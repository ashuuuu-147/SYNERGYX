"""API endpoints for bulk CSV records import."""

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.core.errors import BadRequestError
from app.models.user import User
from app.schemas.csv_import import CsvImportResponse
from app.services.csv_import_service import CsvImportService

router = APIRouter(prefix="/records", tags=["records-import"])


@router.post("/import-csv", response_model=CsvImportResponse)
async def import_records_csv(
    file: UploadFile = File(..., description="CSV file with monthly utility and production records"),
    year: int | None = Form(default=None, description="Default year if months are specified without year"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CsvImportResponse:
    """Upload and import monthly utility and production records from a CSV file.

    Extracts Electricity (kWh & bill), Water (L/m3 & bill), Fuel (L & bill),
    and Production output, converts to canonical units, and atomically stores them.
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise BadRequestError("Uploaded file must be a CSV file (.csv).", code="INVALID_FILE_TYPE")

    # Read file contents (limit to 10MB)
    content_bytes = await file.read()
    if len(content_bytes) > 10 * 1024 * 1024:
        raise BadRequestError("CSV file size exceeds 10MB limit.", code="FILE_TOO_LARGE")

    # Decode using UTF-8, UTF-8-SIG (BOM), or Latin-1 fallback
    decoded_text = ""
    for encoding in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
        try:
            decoded_text = content_bytes.decode(encoding)
            break
        except UnicodeDecodeError:
            continue

    if not decoded_text:
        raise BadRequestError("Could not decode CSV file. Please ensure it is text/CSV.", code="INVALID_ENCODING")

    return CsvImportService.import_records_csv(
        db=db,
        current_user=current_user,
        csv_content=decoded_text,
        default_year=year,
    )
