"""Recommendation model."""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.action import Action
    from app.models.insight import Insight
    from app.models.organization import Organization


class Recommendation(Base):
    __tablename__ = "recommendations"

    __table_args__ = (
        sa.Index("ix_recommendations_org_status", "organization_id", "status"),
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
    insight_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey("insights.id", ondelete="SET NULL"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(sa.String(180), nullable=False)
    description: Mapped[str] = mapped_column(sa.Text, nullable=False)
    steps_json: Mapped[list[Any]] = mapped_column(sa.JSON, default=list, nullable=False)
    priority: Mapped[str] = mapped_column(
        sa.String(10), default="medium", nullable=False
    )  # low, medium, high
    status: Mapped[str] = mapped_column(
        sa.String(20), default="proposed", nullable=False
    )  # proposed, accepted, dismissed, completed
    estimated_saving_quantity: Mapped[Decimal | None] = mapped_column(
        sa.Numeric(18, 3), nullable=True
    )
    estimated_saving_unit: Mapped[str | None] = mapped_column(
        sa.String(20), nullable=True
    )
    estimated_saving_inr: Mapped[Decimal | None] = mapped_column(
        sa.Numeric(14, 2), nullable=True
    )
    assumptions: Mapped[str | None] = mapped_column(sa.Text, nullable=True)

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
    organization: Mapped["Organization"] = relationship(
        back_populates="recommendations"
    )
    insight: Mapped[Optional["Insight"]] = relationship(
        back_populates="recommendations"
    )
    actions: Mapped[list["Action"]] = relationship(back_populates="recommendation")
