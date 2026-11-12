"""Production records API endpoints."""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.production_record import (
    ProductionRecordCreate,
    ProductionRecordResponse,
    ProductionRecordUpdate,
)
from app.services.production_service import ProductionService

router = APIRouter(prefix="/production-records", tags=["Production Records"])


@router.post("", response_model=ProductionRecordResponse, status_code=status.HTTP_201_CREATED)
def create_production_record(
    payload: ProductionRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductionRecordResponse:
    """Create a monthly production output record."""
    return ProductionService.create_record(
        db=db,
        current_user=current_user,
        data=payload,
    )


@router.get("", response_model=list[ProductionRecordResponse])
def list_production_records(
    month: date | None = Query(None, description="Filter by production month (YYYY-MM-DD or YYYY-MM-01)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ProductionRecordResponse]:
    """List monthly production records for current organization."""
    return ProductionService.list_records(
        db=db,
        organization_id=current_user.organization_id,
        month=month,
    )


@router.get("/{record_id}", response_model=ProductionRecordResponse)
def get_production_record(
    record_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductionRecordResponse:
    """Get single production record scoped to current organization."""
    return ProductionService.get_record(
        db=db,
        organization_id=current_user.organization_id,
        record_id=record_id,
    )


@router.patch("/{record_id}", response_model=ProductionRecordResponse)
def update_production_record(
    record_id: uuid.UUID,
    payload: ProductionRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductionRecordResponse:
    """Update quantity or notes of a production record."""
    return ProductionService.update_record(
        db=db,
        current_user=current_user,
        record_id=record_id,
        data=payload,
    )


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_production_record(
    record_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a monthly production record."""
    ProductionService.delete_record(
        db=db,
        organization_id=current_user.organization_id,
        record_id=record_id,
    )
