"""Supabase private bucket storage provider for production."""

import logging
from urllib.parse import urljoin

import httpx

from app.core.config import settings
from app.core.errors import NotFoundError, StorageError
from app.storage.base import StorageProvider

logger = logging.getLogger("synergyx.storage.supabase")


class SupabaseStorageProvider(StorageProvider):
    """Production storage adapter using Supabase Storage private bucket."""

    def __init__(
        self,
        supabase_url: str | None = None,
        service_role_key: str | None = None,
        bucket: str | None = None,
        timeout_seconds: float = 30.0,
    ) -> None:
        self.supabase_url = (supabase_url or settings.SUPABASE_URL).rstrip("/")
        self.service_role_key = service_role_key or settings.SUPABASE_SERVICE_ROLE_KEY
        self.bucket = bucket or settings.SUPABASE_STORAGE_BUCKET
        self.timeout = timeout_seconds

        if not self.supabase_url or not self.service_role_key:
            logger.warning("SupabaseStorageProvider initialized without valid credentials.")

    def _headers(self, content_type: str | None = None) -> dict[str, str]:
        """Construct server-side authenticated headers. Service key is never logged."""
        headers = {
            "Authorization": f"Bearer {self.service_role_key}",
            "apiKey": self.service_role_key,
        }
        if content_type:
            headers["Content-Type"] = content_type
        return headers

    def save(self, file_content: bytes, object_key: str, content_type: str) -> str:
        """Upload private object to Supabase bucket."""
        if not self.supabase_url or not self.service_role_key:
            raise StorageError("Supabase storage is not configured.", code="STORAGE_UNCONFIGURED")

        endpoint = f"{self.supabase_url}/storage/v1/object/{self.bucket}/{object_key}"
        headers = self._headers(content_type=content_type)
        headers["x-upsert"] = "true"

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(endpoint, headers=headers, content=file_content)

            if response.status_code not in (200, 201):
                logger.error("Supabase upload failed with status %d", response.status_code)
                raise StorageError("Failed to store file in Supabase storage.")

            logger.info("Successfully uploaded object %s to bucket %s", object_key, self.bucket)
            return object_key
        except StorageError:
            raise
        except Exception as exc:
            logger.error("Supabase upload exception: %s", type(exc).__name__)
            raise StorageError("Error connecting to Supabase storage provider.") from exc

    def create_download_url(self, storage_path: str, expires_seconds: int = 300) -> str:
        """Generate short-lived signed download URL (60-300s)."""
        if not self.supabase_url or not self.service_role_key:
            raise StorageError("Supabase storage is not configured.", code="STORAGE_UNCONFIGURED")

        # Clamp expiry between 60 and 300 seconds per blueprint
        safe_expiry = max(60, min(300, expires_seconds))
        endpoint = f"{self.supabase_url}/storage/v1/object/sign/{self.bucket}/{storage_path}"
        headers = self._headers(content_type="application/json")

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(endpoint, headers=headers, json={"expiresIn": safe_expiry})

            if response.status_code == 404:
                raise NotFoundError("Document not found in storage bucket.")
            if response.status_code != 200:
                logger.error("Supabase sign failed with status %d", response.status_code)
                raise StorageError("Failed to generate signed download URL.")

            data = response.json()
            signed_rel = data.get("signedURL")
            if not signed_rel:
                raise StorageError("Invalid response from storage signer.")

            # Construct full signed URL
            if signed_rel.startswith("http"):
                return signed_rel
            base_storage = f"{self.supabase_url}/storage/v1"
            return urljoin(base_storage + "/", signed_rel.lstrip("/"))
        except (StorageError, NotFoundError):
            raise
        except Exception as exc:
            logger.error("Supabase signed URL exception: %s", type(exc).__name__)
            raise StorageError("Error generating signed download URL.") from exc

    def get_file_bytes(self, storage_path: str) -> bytes:
        """Download raw object content bytes via authenticated request."""
        if not self.supabase_url or not self.service_role_key:
            raise StorageError("Supabase storage is not configured.", code="STORAGE_UNCONFIGURED")

        endpoint = f"{self.supabase_url}/storage/v1/object/authenticated/{self.bucket}/{storage_path}"
        headers = self._headers()

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(endpoint, headers=headers)

            if response.status_code == 404:
                raise NotFoundError("Document not found in storage bucket.")
            if response.status_code != 200:
                logger.error("Supabase download failed with status %d", response.status_code)
                raise StorageError("Failed to retrieve file from storage bucket.")

            return response.content
        except (StorageError, NotFoundError):
            raise
        except Exception as exc:
            logger.error("Supabase download exception: %s", type(exc).__name__)
            raise StorageError("Error downloading file from storage.") from exc

    def delete(self, storage_path: str) -> None:
        """Delete private object from bucket."""
        if not self.supabase_url or not self.service_role_key:
            raise StorageError("Supabase storage is not configured.", code="STORAGE_UNCONFIGURED")

        endpoint = f"{self.supabase_url}/storage/v1/object/{self.bucket}/{storage_path}"
        headers = self._headers()

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.delete(endpoint, headers=headers)

            if response.status_code not in (200, 204, 404):
                logger.error("Supabase delete failed with status %d", response.status_code)
                raise StorageError("Failed to delete file from storage bucket.")

            logger.info("Deleted object %s from bucket %s", storage_path, self.bucket)
        except StorageError:
            raise
        except Exception as exc:
            logger.error("Supabase delete exception: %s", type(exc).__name__)
            raise StorageError("Error deleting file from storage.") from exc
