"""Service layer for production records with unit inheritance and month uniqueness."""

import logging
import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import BadRequestError, ConflictError, NotFoundError
from app.models.organization import Organization
from app.models.production_record import ProductionRecord
from app.models.user import User
from app.schemas.production_record import (
    ProductionRecordCreate,
    ProductionRecordUpdate,
)
from app.services.utility_service import normalize_to_first_of_month

logger = logging.getLogger("synergyx.services.production")


class ProductionService:
    """Manages monthly production records strictly scoped to tenant organization."""

    @staticmethod
    def create_record(
        db: Session,
        current_user: User,
        data: ProductionRecordCreate,
    ) -> ProductionRecord:
        """Create a monthly production record ensuring inherited unit and uniqueness."""
        period_month = normalize_to_first_of_month(data.period_month)

        org = db.scalar(select(Organization).where(Organization.id == current_user.organization_id))
        if not org:
            raise NotFoundError("Organization not found.", code="ORGANIZATION_NOT_FOUND")

        # Validate or inherit production unit
        if data.unit and data.unit.strip().lower() != org.production_unit.strip().lower():
            raise BadRequestError(
                f"Production unit '{data.unit}' does not match organization production unit '{org.production_unit}'.",
                code="PRODUCTION_UNIT_MISMATCH",
            )
        unit = org.production_unit

        # Check for duplicate month
        existing = db.scalar(
            select(ProductionRecord).where(
                ProductionRecord.organization_id == current_user.organization_id,
                ProductionRecord.period_month == period_month,
            )
        )
        if existing:
            raise ConflictError(
                f"A production record for {period_month.strftime('%B %Y')} already exists. Please edit the existing record.",
                code="DUPLICATE_PRODUCTION_RECORD",
            )

        record = ProductionRecord(
            organization_id=current_user.organization_id,
            period_month=period_month,
            quantity=data.quantity,
            unit=unit,
            notes=data.notes,
            created_by=current_user.id,
        )
        try:
            db.add(record)
            db.commit()
            db.refresh(record)
            logger.info("Created production record %s (%s, %s %s)", record.id, period_month, record.quantity, unit)
            return record
        except IntegrityError as err:
            db.rollback()
            raise ConflictError(
                f"A production record for {period_month.strftime('%B %Y')} already exists.",
                code="DUPLICATE_PRODUCTION_RECORD",
            ) from err

    @staticmethod
    def list_records(
        db: Session,
        organization_id: uuid.UUID,
        month: date | None = None,
    ) -> list[ProductionRecord]:
        """List production records for organization with optional month filter."""
        stmt = select(ProductionRecord).where(ProductionRecord.organization_id == organization_id)
        if month:
            stmt = stmt.where(ProductionRecord.period_month == normalize_to_first_of_month(month))
        stmt = stmt.order_by(ProductionRecord.period_month.desc())
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_record(
        db: Session,
        organization_id: uuid.UUID,
        record_id: uuid.UUID,
    ) -> ProductionRecord:
        """Fetch single production record scoped to tenant."""
        record = db.scalar(
            select(ProductionRecord).where(
                ProductionRecord.id == record_id,
                ProductionRecord.organization_id == organization_id,
            )
        )
        if not record:
            raise NotFoundError("Production record not found.", code="RECORD_NOT_FOUND")
        return record

    @staticmethod
    def update_record(
        db: Session,
        current_user: User,
        record_id: uuid.UUID,
        data: ProductionRecordUpdate,
    ) -> ProductionRecord:
        """Update existing production record."""
        record = ProductionService.get_record(db, current_user.organization_id, record_id)

        if data.quantity is not None:
            record.quantity = data.quantity
        if data.notes is not None:
            record.notes = data.notes

        db.commit()
        db.refresh(record)
        logger.info("Updated production record %s", record.id)
        return record

    @staticmethod
    def delete_record(
        db: Session,
        organization_id: uuid.UUID,
        record_id: uuid.UUID,
    ) -> None:
        """Delete production record."""
        record = ProductionService.get_record(db, organization_id, record_id)
        db.delete(record)
        db.commit()
        logger.info("Deleted production record %s for org %s", record_id, organization_id)
