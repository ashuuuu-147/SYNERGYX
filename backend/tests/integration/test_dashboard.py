"""Integration tests for Dashboard API endpoints and tenant isolation."""

import contextlib
import os
import uuid
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
def dashboard_test_env(tmp_path: Path):
    db_file = tmp_path / "test_dashboard.db"
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


def test_dashboard_empty_account_and_populated_kpis(dashboard_test_env) -> None:
    session_factory = dashboard_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        # Org A: Textile, kg
        reg_a = AuthService.register_user(
            db=db,
            request=RegisterRequest(
                organization_name="Textile Corp",
                industry="textile",
                production_unit="kg",
                full_name="Arjun Mehta",
                email="arjun@textile.com",
                password="SecurePassword123!",
                location="Surat",
                country_code="IN",
            ),
        )
        token_a = reg_a.access_token
        org_a_id = uuid.UUID(reg_a.organization.id) if isinstance(reg_a.organization.id, str) else reg_a.organization.id

        # Org B: Empty account
        reg_b = AuthService.register_user(
            db=db,
            request=RegisterRequest(
                organization_name="Empty Industries",
                industry="packaging",
                production_unit="piece",
                full_name="Bina Roy",
                email="bina@empty.com",
                password="SecurePassword123!",
                location="Mumbai",
                country_code="IN",
            ),
        )
        token_b = reg_b.access_token

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. Org B: Empty account dashboard test (honest nulls, no fake metrics)
    empty_resp = client.get("/api/v1/dashboard/summary", headers=headers_b)
    assert empty_resp.status_code == 200
    empty_data = empty_resp.json()
    assert empty_data["latest_available_month"] is None
    assert empty_data["electricity"]["quantity"] is None
    assert empty_data["water"]["quantity"] is None
    assert empty_data["fuel"]["quantity"] is None
    assert empty_data["production_quantity"] is None
    assert empty_data["total_spend_inr"] is None
    assert empty_data["utility_recorded_count"] == 0
    assert empty_data["utility_data_coverage"] == "0 of 3 utility types recorded"

    # 2. Populate Org A with Section 16 February and March dataset
    with session_factory() as db:
        # February
        feb_month = date(2026, 2, 1)
        db.add_all(
            [
                UtilityRecord(
                    organization_id=org_a_id,
                    resource_type="electricity",
                    period_month=feb_month,
                    quantity=Decimal("12000"),
                    unit="kWh",
                    amount_inr=Decimal("96000"),
                ),
                UtilityRecord(
                    organization_id=org_a_id,
                    resource_type="water",
                    period_month=feb_month,
                    quantity=Decimal("60"),
                    unit="m3",
                    amount_inr=Decimal("2400"),
                ),
                UtilityRecord(
                    organization_id=org_a_id,
                    resource_type="fuel",
                    period_month=feb_month,
                    quantity=Decimal("440"),
                    unit="L",
                    amount_inr=Decimal("44000"),
                ),
                ProductionRecord(
                    organization_id=org_a_id, period_month=feb_month, quantity=Decimal("10000"), unit="kg"
                ),
            ]
        )
        # March
        mar_month = date(2026, 3, 1)
        db.add_all(
            [
                UtilityRecord(
                    organization_id=org_a_id,
                    resource_type="electricity",
                    period_month=mar_month,
                    quantity=Decimal("10500"),
                    unit="kWh",
                    amount_inr=Decimal("84000"),
                ),
                UtilityRecord(
                    organization_id=org_a_id,
                    resource_type="water",
                    period_month=mar_month,
                    quantity=Decimal("55"),
                    unit="m3",
                    amount_inr=Decimal("2200"),
                ),
                UtilityRecord(
                    organization_id=org_a_id,
                    resource_type="fuel",
                    period_month=mar_month,
                    quantity=Decimal("420"),
                    unit="L",
                    amount_inr=Decimal("42000"),
                ),
                ProductionRecord(
                    organization_id=org_a_id, period_month=mar_month, quantity=Decimal("10000"), unit="kg"
                ),
            ]
        )
        db.commit()

    # 3. Query Org A dashboard for March 2026
    mar_resp = client.get("/api/v1/dashboard/summary?month=2026-03", headers=headers_a)
    assert mar_resp.status_code == 200
    mar_data = mar_resp.json()

    # Verify Section 16 values
    assert mar_data["selected_month"] == "2026-03-01"
    assert mar_data["latest_available_month"] == "2026-03-01"

    # Electricity
    elec = mar_data["electricity"]
    assert Decimal(str(elec["quantity"])) == Decimal("10500")
    assert elec["unit"] == "kWh"
    assert Decimal(str(elec["intensity"])) == Decimal("1.05")
    assert elec["intensity_unit"] == "kWh/kg"
    assert Decimal(str(elec["change_percent"])) == Decimal("-12.5")
    assert Decimal(str(elec["observed_resource_reduction"])) == Decimal("1500")
    assert Decimal(str(elec["potential_saving_inr"])) == Decimal("12000")

    # Water
    water = mar_data["water"]
    assert Decimal(str(water["quantity"])) == Decimal("55")
    assert water["unit"] == "m3"
    assert Decimal(str(water["intensity"])) == Decimal("0.0055")

    # Fuel
    fuel = mar_data["fuel"]
    assert Decimal(str(fuel["quantity"])) == Decimal("420")
    assert fuel["unit"] == "L"
    assert Decimal(str(fuel["intensity"])) == Decimal("0.042")

    # Production & Spend
    assert Decimal(str(mar_data["production_quantity"])) == Decimal("10000")
    assert mar_data["production_unit"] == "kg"
    assert Decimal(str(mar_data["total_spend_inr"])) == Decimal("128200")
    assert mar_data["is_partial_spend"] is False
    assert mar_data["utility_recorded_count"] == 3
    assert mar_data["utility_data_coverage"] == "3 of 3 utility types recorded"

    # 4. Multi-tenant isolation: Org B queries March 2026 -> sees nothing
    b_mar_resp = client.get("/api/v1/dashboard/summary?month=2026-03", headers=headers_b)
    assert b_mar_resp.status_code == 200
    b_data = b_mar_resp.json()
    assert b_data["electricity"]["quantity"] is None
    assert b_data["total_spend_inr"] is None

    # 5. Invalid month query rejected
    bad_month_resp = client.get("/api/v1/dashboard/summary?month=not-a-date", headers=headers_a)
    assert bad_month_resp.status_code == 400
    assert bad_month_resp.json()["code"] == "INVALID_MONTH_FORMAT"
