"""Organization model."""

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.action import Action
    from app.models.document import Document
    from app.models.insight import Insight
    from app.models.production_record import ProductionRecord
    from app.models.recommendation import Recommendation
    from app.models.user import User
    from app.models.utility_record import UtilityRecord


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(sa.String(120), nullable=False)
    industry: Mapped[str] = mapped_column(sa.String(40), nullable=False)
    location: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    country_code: Mapped[str] = mapped_column(sa.String(2), default="IN", nullable=False)
    production_unit: Mapped[str] = mapped_column(sa.String(20), nullable=False)
    allow_external_ai: Mapped[bool] = mapped_column(sa.Boolean, default=False, nullable=False)

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
    users: Mapped[list["User"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    utility_records: Mapped[list["UtilityRecord"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )
    production_records: Mapped[list["ProductionRecord"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )
    documents: Mapped[list["Document"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    insights: Mapped[list["Insight"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    recommendations: Mapped[list["Recommendation"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )
    actions: Mapped[list["Action"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
