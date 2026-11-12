"""Integration tests for Authentication endpoints and tenant isolation."""

import contextlib

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from alembic import command
from app.db.session import get_db
from app.main import app


@pytest.fixture(scope="module")
def auth_test_client():
    """Create a temporary SQLite DB with migrations applied and override get_db."""
    import os

    db_file = "test_auth_integration.db"
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

    yield client

    app.dependency_overrides.clear()
    engine.dispose()
    import os

    if os.path.exists(db_file):
        with contextlib.suppress(OSError):
            os.remove(db_file)


def test_register_and_login_flow(auth_test_client: TestClient):
    """Test full registration, login, and /auth/me profile retrieval."""
    reg_payload = {
        "full_name": "Aarav Sharma",
        "email": "aarav@mfgtextile.com",
        "password": "SecurePassword123!",
        "organization_name": "Sharma Textiles Pvt Ltd",
        "industry": "textile",
        "location": "Ahmedabad, Gujarat",
        "country_code": "IN",
        "production_unit": "kg",
    }

    # 1. Register
    reg_res = auth_test_client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == "aarav@mfgtextile.com"
    assert reg_data["organization"]["name"] == "Sharma Textiles Pvt Ltd"
    assert reg_data["organization"]["production_unit"] == "kg"

    # 2. Duplicate registration returns 409
    dup_res = auth_test_client.post("/api/v1/auth/register", json=reg_payload)
    assert dup_res.status_code == 409
    assert dup_res.json()["code"] == "EMAIL_EXISTS"

    # 3. Login with correct password
    login_res = auth_test_client.post(
        "/api/v1/auth/login",
        json={"email": "AARAV@mfgtextile.com", "password": "SecurePassword123!"},
    )
    assert login_res.status_code == 200
    login_token = login_res.json()["access_token"]

    # 4. Login with invalid password returns generic 401
    bad_login_res = auth_test_client.post(
        "/api/v1/auth/login",
        json={"email": "aarav@mfgtextile.com", "password": "WrongPassword!"},
    )
    assert bad_login_res.status_code == 401
    assert bad_login_res.json()["detail"] == "Invalid email or password."

    # 5. Access /auth/me with bearer token
    me_res = auth_test_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {login_token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["user"]["full_name"] == "Aarav Sharma"
    assert me_data["organization"]["industry"] == "textile"

    # 6. Access /auth/me without token returns 401
    no_token_res = auth_test_client.get("/api/v1/auth/me")
    assert no_token_res.status_code == 401

    # 7. Access with invalid token returns 401
    bad_token_res = auth_test_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.jwt.token"},
    )
    assert bad_token_res.status_code == 401
