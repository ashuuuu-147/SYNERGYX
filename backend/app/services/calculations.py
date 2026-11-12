"""Deterministic Calculation Engine for SYNERGYX.

Implements pure, testable calculations using Python Decimal for all:
- Resource totals & units
- Production-normalized intensity
- Month-over-month percentage changes
- Observed improvements and potential monetary savings
- Spend totals and cost data coverage

Per Blueprint Sections 9 and 16.
"""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal


@dataclass(frozen=True)
class ResourceData:
    """Input resource consumption data for a month."""

    resource_type: str
    quantity: Decimal
    unit: str
    amount_inr: Decimal | None = None


@dataclass(frozen=True)
class MonthInputData:
    """Input data for a full calendar month."""

    period_month: date
    resources: dict[str, ResourceData]
    production_quantity: Decimal | None = None
    production_unit: str | None = None


@dataclass(frozen=True)
class ResourceMetricResult:
    """Calculated metric results for a single resource in a month."""

    resource_type: str
    quantity: Decimal
    unit: str
    amount_inr: Decimal | None
    intensity: Decimal | None
    intensity_unit: str | None

    # Month-over-month comparison vs immediately preceding month
    prev_quantity: Decimal | None
    prev_intensity: Decimal | None
    quantity_change_pct: Decimal | None
    intensity_change_pct: Decimal | None

    # Observed improvement & potential savings
    observed_reduction_per_unit: Decimal | None
    observed_resource_reduction: Decimal | None
    potential_saving_inr: Decimal | None


@dataclass(frozen=True)
class MonthAnalyticsResult:
    """Summary calculation results for a calendar month."""

    period_month: date
    production_quantity: Decimal | None
    production_unit: str | None
    resources: dict[str, ResourceMetricResult]
    total_spend_inr: Decimal
    cost_with_amount_count: int
    total_resource_count: int
    cost_data_coverage: str
    is_partial_cost: bool


def calculate_intensity(
    resource_quantity: Decimal,
    production_quantity: Decimal | None,
) -> Decimal | None:
    """Calculate production intensity = resource_quantity / production_quantity.

    Returns None if production quantity is missing or <= 0.
    """
    if production_quantity is None or production_quantity <= Decimal(0):
        return None
    return resource_quantity / production_quantity


def calculate_change_percent(
    current_value: Decimal,
    previous_value: Decimal | None,
) -> Decimal | None:
    """Calculate percentage change: ((current - previous) / previous) * 100.

    Returns None if previous value is None or zero.
    """
    if previous_value is None or previous_value == Decimal(0):
        return None
    return ((current_value - previous_value) / previous_value) * Decimal(100)


def calculate_observed_reduction(
    current_intensity: Decimal | None,
    previous_intensity: Decimal | None,
    current_production: Decimal | None,
) -> tuple[Decimal | None, Decimal | None]:
    """Calculate observed intensity reduction and total resource reduction.

    observed_reduction_per_unit = previous_intensity - current_intensity
    observed_resource_reduction = observed_reduction_per_unit * current_production

    Returns (None, None) if intensity or production is unavailable.
    """
    if (
        current_intensity is None
        or previous_intensity is None
        or current_production is None
        or current_production <= Decimal(0)
    ):
        return None, None

    reduction_per_unit = previous_intensity - current_intensity
    total_resource_reduction = reduction_per_unit * current_production
    return reduction_per_unit, total_resource_reduction


def calculate_potential_saving(
    observed_resource_reduction: Decimal | None,
    previous_amount_inr: Decimal | None,
    previous_resource_quantity: Decimal | None,
) -> Decimal | None:
    """Calculate potential savings estimate based on prior unit cost.

    previous_unit_cost = previous_amount_inr / previous_resource_quantity
    potential_saving_inr = observed_resource_reduction * previous_unit_cost

    Returns None if reduction <= 0 or cost data is unavailable.
    """
    if (
        observed_resource_reduction is None
        or observed_resource_reduction <= Decimal(0)
        or previous_amount_inr is None
        or previous_resource_quantity is None
        or previous_resource_quantity <= Decimal(0)
    ):
        return None

    previous_unit_cost = previous_amount_inr / previous_resource_quantity
    return observed_resource_reduction * previous_unit_cost


def compute_month_analytics(
    current: MonthInputData,
    previous: MonthInputData | None = None,
) -> MonthAnalyticsResult:
    """Compute comprehensive analytics for a month against its previous comparable month."""
    calculated_resources: dict[str, ResourceMetricResult] = {}
    total_spend = Decimal(0)
    with_cost_count = 0
    total_res_count = len(current.resources)

    for res_type, res_data in current.resources.items():
        # Cost accumulation
        if res_data.amount_inr is not None:
            total_spend += res_data.amount_inr
            with_cost_count += 1

        # Current intensity
        intensity = calculate_intensity(res_data.quantity, current.production_quantity)
        intensity_unit = (
            f"{res_data.unit}/{current.production_unit}" if current.production_unit and intensity is not None else None
        )

        # Previous month data for this specific resource
        prev_res = previous.resources.get(res_type) if previous else None
        prev_qty = prev_res.quantity if prev_res else None
        prev_intensity = (
            calculate_intensity(prev_res.quantity, previous.production_quantity) if prev_res and previous else None
        )

        # Month-over-month deltas
        qty_change_pct = calculate_change_percent(res_data.quantity, prev_qty)
        intensity_change_pct = (
            calculate_change_percent(intensity, prev_intensity)
            if intensity is not None and prev_intensity is not None
            else None
        )

        # Observed reduction & savings
        reduction_per_unit, total_reduction = calculate_observed_reduction(
            current_intensity=intensity,
            previous_intensity=prev_intensity,
            current_production=current.production_quantity,
        )

        potential_saving = calculate_potential_saving(
            observed_resource_reduction=total_reduction,
            previous_amount_inr=prev_res.amount_inr if prev_res else None,
            previous_resource_quantity=prev_qty,
        )

        calculated_resources[res_type] = ResourceMetricResult(
            resource_type=res_type,
            quantity=res_data.quantity,
            unit=res_data.unit,
            amount_inr=res_data.amount_inr,
            intensity=intensity,
            intensity_unit=intensity_unit,
            prev_quantity=prev_qty,
            prev_intensity=prev_intensity,
            quantity_change_pct=qty_change_pct,
            intensity_change_pct=intensity_change_pct,
            observed_reduction_per_unit=reduction_per_unit,
            observed_resource_reduction=total_reduction,
            potential_saving_inr=potential_saving,
        )

    coverage_str = f"{with_cost_count} of {total_res_count} utility types" if total_res_count > 0 else "0 utility types"
    is_partial = with_cost_count < total_res_count

    return MonthAnalyticsResult(
        period_month=current.period_month,
        production_quantity=current.production_quantity,
        production_unit=current.production_unit,
        resources=calculated_resources,
        total_spend_inr=total_spend,
        cost_with_amount_count=with_cost_count,
        total_resource_count=total_res_count,
        cost_data_coverage=coverage_str,
        is_partial_cost=is_partial,
    )
