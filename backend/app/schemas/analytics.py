"""Pydantic schemas for Analytics API."""

from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ResourceTypeFilter = Literal["all", "electricity", "water", "fuel"]
MetricTypeFilter = Literal["consumption", "intensity", "spend"]


class ResourceMonthlyData(BaseModel):
    """Resource consumption, cost, and intensity for a month."""

    model_config = ConfigDict(from_attributes=True)

    resource_type: str
    quantity: Decimal | None = None
    unit: str
    amount_inr: Decimal | None = None
    intensity: Decimal | None = None
    intensity_unit: str | None = None


class AnalyticsMonthPoint(BaseModel):
    """Single month data point in the analytics time series."""

    model_config = ConfigDict(from_attributes=True)

    month: date
    month_str: str  # "YYYY-MM"
    production_quantity: Decimal | None = None
    production_unit: str

    electricity: ResourceMonthlyData | None = None
    water: ResourceMonthlyData | None = None
    fuel: ResourceMonthlyData | None = None

    total_spend_inr: Decimal | None = None
    is_partial_spend: bool = False
    cost_data_coverage: str

    has_utility_data: bool = False
    has_production_data: bool = False
    caveats: list[str] = Field(default_factory=list)


class AnalyticsSummaryRow(BaseModel):
    """Formatted row tailored for tabular presentation."""

    model_config = ConfigDict(from_attributes=True)

    month: str  # "YYYY-MM"
    production_display: str
    electricity_qty_display: str
    electricity_intensity_display: str
    electricity_amount_display: str
    water_qty_display: str
    water_intensity_display: str
    water_amount_display: str
    fuel_qty_display: str
    fuel_intensity_display: str
    fuel_amount_display: str
    total_spend_display: str
    is_partial_spend: bool = False
    caveats: list[str] = Field(default_factory=list)


class AnalyticsTotals(BaseModel):
    """Aggregated totals across the queried period."""

    model_config = ConfigDict(from_attributes=True)

    total_production: Decimal | None = None
    total_electricity_kwh: Decimal | None = None
    total_water_m3: Decimal | None = None
    total_fuel_l: Decimal | None = None
    total_spend_inr: Decimal | None = None
    avg_electricity_intensity: Decimal | None = None
    avg_water_intensity: Decimal | None = None
    avg_fuel_intensity: Decimal | None = None


class AnalyticsResponse(BaseModel):
    """Complete analytics series and table presentation contract."""

    model_config = ConfigDict(from_attributes=True)

    from_month: str
    to_month: str
    resource_type: ResourceTypeFilter
    metric: MetricTypeFilter
    production_unit: str
    series: list[AnalyticsMonthPoint]
    summary_table: list[AnalyticsSummaryRow]
    totals: AnalyticsTotals
    data_quality_notes: list[str] = Field(default_factory=list)

