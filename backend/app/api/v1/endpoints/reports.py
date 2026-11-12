"""Reports and CSV export endpoints."""

import re

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.report import MonthlyReportResponse
from app.services.report_service import (
    generate_analytics_csv,
    generate_monthly_csv,
    generate_monthly_report,
)

router = APIRouter(tags=["reports"])


def safe_filename_segment(val: str) -> str:
    """Sanitize string for safe inclusion in download filenames."""
    return re.sub(r"[^a-zA-Z0-9_\-]", "_", val)


@router.get(
    "/reports/monthly",
    response_model=MonthlyReportResponse,
    summary="Get monthly summary report JSON",
)
def get_monthly_report_data(
    month: str = Query(..., description="Calendar month in YYYY-MM format"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MonthlyReportResponse:
    """Generate structured monthly performance report."""
    return generate_monthly_report(
        db=db,
        organization_id=current_user.organization_id,
        month_str=month,
    )


@router.get(
    "/reports/monthly.csv",
    summary="Download monthly summary CSV (dot syntax)",
)
@router.get(
    "/reports/monthly/csv",
    summary="Download monthly summary CSV (slash syntax)",
)
def download_monthly_report_csv(
    month: str = Query(..., description="Calendar month in YYYY-MM format"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Download RFC 4180 monthly summary CSV export."""
    report = generate_monthly_report(
        db=db,
        organization_id=current_user.organization_id,
        month_str=month,
    )
    csv_content = generate_monthly_csv(report)
    clean_month = safe_filename_segment(month)
    filename = f"synergyx_monthly_report_{clean_month}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
        },
    )


@router.get(
    "/reports/analytics.csv",
    summary="Download analytics CSV export (dot syntax)",
)
@router.get(
    "/reports/analytics/csv",
    summary="Download analytics CSV export (slash syntax)",
)
def download_analytics_report_csv(
    from_month: str | None = Query(None, alias="from", description="Start month YYYY-MM"),
    to_month: str | None = Query(None, alias="to", description="End month YYYY-MM"),
    resource_type: str | None = Query(None, description="Resource type filter"),
    metric: str = Query("consumption", description="Metric mode"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Download RFC 4180 analytics history CSV export."""
    csv_content = generate_analytics_csv(
        db=db,
        current_user=current_user,
        from_month=from_month,
        to_month=to_month,
        resource_type=resource_type,
        metric=metric,
    )

    filename = "synergyx_analytics_export.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
        },
    )
