"""Recommendations API endpoints."""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.insight import RecommendationSummary
from app.services.insight_engine import InsightEngineService

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.get("", response_model=list[RecommendationSummary])
def list_recommendations(
    status: str | None = Query(None, description="Filter by status (proposed, accepted, dismissed, completed)"),
    priority: str | None = Query(None, description="Filter by priority (low, medium, high)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[RecommendationSummary]:
    """List recommendations for the authenticated organization."""
    return InsightEngineService.list_recommendations(
        db=db,
        org_id=current_user.organization_id,
        status=status,
        priority=priority,
    )


@router.post("/{recommendation_id}/accept", response_model=RecommendationSummary)
def accept_recommendation(
    recommendation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RecommendationSummary:
    """Accept a recommendation and idempotently create a linked pending action."""
    return InsightEngineService.accept_recommendation(
        db=db,
        org_id=current_user.organization_id,
        recommendation_id=recommendation_id,
        user_id=current_user.id,
    )


@router.post("/{recommendation_id}/dismiss", response_model=RecommendationSummary)
def dismiss_recommendation(
    recommendation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RecommendationSummary:
    """Dismiss a recommendation."""
    return InsightEngineService.dismiss_recommendation(
        db=db,
        org_id=current_user.organization_id,
        recommendation_id=recommendation_id,
    )

