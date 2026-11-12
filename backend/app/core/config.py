"""Application configuration and environment settings."""

from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment validation."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    APP_ENV: Literal["development", "staging", "production", "test"] = "development"
    APP_NAME: str = "SYNERGYX API"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/synergyx"

    JWT_SECRET_KEY: str = Field(
        default="development-only-insecure-secret-key-32-chars-minimum",
        description="Must be at least 32 characters in production",
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_ISSUER: str = "synergyx-api"
    JWT_AUDIENCE: str = "synergyx-client"

    CORS_ORIGINS: str = "http://localhost:5173"

    STORAGE_BACKEND: Literal["local", "supabase"] = "local"
    LOCAL_STORAGE_PATH: str = "./uploads"
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "utility-documents"

    AI_PROVIDER: Literal["rules", "openai"] = "rules"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    AI_REQUEST_TIMEOUT_SECONDS: int = 20

    MAX_UPLOAD_SIZE_MB: int = 10
    LOG_LEVEL: str = "INFO"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @model_validator(mode="after")
    def validate_production_invariants(self) -> "Settings":
        """Strict validation for production mode to prevent insecure defaults."""
        if self.APP_ENV == "production":
            if len(self.JWT_SECRET_KEY) < 32 or "development" in self.JWT_SECRET_KEY:
                raise ValueError("In production, JWT_SECRET_KEY must be a secure random secret of >= 32 characters.")
            if self.STORAGE_BACKEND == "local":
                raise ValueError("STORAGE_BACKEND cannot be 'local' in production. Must use 'supabase'.")
            if self.STORAGE_BACKEND == "supabase" and (not self.SUPABASE_URL or not self.SUPABASE_SERVICE_ROLE_KEY):
                raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for Supabase storage.")
            if "localhost" in self.DATABASE_URL or "127.0.0.1" in self.DATABASE_URL:
                raise ValueError("DATABASE_URL cannot point to localhost in production.")
        return self


settings = Settings()
