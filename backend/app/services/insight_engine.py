"""Deterministic rules-based insight generation engine.

Implements starter rules and recommendation templates per Blueprint Section 10.
Produces authoritative findings with pure Decimal calculations and idempotent upserts.
"""

import logging
import uuid
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import BadRequestError, NotFoundError
from app.core.rules_config import (
    CAVEAT_DATA_READINESS,
    CAVEAT_HEURISTIC,
    CAVEAT_MISSING_COST,
    CAVEAT_MISSING_PRODUCTION,
    CAVEAT_OBSERVED_IMPROVEMENT,
    ELECTRICITY_INTENSITY_DOWN_THRESHOLD,
    ELECTRICITY_INTENSITY_UP_THRESHOLD,
    ENGINE_VERSION,
    FUEL_INTENSITY_UP_THRESHOLD,
    HIGH_SEVERITY_INTENSITY_THRESHOLD,
    WATER_INTENSITY_UP_THRESHOLD,
)
from app.models.action import Action
from app.models.ai_log import AiGenerationLog
from app.models.insight import Insight
from app.models.organization import Organization
from app.models.production_record import ProductionRecord
from app.models.recommendation import Recommendation
from app.models.utility_record import UtilityRecord
from app.schemas.ai import InsightFacts
from app.services.ai_provider import (
    AiProviderError,
    get_explanation_provider,
)
from app.services.calculations import (
    MonthInputData,
    ResourceData,
    compute_month_analytics,
)
from app.services.dashboard_service import get_previous_calendar_month
from app.services.utility_service import normalize_to_first_of_month

logger = logging.getLogger("synergyx.services.insights")


def get_months_in_range(start_date: date, end_date: date) -> list[date]:
    """Return a list of first-of-month dates between start_date and end_date (inclusive)."""
    start_d = normalize_to_first_of_month(start_date)
    end_d = normalize_to_first_of_month(end_date)
    if start_d > end_d:
        start_d, end_d = end_d, start_d

    months: list[date] = []
    current = start_d
    while current <= end_d:
        months.append(current)
        if current.month == 12:
            current = date(current.year + 1, 1, 1)
        else:
            current = date(current.year, current.month + 1, 1)
    return months


@dataclass
class RecommendationCandidate:
    """Template for a recommendation generated from a rule."""

    title: str
    description: str
    steps_json: list[str]
    priority: str
    estimated_saving_quantity: Decimal | None = None
    estimated_saving_unit: str | None = None
    estimated_saving_inr: Decimal | None = None
    assumptions: str | None = None


@dataclass
class InsightCandidate:
    """Structure for an insight evaluated by deterministic rules."""

    metric_code: str
    resource_type: str | None
    severity: str
    title: str
    summary: str
    observed_value: Decimal | None
    comparison_value: Decimal | None
    change_percent: Decimal | None
    unit: str | None
    caveat: str | None
    recommendation: RecommendationCandidate | None = None


