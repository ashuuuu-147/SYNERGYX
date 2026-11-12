"""Integration tests for monthly reports, CSV export, and formula injection protection."""

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
from app.core.security import create_access_token
from app.db.session import get_db
from app.main import app
from app.models.action import Action
from app.models.insight import Insight
from app.models.production_record import ProductionRecord
from app.models.recommendation import Recommendation
from app.models.utility_record import UtilityRecord
from app.schemas.auth import RegisterRequest
from app.services.auth_service import AuthService


@pytest.fixture
def reports_test_env(tmp_path: Path):
    """Create an isolated SQLite database migrated via Alembic."""
    db_file = tmp_path / "test_reports.db"
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


def test_monthly_report_json_section16_vectors(reports_test_env) -> None:
    """Test monthly report JSON against blueprint Section 16 vectors (1.05 intensity, ₹128,200 spend)."""
    session_factory = reports_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        reg = AuthService.register_user(
            db,
            RegisterRequest(
                full_name="Report Lead",
                email="reporter@textile.com",
                password="Password123!",
                organization_name="Textile Corp",
                industry="textile",
                production_unit="kg",
                location="Mumbai",
                country_code="IN",
            ),
        )
        token = create_access_token(reg.user.id, reg.user.organization_id)
        org_id = reg.user.organization_id

        # February records (baseline)
        feb_month = date(2026, 2, 1)
        db.add(ProductionRecord(
            id=uuid.uuid4(),
            organization_id=org_id,
            period_month=feb_month,
            quantity=Decimal("10000"),
            unit="kg",
        ))
        db.add(UtilityRecord(
            id=uuid.uuid4(),
            organization_id=org_id,
            resource_type="electricity",
            period_month=feb_month,
            quantity=Decimal("12000"),
            unit="kWh",
            amount_inr=Decimal("96000"),
        ))
        db.add(UtilityRecord(
            id=uuid.uuid4(),
            organization_id=org_id,
            resource_type="water",
            period_month=feb_month,
            quantity=Decimal("60"),
            unit="m3",
            amount_inr=Decimal("2400"),
        ))
        db.add(UtilityRecord(
            id=uuid.uuid4(),
            organization_id=org_id,
            resource_type="fuel",
            period_month=feb_month,
            quantity=Decimal("440"),
            unit="L",
            amount_inr=Decimal("44000"),
        ))

        # March records (target)
        mar_month = date(2026, 3, 1)
        db.add(ProductionRecord(
            id=uuid.uuid4(),
            organization_id=org_id,
            period_month=mar_month,
            quantity=Decimal("10000"),
            unit="kg",
        ))
        db.add(UtilityRecord(
            id=uuid.uuid4(),
            organization_id=org_id,
            resource_type="electricity",
            period_month=mar_month,
            quantity=Decimal("10500"),
            unit="kWh",
            amount_inr=Decimal("84000"),
        ))
        db.add(UtilityRecord(
            id=uuid.uuid4(),
            organization_id=org_id,
            resource_type="water",
            period_month=mar_month,
            quantity=Decimal("55"),
            unit="m3",
            amount_inr=Decimal("2200"),
        ))
        db.add(UtilityRecord(
            id=uuid.uuid4(),
            organization_id=org_id,
            resource_type="fuel",
            period_month=mar_month,
            quantity=Decimal("420"),
            unit="L",
            amount_inr=Decimal("42000"),
        ))

        # Add recommendation
        rec = Recommendation(
            id=uuid.uuid4(),
            organization_id=org_id,
            title="Optimise air compressor operating hours",
            description="Audit leak points on line 2",
            priority="high",
            status="proposed",
            estimated_saving_inr=Decimal("12000"),
        )
        db.add(rec)
        db.commit()

    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/reports/monthly?month=2026-03", headers=headers)
    assert response.status_code == 200
    data = response.json()

    # Metadata
    assert data["metadata"]["organization_name"] == "Textile Corp"
    assert data["metadata"]["report_month"] == "2026-03"
    assert data["metadata"]["production_unit"] == "kg"

    # Summary
    assert Decimal(str(data["summary"]["production_quantity"])) == Decimal("10000")
    assert Decimal(str(data["summary"]["total_spend_inr"])) == Decimal("128200")
    assert data["summary"]["spend_coverage"] == "3 of 3 utility types recorded"
    assert data["summary"]["has_missing_data"] is False

    # Utilities
    utils = {u["resource_type"]: u for u in data["utilities"]}
    elec = utils["electricity"]
    assert Decimal(str(elec["quantity"])) == Decimal("10500")
    assert Decimal(str(elec["intensity"])) == Decimal("1.05")
    assert Decimal(str(elec["mom_quantity_change_pct"])) == Decimal("-12.50")
    assert Decimal(str(elec["mom_intensity_change_pct"])) == Decimal("-12.50")

    water = utils["water"]
    assert Decimal(str(water["quantity"])) == Decimal("55")
    assert Decimal(str(water["intensity"])) == Decimal("0.0055")

    fuel = utils["fuel"]
    assert Decimal(str(fuel["quantity"])) == Decimal("420")
    assert Decimal(str(fuel["intensity"])) == Decimal("0.042")

    # Recommendations
    assert len(data["recommendations"]) == 1
    assert data["recommendations"][0]["title"] == "Optimise air compressor operating hours"

    # Caveats
    assert any("not an externally certified ESG assurance report" in c for c in data["caveats"])


