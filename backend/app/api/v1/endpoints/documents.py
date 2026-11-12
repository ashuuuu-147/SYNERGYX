"""Document management API endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.document import DocumentDownloadResponse, DocumentResponse
from app.services.document_service import DocumentService

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_document(
    file: Annotated[UploadFile, File(...)],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentResponse:
    """Upload a private utility bill or evidence file."""
    return DocumentService.upload_document(
        db=db,
        current_user=current_user,
        upload_file=file,
    )


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DocumentResponse]:
    """List documents uploaded by the organization."""
    return DocumentService.list_documents(
        db=db,
        organization_id=current_user.organization_id,
    )


@router.get("/{document_id}/download", response_model=DocumentDownloadResponse)
def get_document_download_url(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentDownloadResponse:
    """Generate a short-lived download URL for an authorized document."""
    return DocumentService.get_document_download(
        db=db,
        current_user=current_user,
        document_id=document_id,
    )


@router.get("/download/{path:path}")
def stream_local_document(
    path: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """Stream authorized document for local development storage."""
    doc, content = DocumentService.get_raw_document_for_stream(
        db=db,
        current_user=current_user,
        storage_path=path,
    )
    return Response(
        content=content,
        media_type=doc.mime_type,
        headers={"Content-Disposition": f'inline; filename="{doc.original_filename}"'},
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete an unlinked document."""
    DocumentService.delete_document(
        db=db,
        current_user=current_user,
        document_id=document_id,
    )
