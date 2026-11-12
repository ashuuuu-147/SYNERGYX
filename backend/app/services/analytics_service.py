"""Analytics Service layer for time-series aggregation, gap preservation, and table generation."""

import logging
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import BadRequestError, NotFoundError
from app.models.organization import Organization
from app.models.production_record import ProductionRecord
from app.models.user import User
from app.models.utility_record import UtilityRecord
from app.schemas.analytics import (
    AnalyticsMonthPoint,
    AnalyticsResponse,
    AnalyticsSummaryRow,
    AnalyticsTotals,
    MetricTypeFilter,
    ResourceMonthlyData,
    ResourceTypeFilter,
)
from app.services.calculations import calculate_intensity
from app.services.utility_service import normalize_to_first_of_month

logger = logging.getLogger("synergyx.services.analytics")

CANONICAL_UNITS: dict[str, str] = {
    "electricity": "kWh",
    "water": "m3",
    "fuel": "L",
}


def parse_month_string(month_str: str) -> date:
    """Parse YYYY-MM or YYYY-MM-DD into a normalized first-of-month date."""
    clean = month_str.strip()
    if len(clean) == 7:
        clean += "-01"
    try:
        return normalize_to_first_of_month(date.fromisoformat(clean))
    except Exception as err:
        raise BadRequestError(
            f"Invalid month format '{month_str}'. Expected YYYY-MM.",
            code="INVALID_MONTH_FORMAT",
        ) from err


def generate_month_sequence(start_month: date, end_month: date) -> list[date]:
    """Generate chronological list of first-of-month dates between start and end inclusive."""
    months: list[date] = []
    curr = start_month
    while curr <= end_month:
        months.append(curr)
        curr = date(curr.year + 1, 1, 1) if curr.month == 12 else date(curr.year, curr.month + 1, 1)
    return months


def format_number(val: Decimal | None, decimals: int = 2) -> str:
    """Format Decimal for UI display with commas, returning '—' for None."""
    if val is None:
        return "—"
    if decimals == 0 or val % 1 == 0:
        return f"{int(val):,}"
    # Format with up to specified decimals and strip trailing zeros
    formatted = f"{val:,.{decimals}f}".rstrip("0").rstrip(".")
    return formatted