class InsightEngineService:
    """Service to evaluate rules, generate insights, and manage recommendations."""

    @staticmethod
    def generate_insights_for_month(
        db: Session,
        org_id: uuid.UUID,
        month_query: str | date,
    ) -> list[Insight]:
        """Execute deterministic insight rules and idempotently upsert insights/recommendations."""
        # 1. Parse month
        if isinstance(month_query, str):
            clean = month_query.strip()
            if len(clean) == 7:
                clean += "-01"
            try:
                selected_month = normalize_to_first_of_month(date.fromisoformat(clean))
            except Exception as err:
                raise BadRequestError(
                    f"Invalid month format '{month_query}'. Expected YYYY-MM.",
                    code="INVALID_MONTH_FORMAT",
                ) from err
        else:
            selected_month = normalize_to_first_of_month(month_query)

        # 2. Fetch organization
        org = db.scalar(select(Organization).where(Organization.id == org_id))
        if not org:
            raise NotFoundError("Organization not found.", code="ORGANIZATION_NOT_FOUND")

        prod_unit = org.production_unit or "kg"
        previous_month = get_previous_calendar_month(selected_month)

        # 3. Fetch utility records for selected and previous months
        util_stmt = select(UtilityRecord).where(
            UtilityRecord.organization_id == org_id,
            UtilityRecord.period_month.in_([selected_month, previous_month]),
        )
        util_records = list(db.scalars(util_stmt).all())
        curr_utils = {r.resource_type: r for r in util_records if r.period_month == selected_month}
        prev_utils = {r.resource_type: r for r in util_records if r.period_month == previous_month}

        # 4. Fetch production records for selected and previous months
        prod_stmt = select(ProductionRecord).where(
            ProductionRecord.organization_id == org_id,
            ProductionRecord.period_month.in_([selected_month, previous_month]),
        )
        prod_records = list(db.scalars(prod_stmt).all())
        curr_prod = next((p for p in prod_records if p.period_month == selected_month), None)
        prev_prod = next((p for p in prod_records if p.period_month == previous_month), None)

        # 5. Count total distinct months recorded in DB for data-readiness rule
        total_util_months = db.scalar(
            select(func.count(func.distinct(UtilityRecord.period_month))).where(
                UtilityRecord.organization_id == org_id
            )
        ) or 0
        total_prod_months = db.scalar(
            select(func.count(func.distinct(ProductionRecord.period_month))).where(
                ProductionRecord.organization_id == org_id
            )
        ) or 0
        total_distinct_months = max(total_util_months, total_prod_months)

        # If no records exist for this month at all
        if not curr_utils and not curr_prod:
            return []

        # 6. Perform calculations
        curr_input = MonthInputData(
            period_month=selected_month,
            resources={
                r.resource_type: ResourceData(
                    resource_type=r.resource_type,
                    quantity=r.quantity,
                    unit=r.unit,
                    amount_inr=r.amount_inr,
                )
                for r in curr_utils.values()
            },
            production_quantity=curr_prod.quantity if curr_prod else None,
            production_unit=prod_unit,
        )

        prev_input = (
            MonthInputData(
                period_month=previous_month,
                resources={
                    r.resource_type: ResourceData(
                        resource_type=r.resource_type,
                        quantity=r.quantity,
                        unit=r.unit,
                        amount_inr=r.amount_inr,
                    )
                    for r in prev_utils.values()
                },
                production_quantity=prev_prod.quantity if prev_prod else None,
                production_unit=prod_unit,
            )
            if (prev_utils or prev_prod)
            else None
        )

        calc_result = compute_month_analytics(curr_input, prev_input)

        # 7. Evaluate rules
        candidates: list[InsightCandidate] = []

        # Rule A: Missing production data
        if curr_utils and (curr_prod is None or curr_prod.quantity <= Decimal(0)):
            candidates.append(
                InsightCandidate(
                    metric_code="missing_production_data",
                    resource_type=None,
                    severity="medium",
                    title=f"Missing Production Data for {selected_month.strftime('%B %Y')}",
                    summary=(
                        f"Utility consumption was recorded for {len(curr_utils)} resource types, "
                        f"but no production volume is entered for {selected_month.strftime('%Y-%m')}. "
                        "Production-normalized intensity cannot be calculated without production volume."
                    ),
                    observed_value=None,
                    comparison_value=None,
                    change_percent=None,
                    unit=None,
                    caveat=CAVEAT_MISSING_PRODUCTION,
                    recommendation=RecommendationCandidate(
                        title="Enter Monthly Production Output",
                        description=f"Add the finished production volume for {selected_month.strftime('%B %Y')} in {prod_unit} so resource intensity can be tracked.",
                        steps_json=[
                            "Navigate to Records > Production.",
                            f"Enter the verified production volume in {prod_unit}.",
                            "Save the record and regenerate insights.",
                        ],
                        priority="high",
                    ),
                )
            )

        # Rule B: Missing cost data
        missing_cost_resources = [r.resource_type for r in curr_utils.values() if r.amount_inr is None]
        if missing_cost_resources:
            res_list = ", ".join(missing_cost_resources)
            candidates.append(
                InsightCandidate(
                    metric_code="missing_cost_data",
                    resource_type=None,
                    severity="low",
                    title="Incomplete Utility Spend Records",
                    summary=(
                        f"Utility records for {res_list} in {selected_month.strftime('%Y-%m')} "
                        "do not have invoice amounts entered. Total monthly expenditure is partial."
                    ),
                    observed_value=None,
                    comparison_value=None,
                    change_percent=None,
                    unit=None,
                    caveat=CAVEAT_MISSING_COST,
                    recommendation=RecommendationCandidate(
                        title="Enter Utility Invoice Amounts",
                        description="Enter billing amounts from utility invoices to unlock complete cost and potential monetary savings analytics.",
                        steps_json=[
                            "Gather power, water, and fuel bills for this billing cycle.",
                            "Edit the utility records to add the invoice amount in INR.",
                        ],
                        priority="low",
                    ),
                )
            )

        # Rule C: Data Readiness (only one month of data in history)
        if total_distinct_months < 2 or not prev_input:
            candidates.append(
                InsightCandidate(
                    metric_code="data_readiness_insufficient_history",
                    resource_type=None,
                    severity="low",
                    title="Establishing Efficiency Baseline",
                    summary=(
                        f"Baseline recorded for {selected_month.strftime('%B %Y')}. "
                        "At least two consecutive comparable months are required to calculate month-over-month trend curves."
                    ),
                    observed_value=None,
                    comparison_value=None,
                    change_percent=None,
                    unit=None,
                    caveat=CAVEAT_DATA_READINESS,
                    recommendation=RecommendationCandidate(
                        title="Add Historical or Subsequent Month Data",
                        description="Record utility and production data for previous months to establish comparative efficiency baselines.",
                        steps_json=[
                            "Gather previous utility bills and production logbooks.",
                            "Enter historical months in Records tab to enable month-over-month variance analytics.",
                        ],
                        priority="medium",
                    ),
                )
            )

        # Comparative Rules (only run when previous comparable period exists)
        if prev_input:
            # Rule D: Electricity Intensity Up (>= 10%)
            elec_res = calc_result.resources.get("electricity")
            if elec_res and elec_res.intensity_change_pct is not None:
                if elec_res.intensity_change_pct >= ELECTRICITY_INTENSITY_UP_THRESHOLD:
                    pct = round(elec_res.intensity_change_pct, 1)
                    sev = "high" if elec_res.intensity_change_pct >= HIGH_SEVERITY_INTENSITY_THRESHOLD else "medium"
                    candidates.append(
                        InsightCandidate(
                            metric_code="electricity_intensity_up",
                            resource_type="electricity",
                            severity=sev,
                            title=f"Electricity Intensity Increased by {pct}%",
                            summary=(
                                f"Electricity consumption per unit of production rose by {pct}% vs "
                                f"previous month ({elec_res.prev_intensity:.4f} to {elec_res.intensity:.4f} kWh/{prod_unit})."
                            ),
                            observed_value=elec_res.intensity,
                            comparison_value=elec_res.prev_intensity,
                            change_percent=elec_res.intensity_change_pct,
                            unit=f"kWh/{prod_unit}",
                            caveat=CAVEAT_HEURISTIC,
                            recommendation=RecommendationCandidate(
                                title="Review Machine Idle Time & Operating Schedules",
                                description="Review machine idle time and operating schedules. Record which equipment remains on during non-production periods where applicable.",
                                steps_json=[
                                    "Audit equipment running during non-operational hours and lunch breaks.",
                                    "Establish strict shutdown procedures for idle machinery.",
                                    "Check power factor penalty or demand surges on utility bills.",
                                ],
                                priority="medium",
                            ),
                        )
                    )
                # Rule E: Electricity Intensity Down (<= -5%, Observed Improvement)
                elif elec_res.intensity_change_pct <= ELECTRICITY_INTENSITY_DOWN_THRESHOLD:
                    pct = abs(round(elec_res.intensity_change_pct, 1))
                    saving_str = (
                        f" (Estimated potential saving: ₹{elec_res.potential_saving_inr:,.0f})"
                        if elec_res.potential_saving_inr is not None
                        else ""
                    )
                    candidates.append(
                        InsightCandidate(
                            metric_code="electricity_intensity_down",
                            resource_type="electricity",
                            severity="low",
                            title=f"Observed Electricity Reduction (-{pct}%)",
                            summary=(
                                f"Electricity consumption per unit of production decreased by {pct}% vs "
                                f"previous month ({elec_res.prev_intensity:.4f} to {elec_res.intensity:.4f} kWh/{prod_unit}). "
                                f"Observed resource reduction: {elec_res.observed_resource_reduction:,.0f} kWh{saving_str}."
                            ),
                            observed_value=elec_res.intensity,
                            comparison_value=elec_res.prev_intensity,
                            change_percent=elec_res.intensity_change_pct,
                            unit=f"kWh/{prod_unit}",
                            caveat=CAVEAT_OBSERVED_IMPROVEMENT,
                            recommendation=RecommendationCandidate(
                                title="Document & Maintain Operating Practices",
                                description="Record which operational changes, maintenance tasks, or production schedules contributed to lower consumption where applicable.",
                                steps_json=[
                                    "Log operational practices during this period in factory shift reports.",
                                    "Maintain preventative maintenance schedule for energy-efficient equipment.",
                                ],
                                priority="low",
                                estimated_saving_quantity=elec_res.observed_resource_reduction,
                                estimated_saving_unit="kWh",
                                estimated_saving_inr=elec_res.potential_saving_inr,
                                assumptions="Calculated as observed reduction multiplied by prior month unit cost.",
                            ),
                        )
                    )

            # Rule F: Water Intensity Up (>= 10%)
            water_res = calc_result.resources.get("water")
            if (
                water_res
                and water_res.intensity_change_pct is not None
            ):
                if water_res.intensity_change_pct >= WATER_INTENSITY_UP_THRESHOLD:
                    pct = round(water_res.intensity_change_pct, 1)
                    sev = "high" if water_res.intensity_change_pct >= HIGH_SEVERITY_INTENSITY_THRESHOLD else "medium"
                    candidates.append(
                        InsightCandidate(
                            metric_code="water_intensity_up",
                            resource_type="water",
                            severity=sev,
                            title=f"Water Intensity Increased by {pct}%",
                            summary=(
                                f"Water consumption per unit of production rose by {pct}% vs "
                                f"previous month ({water_res.prev_intensity:.6f} to {water_res.intensity:.6f} m³/{prod_unit})."
                            ),
                            observed_value=water_res.intensity,
                            comparison_value=water_res.prev_intensity,
                            change_percent=water_res.intensity_change_pct,
                            unit=f"m³/{prod_unit}",
                            caveat=CAVEAT_HEURISTIC,
                            recommendation=RecommendationCandidate(
                                title="Inspect Visible Leaks & Review Cleaning Cycles",
                                description="Inspect visible leaks and review cleaning / rinsing cycles. Record water use before and after the change where applicable.",
                                steps_json=[
                                    "Inspect valves, pipelines, and taps across production floors for leaks.",
                                    "Review washing and rinsing schedules for optimization opportunities.",
                                    "Consider sub-metering high-consumption washing areas.",
                                ],
                                priority="medium",
                            ),
                        )
                    )
                # Rule F2: Water Intensity Down (<= -5%, Observed Improvement)
                elif water_res.intensity_change_pct <= Decimal("-5.0"):
                    pct = abs(round(water_res.intensity_change_pct, 1))
                    saving_str = (
                        f" (Estimated potential saving: ₹{water_res.potential_saving_inr:,.0f})"
                        if water_res.potential_saving_inr is not None
                        else ""
                    )
                    candidates.append(
                        InsightCandidate(
                            metric_code="water_intensity_down",
                            resource_type="water",
                            severity="low",
                            title=f"Observed Water Reduction (-{pct}%)",
                            summary=(
                                f"Water consumption per unit of production decreased by {pct}% vs "
                                f"previous month ({water_res.prev_intensity:.6f} to {water_res.intensity:.6f} m³/{prod_unit}). "
                                f"Observed resource reduction: {water_res.observed_resource_reduction:,.2f} m³{saving_str}."
                            ),
                            observed_value=water_res.intensity,
                            comparison_value=water_res.prev_intensity,
                            change_percent=water_res.intensity_change_pct,
                            unit=f"m³/{prod_unit}",
                            caveat=CAVEAT_OBSERVED_IMPROVEMENT,
                            recommendation=RecommendationCandidate(
                                title="Maintain Water Conservation Practices",
                                description="Maintain operational improvements and leak monitoring protocols that helped reduce water intensity.",
                                steps_json=[
                                    "Document wash cycle durations and flow rate limits in plant procedures.",
                                    "Continue regular plumbing and valve inspection rounds.",
                                ],
                                priority="low",
                                estimated_saving_quantity=water_res.observed_resource_reduction,
                                estimated_saving_unit="m3",
                                estimated_saving_inr=water_res.potential_saving_inr,
                                assumptions="Calculated as observed reduction multiplied by prior month unit cost.",
                            ),
                        )
                    )

            # Rule G: Fuel Intensity Up (>= 10%)
            fuel_res = calc_result.resources.get("fuel")
            if (
                fuel_res
                and fuel_res.intensity_change_pct is not None
            ):
                if fuel_res.intensity_change_pct >= FUEL_INTENSITY_UP_THRESHOLD:
                    pct = round(fuel_res.intensity_change_pct, 1)
                    sev = "high" if fuel_res.intensity_change_pct >= HIGH_SEVERITY_INTENSITY_THRESHOLD else "medium"
                    candidates.append(
                        InsightCandidate(
                            metric_code="fuel_intensity_up",
                            resource_type="fuel",
                            severity=sev,
                            title=f"Fuel Intensity Increased by {pct}%",
                            summary=(
                                f"Fuel consumption per unit of production rose by {pct}% vs "
                                f"previous month ({fuel_res.prev_intensity:.4f} to {fuel_res.intensity:.4f} L/{prod_unit})."
                            ),
                            observed_value=fuel_res.intensity,
                            comparison_value=fuel_res.prev_intensity,
                            change_percent=fuel_res.intensity_change_pct,
                            unit=f"L/{prod_unit}",
                            caveat=CAVEAT_HEURISTIC,
                            recommendation=RecommendationCandidate(
                                title="Review Generator & Boiler Runtime Logs",
                                description="Review generator or boiler runtime, operating schedules and maintenance logs where applicable.",
                                steps_json=[
                                    "Cross-reference fuel purchase dates with diesel generator runtime logs.",
                                    "Check boiler insulation, steam traps, and air-fuel burner ratios.",
                                    "Schedule preventative maintenance for diesel generators.",
                                ],
                                priority="medium",
                            ),
                        )
                    )
                # Rule G2: Fuel Intensity Down (<= -5%, Observed Improvement)
                elif fuel_res.intensity_change_pct <= Decimal("-5.0"):
                    pct = abs(round(fuel_res.intensity_change_pct, 1))
                    saving_str = (
                        f" (Estimated potential saving: ₹{fuel_res.potential_saving_inr:,.0f})"
                        if fuel_res.potential_saving_inr is not None
                        else ""
                    )
                    candidates.append(
                        InsightCandidate(
                            metric_code="fuel_intensity_down",
                            resource_type="fuel",
                            severity="low",
                            title=f"Observed Fuel Reduction (-{pct}%)",
                            summary=(
                                f"Fuel consumption per unit of production decreased by {pct}% vs "
                                f"previous month ({fuel_res.prev_intensity:.4f} to {fuel_res.intensity:.4f} L/{prod_unit}). "
                                f"Observed resource reduction: {fuel_res.observed_resource_reduction:,.1f} L{saving_str}."
                            ),
                            observed_value=fuel_res.intensity,
                            comparison_value=fuel_res.prev_intensity,
                            change_percent=fuel_res.intensity_change_pct,
                            unit=f"L/{prod_unit}",
                            caveat=CAVEAT_OBSERVED_IMPROVEMENT,
                            recommendation=RecommendationCandidate(
                                title="Maintain Fuel Optimization Practices",
                                description="Continue preventative maintenance and runtime monitoring that contributed to reduced fuel usage.",
                                steps_json=[
                                    "Continue logging generator operating hours against grid availability.",
                                    "Inspect burner air-fuel ratio during monthly maintenance rounds.",
                                ],
                                priority="low",
                                estimated_saving_quantity=fuel_res.observed_resource_reduction,
                                estimated_saving_unit="L",
                                estimated_saving_inr=fuel_res.potential_saving_inr,
                                assumptions="Calculated as observed reduction multiplied by prior month unit cost.",
                            ),
                        )
                    )

            # Rule H: Stable Operational Efficiency (Baseline Consistency)
            # When comparative data is available and no resource breached anomaly thresholds
            comparative_candidates = [
                c for c in candidates if c.metric_code in (
                    "electricity_intensity_up", "electricity_intensity_down",
                    "water_intensity_up", "water_intensity_down",
                    "fuel_intensity_up", "fuel_intensity_down",
                )
            ]
            if not comparative_candidates and curr_utils and curr_prod and curr_prod.quantity > Decimal(0):
                tracked_res_names = [r.title() for r in curr_utils.keys()]
                res_display = ", ".join(tracked_res_names)
                candidates.append(
                    InsightCandidate(
                        metric_code="stable_resource_intensity",
                        resource_type=None,
                        severity="low",
                        title=f"Stable Resource Efficiency for {selected_month.strftime('%B %Y')}",
                        summary=(
                            f"Resource intensity for {res_display} operated within normal baseline variance "
                            f"(under ±5% change) vs previous month at a production volume of {curr_prod.quantity:,.0f} {prod_unit}. "
                            "Consumption patterns remain consistent and well-controlled."
                        ),
                        observed_value=curr_prod.quantity,
                        comparison_value=prev_prod.quantity if prev_prod else None,
                        change_percent=None,
                        unit=prod_unit,
                        caveat=CAVEAT_HEURISTIC,
                        recommendation=RecommendationCandidate(
                            title="Maintain Standard Operating Procedures",
                            description="Continue existing energy and resource operating procedures while monitoring for seasonal demand shifts.",
                            steps_json=[
                                "Review monthly consumption baselines during regular management meetings.",
                                "Keep preventative maintenance schedules updated for high-uptime machinery.",
                                "Ensure equipment shutdown checklists are followed across production shifts.",
                            ],
                            priority="low",
                        ),
                    )
                )

        # 8. AI Explanation and Idempotent Database Upsert
        provider, provider_name = get_explanation_provider(allow_external_ai=org.allow_external_ai)

        # Fetch existing insights for (org_id, selected_month)
        existing_insights = list(
            db.scalars(
                select(Insight).where(
                    Insight.organization_id == org_id,
                    Insight.period_month == selected_month,
                )
            ).all()
        )
        existing_by_code = {i.metric_code: i for i in existing_insights}

        persisted_insights: list[Insight] = []

        for cand in candidates:
            source_type = "rules"

            # If user consented to external AI, attempt structured explanation
            if org.allow_external_ai and provider_name == "openai":
                facts = InsightFacts(
                    industry=org.industry or "other",
                    period_month=selected_month,
                    metric_code=cand.metric_code,
                    resource_type=cand.resource_type,
                    calculated_quantity=cand.observed_value,
                    canonical_unit=cand.unit,
                    production_quantity=curr_input.production_quantity,
                    production_unit=prod_unit,
                    calculated_intensity=cand.observed_value,
                    comparison_value=cand.comparison_value,
                    change_percent=cand.change_percent,
                    data_quality_caveats=[cand.caveat] if cand.caveat else [],
                    allowed_recommendation_categories=[cand.metric_code],
                )
                try:
                    explanation = provider.explain_insights(facts)
                    cand.summary = explanation.summary
                    if cand.recommendation and explanation.next_steps:
                        cand.recommendation.steps_json = explanation.next_steps
                    cand.caveat = explanation.caveat
                    source_type = "ai_assisted"
                    db.add(
                        AiGenerationLog(
                            organization_id=org_id,
                            provider="openai",
                            period_month=selected_month,
                            status="success",
                            engine_version=ENGINE_VERSION,
                        )
                    )
                except AiProviderError as err:
                    logger.info("AI provider fallback triggered (%s): %s", err.category, err)
                    source_type = "rules"
                    db.add(
                        AiGenerationLog(
                            organization_id=org_id,
                            provider="openai",
                            period_month=selected_month,
                            status="fallback",
                            error_category=err.category,
                            engine_version=ENGINE_VERSION,
                        )
                    )
                except Exception as err:
                    logger.warning("Unexpected error during AI generation: %s", err)
                    source_type = "rules"
                    db.add(
                        AiGenerationLog(
                            organization_id=org_id,
                            provider="openai",
                            period_month=selected_month,
                            status="fallback",
                            error_category="unexpected_error",
                            engine_version=ENGINE_VERSION,
                        )
                    )
            elif not org.allow_external_ai and provider_name == "rules":
                # Deterministic rules audit log
                db.add(
                    AiGenerationLog(
                        organization_id=org_id,
                        provider="rules",
                        period_month=selected_month,
                        status="success",
                        engine_version=ENGINE_VERSION,
                    )
                )

            insight = existing_by_code.get(cand.metric_code)
            if insight:
                # Update existing insight
                insight.severity = cand.severity
                insight.title = cand.title
                insight.summary = cand.summary
                insight.observed_value = cand.observed_value
                insight.comparison_value = cand.comparison_value
                insight.change_percent = cand.change_percent
                insight.unit = cand.unit
                insight.source_type = source_type
                insight.caveat = cand.caveat
                insight.engine_version = ENGINE_VERSION
            else:
                # Create new insight
                insight = Insight(
                    organization_id=org_id,
                    period_month=selected_month,
                    metric_code=cand.metric_code,
                    resource_type=cand.resource_type,
                    severity=cand.severity,
                    title=cand.title,
                    summary=cand.summary,
                    observed_value=cand.observed_value,
                    comparison_value=cand.comparison_value,
                    change_percent=cand.change_percent,
                    unit=cand.unit,
                    source_type=source_type,
                    caveat=cand.caveat,
                    engine_version=ENGINE_VERSION,
                )
                db.add(insight)

            db.flush()  # Ensure insight.id is available

            # Recommendation management
            if cand.recommendation:
                rec_cand = cand.recommendation
                existing_rec = db.scalar(
                    select(Recommendation).where(
                        Recommendation.organization_id == org_id,
                        Recommendation.insight_id == insight.id,
                    )
                )

                if existing_rec:
                    # Only update if in 'proposed' status; preserve user decision if accepted/dismissed
                    if existing_rec.status == "proposed":
                        existing_rec.title = rec_cand.title
                        existing_rec.description = rec_cand.description
                        existing_rec.steps_json = rec_cand.steps_json
                        existing_rec.priority = rec_cand.priority
                        existing_rec.estimated_saving_quantity = rec_cand.estimated_saving_quantity
                        existing_rec.estimated_saving_unit = rec_cand.estimated_saving_unit
                        existing_rec.estimated_saving_inr = rec_cand.estimated_saving_inr
                        existing_rec.assumptions = rec_cand.assumptions
                else:
                    new_rec = Recommendation(
                        organization_id=org_id,
                        insight_id=insight.id,
                        title=rec_cand.title,
                        description=rec_cand.description,
                        steps_json=rec_cand.steps_json,
                        priority=rec_cand.priority,
                        status="proposed",
                        estimated_saving_quantity=rec_cand.estimated_saving_quantity,
                        estimated_saving_unit=rec_cand.estimated_saving_unit,
                        estimated_saving_inr=rec_cand.estimated_saving_inr,
                        assumptions=rec_cand.assumptions,
                    )
                    db.add(new_rec)

            persisted_insights.append(insight)

        db.commit()

        # Reload with relationships
        refreshed = list(
            db.scalars(
                select(Insight).where(
                    Insight.organization_id == org_id,
                    Insight.period_month == selected_month,
                ).order_by(Insight.created_at.desc())
            ).all()
        )
        return refreshed

    @staticmethod
    def generate_insights_for_range(
        db: Session,
        org_id: uuid.UUID,
        start_month_str: str,
        end_month_str: str,
    ) -> list[Insight]:
        """Generate insights for every calendar month in the date range (inclusive)."""
        clean_start = start_month_str.strip()
        if len(clean_start) == 7:
            clean_start += "-01"
        clean_end = end_month_str.strip()
        if len(clean_end) == 7:
            clean_end += "-01"

        try:
            start_date = normalize_to_first_of_month(date.fromisoformat(clean_start))
            end_date = normalize_to_first_of_month(date.fromisoformat(clean_end))
        except Exception as err:
            raise BadRequestError(
                f"Invalid date range format '{start_month_str}' to '{end_month_str}'. Expected YYYY-MM.",
                code="INVALID_DATE_RANGE",
            ) from err

        months = get_months_in_range(start_date, end_date)
        all_insights: list[Insight] = []

        for m in months:
            m_query = m.strftime("%Y-%m")
            insights = InsightEngineService.generate_insights_for_month(
                db=db,
                org_id=org_id,
                month_query=m_query,
            )
            all_insights.extend(insights)

        return all_insights

    @staticmethod
    def list_insights(
        db: Session,
        org_id: uuid.UUID,
        month_query: str | None = None,
        start_month: str | None = None,
        end_month: str | None = None,
    ) -> list[Insight]:
        """List saved insights filtered by organization and optional month or date range."""
        stmt = select(Insight).where(Insight.organization_id == org_id)

        if start_month or end_month:
            if start_month:
                clean_s = start_month.strip()
                if len(clean_s) == 7:
                    clean_s += "-01"
                try:
                    s_date = normalize_to_first_of_month(date.fromisoformat(clean_s))
                    stmt = stmt.where(Insight.period_month >= s_date)
                except Exception as err:
                    raise BadRequestError(
                        f"Invalid start_month '{start_month}'. Expected YYYY-MM.",
                        code="INVALID_MONTH_FORMAT",
                    ) from err
            if end_month:
                clean_e = end_month.strip()
                if len(clean_e) == 7:
                    clean_e += "-01"
                try:
                    e_date = normalize_to_first_of_month(date.fromisoformat(clean_e))
                    stmt = stmt.where(Insight.period_month <= e_date)
                except Exception as err:
                    raise BadRequestError(
                        f"Invalid end_month '{end_month}'. Expected YYYY-MM.",
                        code="INVALID_MONTH_FORMAT",
                    ) from err
        elif month_query:
            try:
                clean = month_query.strip()
                if len(clean) == 7:
                    clean += "-01"
                filter_date = normalize_to_first_of_month(date.fromisoformat(clean))
                stmt = stmt.where(Insight.period_month == filter_date)
            except Exception as err:
                raise BadRequestError(
                    f"Invalid month format '{month_query}'. Expected YYYY-MM.",
                    code="INVALID_MONTH_FORMAT",
                ) from err

        stmt = stmt.order_by(Insight.period_month.desc(), Insight.created_at.desc())
        return list(db.scalars(stmt).all())

    @staticmethod
    def list_recommendations(
        db: Session,
        org_id: uuid.UUID,
        status: str | None = None,
        priority: str | None = None,
    ) -> list[Recommendation]:
        """List recommendations filtered by organization, status, and priority."""
        stmt = select(Recommendation).where(Recommendation.organization_id == org_id)

        if status:
            stmt = stmt.where(Recommendation.status == status)
        if priority:
            stmt = stmt.where(Recommendation.priority == priority)

        stmt = stmt.order_by(Recommendation.created_at.desc())
        return list(db.scalars(stmt).all())

    @staticmethod
    def accept_recommendation(
        db: Session,
        org_id: uuid.UUID,
        recommendation_id: uuid.UUID,
        user_id: uuid.UUID | None = None,
    ) -> Recommendation:
        """Accept recommendation and idempotently create a linked pending action."""
        rec = db.scalar(
            select(Recommendation).where(
                Recommendation.id == recommendation_id,
                Recommendation.organization_id == org_id,
            )
        )
        if not rec:
            raise NotFoundError("Recommendation not found.", code="RECOMMENDATION_NOT_FOUND")

        # Set status to accepted
        rec.status = "accepted"

        # Check if action already created for this recommendation
        existing_action = db.scalar(
            select(Action).where(
                Action.organization_id == org_id,
                Action.recommendation_id == rec.id,
            )
        )

        if not existing_action:
            action = Action(
                organization_id=org_id,
                recommendation_id=rec.id,
                title=rec.title,
                description=rec.description,
                status="pending",
                created_by=user_id,
            )
            db.add(action)

        db.commit()
        db.refresh(rec)
        return rec

    @staticmethod
    def dismiss_recommendation(
        db: Session,
        org_id: uuid.UUID,
        recommendation_id: uuid.UUID,
    ) -> Recommendation:
        """Dismiss a recommendation."""
        rec = db.scalar(
            select(Recommendation).where(
                Recommendation.id == recommendation_id,
                Recommendation.organization_id == org_id,
            )
        )
        if not rec:
            raise NotFoundError("Recommendation not found.", code="RECOMMENDATION_NOT_FOUND")

        rec.status = "dismissed"
        db.commit()
        db.refresh(rec)
        return rec
