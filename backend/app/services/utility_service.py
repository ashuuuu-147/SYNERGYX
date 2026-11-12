"""Utility Record service layer with canonical conversion and multi-tenant isolation."""

import logging
import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import BadRequestError, ConflictError, NotFoundError
from app.models.document import Document
from app.models.user import User
from app.models.utility_record import UtilityRecord
from app.schemas.utility_record import UtilityRecordCreate, UtilityRecordUpdate

logger = logging.getLogger("synergyx.services.utility")


def normalize_to_first_of_month(d: date) -> date:
    """Normalize date to the first calendar day of the month."""
    return date(d.year, d.month, 1)


def convert_to_canonical_unit(resource_type: str, quantity: Decimal, input_unit: str) -> tuple[Decimal, str]:
    """Convert input unit and quantity to canonical unit and quantity.

    Electricity: kWh -> kWh
    Water: L -> m3 (quantity / 1000), m3/m³ -> m3
    Fuel: L -> L
    """
    clean_unit = input_unit.strip().lower()

    if resource_type == "electricity":
        if clean_unit not in ("kwh",):
            raise BadRequestError(
                f"Invalid unit '{input_unit}' for electricity. Allowed unit: kWh.",
                code="INVALID_UNIT",
            )
        return quantity, "kWh"

    if resource_type == "water":
        if clean_unit in ("l", "litre", "litres", "liter", "liters"):
            canonical_qty = quantity / Decimal(1000)
            return canonical_qty, "m3"
        if clean_unit in ("m3", "m³", "cubic_metre", "cubic_meter"):
            return quantity, "m3"
        raise BadRequestError(
            f"Invalid unit '{input_unit}' for water. Allowed units: L, litres, m3, m³.",
            code="INVALID_UNIT",
        )

    if resource_type == "fuel":
        if clean_unit in ("l", "litre", "litres", "liter", "liters"):
            return quantity, "L"
        raise BadRequestError(
            f"Invalid unit '{input_unit}' for fuel. Allowed units: L, litres.",
            code="INVALID_UNIT",
        )

    raise BadRequestError(f"Unsupported resource type '{resource_type}'.", code="INVALID_RESOURCE_TYPE")