def test_monthly_report_empty_state_and_missing_data(reports_test_env) -> None:
    """Test report disclosures when records are completely absent."""
    session_factory = reports_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        reg = AuthService.register_user(
            db,
            RegisterRequest(
                full_name="Plant User",
                email="empty@plant.com",
                password="Password123!",
                organization_name="Empty Plant",
                industry="metal_fabrication",
                production_unit="tonne",
                location="Pune",
                country_code="IN",
            ),
        )
        token = create_access_token(reg.user.id, reg.user.organization_id)

    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/reports/monthly?month=2026-05", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert data["summary"]["production_quantity"] is None
    assert Decimal(str(data["summary"]["total_spend_inr"])) == Decimal("0")
    assert data["summary"]["has_missing_data"] is True

    for u in data["utilities"]:
        assert u["quantity"] is None
        assert u["intensity"] is None

    # Disclosure caveats must be present
    caveats = data["caveats"]
    assert any("Production volume not recorded" in c for c in caveats)
    assert any("Incomplete utility recording" in c for c in caveats)


def test_monthly_csv_download_and_formula_injection_protection(reports_test_env) -> None:
    """Test RFC 4180 CSV export and formula injection sanitization (=, +, -, @)."""
    session_factory = reports_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        reg = AuthService.register_user(
            db,
            RegisterRequest(
                full_name="Security Lead",
                email="sec@mfg.com",
                password="Password123!",
                organization_name="Secure Mfg",
                industry="packaging",
                production_unit="kg",
                location="Bengaluru",
                country_code="IN",
            ),
        )
        token = create_access_token(reg.user.id, reg.user.organization_id)
        org_id = reg.user.organization_id

        # Insert malicious formula strings in text fields
        db.add(Insight(
            id=uuid.uuid4(),
            organization_id=org_id,
            period_month=date(2026, 4, 1),
            metric_code="electricity_consumption",
            resource_type="electricity",
            severity="high",
            title="=cmd|'/C calc'!A0",
            summary="@SUM(1+1)*100",
            source_type="rules",
            engine_version="1.0.0",
        ))
        db.add(Action(
            id=uuid.uuid4(),
            organization_id=org_id,
            title="+DangerousFormulaAction",
            status="pending",
        ))
        db.commit()

    headers = {"Authorization": f"Bearer {token}"}

    # Test both dot and slash routes
    res_dot = client.get("/api/v1/reports/monthly.csv?month=2026-04", headers=headers)
    assert res_dot.status_code == 200
    assert "text/csv" in res_dot.headers["content-type"]
    assert 'filename="synergyx_monthly_report_2026-04.csv"' in res_dot.headers["content-disposition"]

    res_slash = client.get("/api/v1/reports/monthly/csv?month=2026-04", headers=headers)
    assert res_slash.status_code == 200

    csv_text = res_dot.text

    # Verify formula injection protection: dangerous leading characters must be prefixed with single quote
    assert "'=cmd|'/C calc'!A0" in csv_text
    assert "'@SUM(1+1)*100" in csv_text
    assert "'+DangerousFormulaAction" in csv_text

    # Header check
    assert "SYNERGYX MONTHLY RESOURCE & UTILITY REPORT" in csv_text
    assert "Secure Mfg" in csv_text


def test_analytics_csv_download(reports_test_env) -> None:
    """Test analytics historical data CSV export."""
    session_factory = reports_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        reg = AuthService.register_user(
            db,
            RegisterRequest(
                full_name="Analyst",
                email="analytics@org.com",
                password="Password123!",
                organization_name="Analytics Org",
                industry="textile",
                production_unit="kg",
                location="Delhi",
                country_code="IN",
            ),
        )
        token = create_access_token(reg.user.id, reg.user.organization_id)

    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/reports/analytics.csv?from=2026-01&to=2026-03", headers=headers)
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert 'filename="synergyx_analytics_export.csv"' in response.headers["content-disposition"]

    csv_text = response.text
    assert "SYNERGYX HISTORICAL ANALYTICS EXPORT" in csv_text
    assert "PERIOD TOTALS & AVERAGES" in csv_text


def test_reports_multi_tenant_isolation(reports_test_env) -> None:
    """Test tenant isolation: User 1 cannot access User 2's organization report."""
    session_factory = reports_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        reg_a = AuthService.register_user(
            db,
            RegisterRequest(
                full_name="User A",
                email="a@alpha.com",
                password="Password123!",
                organization_name="Org Alpha",
                industry="textile",
                production_unit="kg",
                location="Chennai",
                country_code="IN",
            ),
        )
        reg_b = AuthService.register_user(
            db,
            RegisterRequest(
                full_name="User B",
                email="b@beta.com",
                password="Password123!",
                organization_name="Org Beta",
                industry="metal_fabrication",
                production_unit="tonne",
                location="Hyderabad",
                country_code="IN",
            ),
        )
        token_b = create_access_token(reg_b.user.id, reg_b.user.organization_id)

        # Add production record for Org Alpha
        db.add(ProductionRecord(
            id=uuid.uuid4(),
            organization_id=reg_a.user.organization_id,
            period_month=date(2026, 3, 1),
            quantity=Decimal("50000"),
            unit="kg",
        ))
        db.commit()

    headers_b = {"Authorization": f"Bearer {token_b}"}
    response = client.get("/api/v1/reports/monthly?month=2026-03", headers=headers_b)
    assert response.status_code == 200
    data = response.json()
    assert data["metadata"]["organization_name"] == "Org Beta"
    # User B should NOT see User A's 50000 production volume
    assert data["summary"]["production_quantity"] is None
