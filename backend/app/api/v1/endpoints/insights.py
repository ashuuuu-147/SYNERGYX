"""Insights API endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.insight import InsightGenerateResponse, InsightResponse
from app.services.insight_engine import ENGINE_VERSION, InsightEngineService

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("", response_model=list[InsightResponse])
def list_insights(
    month: str | None = Query(None, description="Filter insights by month (YYYY-MM)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[InsightResponse]:
    """List saved insights for the current organization."""
    return InsightEngineService.list_insights(
        db=db,
        org_id=current_user.organization_id,
        month_query=month,
    )


@router.post("/generate", response_model=InsightGenerateResponse)
def generate_insights(
    month: str = Query(..., description="Target month for insight generation (YYYY-MM)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InsightGenerateResponse:
    """Execute deterministic rules engine for the target month and upsert findings idempotently."""
    insights = InsightEngineService.generate_insights_for_month(
        db=db,
        org_id=current_user.organization_id,
        month_query=month,
    )

    recs_count = sum(len(i.recommendations) for i in insights)

    return InsightGenerateResponse(
        month=insights[0].period_month if insights else month,  # type: ignore[arg-type]
        insights_generated_count=len(insights),
        recommendations_generated_count=recs_count,
        engine_version=ENGINE_VERSION,
        insights=insights,
    )
