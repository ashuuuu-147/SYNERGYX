"""Integration tests for Analytics API endpoints and calculation presentation contract."""

import contextlib
import os
from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from alembic import command
from app.db.session import get_db
from app.main import app
from app.models.production_record import ProductionRecord
from app.models.utility_record import UtilityRecord
from app.schemas.auth import RegisterRequest
from app.services.auth_service import AuthService


@pytest.fixture
def analytics_test_env(tmp_path: Path):
    db_file = tmp_path / "test_analytics.db"
    db_url = f"sqlite:///{db_file}"

    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    backend_dir = Path(__file__).parent.parent.parent
    alembic_ini_path = backend_dir / "alembic.ini"
    alembic_cfg = Config(str(alembic_ini_path))
    alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)

    command.upgrade(alembic_cfg, "head")

    def override_get_db():
        session = testing_session_local()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db

    yield {
        "engine": engine,
        "session_factory": testing_session_local,
    }

    app.dependency_overrides.clear()
    engine.dispose()
    with contextlib.suppress(OSError):
        if db_file.exists():
            os.remove(db_file)


def test_analytics_date_validation_and_gap_preservation(analytics_test_env) -> None:
    session_factory = analytics_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        # Register User
        reg = AuthService.register_user(
            db=db,
            request=RegisterRequest(
                email="analytics_owner@factory.com",
                password="SecurePassword123!",
                full_name="Rajesh Kumar",
                organization_name="Gujarat Spinning",
                industry="textile",
                location="Ahmedabad",
                country_code="IN",
                production_unit="kg",
            ),
        )
        token = reg.access_token
        org_id = reg.user.organization_id

        # Insert Month 1: 2026-01 (Utility + Production)
        db.add(
            UtilityRecord(
                organization_id=org_id,
                resource_type="electricity",
                period_month=date(2026, 1, 1),
                quantity=Decimal("12000"),
                unit="kWh",
                amount_inr=Decimal("96000"),
            )
        )
        db.add(
            ProductionRecord(
                organization_id=org_id,
                period_month=date(2026, 1, 1),
                quantity=Decimal("10000"),
                unit="kg",
            )
        )

        # Skip Month 2: 2026-02 (GAP)

        # Insert Month 3: 2026-03 (Utility only, NO Production)
        db.add(
            UtilityRecord(
                organization_id=org_id,
                resource_type="electricity",
                period_month=date(2026, 3, 1),
                quantity=Decimal("10500"),
                unit="kWh",
                amount_inr=Decimal("84000"),
            )
        )

        db.commit()

    headers = {"Authorization": f"Bearer {token}"}

    # 1. Invalid date range: from > to
    res_invalid_range = client.get(
        "/api/v1/analytics",
        headers=headers,
        params={"from": "2026-05", "to": "2026-01"},
    )
    assert res_invalid_range.status_code == 400
    assert "Start month cannot be after end month" in res_invalid_range.json()["detail"]

    # 2. Invalid date format
    res_invalid_format = client.get(
        "/api/v1/analytics",
        headers=headers,
        params={"from": "not-a-month", "to": "2026-03"},
    )
    assert res_invalid_format.status_code == 400
    assert "INVALID_MONTH_FORMAT" in res_invalid_format.json().get("code", "")

    # 3. Valid range query across gap: 2026-01 to 2026-03
    res = client.get(
        "/api/v1/analytics",
        headers=headers,
        params={"from": "2026-01", "to": "2026-03", "resource_type": "electricity", "metric": "intensity"},
    )
    assert res.status_code == 200
    data = res.json()

    assert data["from_month"] == "2026-01"
    assert data["to_month"] == "2026-03"
    assert data["resource_type"] == "electricity"
    assert data["metric"] == "intensity"
    assert data["production_unit"] == "kg"

    # Exactly 3 chronological months
    series = data["series"]
    assert len(series) == 3

    # Month 1: 2026-01 has valid utility and production intensity (12000 / 10000 = 1.2)
    m1 = series[0]
    assert m1["month_str"] == "2026-01"
    assert m1["has_utility_data"] is True
    assert m1["has_production_data"] is True
    assert float(m1["electricity"]["quantity"]) == 12000.0
    assert float(m1["electricity"]["intensity"]) == 1.2
    assert float(m1["total_spend_inr"]) == 96000.0

    # Month 2: 2026-02 is a GAP (Honest nulls, no fake zeros)
    m2 = series[1]
    assert m2["month_str"] == "2026-02"
    assert m2["has_utility_data"] is False
    assert m2["has_production_data"] is False
    assert m2["electricity"]["quantity"] is None
    assert m2["electricity"]["intensity"] is None
    assert m2["total_spend_inr"] is None
    assert "No records for this month" in m2["caveats"]

    # Month 3: 2026-03 has utility but NO production
    m3 = series[2]
    assert m3["month_str"] == "2026-03"
    assert m3["has_utility_data"] is True
    assert m3["has_production_data"] is False
    assert float(m3["electricity"]["quantity"]) == 10500.0
    # Must be None, not 0
    assert m3["electricity"]["intensity"] is None
    assert any("Production data missing; intensity unavailable" in c for c in m3["caveats"])

    # Summary table
    table = data["summary_table"]
    assert len(table) == 3
    assert table[1]["electricity_qty_display"] == "—"
    assert table[1]["production_display"] == "—"
    assert table[2]["electricity_intensity_display"] == "—"

    # Totals
    totals = data["totals"]
    assert float(totals["total_production"]) == 10000.0
    assert float(totals["total_electricity_kwh"]) == 22500.0
    assert float(totals["total_spend_inr"]) == 180000.0


def test_analytics_multi_tenant_isolation(analytics_test_env) -> None:
    session_factory = analytics_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        # Org 1
        reg1 = AuthService.register_user(
            db=db,
            request=RegisterRequest(
                email="factory1@org1.com",
                password="Password123!",
                full_name="User One",
                organization_name="Org 1 Textiles",
                industry="textile",
                location="Surat",
                country_code="IN",
                production_unit="kg",
            ),
        )
        token1 = reg1.access_token
        org1_id = reg1.user.organization_id

        # Org 2
        reg2 = AuthService.register_user(
            db=db,
            request=RegisterRequest(
                email="factory2@org2.com",
                password="Password123!",
                full_name="User Two",
                organization_name="Org 2 Metals",
                industry="metal_fabrication",
                location="Pune",
                country_code="IN",
                production_unit="kg",
            ),
        )
        token2 = reg2.access_token

        # Insert records only for Org 1
        db.add(
            UtilityRecord(
                organization_id=org1_id,
                resource_type="electricity",
                period_month=date(2026, 4, 1),
                quantity=Decimal("50000"),
                unit="kWh",
                amount_inr=Decimal("400000"),
            )
        )
        db.commit()

    # Query with Org 2 credentials
    res_org2 = client.get(
        "/api/v1/analytics",
        headers={"Authorization": f"Bearer {token2}"},
        params={"from": "2026-04", "to": "2026-04"},
    )
    assert res_org2.status_code == 200
    data_org2 = res_org2.json()

    # Org 2 has no data, so quantity must be null
    assert data_org2["series"][0]["electricity"]["quantity"] is None
    assert data_org2["totals"]["total_electricity_kwh"] is None

    # Query with Org 1 credentials
    res_org1 = client.get(
        "/api/v1/analytics",
        headers={"Authorization": f"Bearer {token1}"},
        params={"from": "2026-04", "to": "2026-04"},
    )
    assert res_org1.status_code == 200
    data_org1 = res_org1.json()
    assert float(data_org1["series"][0]["electricity"]["quantity"]) == 50000.0
