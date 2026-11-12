"""Action Tracker API endpoints."""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.action import ActionCreate, ActionResponse, ActionUpdate
from app.services.action_service import ActionService

router = APIRouter(prefix="/actions", tags=["Actions"])


@router.get("", response_model=list[ActionResponse])
def list_actions(
    status_filter: str | None = Query(None, alias="status", description="Filter by status (pending, in_progress, completed, cancelled)"),
    from_date: date | None = Query(None, alias="from", description="Filter by due date from"),
    to_date: date | None = Query(None, alias="to", description="Filter by due date to"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ActionResponse]:
    """List actions for the authenticated organization."""
    return ActionService.list_actions(
        db=db,
        org_id=current_user.organization_id,
        status=status_filter,
        from_date=from_date,
        to_date=to_date,
    )


@router.post("", response_model=ActionResponse, status_code=status.HTTP_201_CREATED)
def create_action(
    payload: ActionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActionResponse:
    """Create a new manual or recommendation-linked action."""
    return ActionService.create_action(
        db=db,
        org_id=current_user.organization_id,
        user_id=current_user.id,
        payload=payload,
    )


@router.patch("/{action_id}", response_model=ActionResponse)
def update_action(
    action_id: uuid.UUID,
    payload: ActionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActionResponse:
    """Update action status, due date, description or notes."""
    return ActionService.update_action(
        db=db,
        org_id=current_user.organization_id,
        action_id=action_id,
        payload=payload,
    )


@router.delete("/{action_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_action(
    action_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete an action, preserving any linked recommendation."""
    ActionService.delete_action(
        db=db,
        org_id=current_user.organization_id,
        action_id=action_id,
    )
