"""Unit tests for private document storage foundation."""

import uuid
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.core.errors import BadRequestError, NotFoundError, StorageError
from app.storage.local import LocalStorageProvider
from app.storage.supabase_storage import SupabaseStorageProvider
from app.storage.validation import (
    generate_object_key,
    sanitize_filename,
    validate_file,
)


class TestFileValidation:
    """Tests for file type, MIME, extension, size, and magic byte validation."""

    def test_valid_pdf_file(self) -> None:
        pdf_bytes = b"%PDF-1.4 simulated pdf document content"
        filename, mime = validate_file("june_electricity_bill.pdf", "application/pdf", pdf_bytes)
        assert filename == "june_electricity_bill.pdf"
        assert mime == "application/pdf"

    def test_valid_png_file(self) -> None:
        png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
        filename, mime = validate_file("meter_photo.png", "image/png", png_bytes)
        assert filename == "meter_photo.png"
        assert mime == "image/png"

    def test_valid_jpeg_file(self) -> None:
        jpeg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF"
        filename, mime = validate_file("invoice.jpg", "image/jpeg", jpeg_bytes)
        assert filename == "invoice.jpg"
        assert mime == "image/jpeg"

    def test_disallowed_extension(self) -> None:
        with pytest.raises(BadRequestError) as exc_info:
            validate_file("malicious.exe", "application/pdf", b"%PDF-1.4 content")
        assert exc_info.value.code == "INVALID_FILE_EXTENSION"

    def test_disallowed_mime_type(self) -> None:
        with pytest.raises(BadRequestError) as exc_info:
            validate_file("script.pdf", "application/x-sh", b"%PDF-1.4 content")
        assert exc_info.value.code == "INVALID_MIME_TYPE"

    def test_mime_extension_mismatch(self) -> None:
        with pytest.raises(BadRequestError) as exc_info:
            validate_file("bill.pdf", "image/png", b"\x89PNG\r\n\x1a\n")
        assert exc_info.value.code == "MIME_EXTENSION_MISMATCH"

    def test_spoofed_magic_bytes_rejected(self) -> None:
        fake_pdf = b"Plain text payload pretending to be a pdf"
        with pytest.raises(BadRequestError) as exc_info:
            validate_file("fake.pdf", "application/pdf", fake_pdf)
        assert exc_info.value.code == "INVALID_FILE_SIGNATURE"

    def test_empty_file_rejected(self) -> None:
        with pytest.raises(BadRequestError) as exc_info:
            validate_file("empty.pdf", "application/pdf", b"")
        assert exc_info.value.code == "FILE_EMPTY"

    def test_file_exceeding_10mb_rejected(self) -> None:
        large_bytes = b"%PDF" + b"0" * (10 * 1024 * 1024 + 1)
        with pytest.raises(BadRequestError) as exc_info:
            validate_file("huge.pdf", "application/pdf", large_bytes, max_size_mb=10)
        assert exc_info.value.code == "FILE_TOO_LARGE"

    def test_filename_sanitization_strips_traversal(self) -> None:
        assert sanitize_filename("../../etc/passwd") == "passwd"
        assert sanitize_filename("..\\..\\secret.pdf") == "secret.pdf"
        assert sanitize_filename("cool bill (1) [2].pdf") == "cool_bill__1___2_.pdf"

    def test_object_key_generation_includes_org_id(self) -> None:
        org_id = uuid.uuid4()
        key = generate_object_key(org_id, "bill.pdf")
        assert key.startswith(f"{org_id}/")
        assert key.endswith("_bill.pdf")


