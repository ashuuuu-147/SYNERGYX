"""Service layer for Action Tracker management."""

import logging
import uuid
from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.errors import BadRequestError, NotFoundError
from app.models.action import Action
from app.models.recommendation import Recommendation
from app.schemas.action import ActionCreate, ActionResponse, ActionUpdate

logger = logging.getLogger("synergyx.services.actions")


class ActionService:
    """Manages actions, status transitions, and audit timestamps."""

    @staticmethod
    def list_actions(
        db: Session,
        org_id: uuid.UUID,
        status: str | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> list[ActionResponse]:
        """List all actions for the organization with optional status and date filters."""
        stmt = (
            select(Action)
            .options(joinedload(Action.recommendation))
            .where(Action.organization_id == org_id)
        )

        if status and status != "all":
            stmt = stmt.where(Action.status == status)
        if from_date:
            stmt = stmt.where(Action.due_date >= from_date)
        if to_date:
            stmt = stmt.where(Action.due_date <= to_date)

        stmt = stmt.order_by(Action.due_date.asc().nullslast(), Action.created_at.desc())
        actions = list(db.scalars(stmt).all())

        return [
            ActionResponse(
                id=a.id,
                organization_id=a.organization_id,
                recommendation_id=a.recommendation_id,
                title=a.title,
                description=a.description,
                status=a.status,  # type: ignore[arg-type]
                due_date=a.due_date,
                completed_at=a.completed_at,
                notes=a.notes,
                created_by=a.created_by,
                created_at=a.created_at,
                updated_at=a.updated_at,
                recommendation_title=a.recommendation.title if a.recommendation else None,
            )
            for a in actions
        ]

    @staticmethod
    def create_action(
        db: Session,
        org_id: uuid.UUID,
        user_id: uuid.UUID | None,
        payload: ActionCreate,
    ) -> ActionResponse:
        """Create a new action manually or linked to an existing recommendation."""
        rec_title = None
        if payload.recommendation_id:
            rec = db.scalar(
                select(Recommendation).where(
                    Recommendation.id == payload.recommendation_id,
                    Recommendation.organization_id == org_id,
                )
            )
            if not rec:
                raise BadRequestError(
                    "Referenced recommendation does not exist or belongs to another organization.",
                    code="INVALID_RECOMMENDATION",
                )
            rec_title = rec.title

        completed_at = datetime.now(UTC) if payload.status == "completed" else None

        action = Action(
            organization_id=org_id,
            recommendation_id=payload.recommendation_id,
            title=payload.title,
            description=payload.description,
            status=payload.status,
            due_date=payload.due_date,
            completed_at=completed_at,
            notes=payload.notes,
            created_by=user_id,
        )
        db.add(action)
        db.commit()
        db.refresh(action)

        return ActionResponse(
            id=action.id,
            organization_id=action.organization_id,
            recommendation_id=action.recommendation_id,
            title=action.title,
            description=action.description,
            status=action.status,  # type: ignore[arg-type]
            due_date=action.due_date,
            completed_at=action.completed_at,
            notes=action.notes,
            created_by=action.created_by,
            created_at=action.created_at,
            updated_at=action.updated_at,
            recommendation_title=rec_title,
        )

    @staticmethod
    def update_action(
        db: Session,
        org_id: uuid.UUID,
        action_id: uuid.UUID,
        payload: ActionUpdate,
    ) -> ActionResponse:
        """Update an action and manage completed_at timestamps during status transitions."""
        action = db.scalar(
            select(Action)
            .options(joinedload(Action.recommendation))
            .where(
                Action.id == action_id,
                Action.organization_id == org_id,
            )
        )
        if not action:
            raise NotFoundError("Action not found.", code="ACTION_NOT_FOUND")

        if payload.title is not None:
            action.title = payload.title
        if payload.description is not None:
            action.description = payload.description
        if payload.due_date is not None:
            action.due_date = payload.due_date
        if payload.notes is not None:
            action.notes = payload.notes

        # Status transition handling
        if payload.status is not None and payload.status != action.status:
            old_status = action.status
            new_status = payload.status
            action.status = new_status

            if new_status == "completed":
                action.completed_at = datetime.now(UTC)
            elif old_status == "completed" and new_status in ["pending", "in_progress"]:
                # Reopening invalidates completion timestamp
                action.completed_at = None

        db.commit()
        db.refresh(action)

        return ActionResponse(
            id=action.id,
            organization_id=action.organization_id,
            recommendation_id=action.recommendation_id,
            title=action.title,
            description=action.description,
            status=action.status,  # type: ignore[arg-type]
            due_date=action.due_date,
            completed_at=action.completed_at,
            notes=action.notes,
            created_by=action.created_by,
            created_at=action.created_at,
            updated_at=action.updated_at,
            recommendation_title=action.recommendation.title if action.recommendation else None,
        )

    @staticmethod
    def delete_action(
        db: Session,
        org_id: uuid.UUID,
        action_id: uuid.UUID,
    ) -> None:
        """Delete an action, keeping any linked recommendation intact."""
        action = db.scalar(
            select(Action).where(
                Action.id == action_id,
                Action.organization_id == org_id,
            )
        )
        if not action:
            raise NotFoundError("Action not found.", code="ACTION_NOT_FOUND")

        db.delete(action)
        db.commit()