class AnalyticsService:
    """Computes time series analytics, preserving gaps and strictly using pure Decimal."""

    @staticmethod
    def get_analytics(
        db: Session,
        current_user: User,
        from_str: str | None = None,
        to_str: str | None = None,
        resource_type: ResourceTypeFilter = "all",
        metric: MetricTypeFilter = "consumption",
    ) -> AnalyticsResponse:
        """Fetch and calculate multi-month analytics time series and summary table."""
        org_id = current_user.organization_id

        # 1. Fetch organization settings
        org = db.scalar(select(Organization).where(Organization.id == org_id))
        if not org:
            raise NotFoundError("Organization not found.", code="ORGANIZATION_NOT_FOUND")

        prod_unit = org.production_unit or "kg"

        # 2. Determine bounds
        # Discover min and max recorded months in DB
        min_util_m = db.scalar(
            select(func.min(UtilityRecord.period_month)).where(UtilityRecord.organization_id == org_id)
        )
        max_util_m = db.scalar(
            select(func.max(UtilityRecord.period_month)).where(UtilityRecord.organization_id == org_id)
        )
        min_prod_m = db.scalar(
            select(func.min(ProductionRecord.period_month)).where(ProductionRecord.organization_id == org_id)
        )
        max_prod_m = db.scalar(
            select(func.max(ProductionRecord.period_month)).where(ProductionRecord.organization_id == org_id)
        )

        all_mins = [m for m in (min_util_m, min_prod_m) if m is not None]
        all_maxs = [m for m in (max_util_m, max_prod_m) if m is not None]

        earliest_recorded = min(all_mins) if all_mins else None
        latest_recorded = max(all_maxs) if all_maxs else None

        # Parse or default `to_date`
        if to_str:
            to_date = parse_month_string(to_str)
        elif latest_recorded:
            to_date = latest_recorded
        else:
            today = date.today()
            to_date = date(today.year, today.month, 1)

        # Parse or default `from_date`
        if from_str:
            from_date = parse_month_string(from_str)
        elif earliest_recorded:
            # Default to up to 12 months before to_date or earliest recorded
            months_back = 5
            year = to_date.year
            month = to_date.month - months_back
            while month <= 0:
                month += 12
                year -= 1
            default_from = date(year, month, 1)
            from_date = max(default_from, earliest_recorded)
        else:
            # 6 months back from to_date
            year = to_date.year
            month = to_date.month - 5
            while month <= 0:
                month += 12
                year -= 1
            from_date = date(year, month, 1)

        # Date range validation
        if from_date > to_date:
            raise BadRequestError(
                "Start month cannot be after end month.",
                code="INVALID_DATE_RANGE",
            )

        # 3. Generate sequential calendar months
        month_sequence = generate_month_sequence(from_date, to_date)

        # 4. Fetch all utility records in range
        util_stmt = select(UtilityRecord).where(
            UtilityRecord.organization_id == org_id,
            UtilityRecord.period_month >= from_date,
            UtilityRecord.period_month <= to_date,
        )
        util_records = list(db.scalars(util_stmt).all())

        # Group utilities by (month, resource_type)
        utils_by_month: dict[date, dict[str, UtilityRecord]] = {}
        for r in util_records:
            utils_by_month.setdefault(r.period_month, {})[r.resource_type] = r

        # 5. Fetch all production records in range
        prod_stmt = select(ProductionRecord).where(
            ProductionRecord.organization_id == org_id,
            ProductionRecord.period_month >= from_date,
            ProductionRecord.period_month <= to_date,
        )
        prod_records = list(db.scalars(prod_stmt).all())
        prods_by_month = {p.period_month: p for p in prod_records}

        # 6. Build series and table rows
        series: list[AnalyticsMonthPoint] = []
        summary_table: list[AnalyticsSummaryRow] = []

        total_prod_sum: Decimal = Decimal(0)
        has_any_prod: bool = False

        total_elec_qty: Decimal = Decimal(0)
        has_any_elec: bool = False

        total_water_qty: Decimal = Decimal(0)
        has_any_water: bool = False

        total_fuel_qty: Decimal = Decimal(0)
        has_any_fuel: bool = False

        total_spend_sum: Decimal = Decimal(0)
        has_any_spend: bool = False

        data_quality_notes: set[str] = set()

        for m in month_sequence:
            m_str = m.strftime("%Y-%m")
            m_prod = prods_by_month.get(m)
            m_utils = utils_by_month.get(m, {})

            prod_qty = m_prod.quantity if m_prod else None
            if prod_qty is not None:
                total_prod_sum += prod_qty
                has_any_prod = True

            caveats: list[str] = []
            has_utility = len(m_utils) > 0
            has_prod = prod_qty is not None

            if not has_utility and not has_prod:
                caveats.append("No records for this month")
            elif has_utility and not has_prod:
                caveats.append("Production data missing; intensity unavailable")
                data_quality_notes.add("One or more months are missing production data; intensity is not calculated.")
            elif has_prod and not has_utility:
                caveats.append("Utility records missing for this month")
                data_quality_notes.add("One or more months are missing utility records.")

            # Resource metrics
            resources_data: dict[str, ResourceMonthlyData] = {}
            for res_name, res_unit in CANONICAL_UNITS.items():
                u_rec = m_utils.get(res_name)
                if u_rec:
                    qty = u_rec.quantity
                    amt = u_rec.amount_inr
                    intensity = calculate_intensity(qty, prod_qty)
                    intensity_unit = f"{res_unit}/{prod_unit}" if intensity is not None else None

                    if res_name == "electricity":
                        total_elec_qty += qty
                        has_any_elec = True
                    elif res_name == "water":
                        total_water_qty += qty
                        has_any_water = True
                    elif res_name == "fuel":
                        total_fuel_qty += qty
                        has_any_fuel = True

                    resources_data[res_name] = ResourceMonthlyData(
                        resource_type=res_name,
                        quantity=qty,
                        unit=res_unit,
                        amount_inr=amt,
                        intensity=intensity,
                        intensity_unit=intensity_unit,
                    )
                else:
                    resources_data[res_name] = ResourceMonthlyData(
                        resource_type=res_name,
                        quantity=None,
                        unit=res_unit,
                        amount_inr=None,
                        intensity=None,
                        intensity_unit=None,
                    )

            # Monthly spend
            amounts_present = [r.amount_inr for r in m_utils.values() if r.amount_inr is not None]
            if len(m_utils) > 0:
                m_spend = sum(amounts_present, Decimal(0))
                if amounts_present:
                    total_spend_sum += m_spend
                    has_any_spend = True
                with_cost_count = len(amounts_present)
                total_recorded = len(m_utils)
                is_partial = with_cost_count < total_recorded or total_recorded < 3
                coverage_str = f"{with_cost_count} of {total_recorded} recorded with cost"
                if is_partial and with_cost_count < total_recorded:
                    caveats.append(f"Partial cost data ({coverage_str})")
                    data_quality_notes.add("Some utility bills do not have financial spend recorded.")
            else:
                m_spend = None
                is_partial = False
                coverage_str = "0 of 0"

            # Point
            point = AnalyticsMonthPoint(
                month=m,
                month_str=m_str,
                production_quantity=prod_qty,
                production_unit=prod_unit,
                electricity=resources_data["electricity"],
                water=resources_data["water"],
                fuel=resources_data["fuel"],
                total_spend_inr=m_spend,
                is_partial_spend=is_partial,
                cost_data_coverage=coverage_str,
                has_utility_data=has_utility,
                has_production_data=has_prod,
                caveats=caveats,
            )
            series.append(point)

            # Summary table row
            e_data = resources_data["electricity"]
            w_data = resources_data["water"]
            f_data = resources_data["fuel"]

            summary_table.append(
                AnalyticsSummaryRow(
                    month=m_str,
                    production_display=f"{format_number(prod_qty, 0)} {prod_unit}" if prod_qty is not None else "—",
                    electricity_qty_display=f"{format_number(e_data.quantity, 0)} kWh"
                    if e_data.quantity is not None
                    else "—",
                    electricity_intensity_display=f"{format_number(e_data.intensity, 4)} kWh/{prod_unit}"
                    if e_data.intensity is not None
                    else "—",
                    electricity_amount_display=f"₹{format_number(e_data.amount_inr, 0)}"
                    if e_data.amount_inr is not None
                    else "—",
                    water_qty_display=f"{format_number(w_data.quantity, 2)} m³"
                    if w_data.quantity is not None
                    else "—",
                    water_intensity_display=f"{format_number(w_data.intensity, 6)} m³/{prod_unit}"
                    if w_data.intensity is not None
                    else "—",
                    water_amount_display=f"₹{format_number(w_data.amount_inr, 0)}"
                    if w_data.amount_inr is not None
                    else "—",
                    fuel_qty_display=f"{format_number(f_data.quantity, 0)} L" if f_data.quantity is not None else "—",
                    fuel_intensity_display=f"{format_number(f_data.intensity, 4)} L/{prod_unit}"
                    if f_data.intensity is not None
                    else "—",
                    fuel_amount_display=f"₹{format_number(f_data.amount_inr, 0)}"
                    if f_data.amount_inr is not None
                    else "—",
                    total_spend_display=f"₹{format_number(m_spend, 0)}" if m_spend is not None else "—",
                    is_partial_spend=is_partial,
                    caveats=caveats,
                )
            )

        # 7. Aggregated Totals
        totals = AnalyticsTotals(
            total_production=total_prod_sum if has_any_prod else None,
            total_electricity_kwh=total_elec_qty if has_any_elec else None,
            total_water_m3=total_water_qty if has_any_water else None,
            total_fuel_l=total_fuel_qty if has_any_fuel else None,
            total_spend_inr=total_spend_sum if has_any_spend else None,
            avg_electricity_intensity=(
                calculate_intensity(total_elec_qty, total_prod_sum)
                if has_any_elec and has_any_prod and total_prod_sum > 0
                else None
            ),
            avg_water_intensity=(
                calculate_intensity(total_water_qty, total_prod_sum)
                if has_any_water and has_any_prod and total_prod_sum > 0
                else None
            ),
            avg_fuel_intensity=(
                calculate_intensity(total_fuel_qty, total_prod_sum)
                if has_any_fuel and has_any_prod and total_prod_sum > 0
                else None
            ),
        )

        return AnalyticsResponse(
            from_month=from_date.strftime("%Y-%m"),
            to_month=to_date.strftime("%Y-%m"),
            resource_type=resource_type,
            metric=metric,
            production_unit=prod_unit,
            series=series,
            summary_table=summary_table,
            totals=totals,
            data_quality_notes=sorted(list(data_quality_notes)),
        )
