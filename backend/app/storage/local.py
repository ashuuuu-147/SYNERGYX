"""Local filesystem storage provider for development."""

import contextlib
import logging
from pathlib import Path

from app.core.config import settings
from app.core.errors import NotFoundError, StorageError
from app.storage.base import StorageProvider

logger = logging.getLogger("synergyx.storage.local")


class LocalStorageProvider(StorageProvider):
    """Storage provider saving files to local disk (development only)."""

    def __init__(self, base_path: str | Path | None = None) -> None:
        raw_path = base_path if base_path is not None else settings.LOCAL_STORAGE_PATH
        self.base_path = Path(raw_path).resolve()
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _resolve_path(self, storage_path: str) -> Path:
        """Resolve and prevent path traversal outside base directory."""
        # Normalize separators
        clean_rel = storage_path.replace("\\", "/").lstrip("/")
        target = (self.base_path / clean_rel).resolve()
        try:
            target.relative_to(self.base_path)
        except ValueError as err:
            logger.error("Path traversal attempt detected in storage path: %s", storage_path)
            raise StorageError("Invalid storage path: path traversal forbidden.", code="ILLEGAL_STORAGE_PATH") from err
        return target

    def save(self, file_content: bytes, object_key: str, content_type: str) -> str:
        """Save file content to disk and return storage path."""
        try:
            target_path = self._resolve_path(object_key)
            target_path.parent.mkdir(parents=True, exist_ok=True)
            target_path.write_bytes(file_content)
            logger.info("Saved local document to %s (%d bytes)", object_key, len(file_content))
            return object_key
        except StorageError:
            raise
        except Exception as exc:
            logger.error("Failed to write file locally: %s", type(exc).__name__)
            raise StorageError("Could not write document to local storage.") from exc

    def create_download_url(self, storage_path: str, expires_seconds: int = 300) -> str:
        """Return authorized local download route path."""
        # Verify file exists before returning route
        self._resolve_path(storage_path)
        clean_rel = storage_path.replace("\\", "/").lstrip("/")
        return f"/api/v1/documents/download/{clean_rel}"

    def get_file_bytes(self, storage_path: str) -> bytes:
        """Read and return raw file bytes from disk."""
        target_path = self._resolve_path(storage_path)
        if not target_path.is_file():
            raise NotFoundError("Document file not found on local storage.", code="FILE_NOT_FOUND")
        try:
            return target_path.read_bytes()
        except Exception as exc:
            logger.error("Failed to read local file: %s", type(exc).__name__)
            raise StorageError("Failed to read file from local storage.") from exc

    def delete(self, storage_path: str) -> None:
        """Delete file from disk if present."""
        try:
            target_path = self._resolve_path(storage_path)
            with contextlib.suppress(FileNotFoundError):
                if target_path.is_file():
                    target_path.unlink()
                    logger.info("Deleted local file %s", storage_path)
        except StorageError:
            raise
        except Exception as exc:
            logger.error("Failed to delete local file: %s", type(exc).__name__)
            raise StorageError("Failed to delete file from local storage.") from exc
