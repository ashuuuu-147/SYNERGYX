"""Pydantic schemas for Dashboard summary."""

from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ResourceDashboardKpi(BaseModel):
    """Resource KPI card data for dashboard."""

    model_config = ConfigDict(from_attributes=True)

    resource_type: str
    quantity: Decimal | None = None
    unit: str
    amount_inr: Decimal | None = None
    intensity: Decimal | None = None
    intensity_unit: str | None = None
    change_percent: Decimal | None = None
    observed_reduction_per_unit: Decimal | None = None
    observed_resource_reduction: Decimal | None = None
    potential_saving_inr: Decimal | None = None


class DashboardSummaryResponse(BaseModel):
    """Complete dashboard summary response."""

    model_config = ConfigDict(from_attributes=True)

    selected_month: date
    latest_available_month: date | None = None

    # Core resource metrics
    electricity: ResourceDashboardKpi
    water: ResourceDashboardKpi
    fuel: ResourceDashboardKpi

    # Production metrics
    production_quantity: Decimal | None = None
    production_unit: str

    # Financial spend
    total_spend_inr: Decimal | None = None
    is_partial_spend: bool = False

    # Data coverage indicators
    utility_data_coverage: str = Field(description="e.g. '2 of 3 utility types recorded'")
    utility_recorded_count: int
    cost_data_coverage: str = Field(description="e.g. '2 of 3 utility types'")

    # Activity counters
    open_actions_count: int = 0
    completed_actions_count: int = 0
    latest_insights_count: int = 0
