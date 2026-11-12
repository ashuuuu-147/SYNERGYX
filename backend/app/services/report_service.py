"""Report generation service for SYNERGYX.

Synthesizes saved utility records, production volumes, deterministic intensities,
active insights, recommendations, and action statuses into structured reports
and formula-injection-safe RFC 4180 CSV exports.
"""

import csv
import io
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.action import Action
from app.models.insight import Insight
from app.models.organization import Organization
from app.models.production_record import ProductionRecord
from app.models.recommendation import Recommendation
from app.models.user import User
from app.models.utility_record import UtilityRecord
from app.schemas.report import (
    ActionReportItem,
    InsightReportItem,
    MonthlyReportResponse,
    RecommendationReportItem,
    ReportMetadata,
    ReportSummary,
    UtilityReportItem,
)
from app.services.analytics_service import AnalyticsService
from app.services.calculations import (
    calculate_change_percent,
    calculate_intensity,
)

RESOURCE_UNITS = {
    "electricity": "kWh",
    "water": "m3",
    "fuel": "L",
}


def sanitize_csv_cell(val: Any) -> Any:
    """Protect against CSV formula injection (RFC 4180 / OWASP recommendations).

    Prefixes dangerous leading characters ('=', '+', '-', '@', '\t', '\r')
    with a single quote unless the value represents a valid numeric constant.
    """
    if val is None:
        return ""
    if isinstance(val, (int, float, Decimal)):
        return str(val)
    s = str(val).strip()
    if not s:
        return ""
    if s[0] in ("=", "+", "-", "@", "\t", "\r"):
        try:
            Decimal(s)
            return s
        except Exception:
            return f"'{s}"
    return s


def parse_month_string(month_str: str) -> tuple[date, date]:
    """Parse YYYY-MM string and return (current_month_start, previous_month_start)."""
    try:
        parts = month_str.split("-")
        if len(parts) != 2:
            raise ValueError
        year = int(parts[0])
        month = int(parts[1])
        if not (1 <= month <= 12):
            raise ValueError
        curr_start = date(year, month, 1)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid month format '{month_str}'. Expected YYYY-MM.",
        ) from exc

    prev_year = year - 1 if month == 1 else year
    prev_month = 12 if month == 1 else month - 1
    prev_start = date(prev_year, prev_month, 1)
    return curr_start, prev_start


