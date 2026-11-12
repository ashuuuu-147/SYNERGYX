"""Pydantic schemas for monthly summary reports and exports."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class UtilityReportItem(BaseModel):
    """Utility line item in monthly report."""

    resource_type: str = Field(description="electricity | water | fuel")
    quantity: Decimal | None = Field(default=None, description="Canonical quantity consumed")
    unit: str = Field(description="Canonical unit: kWh, m3, L")
    spend_inr: Decimal | None = Field(default=None, description="Recorded bill spend in INR")
    intensity: Decimal | None = Field(default=None, description="Quantity / Production volume")
    intensity_unit: str = Field(description="e.g. kWh/kg, m3/kg, L/kg")
    mom_quantity_change_pct: Decimal | None = Field(
        default=None, description="MoM percentage change in consumption vs previous month"
    )
    mom_intensity_change_pct: Decimal | None = Field(
        default=None, description="MoM percentage change in intensity vs previous month"
    )
    notes: str | None = None


class InsightReportItem(BaseModel):
    """Insight item in monthly report."""

    title: str
    severity: str
    resource_type: str | None = None
    description: str
    source: str
    caveat: str | None = None


class RecommendationReportItem(BaseModel):
    """Recommendation item in monthly report."""

    title: str
    priority: str
    status: str
    potential_saving_inr: Decimal | None = None
    practical_action: str | None = None


class ActionReportItem(BaseModel):
    """Action item in monthly report."""

    title: str
    status: str
    due_date: date | None = None
    completed_at: datetime | None = None


class ReportMetadata(BaseModel):
    """Organization and generation metadata."""

    organization_name: str
    industry: str
    location: str | None = None
    report_month: str = Field(description="Calendar month in YYYY-MM format")
    generated_at: datetime = Field(description="Generation timestamp in UTC")
    production_unit: str


class ReportSummary(BaseModel):
    """High-level summary metrics for the month."""

    production_quantity: Decimal | None = None
    production_unit: str
    total_spend_inr: Decimal
    spend_coverage: str
    active_actions_count: int
    has_missing_data: bool


class MonthlyReportResponse(BaseModel):
    """Full monthly performance report payload."""

    metadata: ReportMetadata
    summary: ReportSummary
    utilities: list[UtilityReportItem]
    insights: list[InsightReportItem]
    recommendations: list[RecommendationReportItem]
    actions: list[ActionReportItem]
    caveats: list[str]
