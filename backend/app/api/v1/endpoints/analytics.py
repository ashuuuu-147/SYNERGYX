"""Analytics API endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.analytics import AnalyticsResponse, MetricTypeFilter, ResourceTypeFilter
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("", response_model=AnalyticsResponse)
def get_analytics(
    from_month: str | None = Query(None, alias="from", description="Start month in YYYY-MM format"),
    to_month: str | None = Query(None, alias="to", description="End month in YYYY-MM format"),
    resource_type: ResourceTypeFilter = Query("all", description="Resource type filter"),
    metric: MetricTypeFilter = Query("consumption", description="Metric type filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnalyticsResponse:
    """Fetch multi-month analytics time series, summary table, and totals with gap preservation."""
    return AnalyticsService.get_analytics(
        db=db,
        current_user=current_user,
        from_str=from_month,
        to_str=to_month,
        resource_type=resource_type,
        metric=metric,
    )

