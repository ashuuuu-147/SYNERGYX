"""Dashboard Service layer implementing summary calculations and coverage metrics."""

import logging
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import BadRequestError, NotFoundError
from app.models.action import Action
from app.models.insight import Insight
from app.models.organization import Organization
from app.models.production_record import ProductionRecord
from app.models.user import User
from app.models.utility_record import UtilityRecord
from app.schemas.dashboard import DashboardSummaryResponse, ResourceDashboardKpi
from app.services.calculations import (
    MonthAnalyticsResult,
    MonthInputData,
    ResourceData,
    compute_month_analytics,
)
from app.services.utility_service import normalize_to_first_of_month

logger = logging.getLogger("synergyx.services.dashboard")

CANONICAL_UNITS: dict[str, str] = {
    "electricity": "kWh",
    "water": "m3",
    "fuel": "L",
}


def get_previous_calendar_month(d: date) -> date:
    """Return the first day of the calendar month immediately preceding d."""
    if d.month == 1:
        return date(d.year - 1, 12, 1)
    return date(d.year, d.month - 1, 1)


class DashboardService:
    """Computes authoritative dashboard KPIs and summary state."""

    @staticmethod
    def get_dashboard_summary(
        db: Session,
        current_user: User,
        month_query: str | None = None,
    ) -> DashboardSummaryResponse:
        """Fetch and calculate all dashboard metrics for the requested or latest available month."""
        org_id = current_user.organization_id

        # 1. Fetch organization settings
        org = db.scalar(select(Organization).where(Organization.id == org_id))
        if not org:
            raise NotFoundError("Organization not found.", code="ORGANIZATION_NOT_FOUND")

        # 2. Determine latest available month across utility & production records
        max_util_month = db.scalar(
            select(func.max(UtilityRecord.period_month)).where(UtilityRecord.organization_id == org_id)
        )
        max_prod_month = db.scalar(
            select(func.max(ProductionRecord.period_month)).where(ProductionRecord.organization_id == org_id)
        )

        candidates = [m for m in (max_util_month, max_prod_month) if m is not None]
        latest_available = max(candidates) if candidates else None

        # 3. Determine selected month
        if month_query:
            try:
                clean_str = month_query.strip()
                if len(clean_str) == 7:  # YYYY-MM
                    clean_str += "-01"
                selected_month = normalize_to_first_of_month(date.fromisoformat(clean_str))
            except Exception as err:
                raise BadRequestError(
                    f"Invalid month format '{month_query}'. Expected YYYY-MM.",
                    code="INVALID_MONTH_FORMAT",
                ) from err
        elif latest_available:
            selected_month = latest_available
        else:
            today = date.today()
            selected_month = date(today.year, today.month, 1)

        previous_month = get_previous_calendar_month(selected_month)

        # 4. Fetch utility records for selected and previous months
        util_stmt = select(UtilityRecord).where(
            UtilityRecord.organization_id == org_id,
            UtilityRecord.period_month.in_([selected_month, previous_month]),
        )
        util_records = list(db.scalars(util_stmt).all())

        curr_utils = {r.resource_type: r for r in util_records if r.period_month == selected_month}
        prev_utils = {r.resource_type: r for r in util_records if r.period_month == previous_month}

        # 5. Fetch production records for selected and previous months
        prod_stmt = select(ProductionRecord).where(
            ProductionRecord.organization_id == org_id,
            ProductionRecord.period_month.in_([selected_month, previous_month]),
        )
        prod_records = list(db.scalars(prod_stmt).all())

        curr_prod = next((p for p in prod_records if p.period_month == selected_month), None)
        prev_prod = next((p for p in prod_records if p.period_month == previous_month), None)

        # 6. Build calculation inputs
        curr_input = MonthInputData(
            period_month=selected_month,
            resources={
                res_type: ResourceData(
                    resource_type=res_type,
                    quantity=rec.quantity,
                    unit=rec.unit,
                    amount_inr=rec.amount_inr,
                )
                for res_type, rec in curr_utils.items()
            },
            production_quantity=curr_prod.quantity if curr_prod else None,
            production_unit=org.production_unit,
        )

        prev_input = (
            MonthInputData(
                period_month=previous_month,
                resources={
                    res_type: ResourceData(
                        resource_type=res_type,
                        quantity=rec.quantity,
                        unit=rec.unit,
                        amount_inr=rec.amount_inr,
                    )
                    for res_type, rec in prev_utils.items()
                },
                production_quantity=prev_prod.quantity if prev_prod else None,
                production_unit=org.production_unit,
            )
            if (prev_utils or prev_prod)
            else None
        )

        # 7. Compute deterministic analytics via calculation engine
        analytics: MonthAnalyticsResult = compute_month_analytics(current=curr_input, previous=prev_input)

        # 8. Build resource KPIs
        def build_resource_kpi(res_type: str) -> ResourceDashboardKpi:
            metric = analytics.resources.get(res_type)
            canonical_unit = CANONICAL_UNITS.get(res_type, "")
            if not metric:
                return ResourceDashboardKpi(
                    resource_type=res_type,
                    quantity=None,
                    unit=canonical_unit,
                    amount_inr=None,
                    intensity=None,
                    intensity_unit=None,
                    change_percent=None,
                    observed_reduction_per_unit=None,
                    observed_resource_reduction=None,
                    potential_saving_inr=None,
                )
            return ResourceDashboardKpi(
                resource_type=metric.resource_type,
                quantity=metric.quantity,
                unit=metric.unit,
                amount_inr=metric.amount_inr,
                intensity=metric.intensity,
                intensity_unit=metric.intensity_unit,
                change_percent=metric.intensity_change_pct,
                observed_reduction_per_unit=metric.observed_reduction_per_unit,
                observed_resource_reduction=metric.observed_resource_reduction,
                potential_saving_inr=metric.potential_saving_inr,
            )

        elec_kpi = build_resource_kpi("electricity")
        water_kpi = build_resource_kpi("water")
        fuel_kpi = build_resource_kpi("fuel")

        # 9. Query action and insight counts
        open_actions = (
            db.scalar(
                select(func.count(Action.id)).where(
                    Action.organization_id == org_id,
                    Action.status.in_(["pending", "in_progress"]),
                )
            )
            or 0
        )
        completed_actions = (
            db.scalar(
                select(func.count(Action.id)).where(
                    Action.organization_id == org_id,
                    Action.status == "completed",
                )
            )
            or 0
        )
        latest_insights = (
            db.scalar(
                select(func.count(Insight.id)).where(
                    Insight.organization_id == org_id,
                    Insight.period_month == selected_month,
                )
            )
            or 0
        )

        recorded_util_count = len(curr_utils)
        util_coverage = f"{recorded_util_count} of 3 utility types recorded"

        # Total spend: return None if 0 bills recorded
        total_spend = analytics.total_spend_inr if analytics.cost_with_amount_count > 0 else None

        return DashboardSummaryResponse(
            selected_month=selected_month,
            latest_available_month=latest_available,
            electricity=elec_kpi,
            water=water_kpi,
            fuel=fuel_kpi,
            production_quantity=curr_prod.quantity if curr_prod else None,
            production_unit=org.production_unit,
            total_spend_inr=total_spend,
            is_partial_spend=analytics.is_partial_cost,
            utility_data_coverage=util_coverage,
            utility_recorded_count=recorded_util_count,
            cost_data_coverage=analytics.cost_data_coverage,
            open_actions_count=open_actions,
            completed_actions_count=completed_actions,
            latest_insights_count=latest_insights,
        )
