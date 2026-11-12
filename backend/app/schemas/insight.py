"""Pydantic schemas for Insights and Recommendations."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

InsightSeverity = Literal["low", "medium", "high"]
RecommendationPriority = Literal["low", "medium", "high"]
RecommendationStatus = Literal["proposed", "accepted", "dismissed", "completed"]


class RecommendationSummary(BaseModel):
    """Recommendation schema."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    insight_id: uuid.UUID | None = None
    title: str
    description: str
    steps_json: list[Any] = Field(default_factory=list)
    priority: RecommendationPriority
    status: RecommendationStatus
    estimated_saving_quantity: Decimal | None = None
    estimated_saving_unit: str | None = None
    estimated_saving_inr: Decimal | None = None
    assumptions: str | None = None
    created_at: datetime
    updated_at: datetime


class InsightResponse(BaseModel):
    """Insight response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    period_month: date
    metric_code: str
    resource_type: str | None = None
    severity: InsightSeverity
    title: str
    summary: str
    observed_value: Decimal | None = None
    comparison_value: Decimal | None = None
    change_percent: Decimal | None = None
    unit: str | None = None
    source_type: str
    caveat: str | None = None
    engine_version: str
    created_at: datetime
    recommendations: list[RecommendationSummary] = Field(default_factory=list)


class InsightGenerateResponse(BaseModel):
    """Response after executing insight generation pipeline."""

    month: date
    insights_generated_count: int
    recommendations_generated_count: int
    engine_version: str
    insights: list[InsightResponse]
