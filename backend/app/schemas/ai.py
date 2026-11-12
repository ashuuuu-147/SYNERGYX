"""Pydantic schemas for AI explanation adapter and structured output contracts.

Per Blueprint Sections 10.4–10.5:
- InsightFacts must strictly contain only non-identifying, aggregated metrics.
- No PII, person names, emails, exact locations, or raw invoices allowed.
- InsightExplanation enforces strict lengths and forbids extra keys.
- Numbers remain authoritative and backend-calculated.
"""

from datetime import date
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

CleanString180 = Annotated[str, StringConstraints(strip_whitespace=True, max_length=180)]


class InsightFacts(BaseModel):
    """Aggregated, non-identifying facts passed to the AI explanation provider."""

    model_config = ConfigDict(extra="forbid")

    industry: str = Field(..., description="High-level industry sector only, e.g. textile, packaging")
    period_month: date = Field(..., description="Target calendar month")
    metric_code: str = Field(..., description="Deterministic rule identifier")
    resource_type: str | None = Field(None, description="electricity, water, or fuel")
    calculated_quantity: Decimal | None = None
    canonical_unit: str | None = None
    production_quantity: Decimal | None = None
    production_unit: str | None = None
    calculated_intensity: Decimal | None = None
    comparison_value: Decimal | None = None
    change_percent: Decimal | None = None
    data_quality_caveats: list[str] = Field(default_factory=list)
    allowed_recommendation_categories: list[str] = Field(default_factory=list)


class InsightExplanation(BaseModel):
    """Structured response required from the AI explanation provider."""

    model_config = ConfigDict(extra="forbid")

    summary: Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)] = Field(
        ..., description="Brief, factual explanation of the observed resource variance"
    )
    possible_causes: list[CleanString180] = Field(
        default_factory=list,
        max_length=5,
        description="List of possible operational causes, qualified with 'where applicable'",
    )
    next_steps: list[CleanString180] = Field(
        default_factory=list,
        max_length=5,
        description="Actionable, non-invasive investigation steps for the factory team",
    )
    caveat: Annotated[str, StringConstraints(strip_whitespace=True, max_length=300)] = Field(
        ..., description="Honest heuristic and data limitation disclosure"
    )
