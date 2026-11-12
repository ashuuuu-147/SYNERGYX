"""Pydantic schemas for Document management."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DocumentResponse(BaseModel):
    """Document metadata response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    storage_provider: str
    storage_path: str
    original_filename: str
    mime_type: str
    size_bytes: int
    uploaded_by: uuid.UUID | None = None
    created_at: datetime
    is_linked: bool = Field(default=False, description="Whether document is linked to a utility record")


class DocumentDownloadResponse(BaseModel):
    """Signed or direct download URL response."""

    download_url: str
    expires_in_seconds: int = 300
    original_filename: str
