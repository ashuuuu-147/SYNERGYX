"""Integration tests for Organization profile endpoints and safeguards."""

import contextlib
import os
from decimal import Decimal

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from alembic import command
from app.db.session import get_db
from app.main import app
from app.models.production_record import ProductionRecord


@pytest.fixture(scope="module")
def org_test_client():
    db_file = "test_org_integration.db"
    db_url = f"sqlite:///{db_file}"

    if os.path.exists(db_file):
        with contextlib.suppress(OSError):
            os.remove(db_file)

    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)
    command.upgrade(alembic_cfg, "head")

    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    yield client, TestingSession

    app.dependency_overrides.clear()
    engine.dispose()
    if os.path.exists(db_file):
        with contextlib.suppress(OSError):
            os.remove(db_file)


def test_organization_profile_and_production_unit_lock(org_test_client):
    client, session_factory = org_test_client

    # 1. Register User A
    reg_a = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "User Alpha",
            "email": "alpha@factory.com",
            "password": "Password12345!",
            "organization_name": "Alpha Mfg Ltd",
            "industry": "textile",
            "location": "Mumbai",
            "country_code": "IN",
            "production_unit": "kg",
        },
    ).json()
    token_a = reg_a["access_token"]
    org_a_id = reg_a["organization"]["id"]

    # 2. GET /organization
    get_res = client.get("/api/v1/organization", headers={"Authorization": f"Bearer {token_a}"})
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Alpha Mfg Ltd"
    assert get_res.json()["allow_external_ai"] is False

    # 3. PATCH /organization before any production records
    patch_res = client.patch(
        "/api/v1/organization",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"name": "Alpha Manufacturing Group", "production_unit": "tonne"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "Alpha Manufacturing Group"
    assert patch_res.json()["production_unit"] == "tonne"

    # 4. Insert a production record directly into DB to test the lock
    db = session_factory()
    import uuid
    from datetime import date

    prod = ProductionRecord(
        organization_id=uuid.UUID(org_a_id),
        period_month=date(2026, 1, 1),
        quantity=Decimal("500.000"),
        unit="tonne",
    )
    db.add(prod)
    db.commit()
    db.close()

    # 5. Attempt to change production_unit now -> must fail with 400 PRODUCTION_UNIT_LOCKED
    locked_res = client.patch(
        "/api/v1/organization",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"production_unit": "kg"},
    )
    assert locked_res.status_code == 400
    assert locked_res.json()["code"] == "PRODUCTION_UNIT_LOCKED"

    # 6. Update AI consent
    consent_res = client.patch(
        "/api/v1/organization/ai-consent",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"allow_external_ai": True},
    )
    assert consent_res.status_code == 200
    assert consent_res.json()["allow_external_ai"] is True
