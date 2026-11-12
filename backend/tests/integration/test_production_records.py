"""Integration tests for Production Records CRUD, unit inheritance, and isolation."""

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
def prod_test_env(tmp_path: Path):
    db_file = tmp_path / "test_production.db"
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


def test_production_records_crud_and_invariants(prod_test_env) -> None:
    session_factory = prod_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        reg_a = AuthService.register_user(
            db=db,
            request=RegisterRequest(
                organization_name="Alpha Textiles",
                industry="textile",
                production_unit="kg",
                full_name="Anil Kumar",
                email="anil@alpha.com",
                password="SecurePassword123!",
                location="Surat",
                country_code="IN",
            ),
        )
        token_a = reg_a.access_token

        reg_b = AuthService.register_user(
            db=db,
            request=RegisterRequest(
                organization_name="Beta Steel",
                industry="metal_fabrication",
                production_unit="tonne",
                full_name="Deepak Verma",
                email="deepak@beta.com",
                password="SecurePassword123!",
                location="Rourkela",
                country_code="IN",
            ),
        )
        token_b = reg_b.access_token

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. Create production record for Org A without specifying unit -> inherits 'kg'
    payload_a = {
        "period_month": "2026-05-18",
        "quantity": "50000.5",
        "notes": "Full capacity double-shift run",
    }
    resp_a = client.post("/api/v1/production-records", json=payload_a, headers=headers_a)
    assert resp_a.status_code == 201
    data_a = resp_a.json()
    assert data_a["period_month"] == "2026-05-01"
    assert data_a["unit"] == "kg"  # Inherited from Org A
    assert Decimal(str(data_a["quantity"])) == Decimal("50000.500")
    record_id_a = data_a["id"]

    # 2. Reject mismatched unit
    mismatch_payload = {
        "period_month": "2026-06-01",
        "quantity": "1000",
        "unit": "tonne",  # Org A is configured for kg!
    }
    mismatch_resp = client.post("/api/v1/production-records", json=mismatch_payload, headers=headers_a)
    assert mismatch_resp.status_code == 400
    assert mismatch_resp.json()["code"] == "PRODUCTION_UNIT_MISMATCH"

    # 3. Duplicate month rejected with 409
    dup_resp = client.post("/api/v1/production-records", json=payload_a, headers=headers_a)
    assert dup_resp.status_code == 409
    assert dup_resp.json()["code"] == "DUPLICATE_PRODUCTION_RECORD"

    # 4. Org B creates record -> inherits 'tonne'
    payload_b = {
        "period_month": "2026-05-01",
        "quantity": "120.75",
    }
    resp_b = client.post("/api/v1/production-records", json=payload_b, headers=headers_b)
    assert resp_b.status_code == 201
    assert resp_b.json()["unit"] == "tonne"

    # 5. List and tenant isolation
    list_a = client.get("/api/v1/production-records", headers=headers_a)
    assert list_a.status_code == 200
    assert len(list_a.json()) == 1

    list_b = client.get("/api/v1/production-records", headers=headers_b)
    assert len(list_b.json()) == 1
    assert list_b.json()[0]["unit"] == "tonne"

    # Org B cannot access Org A's record
    get_cross = client.get(f"/api/v1/production-records/{record_id_a}", headers=headers_b)
    assert get_cross.status_code == 404

    patch_cross = client.patch(f"/api/v1/production-records/{record_id_a}", json={"quantity": "999"}, headers=headers_b)
    assert patch_cross.status_code == 404

    del_cross = client.delete(f"/api/v1/production-records/{record_id_a}", headers=headers_b)
    assert del_cross.status_code == 404

    # 6. Org A updates record
    update_resp = client.patch(
        f"/api/v1/production-records/{record_id_a}",
        json={"quantity": "52000.000", "notes": "Adjusted with audit logs"},
        headers=headers_a,
    )
    assert update_resp.status_code == 200
    assert Decimal(str(update_resp.json()["quantity"])) == Decimal("52000.000")

    # 7. Org A deletes record -> 204
    del_resp = client.delete(f"/api/v1/production-records/{record_id_a}", headers=headers_a)
    assert del_resp.status_code == 204

    # Verification: record gone
    list_after = client.get("/api/v1/production-records", headers=headers_a)
    assert len(list_after.json()) == 0