def generate_monthly_report(
    db: Session,
    organization_id: UUID,
    month_str: str,
) -> MonthlyReportResponse:
    """Generate structured monthly performance report data."""
    curr_start, prev_start = parse_month_string(month_str)

    # 1. Fetch organization
    org = db.execute(
        select(Organization).where(Organization.id == organization_id)
    ).scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    location_str = f"{org.location}, {org.country_code}" if org.country_code else org.location

    # 2. Fetch production records for current and previous month
    curr_prod = db.execute(
        select(ProductionRecord).where(
            ProductionRecord.organization_id == organization_id,
            ProductionRecord.period_month == curr_start,
        )
    ).scalar_one_or_none()

    prev_prod = db.execute(
        select(ProductionRecord).where(
            ProductionRecord.organization_id == organization_id,
            ProductionRecord.period_month == prev_start,
        )
    ).scalar_one_or_none()

    curr_prod_qty = curr_prod.quantity if curr_prod else None
    prev_prod_qty = prev_prod.quantity if prev_prod else None

    # 3. Fetch utility records for current and previous month
    curr_utils = db.execute(
        select(UtilityRecord).where(
            UtilityRecord.organization_id == organization_id,
            UtilityRecord.period_month == curr_start,
        )
    ).scalars().all()
    curr_utils_map = {u.resource_type: u for u in curr_utils}

    prev_utils = db.execute(
        select(UtilityRecord).where(
            UtilityRecord.organization_id == organization_id,
            UtilityRecord.period_month == prev_start,
        )
    ).scalars().all()
    prev_utils_map = {u.resource_type: u for u in prev_utils}

    # 4. Build utility report items
    utility_items: list[UtilityReportItem] = []
    has_missing_data = curr_prod_qty is None

    for res_type in ["electricity", "water", "fuel"]:
        unit = RESOURCE_UNITS[res_type]
        intensity_unit = f"{unit}/{org.production_unit}"
        rec_curr = curr_utils_map.get(res_type)
        rec_prev = prev_utils_map.get(res_type)

        if not rec_curr:
            has_missing_data = True
            utility_items.append(
                UtilityReportItem(
                    resource_type=res_type,
                    quantity=None,
                    unit=unit,
                    spend_inr=None,
                    intensity=None,
                    intensity_unit=intensity_unit,
                    mom_quantity_change_pct=None,
                    mom_intensity_change_pct=None,
                    notes=None,
                )
            )
            continue

        if rec_curr.amount_inr is None:
            has_missing_data = True

        # Calculate intensity
        intensity = None
        if curr_prod_qty is not None:
            intensity = calculate_intensity(rec_curr.quantity, curr_prod_qty)

        # Calculate MoM quantity change
        mom_qty_pct = None
        if rec_prev and rec_prev.quantity is not None:
            mom_qty_pct = calculate_change_percent(rec_curr.quantity, rec_prev.quantity)

        # Calculate MoM intensity change
        mom_intensity_pct = None
        if (
            intensity is not None
            and rec_prev
            and rec_prev.quantity is not None
            and prev_prod_qty is not None
        ):
            prev_intensity = calculate_intensity(rec_prev.quantity, prev_prod_qty)
            if prev_intensity is not None:
                mom_intensity_pct = calculate_change_percent(intensity, prev_intensity)

        utility_items.append(
            UtilityReportItem(
                resource_type=res_type,
                quantity=rec_curr.quantity,
                unit=unit,
                spend_inr=rec_curr.amount_inr,
                intensity=intensity,
                intensity_unit=intensity_unit,
                mom_quantity_change_pct=mom_qty_pct,
                mom_intensity_change_pct=mom_intensity_pct,
                notes=rec_curr.notes,
            )
        )

    # 5. Summary calculations
    spend_amounts = [u.spend_inr for u in utility_items if u.spend_inr is not None]
    total_spend = sum(spend_amounts, Decimal(0))
    spend_coverage = f"{len(spend_amounts)} of 3 utility types recorded"

    # 6. Fetch insights
    insights_db = db.execute(
        select(Insight).where(
            Insight.organization_id == organization_id,
            Insight.period_month == curr_start,
        )
    ).scalars().all()

    insight_items = [
        InsightReportItem(
            title=ins.title,
            severity=ins.severity,
            resource_type=ins.resource_type,
            description=ins.summary,
            source=ins.source_type,
            caveat=ins.caveat,
        )
        for ins in insights_db
    ]

    # 7. Fetch recommendations
    recs_db = db.execute(
        select(Recommendation).where(
            Recommendation.organization_id == organization_id
        ).order_by(Recommendation.created_at.desc())
    ).scalars().all()

    rec_items = [
        RecommendationReportItem(
            title=r.title,
            priority=r.priority,
            status=r.status,
            potential_saving_inr=r.estimated_saving_inr,
            practical_action=r.description,
        )
        for r in recs_db
    ]

    # 8. Fetch actions
    actions_db = db.execute(
        select(Action).where(
            Action.organization_id == organization_id
        ).order_by(Action.created_at.desc())
    ).scalars().all()

    active_actions_count = sum(
        1 for a in actions_db if a.status in ("pending", "in_progress")
    )

    action_items = [
        ActionReportItem(
            title=a.title,
            status=a.status,
            due_date=a.due_date,
            completed_at=a.completed_at,
        )
        for a in actions_db
    ]

    # 9. Formulate caveats
    caveats = [
        "Operational resource summary based strictly on user-entered utility bills and production logs; not an externally certified ESG assurance report."
    ]
    if curr_prod_qty is None:
        caveats.append(
            "Production volume not recorded for this month; resource intensities could not be computed."
        )
    if len(spend_amounts) < 3:
        caveats.append(
            "Partial expenditure coverage: spend totals exclude utility resources with missing bill amounts."
        )
    if any(u.quantity is None for u in utility_items):
        caveats.append(
            "Incomplete utility recording: one or more utility resource types were not recorded for this month."
        )
    if any(u.mom_quantity_change_pct is None for u in utility_items if u.quantity is not None):
        caveats.append(
            "MoM change rates are omitted where the previous month's baseline was unrecorded or zero."
        )

    return MonthlyReportResponse(
        metadata=ReportMetadata(
            organization_name=org.name,
            industry=org.industry,
            location=location_str,
            report_month=month_str,
            generated_at=datetime.now(UTC),
            production_unit=org.production_unit,
        ),
        summary=ReportSummary(
            production_quantity=curr_prod_qty,
            production_unit=org.production_unit,
            total_spend_inr=total_spend,
            spend_coverage=spend_coverage,
            active_actions_count=active_actions_count,
            has_missing_data=has_missing_data,
        ),
        utilities=utility_items,
        insights=insight_items,
        recommendations=rec_items,
        actions=action_items,
        caveats=caveats,
    )