class UtilityService:
    """Manages utility records operations strictly scoped to the tenant organization."""

    @staticmethod
    def _validate_document_ownership(
        db: Session,
        organization_id: uuid.UUID,
        document_id: uuid.UUID | None,
        exclude_record_id: uuid.UUID | None = None,
    ) -> None:
        """Ensure document exists in the organization and is not already linked elsewhere."""
        if not document_id:
            return

        doc = db.scalar(
            select(Document).where(
                Document.id == document_id,
                Document.organization_id == organization_id,
            )
        )
        if not doc:
            raise BadRequestError(
                "Attached document does not exist or does not belong to your organization.",
                code="INVALID_DOCUMENT",
            )

        # Check if already linked to another record
        stmt = select(UtilityRecord).where(UtilityRecord.document_id == document_id)
        if exclude_record_id:
            stmt = stmt.where(UtilityRecord.id != exclude_record_id)
        existing_link = db.scalar(stmt)
        if existing_link:
            raise ConflictError(
                "This document is already linked to another utility record.",
                code="DOCUMENT_ALREADY_LINKED",
            )

    @staticmethod
    def create_record(db: Session, current_user: User, data: UtilityRecordCreate) -> UtilityRecord:
        """Create a monthly utility record with canonical unit conversion."""
        period_month = normalize_to_first_of_month(data.period_month)
        canonical_qty, canonical_unit = convert_to_canonical_unit(
            resource_type=data.resource_type,
            quantity=data.quantity,
            input_unit=data.input_unit,
        )

        # Check for duplicate entry for this month & resource
        existing = db.scalar(
            select(UtilityRecord).where(
                UtilityRecord.organization_id == current_user.organization_id,
                UtilityRecord.resource_type == data.resource_type,
                UtilityRecord.period_month == period_month,
            )
        )
        if existing:
            raise ConflictError(
                f"A {data.resource_type} record for {period_month.strftime('%B %Y')} already exists. Please edit the existing record.",
                code="DUPLICATE_UTILITY_RECORD",
            )

        # Validate document if attached
        if data.document_id:
            UtilityService._validate_document_ownership(
                db=db,
                organization_id=current_user.organization_id,
                document_id=data.document_id,
            )

        record = UtilityRecord(
            organization_id=current_user.organization_id,
            resource_type=data.resource_type,
            period_month=period_month,
            quantity=canonical_qty,
            unit=canonical_unit,
            amount_inr=data.amount_inr,
            document_id=data.document_id,
            notes=data.notes,
            created_by=current_user.id,
        )
        try:
            db.add(record)
            db.commit()
            db.refresh(record)
            logger.info("Created utility record %s (%s, %s)", record.id, record.resource_type, period_month)
            return record
        except IntegrityError as err:
            db.rollback()
            raise ConflictError(
                f"A {data.resource_type} record for {period_month.strftime('%B %Y')} already exists.",
                code="DUPLICATE_UTILITY_RECORD",
            ) from err

    @staticmethod
    def list_records(
        db: Session,
        organization_id: uuid.UUID,
        resource_type: str | None = None,
        month: date | None = None,
    ) -> list[UtilityRecord]:
        """List utility records for the organization with optional resource and month filters."""
        stmt = select(UtilityRecord).where(UtilityRecord.organization_id == organization_id)
        if resource_type:
            stmt = stmt.where(UtilityRecord.resource_type == resource_type)
        if month:
            stmt = stmt.where(UtilityRecord.period_month == normalize_to_first_of_month(month))
        stmt = stmt.order_by(UtilityRecord.period_month.desc(), UtilityRecord.resource_type.asc())
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_record(db: Session, organization_id: uuid.UUID, record_id: uuid.UUID) -> UtilityRecord:
        """Fetch a single utility record scoped to the organization."""
        record = db.scalar(
            select(UtilityRecord).where(
                UtilityRecord.id == record_id,
                UtilityRecord.organization_id == organization_id,
            )
        )
        if not record:
            raise NotFoundError("Utility record not found.", code="RECORD_NOT_FOUND")
        return record

    @staticmethod
    def update_record(
        db: Session,
        current_user: User,
        record_id: uuid.UUID,
        data: UtilityRecordUpdate,
    ) -> UtilityRecord:
        """Update an existing utility record."""
        record = UtilityService.get_record(db, current_user.organization_id, record_id)

        # Quantity / Unit update
        if data.quantity is not None or data.input_unit is not None:
            new_qty = data.quantity if data.quantity is not None else record.quantity
            new_unit = data.input_unit if data.input_unit is not None else record.unit
            canonical_qty, canonical_unit = convert_to_canonical_unit(
                resource_type=record.resource_type,
                quantity=new_qty,
                input_unit=new_unit,
            )
            record.quantity = canonical_qty
            record.unit = canonical_unit

        if data.amount_inr is not None:
            record.amount_inr = data.amount_inr

        if data.notes is not None:
            record.notes = data.notes

        # Document update
        if "document_id" in data.model_fields_set and data.document_id != record.document_id:
            UtilityService._validate_document_ownership(
                db=db,
                organization_id=current_user.organization_id,
                document_id=data.document_id,
                exclude_record_id=record.id,
            )
            record.document_id = data.document_id

        db.commit()
        db.refresh(record)
        logger.info("Updated utility record %s", record.id)
        return record

    @staticmethod
    def delete_record(db: Session, organization_id: uuid.UUID, record_id: uuid.UUID) -> None:
        """Delete utility record without deleting the attached document."""
        record = UtilityService.get_record(db, organization_id, record_id)
        db.delete(record)
        db.commit()
        logger.info("Deleted utility record %s for org %s", record_id, organization_id)
