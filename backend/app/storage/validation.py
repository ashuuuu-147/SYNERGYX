"""File upload validation and security checks."""

import os
import re
import uuid
from pathlib import Path

from app.core.config import settings
from app.core.errors import BadRequestError

ALLOWED_EXTENSIONS: set[str] = {".pdf", ".png", ".jpg", ".jpeg"}

ALLOWED_MIME_TYPES: dict[str, set[str]] = {
    "application/pdf": {".pdf"},
    "image/png": {".png"},
    "image/jpeg": {".jpg", ".jpeg"},
}

# Magic byte signatures
MAGIC_SIGNATURES: dict[str, list[bytes]] = {
    "application/pdf": [b"%PDF"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/jpeg": [b"\xff\xd8\xff"],
}


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal and special character attacks."""
    basename = Path(filename).name
    if not basename:
        return "unnamed_document"
    # Replace any character outside alphanumeric, dot, underscore, and dash with underscore
    sanitized = re.sub(r"[^\w\.-]", "_", basename)
    return sanitized.strip("._") or "unnamed_document"


def validate_file(
    filename: str,
    content_type: str,
    file_bytes: bytes,
    max_size_mb: int = settings.MAX_UPLOAD_SIZE_MB,
) -> tuple[str, str]:
    """Validate file size, extension, MIME type, and magic bytes.

    Returns tuple of (sanitized_filename, validated_mime_type).
    Raises BadRequestError on validation failure.
    """
    max_bytes = max_size_mb * 1024 * 1024
    file_size = len(file_bytes)

    if file_size == 0:
        raise BadRequestError("Uploaded file cannot be empty.", code="FILE_EMPTY")

    if file_size > max_bytes:
        raise BadRequestError(
            f"File size ({file_size / (1024 * 1024):.1f} MB) exceeds maximum allowed size ({max_size_mb} MB).",
            code="FILE_TOO_LARGE",
        )

    clean_filename = sanitize_filename(filename)
    extension = os.path.splitext(clean_filename)[1].lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise BadRequestError(
            f"File extension '{extension}' is not allowed. Supported formats: .pdf, .png, .jpg, .jpeg.",
            code="INVALID_FILE_EXTENSION",
        )

    clean_mime = (content_type or "").split(";")[0].strip().lower()
    if clean_mime not in ALLOWED_MIME_TYPES:
        raise BadRequestError(
            f"MIME type '{clean_mime}' is not permitted. Supported MIME types: application/pdf, image/png, image/jpeg.",
            code="INVALID_MIME_TYPE",
        )

    # Check extension matches MIME type
    if extension not in ALLOWED_MIME_TYPES[clean_mime]:
        raise BadRequestError(
            f"File extension '{extension}' does not match declared MIME type '{clean_mime}'.",
            code="MIME_EXTENSION_MISMATCH",
        )

    # Validate magic bytes / file signature
    expected_signatures = MAGIC_SIGNATURES.get(clean_mime, [])
    matches_magic = any(file_bytes.startswith(sig) for sig in expected_signatures)
    if not matches_magic:
        raise BadRequestError(
            f"File content does not match the signature for '{clean_mime}'. File may be corrupt or spoofed.",
            code="INVALID_FILE_SIGNATURE",
        )

    return clean_filename, clean_mime


def generate_object_key(organization_id: uuid.UUID, safe_filename: str) -> str:
    """Generate a tenant-partitioned collision-free storage object key."""
    unique_prefix = uuid.uuid4().hex
    return f"{organization_id}/{unique_prefix}_{safe_filename}"
