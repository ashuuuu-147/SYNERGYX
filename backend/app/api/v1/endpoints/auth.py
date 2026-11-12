"""Authentication router endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, MeResponse, RegisterRequest
from app.schemas.organization import OrganizationResponse
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new organization and owner account",
)
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db),
) -> AuthResponse:
    """Create organization and initial owner user in a single transaction."""
    return AuthService.register_user(db, request)


@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="User login with email and password",
)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
) -> AuthResponse:
    """Authenticate credentials and issue a short-lived bearer token."""
    return AuthService.authenticate_user(db, request)


@router.get(
    "/me",
    response_model=MeResponse,
    status_code=status.HTTP_200_OK,
    summary="Fetch current authenticated user and organization details",
)
def get_me(
    current_user: User = Depends(get_current_user),
) -> MeResponse:
    """Return profile details for current session."""
    return MeResponse(
        user=UserResponse.model_validate(current_user),
        organization=OrganizationResponse.model_validate(current_user.organization),
    )