def generate_monthly_csv(report: MonthlyReportResponse) -> str:
    """Render monthly report into RFC 4180 CSV string with formula injection protection."""
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    # Header / Meta
    writer.writerow([sanitize_csv_cell("SYNERGYX MONTHLY RESOURCE & UTILITY REPORT")])
    writer.writerow(["Organization", sanitize_csv_cell(report.metadata.organization_name)])
    writer.writerow(["Industry", sanitize_csv_cell(report.metadata.industry)])
    writer.writerow(["Location", sanitize_csv_cell(report.metadata.location or "Not specified")])
    writer.writerow(["Report Month", sanitize_csv_cell(report.metadata.report_month)])
    writer.writerow(["Generated At (UTC)", sanitize_csv_cell(report.metadata.generated_at.isoformat())])
    writer.writerow(["Notice", sanitize_csv_cell("Internal operational summary. User-submitted data. Not a certified ESG report.")])
    writer.writerow([])

    # Summary
    writer.writerow([sanitize_csv_cell("SUMMARY METRICS")])
    writer.writerow([
        "Production Volume",
        sanitize_csv_cell(report.summary.production_quantity),
        sanitize_csv_cell(report.summary.production_unit),
    ])
    writer.writerow([
        "Total Utility Spend (INR)",
        sanitize_csv_cell(report.summary.total_spend_inr),
    ])
    writer.writerow([
        "Spend Coverage",
        sanitize_csv_cell(report.summary.spend_coverage),
    ])
    writer.writerow([
        "Active Open Actions",
        sanitize_csv_cell(report.summary.active_actions_count),
    ])
    writer.writerow([])

    # Utilities
    writer.writerow([sanitize_csv_cell("UTILITY CONSUMPTION & INTENSITIES")])
    writer.writerow([
        "Resource",
        "Unit",
        "Consumption",
        "Spend (INR)",
        "Intensity",
        "Intensity Unit",
        "MoM Consumption Change %",
        "MoM Intensity Change %",
        "Notes",
    ])
    for u in report.utilities:
        writer.writerow([
            sanitize_csv_cell(u.resource_type.capitalize()),
            sanitize_csv_cell(u.unit),
            sanitize_csv_cell(u.quantity),
            sanitize_csv_cell(u.spend_inr),
            sanitize_csv_cell(u.intensity),
            sanitize_csv_cell(u.intensity_unit),
            sanitize_csv_cell(u.mom_quantity_change_pct),
            sanitize_csv_cell(u.mom_intensity_change_pct),
            sanitize_csv_cell(u.notes or ""),
        ])
    writer.writerow([])

    # Insights
    writer.writerow([sanitize_csv_cell("ACTIVE INSIGHTS")])
    writer.writerow(["Severity", "Title", "Resource", "Source", "Description", "Caveat"])
    if report.insights:
        for ins in report.insights:
            writer.writerow([
                sanitize_csv_cell(ins.severity.upper()),
                sanitize_csv_cell(ins.title),
                sanitize_csv_cell(ins.resource_type or "general"),
                sanitize_csv_cell(ins.source),
                sanitize_csv_cell(ins.description),
                sanitize_csv_cell(ins.caveat or ""),
            ])
    else:
        writer.writerow(["None", "No automated insights generated for this period", "", "", "", ""])
    writer.writerow([])

    # Recommendations
    writer.writerow([sanitize_csv_cell("RECOMMENDATIONS")])
    writer.writerow(["Priority", "Title", "Status", "Potential Saving (INR)", "Practical Action"])
    if report.recommendations:
        for rec in report.recommendations:
            writer.writerow([
                sanitize_csv_cell(rec.priority.upper()),
                sanitize_csv_cell(rec.title),
                sanitize_csv_cell(rec.status),
                sanitize_csv_cell(rec.potential_saving_inr),
                sanitize_csv_cell(rec.practical_action or ""),
            ])
    else:
        writer.writerow(["None", "No recommendations recorded", "", "", ""])
    writer.writerow([])

    # Actions
    writer.writerow([sanitize_csv_cell("ACTION TRACKER")])
    writer.writerow(["Title", "Status", "Due Date", "Completed At"])
    if report.actions:
        for act in report.actions:
            writer.writerow([
                sanitize_csv_cell(act.title),
                sanitize_csv_cell(act.status),
                sanitize_csv_cell(act.due_date.isoformat() if act.due_date else ""),
                sanitize_csv_cell(act.completed_at.isoformat() if act.completed_at else ""),
            ])
    else:
        writer.writerow(["No actions recorded", "", "", ""])
    writer.writerow([])

    # Caveats
    writer.writerow([sanitize_csv_cell("DATA QUALITY NOTES & CAVEATS")])
    for cav in report.caveats:
        writer.writerow([sanitize_csv_cell(f"- {cav}")])

    return output.getvalue()


