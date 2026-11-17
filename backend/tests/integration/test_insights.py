"""Integration tests for Rules-Based Insights Engine and Recommendations."""

import contextlib
import os
import uuid
from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker

from alembic import command
from app.db.session import get_db
from app.main import app
from app.models.action import Action
from app.models.insight import Insight
from app.models.production_record import ProductionRecord
from app.models.utility_record import UtilityRecord
from app.schemas.auth import RegisterRequest
from app.services.auth_service import AuthService


@pytest.fixture
def insights_test_env(tmp_path: Path):
    db_file = tmp_path / "test_insights.db"
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


def test_rules_generation_missing_data_and_comparative_rules(insights_test_env) -> None:
    session_factory = insights_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        reg = AuthService.register_user(
            db=db,
            request=RegisterRequest(
                email="factory_owner@textile.com",
                password="SecurePassword123!",
                full_name="Arjun Mehta",
                organization_name="Mehta Weaving Mills",
                industry="textile",
                location="Surat",
                country_code="IN",
                production_unit="kg",
            ),
        )
        token = reg.access_token
        org_id = reg.user.organization_id

        # Month 1: 2026-02-01 (Baseline Month from Section 16 dataset)
        db.add(
            UtilityRecord(
                organization_id=org_id,
                resource_type="electricity",
                period_month=date(2026, 2, 1),
                quantity=Decimal("12000"),
                unit="kWh",
                amount_inr=Decimal("96000"),
            )
        )
        db.add(
            ProductionRecord(
                organization_id=org_id,
                period_month=date(2026, 2, 1),
                quantity=Decimal("10000"),
                unit="kg",
            )
        )

        # Month 2: 2026-03-01 (Current Month: 10,500 kWh electricity, ₹84,000, 10,000 kg prod)
        # Also water with missing amount to test missing_cost_data rule
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
        db.add(
            UtilityRecord(
                organization_id=org_id,
                resource_type="water",
                period_month=date(2026, 3, 1),
                quantity=Decimal("55"),
                unit="m3",
                amount_inr=None,  # Missing cost
            )
        )
        db.add(
            ProductionRecord(
                organization_id=org_id,
                period_month=date(2026, 3, 1),
                quantity=Decimal("10000"),
                unit="kg",
            )
        )

        db.commit()

    headers = {"Authorization": f"Bearer {token}"}

    # 1. Generate insights for 2026-03
    res_gen = client.post("/api/v1/insights/generate?month=2026-03", headers=headers)
    assert res_gen.status_code == 200
    gen_data = res_gen.json()
    assert gen_data["engine_version"] == "rules_v1.0"
    assert gen_data["insights_generated_count"] >= 2

    # Check the insights generated
    insights = gen_data["insights"]
    metric_codes = [i["metric_code"] for i in insights]
    assert "electricity_intensity_down" in metric_codes
    assert "missing_cost_data" in metric_codes

    # Find electricity reduction insight
    elec_down = next(i for i in insights if i["metric_code"] == "electricity_intensity_down")
    assert elec_down["severity"] == "low"
    assert float(elec_down["change_percent"]) == -12.5
    assert float(elec_down["observed_value"]) == 1.05
    assert float(elec_down["comparison_value"]) == 1.2
    assert "Observed improvement vs previous month" in elec_down["caveat"]

    # Verify recommendation linked
    assert len(elec_down["recommendations"]) == 1
    rec = elec_down["recommendations"][0]
    assert rec["status"] == "proposed"
    assert rec["priority"] == "low"
    assert float(rec["estimated_saving_quantity"]) == 1500.0
    assert float(rec["estimated_saving_inr"]) == 12000.0

    # 2. Idempotency: generating a second time does not duplicate records in DB
    res_gen_2 = client.post("/api/v1/insights/generate?month=2026-03", headers=headers)
    assert res_gen_2.status_code == 200
    assert res_gen_2.json()["insights_generated_count"] == gen_data["insights_generated_count"]

    with session_factory() as db:
        total_db_insights = db.scalar(select(func.count(Insight.id)).where(Insight.organization_id == org_id))
        assert total_db_insights == gen_data["insights_generated_count"]

    # 3. List insights
    res_list = client.get("/api/v1/insights?month=2026-03", headers=headers)
    assert res_list.status_code == 200
    assert len(res_list.json()) == gen_data["insights_generated_count"]


