"""Storage package and provider factory."""

from app.core.config import settings
from app.storage.base import StorageProvider
from app.storage.local import LocalStorageProvider
from app.storage.supabase_storage import SupabaseStorageProvider


def get_storage_provider() -> StorageProvider:
    """Return the configured storage provider instance."""
    if settings.STORAGE_BACKEND == "supabase":
        return SupabaseStorageProvider()
    return LocalStorageProvider()


__all__ = [
    "LocalStorageProvider",
    "StorageProvider",
    "SupabaseStorageProvider",
    "get_storage_provider",
]
