"""Integration tests for Action Tracker API endpoints and status transitions."""

import contextlib
import os
import uuid
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from alembic import command
from app.db.session import get_db
from app.main import app
from app.models.action import Action
from app.models.recommendation import Recommendation
from app.schemas.auth import RegisterRequest
from app.services.auth_service import AuthService


@pytest.fixture
def actions_test_env(tmp_path: Path):
    db_file = tmp_path / "test_actions.db"
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


def test_action_crud_status_transitions_and_completion_timestamp(actions_test_env) -> None:
    session_factory = actions_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        reg = AuthService.register_user(
            db=db,
            request=RegisterRequest(
                email="actions_manager@textile.com",
                password="SecurePassword123!",
                full_name="Sunil Rao",
                organization_name="Rao Weaving",
                industry="textile",
                location="Surat",
                country_code="IN",
                production_unit="kg",
            ),
        )
        token = reg.access_token
        org_id = reg.user.organization_id

        # Insert a recommendation to test linking
        rec = Recommendation(
            organization_id=org_id,
            title="Inspect Air Compressor Leaks",
            description="Inspect all pneumatic lines across Loom shed.",
            steps_json=["Perform acoustic audit", "Fix fittings"],
            priority="high",
            status="accepted",
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        rec_id = str(rec.id)

    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a linked action
    create_payload = {
        "title": "Fix Loom Shed Air Leaks",
        "description": "Replace worn couplings on compressor line 2",
        "recommendation_id": rec_id,
        "status": "pending",
        "due_date": "2026-06-15",
        "notes": "Spares ordered from supplier",
    }
    res_create = client.post("/api/v1/actions", headers=headers, json=create_payload)
    assert res_create.status_code == 201
    act_data = res_create.json()
    action_id = act_data["id"]

    assert act_data["title"] == "Fix Loom Shed Air Leaks"
    assert act_data["status"] == "pending"
    assert act_data["completed_at"] is None
    assert act_data["recommendation_title"] == "Inspect Air Compressor Leaks"

    # 2. Transition status: mark 'in_progress'
    res_in_prog = client.patch(
        f"/api/v1/actions/{action_id}",
        headers=headers,
        json={"status": "in_progress"},
    )
    assert res_in_prog.status_code == 200
    assert res_in_prog.json()["status"] == "in_progress"
    assert res_in_prog.json()["completed_at"] is None

    # 3. Transition status: mark 'completed' -> server sets completed_at
    res_comp = client.patch(
        f"/api/v1/actions/{action_id}",
        headers=headers,
        json={"status": "completed"},
    )
    assert res_comp.status_code == 200
    assert res_comp.json()["status"] == "completed"
    assert res_comp.json()["completed_at"] is not None

    # 4. Reopen action: transition to 'in_progress' -> server clears completed_at
    res_reopen = client.patch(
        f"/api/v1/actions/{action_id}",
        headers=headers,
        json={"status": "in_progress"},
    )
    assert res_reopen.status_code == 200
    assert res_reopen.json()["status"] == "in_progress"
    assert res_reopen.json()["completed_at"] is None

    # 5. List with filters
    res_list = client.get("/api/v1/actions?status=in_progress", headers=headers)
    assert res_list.status_code == 200
    assert len(res_list.json()) == 1

    # 6. Delete action, ensure recommendation remains intact
    res_del = client.delete(f"/api/v1/actions/{action_id}", headers=headers)
    assert res_del.status_code == 204

    with session_factory() as db:
        # Action deleted
        action_in_db = db.scalar(select(Action).where(Action.id == uuid.UUID(action_id)))
        assert action_in_db is None

        # Recommendation still exists!
        rec_in_db = db.scalar(select(Recommendation).where(Recommendation.id == uuid.UUID(rec_id)))
        assert rec_in_db is not None
        assert rec_in_db.title == "Inspect Air Compressor Leaks"


def test_action_multi_tenant_isolation(actions_test_env) -> None:
    session_factory = actions_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        # Org 1
        reg1 = AuthService.register_user(
            db=db,
            request=RegisterRequest(
                email="org1@plant.com",
                password="SecurePassword123!",
                full_name="User 1",
                organization_name="Org 1",
                industry="textile",
                location="Surat",
                country_code="IN",
                production_unit="kg",
            ),
        )
        token1 = reg1.access_token

        # Org 2
        reg2 = AuthService.register_user(
            db=db,
            request=RegisterRequest(
                email="org2@plant.com",
                password="SecurePassword123!",
                full_name="User 2",
                organization_name="Org 2",
                industry="packaging",
                location="Vapi",
                country_code="IN",
                production_unit="kg",
            ),
        )
        token2 = reg2.access_token

    # Org 1 creates an action
    res_create = client.post(
        "/api/v1/actions",
        headers={"Authorization": f"Bearer {token1}"},
        json={"title": "Confidential Boiler Overhaul", "status": "pending"},
    )
    assert res_create.status_code == 201
    action1_id = res_create.json()["id"]

    # Org 2 attempts to list actions
    res_list_org2 = client.get("/api/v1/actions", headers={"Authorization": f"Bearer {token2}"})
    assert res_list_org2.status_code == 200
    assert len(res_list_org2.json()) == 0

    # Org 2 attempts to update Org 1's action -> 404 Not Found
    res_hack = client.patch(
        f"/api/v1/actions/{action1_id}",
        headers={"Authorization": f"Bearer {token2}"},
        json={"status": "cancelled"},
    )
    assert res_hack.status_code == 404
