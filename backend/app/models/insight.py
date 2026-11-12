"""Insight model."""

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.organization import Organization
    from app.models.recommendation import Recommendation


class Insight(Base):
    __tablename__ = "insights"

    __table_args__ = (
        sa.Index("ix_insights_org_month", "organization_id", "period_month"),
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
    period_month: Mapped[date] = mapped_column(sa.Date, nullable=False)
    metric_code: Mapped[str] = mapped_column(sa.String(60), nullable=False)
    resource_type: Mapped[str | None] = mapped_column(sa.String(20), nullable=True)
    severity: Mapped[str] = mapped_column(
        sa.String(10), nullable=False
    )  # low, medium, high
    title: Mapped[str] = mapped_column(sa.String(180), nullable=False)
    summary: Mapped[str] = mapped_column(sa.Text, nullable=False)
    observed_value: Mapped[Decimal | None] = mapped_column(
        sa.Numeric(18, 6), nullable=True
    )
    comparison_value: Mapped[Decimal | None] = mapped_column(
        sa.Numeric(18, 6), nullable=True
    )
    change_percent: Mapped[Decimal | None] = mapped_column(
        sa.Numeric(10, 3), nullable=True
    )
    unit: Mapped[str | None] = mapped_column(sa.String(30), nullable=True)
    source_type: Mapped[str] = mapped_column(
        sa.String(20), nullable=False
    )  # rules, ai_assisted
    caveat: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    engine_version: Mapped[str] = mapped_column(sa.String(30), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    organization: Mapped["Organization"] = relationship(back_populates="insights")
    recommendations: Mapped[list["Recommendation"]] = relationship(
        back_populates="insight"
    )
