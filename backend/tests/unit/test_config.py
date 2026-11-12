"""Test configuration loading and production validation."""

import pytest

from app.core.config import Settings


def test_development_config_defaults():
    """Verify default development configuration is loaded."""
    settings = Settings(APP_ENV="development")
    assert settings.APP_NAME == "SYNERGYX API"
    assert settings.STORAGE_BACKEND == "local"
    assert "http://localhost:5173" in settings.cors_origins_list


def test_production_config_rejects_insecure_jwt_secret():
    """Verify production fails fast if JWT_SECRET_KEY is insecure."""
    with pytest.raises(ValueError, match="JWT_SECRET_KEY must be a secure random secret"):
        Settings(
            APP_ENV="production",
            JWT_SECRET_KEY="development-key",
            STORAGE_BACKEND="supabase",
            SUPABASE_URL="https://example.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY="secret-service-key",
            DATABASE_URL="postgresql+psycopg://user:pass@remote:5432/db",
        )


def test_production_config_rejects_local_storage():
    """Verify production fails if storage backend is local."""
    with pytest.raises(ValueError, match="STORAGE_BACKEND cannot be 'local' in production"):
        Settings(
            APP_ENV="production",
            JWT_SECRET_KEY="super-secret-random-key-32-chars-long!",
            STORAGE_BACKEND="local",
            DATABASE_URL="postgresql+psycopg://user:pass@remote:5432/db",
        )
