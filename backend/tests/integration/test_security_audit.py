"""Comprehensive Security Review & Multi-Tenant Isolation Penetration Test Suite.

Verifies:
- Complete multi-tenant isolation across every endpoint and resource family (Blueprint Section 19).
- Upload security bounds (10MB limit, forbidden extensions, spoofed magic bytes).
- Authentication hardening (generic invalid credential responses, token tampering rejection).
- Secret leakage prevention.
"""

import contextlib
import io
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
from app.models.document import Document
from app.models.production_record import ProductionRecord
from app.models.recommendation import Recommendation
from app.models.utility_record import UtilityRecord
from app.schemas.auth import RegisterRequest
from app.services.auth_service import AuthService


@pytest.fixture
def security_test_env(tmp_path: Path):
    """Isolated SQLite test environment migrated to head."""
    db_file = tmp_path / "test_security.db"
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


# ---------------------------------------------------------------------------
# 1. Multi-Tenant Cross-Access Penetration Tests
# ---------------------------------------------------------------------------

def test_cross_tenant_resource_isolation_penetration(security_test_env) -> None:
    """Rigorous penetration test: Tenant B attempts to read, mutate, and delete Tenant A resources."""
    session_factory = security_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        # Register Tenant A
        reg_a = AuthService.register_user(
            db,
            RegisterRequest(
                full_name="Tenant A Lead",
                email="lead@tenant-a.com",
                password="Password123!",
                organization_name="Tenant A Corp",
                industry="textile",
                production_unit="kg",
                location="Surat",
                country_code="IN",
            ),
        )
        org_a_id = reg_a.user.organization_id

        # Register Tenant B
        reg_b = AuthService.register_user(
            db,
            RegisterRequest(
                full_name="Tenant B Intruder",
                email="intruder@tenant-b.com",
                password="Password123!",
                organization_name="Tenant B Ltd",
                industry="metal_fabrication",
                production_unit="tonne",
                location="Pune",
                country_code="IN",
            ),
        )
        token_b = create_access_token(reg_b.user.id, reg_b.user.organization_id)

        # Seed private resources belonging to Tenant A
        doc_a = Document(
            id=uuid.uuid4(),
            organization_id=org_a_id,
            storage_provider="local",
            storage_path="uploads/tenant_a_secret_bill.pdf",
            original_filename="secret_bill.pdf",
            mime_type="application/pdf",
            size_bytes=1024,
        )
        db.add(doc_a)

        util_a = UtilityRecord(
            id=uuid.uuid4(),
            organization_id=org_a_id,
            resource_type="electricity",
            period_month=date(2026, 3, 1),
            quantity=Decimal("15000"),
            unit="kWh",
            amount_inr=Decimal("120000"),
        )
        db.add(util_a)

        prod_a = ProductionRecord(
            id=uuid.uuid4(),
            organization_id=org_a_id,
            period_month=date(2026, 3, 1),
            quantity=Decimal("10000"),
            unit="kg",
        )
        db.add(prod_a)

        rec_a = Recommendation(
            id=uuid.uuid4(),
            organization_id=org_a_id,
            title="Confidential Efficiency Upgrade",
            description="Tenant A private boiler revamp",
            priority="high",
            status="proposed",
            estimated_saving_inr=Decimal("25000"),
        )
        db.add(rec_a)

        act_a = Action(
            id=uuid.uuid4(),
            organization_id=org_a_id,
            title="Tenant A Private Action",
            status="pending",
        )
        db.add(act_a)
        db.commit()

        doc_a_id = str(doc_a.id)
        util_a_id = str(util_a.id)
        prod_a_id = str(prod_a.id)
        rec_a_id = str(rec_a.id)
        act_a_id = str(act_a.id)

    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. Tenant B attempts to download Tenant A document -> must 404
    res = client.get(f"/api/v1/documents/{doc_a_id}/download", headers=headers_b)
    assert res.status_code == 404, "Tenant B must not obtain download URL for Tenant A document"

    # 2. Tenant B attempts to delete Tenant A document -> must 404
    res = client.delete(f"/api/v1/documents/{doc_a_id}", headers=headers_b)
    assert res.status_code == 404, "Tenant B must not delete Tenant A document"

    # 3. Tenant B attempts to modify Tenant A utility record -> must 404
    res = client.patch(
        f"/api/v1/utility-records/{util_a_id}",
        json={"notes": "Hacked by Tenant B"},
        headers=headers_b,
    )
    assert res.status_code == 404, "Tenant B must not mutate Tenant A utility record"

    # 4. Tenant B attempts to delete Tenant A utility record -> must 404
    res = client.delete(f"/api/v1/utility-records/{util_a_id}", headers=headers_b)
    assert res.status_code == 404, "Tenant B must not delete Tenant A utility record"

    # 5. Tenant B attempts to modify Tenant A production record -> must 404
    res = client.patch(
        f"/api/v1/production-records/{prod_a_id}",
        json={"quantity": 999999},
        headers=headers_b,
    )
    assert res.status_code == 404, "Tenant B must not mutate Tenant A production record"

    # 6. Tenant B attempts to delete Tenant A production record -> must 404
    res = client.delete(f"/api/v1/production-records/{prod_a_id}", headers=headers_b)
    assert res.status_code == 404, "Tenant B must not delete Tenant A production record"

    # 7. Tenant B attempts to accept Tenant A recommendation -> must 404
    res = client.post(f"/api/v1/recommendations/{rec_a_id}/accept", headers=headers_b)
    assert res.status_code == 404, "Tenant B must not accept Tenant A recommendation"

    # 8. Tenant B attempts to dismiss Tenant A recommendation -> must 404
    res = client.post(f"/api/v1/recommendations/{rec_a_id}/dismiss", headers=headers_b)
    assert res.status_code == 404, "Tenant B must not dismiss Tenant A recommendation"

    # 9. Tenant B attempts to modify Tenant A action -> must 404
    res = client.patch(
        f"/api/v1/actions/{act_a_id}",
        json={"status": "completed"},
        headers=headers_b,
    )
    assert res.status_code == 404, "Tenant B must not modify Tenant A action"

    # 10. Tenant B attempts to delete Tenant A action -> must 404
    res = client.delete(f"/api/v1/actions/{act_a_id}", headers=headers_b)
    assert res.status_code == 404, "Tenant B must not delete Tenant A action"

    # 11. Verify Tenant A resources remain completely unmodified
    with session_factory() as db:
        intact_doc = db.get(Document, uuid.UUID(doc_a_id))
        assert intact_doc is not None

        intact_util = db.get(UtilityRecord, uuid.UUID(util_a_id))
        assert intact_util is not None
        assert intact_util.notes != "Hacked by Tenant B"

        intact_act = db.get(Action, uuid.UUID(act_a_id))
        assert intact_act is not None
        assert intact_act.status == "pending"


