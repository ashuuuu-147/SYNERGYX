"""Organization router endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.organization import (
    OrganizationAiConsentUpdate,
    OrganizationResponse,
    OrganizationUpdate,
)
from app.services.organization_service import OrganizationService

router = APIRouter()


@router.get(
    "",
    response_model=OrganizationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated organization details",
)
def get_organization(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrganizationResponse:
    """Fetch organization profile scoped to current authenticated user's organization."""
    return OrganizationService.get_organization(db, current_user.organization_id)


@router.patch(
    "",
    response_model=OrganizationResponse,
    status_code=status.HTTP_200_OK,
    summary="Update organization profile settings",
)
def update_organization(
    update_data: OrganizationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrganizationResponse:
    """Update profile fields with validation and production unit protection."""
    return OrganizationService.update_organization(db, current_user.organization_id, update_data)


@router.patch(
    "/ai-consent",
    response_model=OrganizationResponse,
    status_code=status.HTTP_200_OK,
    summary="Update external AI explanation consent",
)
def update_ai_consent(
    consent_data: OrganizationAiConsentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrganizationResponse:
    """Toggle organization consent for sending aggregated non-identifying metrics to external AI."""
    return OrganizationService.update_ai_consent(db, current_user.organization_id, consent_data)
