"""Critical End-to-End Journey Test for SYNERGYX.

Verifies the entire lifecycle end-to-end:
Register -> Enter Utility & Production Records -> Link Bill Document ->
Dashboard -> Analytics -> Generate Insights -> Accept Recommendation ->
Track & Complete Action -> Generate Monthly Performance Report & CSV Export.
"""

import contextlib
import io
import os
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


@pytest.fixture
def e2e_test_env(tmp_path: Path):
    """Isolated SQLite test environment migrated to head."""
    db_file = tmp_path / "test_e2e_journey.db"
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


def test_full_critical_journey_end_to_end(e2e_test_env) -> None:
    """Execute the complete critical user journey through public API endpoints."""
    client = TestClient(app)

    # -----------------------------------------------------------------------
    # Step 1: Register User & Organization
    # -----------------------------------------------------------------------
    reg_payload = {
        "full_name": "Rajesh Kumar",
        "email": "rajesh@surattextiles.in",
        "password": "SecurePassword123!",
        "organization_name": "Surat Textiles Ltd",
        "industry": "textile",
        "production_unit": "kg",
        "location": "Surat, Gujarat",
        "country_code": "IN",
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == "rajesh@surattextiles.in"
    assert reg_data["organization"]["name"] == "Surat Textiles Ltd"

    # -----------------------------------------------------------------------
    # Step 2: Login & Token Authentication
    # -----------------------------------------------------------------------
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "rajesh@surattextiles.in", "password": "SecurePassword123!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify /auth/me
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["organization"]["industry"] == "textile"

    # -----------------------------------------------------------------------
    # Step 3: Upload Utility Evidence Document
    # -----------------------------------------------------------------------
    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    upload_res = client.post(
        "/api/v1/documents",
        files={"file": ("march_electricity_bill.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        headers=headers,
    )
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["id"]

    # -----------------------------------------------------------------------
    # Step 4: Enter Historical & Current Utility Records (Jan, Feb, Mar 2026)
    # Per Blueprint Section 16 vectors
    # -----------------------------------------------------------------------
    utilities = [
        # January
        {"resource_type": "electricity", "period_month": "2026-01-01", "quantity": 10000, "input_unit": "kWh", "amount_inr": 80000},
        {"resource_type": "water", "period_month": "2026-01-01", "quantity": 50000, "input_unit": "L", "amount_inr": 2000},
        {"resource_type": "fuel", "period_month": "2026-01-01", "quantity": 400, "input_unit": "L", "amount_inr": 40000},
        # February
        {"resource_type": "electricity", "period_month": "2026-02-01", "quantity": 12000, "input_unit": "kWh", "amount_inr": 96000},
        {"resource_type": "water", "period_month": "2026-02-01", "quantity": 60000, "input_unit": "L", "amount_inr": 2400},
        {"resource_type": "fuel", "period_month": "2026-02-01", "quantity": 440, "input_unit": "L", "amount_inr": 44000},
        # March (target month)
        {"resource_type": "electricity", "period_month": "2026-03-01", "quantity": 10500, "input_unit": "kWh", "amount_inr": 84000, "document_id": doc_id},
        {"resource_type": "water", "period_month": "2026-03-01", "quantity": 55000, "input_unit": "L", "amount_inr": 2200},
        {"resource_type": "fuel", "period_month": "2026-03-01", "quantity": 420, "input_unit": "L", "amount_inr": 42000},
    ]

    for u in utilities:
        res = client.post("/api/v1/utility-records", json=u, headers=headers)
        assert res.status_code == 201, f"Failed to create utility record: {res.text}"

    # -----------------------------------------------------------------------
    # Step 5: Enter Production Records (Jan, Feb, Mar 2026: 10,000 kg each)
    # -----------------------------------------------------------------------
    for m in ["2026-01-01", "2026-02-01", "2026-03-01"]:
        res = client.post(
            "/api/v1/production-records",
            json={"period_month": m, "quantity": 10000, "unit": "kg"},
            headers=headers,
        )
        assert res.status_code == 201

    # -----------------------------------------------------------------------
    # Step 6: Verify Dashboard Summary Endpoint (Section 16 Test Vectors)
    # -----------------------------------------------------------------------
    dash_res = client.get("/api/v1/dashboard/summary?month=2026-03", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()

    assert Decimal(str(dash_data["electricity"]["intensity"])) == Decimal("1.05")
    assert Decimal(str(dash_data["electricity"]["change_percent"])) == Decimal("-12.50")
    assert Decimal(str(dash_data["electricity"]["observed_resource_reduction"])) == Decimal("1500")
    assert Decimal(str(dash_data["total_spend_inr"])) == Decimal("128200")
    assert "3 of 3" in dash_data["cost_data_coverage"]

    # -----------------------------------------------------------------------
    # Step 7: Verify Historical Analytics Endpoint
    # -----------------------------------------------------------------------
    analytics_res = client.get(
        "/api/v1/analytics?from=2026-01&to=2026-03",
        headers=headers,
    )
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()
    assert len(analytics_data["series"]) == 3
    assert Decimal(str(analytics_data["totals"]["total_spend_inr"])) == Decimal("392600")

    # -----------------------------------------------------------------------
    # Step 8: Generate Automated Insights
    # -----------------------------------------------------------------------
    gen_insights_res = client.post("/api/v1/insights/generate?month=2026-03", headers=headers)
    assert gen_insights_res.status_code in (200, 201)

    insights_list_res = client.get("/api/v1/insights?month=2026-03", headers=headers)
    assert insights_list_res.status_code == 200
    insights = insights_list_res.json()
    assert len(insights) > 0

    # -----------------------------------------------------------------------
    # Step 9: List Recommendations & Accept One Atomically
    # -----------------------------------------------------------------------
    recs_res = client.get("/api/v1/recommendations", headers=headers)
    assert recs_res.status_code == 200
    recs = recs_res.json()
    assert len(recs) > 0
    target_rec = recs[0]
    rec_id = target_rec["id"]

    # Accept recommendation
    accept_res = client.post(f"/api/v1/recommendations/{rec_id}/accept", headers=headers)
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "accepted"

    # Verify idempotency: accepting again does not fail or duplicate
    accept_again_res = client.post(f"/api/v1/recommendations/{rec_id}/accept", headers=headers)
    assert accept_again_res.status_code == 200

    # -----------------------------------------------------------------------
    # Step 10: Track Action in Action Tracker & Mark Completed
    # -----------------------------------------------------------------------
    actions_res = client.get("/api/v1/actions", headers=headers)
    assert actions_res.status_code == 200
    actions = actions_res.json()
    assert len(actions) == 1
    action_id = actions[0]["id"]
    assert actions[0]["recommendation_id"] == rec_id

    # Transition to in_progress
    patch_in_progress = client.patch(
        f"/api/v1/actions/{action_id}",
        json={"status": "in_progress"},
        headers=headers,
    )
    assert patch_in_progress.status_code == 200
    assert patch_in_progress.json()["status"] == "in_progress"

    # Transition to completed (server sets completed_at timestamp)
    patch_completed = client.patch(
        f"/api/v1/actions/{action_id}",
        json={"status": "completed"},
        headers=headers,
    )
    assert patch_completed.status_code == 200
    completed_data = patch_completed.json()
    assert completed_data["status"] == "completed"
    assert completed_data["completed_at"] is not None

    # -----------------------------------------------------------------------
    # Step 11: Generate Monthly Performance Report & CSV Export
    # -----------------------------------------------------------------------
    report_res = client.get("/api/v1/reports/monthly?month=2026-03", headers=headers)
    assert report_res.status_code == 200
    report_data = report_res.json()
    assert report_data["metadata"]["organization_name"] == "Surat Textiles Ltd"
    assert Decimal(str(report_data["summary"]["total_spend_inr"])) == Decimal("128200")
    assert report_data["summary"]["spend_coverage"] == "3 of 3 utility types recorded"

    # Download CSV export
    csv_res = client.get("/api/v1/reports/monthly.csv?month=2026-03", headers=headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "SYNERGYX MONTHLY RESOURCE & UTILITY REPORT" in csv_res.text
    assert "Surat Textiles Ltd" in csv_res.text

    # Download Analytics CSV export
    analytics_csv_res = client.get("/api/v1/reports/analytics.csv?from=2026-01&to=2026-03", headers=headers)
    assert analytics_csv_res.status_code == 200
    assert "SYNERGYX HISTORICAL ANALYTICS EXPORT" in analytics_csv_res.text