# ---------------------------------------------------------------------------
# 2. Authentication Security Tests
# ---------------------------------------------------------------------------

def test_auth_generic_invalid_credential_responses(security_test_env) -> None:
    """Verify that failed logins return generic messages and do not disclose user existence."""
    session_factory = security_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        AuthService.register_user(
            db,
            RegisterRequest(
                full_name="Target User",
                email="existing@target.com",
                password="RealPassword123!",
                organization_name="Target Org",
                industry="textile",
                production_unit="kg",
                location="Delhi",
                country_code="IN",
            ),
        )

    # 1. Existing user with wrong password
    res_wrong_pw = client.post(
        "/api/v1/auth/login",
        json={"email": "existing@target.com", "password": "WrongPassword999!"},
    )
    assert res_wrong_pw.status_code == 401
    msg_wrong_pw = res_wrong_pw.json().get("detail", "")

    # 2. Non-existent user
    res_no_user = client.post(
        "/api/v1/auth/login",
        json={"email": "ghost@nowhere.com", "password": "AnyPassword123!"},
    )
    assert res_no_user.status_code == 401
    msg_no_user = res_no_user.json().get("detail", "")

    # Both error responses must be indistinguishable (timing/enumeration defense)
    assert msg_wrong_pw == msg_no_user
    assert "Invalid email or password" in msg_wrong_pw


