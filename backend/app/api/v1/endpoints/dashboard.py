"""Dashboard API endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardSummaryResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    month: str | None = Query(None, description="Billing month in YYYY-MM format"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardSummaryResponse:
    """Fetch monthly dashboard summary metrics, KPIs, coverage, and recent activity."""
    return DashboardService.get_dashboard_summary(
        db=db,
        current_user=current_user,
        month_query=month,
    )