def generate_analytics_csv(
    db: Session,
    current_user: User,
    from_month: str | None,
    to_month: str | None,
    resource_type: str | None,
    metric: str,
) -> str:
    """Render historical analytics data into RFC 4180 CSV string."""
    res_filter: Any = resource_type if resource_type in ("electricity", "water", "fuel") else "all"
    metric_filter: Any = metric if metric in ("consumption", "intensity", "spend") else "consumption"

    analytics = AnalyticsService.get_analytics(
        db=db,
        current_user=current_user,
        from_str=from_month,
        to_str=to_month,
        resource_type=res_filter,
        metric=metric_filter,
    )

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    # Title & Metadata
    writer.writerow([sanitize_csv_cell("SYNERGYX HISTORICAL ANALYTICS EXPORT")])
    writer.writerow(["From Month", sanitize_csv_cell(analytics.from_month)])
    writer.writerow(["To Month", sanitize_csv_cell(analytics.to_month)])
    writer.writerow(["Resource Filter", sanitize_csv_cell(analytics.resource_type)])
    writer.writerow(["Metric Mode", sanitize_csv_cell(analytics.metric)])
    writer.writerow(["Production Unit", sanitize_csv_cell(analytics.production_unit)])
    writer.writerow([])

    # Monthly Series Table
    writer.writerow([
        "Month",
        "Electricity (kWh)",
        "Water (m3)",
        "Fuel (L)",
        "Production Volume",
        "Electricity Intensity (kWh/unit)",
        "Water Intensity (m3/unit)",
        "Fuel Intensity (L/unit)",
        "Electricity Spend (INR)",
        "Water Spend (INR)",
        "Fuel Spend (INR)",
        "Total Spend (INR)",
    ])

    for pt in analytics.series:
        writer.writerow([
            sanitize_csv_cell(pt.month_str),
            sanitize_csv_cell(pt.electricity.quantity if pt.electricity else None),
            sanitize_csv_cell(pt.water.quantity if pt.water else None),
            sanitize_csv_cell(pt.fuel.quantity if pt.fuel else None),
            sanitize_csv_cell(pt.production_quantity),
            sanitize_csv_cell(pt.electricity.intensity if pt.electricity else None),
            sanitize_csv_cell(pt.water.intensity if pt.water else None),
            sanitize_csv_cell(pt.fuel.intensity if pt.fuel else None),
            sanitize_csv_cell(pt.electricity.amount_inr if pt.electricity else None),
            sanitize_csv_cell(pt.water.amount_inr if pt.water else None),
            sanitize_csv_cell(pt.fuel.amount_inr if pt.fuel else None),
            sanitize_csv_cell(pt.total_spend_inr),
        ])
    writer.writerow([])

    # Totals
    writer.writerow([sanitize_csv_cell("PERIOD TOTALS & AVERAGES")])
    writer.writerow(["Total Production", sanitize_csv_cell(analytics.totals.total_production), sanitize_csv_cell(analytics.production_unit)])
    writer.writerow(["Total Electricity (kWh)", sanitize_csv_cell(analytics.totals.total_electricity_kwh)])
    writer.writerow(["Total Water (m3)", sanitize_csv_cell(analytics.totals.total_water_m3)])
    writer.writerow(["Total Fuel (L)", sanitize_csv_cell(analytics.totals.total_fuel_l)])
    writer.writerow(["Total Spend (INR)", sanitize_csv_cell(analytics.totals.total_spend_inr)])
    writer.writerow(["Avg Electricity Intensity", sanitize_csv_cell(analytics.totals.avg_electricity_intensity)])
    writer.writerow(["Avg Water Intensity", sanitize_csv_cell(analytics.totals.avg_water_intensity)])
    writer.writerow(["Avg Fuel Intensity", sanitize_csv_cell(analytics.totals.avg_fuel_intensity)])

    return output.getvalue()