class TestLocalStorageProvider:
    """Tests for local development file storage adapter."""

    def test_save_get_and_delete_file(self, tmp_path: Path) -> None:
        provider = LocalStorageProvider(base_path=tmp_path)
        content = b"%PDF-1.4 test document"
        key = "org-1/bill_123.pdf"

        saved_path = provider.save(content, key, "application/pdf")
        assert saved_path == key
        assert (tmp_path / key).is_file()

        # Retrieve bytes
        retrieved = provider.get_file_bytes(saved_path)
        assert retrieved == content

        # Check download URL
        url = provider.create_download_url(saved_path)
        assert url == f"/api/v1/documents/download/{key}"

        # Delete file
        provider.delete(saved_path)
        assert not (tmp_path / key).exists()

    def test_get_nonexistent_file_raises_not_found(self, tmp_path: Path) -> None:
        provider = LocalStorageProvider(base_path=tmp_path)
        with pytest.raises(NotFoundError):
            provider.get_file_bytes("nonexistent/file.pdf")

    def test_path_traversal_forbidden(self, tmp_path: Path) -> None:
        provider = LocalStorageProvider(base_path=tmp_path)
        with pytest.raises(StorageError) as exc_info:
            provider._resolve_path("../../system_secret.txt")
        assert exc_info.value.code == "ILLEGAL_STORAGE_PATH"


class TestSupabaseStorageProvider:
    """Tests for production Supabase Storage provider with mocked HTTP."""

    def test_unconfigured_provider_raises_storage_error(self) -> None:
        provider = SupabaseStorageProvider(supabase_url="", service_role_key="")
        with pytest.raises(StorageError) as exc_info:
            provider.save(b"%PDF", "org/doc.pdf", "application/pdf")
        assert exc_info.value.code == "STORAGE_UNCONFIGURED"

    @patch("httpx.Client")
    def test_supabase_upload_success(self, mock_client_cls: MagicMock) -> None:
        mock_client = MagicMock()
        mock_response = MagicMock(status_code=200)
        mock_client.post.return_value = mock_response
        mock_client_cls.return_value.__enter__.return_value = mock_client

        provider = SupabaseStorageProvider(
            supabase_url="https://xyz.supabase.co",
            service_role_key="test-secret-key",
            bucket="utility-documents",
        )

        res = provider.save(b"%PDF-1.4 test", "org-id/doc.pdf", "application/pdf")
        assert res == "org-id/doc.pdf"
        mock_client.post.assert_called_once()
        call_args = mock_client.post.call_args
        assert call_args[0][0] == "https://xyz.supabase.co/storage/v1/object/utility-documents/org-id/doc.pdf"
        assert call_args[1]["headers"]["Authorization"] == "Bearer test-secret-key"

    @patch("httpx.Client")
    def test_supabase_signed_url_success(self, mock_client_cls: MagicMock) -> None:
        mock_client = MagicMock()
        mock_response = MagicMock(
            status_code=200,
            json=lambda: {"signedURL": "/object/sign/utility-documents/org/doc.pdf?token=abc"},
        )
        mock_client.post.return_value = mock_response
        mock_client_cls.return_value.__enter__.return_value = mock_client

        provider = SupabaseStorageProvider(
            supabase_url="https://xyz.supabase.co",
            service_role_key="test-secret-key",
            bucket="utility-documents",
        )

        signed_url = provider.create_download_url("org/doc.pdf", expires_seconds=120)
        assert "xyz.supabase.co/storage/v1/object/sign/utility-documents/org/doc.pdf" in signed_url
        assert "token=abc" in signed_url

    @patch("httpx.Client")
    def test_supabase_delete_success(self, mock_client_cls: MagicMock) -> None:
        mock_client = MagicMock()
        mock_response = MagicMock(status_code=200)
        mock_client.delete.return_value = mock_response
        mock_client_cls.return_value.__enter__.return_value = mock_client

        provider = SupabaseStorageProvider(
            supabase_url="https://xyz.supabase.co",
            service_role_key="test-secret-key",
            bucket="utility-documents",
        )

        provider.delete("org/doc.pdf")
        mock_client.delete.assert_called_once_with(
            "https://xyz.supabase.co/storage/v1/object/utility-documents/org/doc.pdf",
            headers={
                "Authorization": "Bearer test-secret-key",
                "apiKey": "test-secret-key",
            },
        )
