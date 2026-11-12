"""Integration tests for Utility Records CRUD, canonical unit conversions, and isolation."""

import contextlib
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
from app.schemas.auth import RegisterRequest
from app.services.auth_service import AuthService


@pytest.fixture
def utility_test_env(tmp_path: Path):
    db_file = tmp_path / "test_utility.db"
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


def test_utility_records_crud_and_canonical_conversion(utility_test_env) -> None:
    session_factory = utility_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        reg_a = AuthService.register_user(
            db=db,
            request=RegisterRequest(
                organization_name="Solaris Mills",
                industry="textile",
                production_unit="kg",
                full_name="Rajesh Patel",
                email="rajesh@solaris.com",
                password="SecurePassword123!",
                location="Ahmedabad",
                country_code="IN",
            ),
        )
        token_a = reg_a.access_token

        reg_b = AuthService.register_user(
            db=db,
            request=RegisterRequest(
                organization_name="Zenith Foods",
                industry="food_processing",
                production_unit="tonne",
                full_name="Pooja Sharma",
                email="pooja@zenith.com",
                password="SecurePassword123!",
                location="Pune",
                country_code="IN",
            ),
        )
        token_b = reg_b.access_token

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. Create electricity record (normalizes date 2026-05-20 -> 2026-05-01)
    elec_payload = {
        "resource_type": "electricity",
        "period_month": "2026-05-20",
        "quantity": "14500.25",
        "input_unit": "kWh",
        "amount_inr": "116000.00",
        "notes": "Main plant electricity meter",
    }
    elec_resp = client.post("/api/v1/utility-records", json=elec_payload, headers=headers_a)
    assert elec_resp.status_code == 201
    elec_data = elec_resp.json()
    assert elec_data["period_month"] == "2026-05-01"
    assert elec_data["unit"] == "kWh"
    assert Decimal(str(elec_data["quantity"])) == Decimal("14500.250")
    elec_id = elec_data["id"]

    # 2. Duplicate entry for same resource & month -> 409
    dup_resp = client.post("/api/v1/utility-records", json=elec_payload, headers=headers_a)
    assert dup_resp.status_code == 409
    assert dup_resp.json()["code"] == "DUPLICATE_UTILITY_RECORD"

    # 3. Create water record with conversion from litres -> m3
    water_payload = {
        "resource_type": "water",
        "period_month": "2026-05-01",
        "quantity": "250000",  # 250,000 litres
        "input_unit": "litres",
        "amount_inr": "12500.50",
    }
    water_resp = client.post("/api/v1/utility-records", json=water_payload, headers=headers_a)
    assert water_resp.status_code == 201
    water_data = water_resp.json()
    assert water_data["unit"] == "m3"
    assert Decimal(str(water_data["quantity"])) == Decimal("250.000")  # 250,000 / 1000

    # 4. Create fuel record in litres
    fuel_payload = {
        "resource_type": "fuel",
        "period_month": "2026-05-01",
        "quantity": "1200.00",
        "input_unit": "L",
        "amount_inr": "108000.00",
    }
    fuel_resp = client.post("/api/v1/utility-records", json=fuel_payload, headers=headers_a)
    assert fuel_resp.status_code == 201
    fuel_data = fuel_resp.json()
    assert fuel_data["unit"] == "L"
    assert Decimal(str(fuel_data["quantity"])) == Decimal("1200.000")

    # 5. Invalid unit rejection
    bad_unit_payload = {
        "resource_type": "water",
        "period_month": "2026-06-01",
        "quantity": "100",
        "input_unit": "gallons",
    }
    bad_resp = client.post("/api/v1/utility-records", json=bad_unit_payload, headers=headers_a)
    assert bad_resp.status_code == 400
    assert bad_resp.json()["code"] == "INVALID_UNIT"

    # 6. List records with filtering
    list_all = client.get("/api/v1/utility-records", headers=headers_a)
    assert list_all.status_code == 200
    assert len(list_all.json()) == 3

    list_water = client.get("/api/v1/utility-records?resource_type=water", headers=headers_a)
    assert len(list_water.json()) == 1
    assert list_water.json()[0]["resource_type"] == "water"

    # 7. Cross-tenant isolation
    b_list = client.get("/api/v1/utility-records", headers=headers_b)
    assert len(b_list.json()) == 0

    b_read = client.get(f"/api/v1/utility-records/{elec_id}", headers=headers_b)
    assert b_read.status_code == 404

    b_update = client.patch(
        f"/api/v1/utility-records/{elec_id}",
        json={"notes": "Hacked notes"},
        headers=headers_b,
    )
    assert b_update.status_code == 404

    b_delete = client.delete(f"/api/v1/utility-records/{elec_id}", headers=headers_b)
    assert b_delete.status_code == 404

    # 8. User A updates record
    update_resp = client.patch(
        f"/api/v1/utility-records/{elec_id}",
        json={"quantity": "15000", "notes": "Updated after reconciliation"},
        headers=headers_a,
    )
    assert update_resp.status_code == 200
    assert Decimal(str(update_resp.json()["quantity"])) == Decimal("15000.000")
    assert update_resp.json()["notes"] == "Updated after reconciliation"

    # 9. User A deletes electricity record -> 204
    del_resp = client.delete(f"/api/v1/utility-records/{elec_id}", headers=headers_a)
    assert del_resp.status_code == 204

    # Verification: now only 2 records remain
    remaining = client.get("/api/v1/utility-records", headers=headers_a)
    assert len(remaining.json()) == 2
