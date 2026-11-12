"""Integration tests for document upload, listing, download, and deletion."""

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
from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.models.utility_record import UtilityRecord
from app.schemas.auth import RegisterRequest
from app.services.auth_service import AuthService


@pytest.fixture
def document_test_env(tmp_path: Path):
    db_file = tmp_path / "test_documents.db"
    db_url = f"sqlite:///{db_file}"
    uploads_dir = tmp_path / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    # Override settings for test isolation
    orig_storage_path = settings.LOCAL_STORAGE_PATH
    settings.LOCAL_STORAGE_PATH = str(uploads_dir)

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
        "uploads_dir": uploads_dir,
    }

    app.dependency_overrides.clear()
    engine.dispose()
    settings.LOCAL_STORAGE_PATH = orig_storage_path
    with contextlib.suppress(OSError):
        if db_file.exists():
            os.remove(db_file)


def test_document_lifecycle_and_tenant_isolation(document_test_env) -> None:
    session_factory = document_test_env["session_factory"]
    client = TestClient(app)

    with session_factory() as db:
        # Create Org A and User A
        reg_a = AuthService.register_user(
            db=db,
            request=RegisterRequest(
                organization_name="Org Alpha",
                industry="textile",
                production_unit="kg",
                full_name="User Alpha",
                email="alpha@test.com",
                password="SecurePassword123!",
                location="Surat",
                country_code="IN",
            ),
        )
        token_a = reg_a.access_token

        # Create Org B and User B
        reg_b = AuthService.register_user(
            db=db,
            request=RegisterRequest(
                organization_name="Org Beta",
                industry="packaging",
                production_unit="tonne",
                full_name="User Beta",
                email="beta@test.com",
                password="SecurePassword123!",
                location="Vapi",
                country_code="IN",
            ),
        )
        token_b = reg_b.access_token

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. User A uploads valid PDF
    pdf_content = b"%PDF-1.4 test invoice content"
    files = {"file": ("electricity_bill.pdf", io.BytesIO(pdf_content), "application/pdf")}
    upload_resp = client.post("/api/v1/documents", headers=headers_a, files=files)
    assert upload_resp.status_code == 201
    doc_data = upload_resp.json()
    doc_id = doc_data["id"]
    assert doc_data["original_filename"] == "electricity_bill.pdf"
    assert doc_data["mime_type"] == "application/pdf"
    assert doc_data["size_bytes"] == len(pdf_content)
    assert doc_data["is_linked"] is False

    # 2. Upload invalid spoofed file is rejected
    fake_files = {"file": ("malicious.pdf", io.BytesIO(b"not a real pdf"), "application/pdf")}
    bad_upload_resp = client.post("/api/v1/documents", headers=headers_a, files=fake_files)
    assert bad_upload_resp.status_code == 400
    assert bad_upload_resp.json()["code"] == "INVALID_FILE_SIGNATURE"

    # 3. User A lists documents -> sees the uploaded doc
    list_resp_a = client.get("/api/v1/documents", headers=headers_a)
    assert list_resp_a.status_code == 200
    docs_a = list_resp_a.json()
    assert len(docs_a) == 1
    assert docs_a[0]["id"] == doc_id

    # 4. User B lists documents -> empty list (isolation)
    list_resp_b = client.get("/api/v1/documents", headers=headers_b)
    assert list_resp_b.status_code == 200
    assert len(list_resp_b.json()) == 0

    # 5. User B tries to download User A's document -> 404
    dl_resp_b = client.get(f"/api/v1/documents/{doc_id}/download", headers=headers_b)
    assert dl_resp_b.status_code == 404

    # 6. User A gets download URL
    dl_resp_a = client.get(f"/api/v1/documents/{doc_id}/download", headers=headers_a)
    assert dl_resp_a.status_code == 200
    dl_url = dl_resp_a.json()["download_url"]
    assert "download" in dl_url

    # 7. User A accesses local download stream
    stream_resp = client.get(dl_url, headers=headers_a)
    assert stream_resp.status_code == 200
    assert stream_resp.content == pdf_content
    assert stream_resp.headers["content-type"] == "application/pdf"

    # 8. User B cannot stream User A's file -> 404
    stream_b_resp = client.get(dl_url, headers=headers_b)
    assert stream_b_resp.status_code == 404

    # 9. Link document to a utility record and test deletion safeguard
    with session_factory() as db:
        util = UtilityRecord(
            organization_id=reg_a.organization.id,
            resource_type="electricity",
            period_month=date(2026, 5, 1),
            quantity=Decimal("1500.000"),
            unit="kWh",
            document_id=uuid.UUID(doc_id),
        )
        db.add(util)
        db.commit()

    # User A tries to delete linked document -> 400 DOCUMENT_LINKED
    del_resp_linked = client.delete(f"/api/v1/documents/{doc_id}", headers=headers_a)
    assert del_resp_linked.status_code == 400
    assert del_resp_linked.json()["code"] == "DOCUMENT_LINKED"

    # Document list now shows is_linked = True
    list_resp_a_linked = client.get("/api/v1/documents", headers=headers_a)
    assert list_resp_a_linked.json()[0]["is_linked"] is True

    # Unlink document
    with session_factory() as db:
        util_record = db.query(UtilityRecord).filter_by(document_id=uuid.UUID(doc_id)).first()
        util_record.document_id = None
        db.commit()

    # Delete unlinked document -> 204
    del_resp_unlinked = client.delete(f"/api/v1/documents/{doc_id}", headers=headers_a)
    assert del_resp_unlinked.status_code == 204

    # Document is now gone
    list_resp_a_after = client.get("/api/v1/documents", headers=headers_a)
    assert len(list_resp_a_after.json()) == 0