def test_recommendation_accept_dismiss_and_action_creation(insights_test_env) -> None:
    session_factory = insights_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        reg = AuthService.register_user(
            db=db,
            request=RegisterRequest(
                email="manager@plant.com",
                password="SecurePassword123!",
                full_name="Pooja Sharma",
                organization_name="Sharma Food Products",
                industry="food_processing",
                location="Indore",
                country_code="IN",
                production_unit="kg",
            ),
        )
        token = reg.access_token
        org_id = reg.user.organization_id

        # Insert utility without production -> triggers missing_production_data
        db.add(
            UtilityRecord(
                organization_id=org_id,
                resource_type="fuel",
                period_month=date(2026, 4, 1),
                quantity=Decimal("500"),
                unit="L",
                amount_inr=Decimal("45000"),
            )
        )
        db.commit()

    headers = {"Authorization": f"Bearer {token}"}

    # Generate insights
    res = client.post("/api/v1/insights/generate?month=2026-04", headers=headers)
    assert res.status_code == 200
    insights = res.json()["insights"]

    missing_prod_insight = next(i for i in insights if i["metric_code"] == "missing_production_data")
    rec_id = missing_prod_insight["recommendations"][0]["id"]

    # 1. Accept recommendation
    res_accept = client.post(f"/api/v1/recommendations/{rec_id}/accept", headers=headers)
    assert res_accept.status_code == 200
    assert res_accept.json()["status"] == "accepted"

    # Verify linked Action was created in DB
    with session_factory() as db:
        action = db.scalar(select(Action).where(Action.recommendation_id == uuid.UUID(rec_id)))
        assert action is not None
        assert action.status == "pending"
        assert action.title == "Enter Monthly Production Output"

    # 2. Idempotent acceptance: accept again does not create a second action
    res_accept_again = client.post(f"/api/v1/recommendations/{rec_id}/accept", headers=headers)
    assert res_accept_again.status_code == 200
    with session_factory() as db:
        action_count = db.scalar(
            select(func.count(Action.id)).where(Action.recommendation_id == uuid.UUID(rec_id))
        )
        assert action_count == 1

    # 3. Dismiss another recommendation
    other_rec = next(
        i["recommendations"][0]
        for i in insights
        if i["recommendations"] and i["recommendations"][0]["id"] != rec_id
    )
    other_rec_id = other_rec["id"]

    res_dismiss = client.post(f"/api/v1/recommendations/{other_rec_id}/dismiss", headers=headers)
    assert res_dismiss.status_code == 200
    assert res_dismiss.json()["status"] == "dismissed"


def test_generate_and_list_insights_for_range(insights_test_env):
    """Verify generating and listing insights across a multi-month range."""
    session_factory = insights_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        reg = AuthService.register_user(
            db=db,
            request=RegisterRequest(
                organization_name="Range Textiles",
                industry="textile",
                production_unit="kg",
                full_name="Anil Kumar",
                email="anil.range@textile.com",
                password="SecurePassword123!",
                location="Surat",
                country_code="IN",
            ),
        )
        token = reg.access_token
        org_id = reg.user.organization_id

        # Insert utility records for January, February, and March with varying intensities
        records = [
            (date(2026, 1, 1), Decimal("5000"), Decimal("40000"), Decimal("10000")),
            (date(2026, 2, 1), Decimal("7000"), Decimal("56000"), Decimal("10000")),  # +40% increase -> triggers intensity up
            (date(2026, 3, 1), Decimal("4000"), Decimal("32000"), Decimal("10000")),  # -42% reduction -> triggers observed improvement
        ]
        for m, qty, bill, prod in records:
            db.add(
                UtilityRecord(
                    organization_id=org_id,
                    resource_type="electricity",
                    period_month=m,
                    quantity=qty,
                    unit="kWh",
                    amount_inr=bill,
                )
            )
            db.add(
                ProductionRecord(
                    organization_id=org_id,
                    period_month=m,
                    quantity=prod,
                    unit="kg",
                )
            )
        db.commit()

    headers = {"Authorization": f"Bearer {token}"}

    # Generate insights across Jan 2026 to Mar 2026
    res = client.post("/api/v1/insights/generate?start_month=2026-01&end_month=2026-03", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["insights_generated_count"] >= 3

    # List insights filtered by range
    res_list = client.get("/api/v1/insights?start_month=2026-01&end_month=2026-02", headers=headers)
    assert res_list.status_code == 200
    list_items = res_list.json()
    # Check that months returned are only in 2026-01 or 2026-02
    for item in list_items:
        assert item["period_month"] in ("2026-01-01", "2026-02-01")

