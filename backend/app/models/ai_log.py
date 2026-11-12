"""AI Generation Log audit model."""

import uuid
from datetime import UTC, date, datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AiGenerationLog(Base):
    __tablename__ = "ai_generation_logs"

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
    provider: Mapped[str] = mapped_column(
        sa.String(20), nullable=False
    )  # rules, openai
    period_month: Mapped[date] = mapped_column(sa.Date, nullable=False)
    status: Mapped[str] = mapped_column(
        sa.String(20), nullable=False
    )  # success, fallback, error
    error_category: Mapped[str | None] = mapped_column(sa.String(50), nullable=True)
    engine_version: Mapped[str] = mapped_column(sa.String(30), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
