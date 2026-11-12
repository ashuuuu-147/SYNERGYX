"""Service layer for document storage, retrieval, and lifecycle management."""

import logging
import uuid

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import BadRequestError, NotFoundError
from app.models.document import Document
from app.models.user import User
from app.models.utility_record import UtilityRecord
from app.schemas.document import DocumentDownloadResponse, DocumentResponse
from app.storage import get_storage_provider
from app.storage.validation import generate_object_key, validate_file

logger = logging.getLogger("synergyx.services.documents")


class DocumentService:
    """Encapsulates document operations strictly scoped to the tenant organization."""

    @staticmethod
    def upload_document(
        db: Session,
        current_user: User,
        upload_file: UploadFile,
    ) -> DocumentResponse:
        """Validate, store, and record document metadata atomically."""
        filename = upload_file.filename or "uploaded_file"
        content_type = upload_file.content_type or "application/octet-stream"

        file_bytes = upload_file.file.read()
        sanitized_filename, validated_mime = validate_file(
            filename=filename,
            content_type=content_type,
            file_bytes=file_bytes,
        )

        storage_provider = get_storage_provider()
        object_key = generate_object_key(current_user.organization_id, sanitized_filename)

        # 1. Save to physical/cloud storage
        storage_path = storage_provider.save(
            file_content=file_bytes,
            object_key=object_key,
            content_type=validated_mime,
        )

        # 2. Insert into database with rollback cleanup
        try:
            document = Document(
                organization_id=current_user.organization_id,
                uploaded_by=current_user.id,
                storage_provider=settings.STORAGE_BACKEND,
                storage_path=storage_path,
                original_filename=sanitized_filename,
                mime_type=validated_mime,
                size_bytes=len(file_bytes),
            )
            db.add(document)
            db.commit()
            db.refresh(document)
            logger.info("Document %s created for org %s", document.id, current_user.organization_id)
            return DocumentResponse(
                id=document.id,
                organization_id=document.organization_id,
                storage_provider=document.storage_provider,
                storage_path=document.storage_path,
                original_filename=document.original_filename,
                mime_type=document.mime_type,
                size_bytes=document.size_bytes,
                uploaded_by=document.uploaded_by,
                created_at=document.created_at,
                is_linked=False,
            )
        except Exception as exc:
            db.rollback()
            logger.error("DB insertion failed after storage save; cleaning up storage object: %s", storage_path)
            try:
                storage_provider.delete(storage_path)
            except Exception as cleanup_err:
                logger.error("Failed to cleanup orphan storage file %s: %s", storage_path, type(cleanup_err).__name__)
            raise exc

    @staticmethod
    def list_documents(db: Session, organization_id: uuid.UUID) -> list[DocumentResponse]:
        """List all documents belonging to the organization with linkage status."""
        stmt = (
            select(Document, UtilityRecord.id.isnot(None).label("has_link"))
            .outerjoin(UtilityRecord, UtilityRecord.document_id == Document.id)
            .where(Document.organization_id == organization_id)
            .order_by(Document.created_at.desc())
        )
        results = db.execute(stmt).all()
        responses: list[DocumentResponse] = []
        for doc, has_link in results:
            responses.append(
                DocumentResponse(
                    id=doc.id,
                    organization_id=doc.organization_id,
                    storage_provider=doc.storage_provider,
                    storage_path=doc.storage_path,
                    original_filename=doc.original_filename,
                    mime_type=doc.mime_type,
                    size_bytes=doc.size_bytes,
                    uploaded_by=doc.uploaded_by,
                    created_at=doc.created_at,
                    is_linked=bool(has_link),
                )
            )
        return responses

    @staticmethod
    def get_document_download(
        db: Session,
        current_user: User,
        document_id: uuid.UUID,
        expires_seconds: int = 300,
    ) -> DocumentDownloadResponse:
        """Generate authorized short-lived download URL."""
        stmt = select(Document).where(
            Document.id == document_id,
            Document.organization_id == current_user.organization_id,
        )
        doc = db.execute(stmt).scalar_one_or_none()
        if not doc:
            raise NotFoundError("Document not found.", code="DOCUMENT_NOT_FOUND")

        storage_provider = get_storage_provider()
        download_url = storage_provider.create_download_url(
            storage_path=doc.storage_path,
            expires_seconds=expires_seconds,
        )
        return DocumentDownloadResponse(
            download_url=download_url,
            expires_in_seconds=expires_seconds,
            original_filename=doc.original_filename,
        )

    @staticmethod
    def get_raw_document_for_stream(
        db: Session,
        current_user: User,
        storage_path: str,
    ) -> tuple[Document, bytes]:
        """Fetch file bytes and document record for local streaming after tenant verification."""
        stmt = select(Document).where(
            Document.storage_path == storage_path,
            Document.organization_id == current_user.organization_id,
        )
        doc = db.execute(stmt).scalar_one_or_none()
        if not doc:
            raise NotFoundError("Document not found or access denied.", code="DOCUMENT_NOT_FOUND")

        storage_provider = get_storage_provider()
        content = storage_provider.get_file_bytes(doc.storage_path)
        return doc, content

    @staticmethod
    def delete_document(
        db: Session,
        current_user: User,
        document_id: uuid.UUID,
    ) -> None:
        """Delete document if not linked to any utility record."""
        stmt = select(Document).where(
            Document.id == document_id,
            Document.organization_id == current_user.organization_id,
        )
        doc = db.execute(stmt).scalar_one_or_none()
        if not doc:
            raise NotFoundError("Document not found.", code="DOCUMENT_NOT_FOUND")

        # Check for linked utility records
        link_stmt = select(UtilityRecord).where(UtilityRecord.document_id == document_id)
        linked_record = db.execute(link_stmt).first()
        if linked_record:
            raise BadRequestError(
                "Cannot delete document linked to a utility record. Please unlink or delete the utility record first.",
                code="DOCUMENT_LINKED",
            )

        storage_provider = get_storage_provider()
        try:
            storage_provider.delete(doc.storage_path)
        except Exception as exc:
            logger.warning("Storage file deletion reported issue: %s", type(exc).__name__)

        db.delete(doc)
        db.commit()
        logger.info("Deleted document %s for org %s", document_id, current_user.organization_id)
