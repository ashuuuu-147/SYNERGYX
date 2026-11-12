"""Storage provider abstract interface."""

from abc import ABC, abstractmethod


class StorageProvider(ABC):
    """Abstract interface for file storage adapters."""

    @abstractmethod
    def save(self, file_content: bytes, object_key: str, content_type: str) -> str:
        """Save file content and return storage path / key."""
        pass

    @abstractmethod
    def create_download_url(self, storage_path: str, expires_seconds: int = 300) -> str:
        """Generate a short-lived download URL or authorized endpoint path."""
        pass

    @abstractmethod
    def get_file_bytes(self, storage_path: str) -> bytes:
        """Retrieve raw file content bytes."""
        pass

    @abstractmethod
    def delete(self, storage_path: str) -> None:
        """Delete file from storage."""
        pass