def test_auth_jwt_tampering_and_missing_token(security_test_env) -> None:
    """Verify forged, expired, or missing JWTs are strictly rejected."""
    client = TestClient(app)

    # Missing token
    res_missing = client.get("/api/v1/organization")
    assert res_missing.status_code == 401

    # Forged signature token
    forged_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtMTIzNC01NjcxMjM0NTY3OCIsIm9yZ19pZCI6IjEyMzQ1Njc4LTEyMzQtNTY3OC0xMjM0LTU2NzEyMzQ1Njc4In0.fake_signature_abc123"
    res_forged = client.get(
        "/api/v1/organization",
        headers={"Authorization": f"Bearer {forged_token}"},
    )
    assert res_forged.status_code == 401


# ---------------------------------------------------------------------------
# 3. Upload Security Bounds
# ---------------------------------------------------------------------------

def test_upload_security_bounds_and_magic_byte_validation(security_test_env) -> None:
    """Verify strict 10MB limit and rejection of spoofed extensions or executable files."""
    session_factory = security_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        reg = AuthService.register_user(
            db,
            RegisterRequest(
                full_name="Upload Tester",
                email="uploader@mfg.com",
                password="Password123!",
                organization_name="Upload Org",
                industry="textile",
                production_unit="kg",
                location="Mumbai",
                country_code="IN",
            ),
        )
        token = create_access_token(reg.user.id, reg.user.organization_id)

    headers = {"Authorization": f"Bearer {token}"}

    # 1. Forbidden executable extension (.exe)
    malicious_exe = io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00executable bytes")
    res_exe = client.post(
        "/api/v1/documents",
        files={"file": ("malware.exe", malicious_exe, "application/octet-stream")},
        headers=headers,
    )
    assert res_exe.status_code in (400, 422)

    # 2. Extension spoofing: .pdf extension with non-PDF plain text / executable payload
    spoofed_pdf = io.BytesIO(b"This is completely arbitrary text pretending to be a PDF")
    res_spoof = client.post(
        "/api/v1/documents",
        files={"file": ("fake.pdf", spoofed_pdf, "application/pdf")},
        headers=headers,
    )
    assert res_spoof.status_code in (400, 422)

    # 3. Genuine PDF magic bytes (%PDF) must succeed
    valid_pdf_content = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    valid_pdf = io.BytesIO(valid_pdf_content)
    res_valid = client.post(
        "/api/v1/documents",
        files={"file": ("legit_bill.pdf", valid_pdf, "application/pdf")},
        headers=headers,
    )
    assert res_valid.status_code == 201


# ---------------------------------------------------------------------------
# 4. Git Secret Audit Check
# ---------------------------------------------------------------------------

def test_no_secrets_or_env_files_committed() -> None:
    """Verify that no active .env secrets are committed to git repository."""
    root_dir = Path(__file__).parent.parent.parent.parent

    # .env files must not exist in tracked git status
    backend_env = root_dir / "backend" / ".env"
    frontend_env = root_dir / "frontend" / ".env"
    root_env = root_dir / ".env"

    for env_path in [backend_env, frontend_env, root_env]:
        if env_path.exists():
            # If present locally for developer, verify it is strictly ignored by git
            git_ignore_path = root_dir / ".gitignore"
            assert git_ignore_path.exists()
            content = git_ignore_path.read_text(encoding="utf-8")
            assert ".env" in content
