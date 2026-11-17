"""Insights API endpoints."""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.errors import BadRequestError
from app.db.session import get_db
from app.models.user import User
from app.schemas.insight import InsightGenerateResponse, InsightResponse
from app.services.insight_engine import ENGINE_VERSION, InsightEngineService
from app.services.utility_service import normalize_to_first_of_month

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("", response_model=list[InsightResponse])
def list_insights(
    month: str | None = Query(None, description="Filter insights by single month (YYYY-MM)"),
    start_month: str | None = Query(None, description="Start month of range (YYYY-MM)"),
    end_month: str | None = Query(None, description="End month of range (YYYY-MM)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[InsightResponse]:
    """List saved insights for the current organization, optionally filtered by month or month range."""
    return InsightEngineService.list_insights(
        db=db,
        org_id=current_user.organization_id,
        month_query=month,
        start_month=start_month,
        end_month=end_month,
    )


@router.post("/generate", response_model=InsightGenerateResponse)
def generate_insights(
    month: str | None = Query(None, description="Target month for single-month generation (YYYY-MM)"),
    start_month: str | None = Query(None, description="Start month of range (YYYY-MM)"),
    end_month: str | None = Query(None, description="End month of range (YYYY-MM)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InsightGenerateResponse:
    """Execute deterministic rules engine for the target month or month range and upsert findings idempotently."""
    if start_month and end_month:
        insights = InsightEngineService.generate_insights_for_range(
            db=db,
            org_id=current_user.organization_id,
            start_month_str=start_month,
            end_month_str=end_month,
        )
        clean_target = end_month.strip() + ("-01" if len(end_month.strip()) == 7 else "")
        target_month_date = normalize_to_first_of_month(date.fromisoformat(clean_target))
    elif month:
        insights = InsightEngineService.generate_insights_for_month(
            db=db,
            org_id=current_user.organization_id,
            month_query=month,
        )
        clean_target = month.strip() + ("-01" if len(month.strip()) == 7 else "")
        target_month_date = normalize_to_first_of_month(date.fromisoformat(clean_target))
    else:
        raise BadRequestError(
            "Either 'month' or both 'start_month' and 'end_month' must be provided.",
            code="MISSING_TARGET_MONTH",
        )

    recs_count = sum(len(i.recommendations) for i in insights)

    return InsightGenerateResponse(
        month=insights[0].period_month if insights else target_month_date,
        insights_generated_count=len(insights),
        recommendations_generated_count=recs_count,
        engine_version=ENGINE_VERSION,
        insights=insights,
    )

