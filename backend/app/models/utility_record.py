"""Utility Record model."""

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.organization import Organization


class UtilityRecord(Base):
    __tablename__ = "utility_records"

    __table_args__ = (
        sa.UniqueConstraint(
            "organization_id",
            "resource_type",
            "period_month",
            name="uq_utility_org_resource_month",
        ),
        sa.Index("ix_utility_org_month", "organization_id", "period_month"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    resource_type: Mapped[str] = mapped_column(sa.String(20), nullable=False)  # electricity, water, fuel
    period_month: Mapped[date] = mapped_column(sa.Date, nullable=False)
    quantity: Mapped[Decimal] = mapped_column(sa.Numeric(14, 3), nullable=False)
    unit: Mapped[str] = mapped_column(sa.String(10), nullable=False)  # kWh, m3, L
    amount_inr: Mapped[Decimal | None] = mapped_column(sa.Numeric(14, 2), nullable=True)
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey("documents.id", ondelete="SET NULL"),
        unique=True,
        nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(sa.String(500), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    organization: Mapped["Organization"] = relationship(back_populates="utility_records")
    document: Mapped[Optional["Document"]] = relationship(back_populates="utility_record")
