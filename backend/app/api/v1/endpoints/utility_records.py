"""Utility records API endpoints."""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.utility_record import UtilityRecordCreate, UtilityRecordResponse, UtilityRecordUpdate
from app.services.utility_service import UtilityService

router = APIRouter(prefix="/utility-records", tags=["Utility Records"])


@router.post("", response_model=UtilityRecordResponse, status_code=status.HTTP_201_CREATED)
def create_utility_record(
    payload: UtilityRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UtilityRecordResponse:
    """Create a new monthly utility record with canonical unit conversion."""
    return UtilityService.create_record(
        db=db,
        current_user=current_user,
        data=payload,
    )


@router.get("", response_model=list[UtilityRecordResponse])
def list_utility_records(
    resource_type: str | None = Query(None, description="Filter by resource type: electricity, water, fuel"),
    month: date | None = Query(None, description="Filter by billing month (YYYY-MM-DD or YYYY-MM-01)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[UtilityRecordResponse]:
    """List monthly utility records for the current organization."""
    return UtilityService.list_records(
        db=db,
        organization_id=current_user.organization_id,
        resource_type=resource_type,
        month=month,
    )


@router.get("/{record_id}", response_model=UtilityRecordResponse)
def get_utility_record(
    record_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UtilityRecordResponse:
    """Get a single utility record scoped to the organization."""
    return UtilityService.get_record(
        db=db,
        organization_id=current_user.organization_id,
        record_id=record_id,
    )


@router.patch("/{record_id}", response_model=UtilityRecordResponse)
def update_utility_record(
    record_id: uuid.UUID,
    payload: UtilityRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UtilityRecordResponse:
    """Update an existing utility record."""
    return UtilityService.update_record(
        db=db,
        current_user=current_user,
        record_id=record_id,
        data=payload,
    )


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_utility_record(
    record_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a utility record without deleting the attached document."""
    UtilityService.delete_record(
        db=db,
        organization_id=current_user.organization_id,
        record_id=record_id,
    )
