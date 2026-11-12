"""Authentication service handling registration and user login."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, UnauthorizedError
from app.core.security import create_access_token, hash_password, verify_password
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest
from app.schemas.organization import OrganizationResponse
from app.schemas.user import UserResponse


class AuthService:
    @staticmethod
    def register_user(db: Session, request: RegisterRequest) -> AuthResponse:
        """Atomically register a new organization and owner user."""
        normalized_email = request.email.strip().lower()

        # Check if email is already registered
        existing_user = db.scalar(select(User).where(User.email == normalized_email))
        if existing_user:
            raise ConflictError("An account with this email already exists.", code="EMAIL_EXISTS")

        try:
            # Create organization
            org = Organization(
                name=request.organization_name.strip(),
                industry=request.industry,
                location=request.location.strip(),
                country_code=request.country_code.strip().upper(),
                production_unit=request.production_unit,
                allow_external_ai=False,
            )
            db.add(org)
            db.flush()  # Flush to get org.id within transaction

            # Create owner user
            user = User(
                organization_id=org.id,
                full_name=request.full_name.strip(),
                email=normalized_email,
                password_hash=hash_password(request.password),
                is_active=True,
            )
            db.add(user)
            db.commit()

            db.refresh(org)
            db.refresh(user)

            token = create_access_token(user_id=user.id, organization_id=org.id)

            return AuthResponse(
                access_token=token,
                token_type="bearer",
                user=UserResponse.model_validate(user),
                organization=OrganizationResponse.model_validate(org),
            )
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def authenticate_user(db: Session, request: LoginRequest) -> AuthResponse:
        """Authenticate user with email and password, returning access token."""
        normalized_email = request.email.strip().lower()

        user = db.scalar(select(User).where(User.email == normalized_email))
        if not user or not verify_password(request.password, user.password_hash):
            raise UnauthorizedError("Invalid email or password.", code="INVALID_CREDENTIALS")

        if not user.is_active:
            raise UnauthorizedError("User account is inactive.", code="ACCOUNT_INACTIVE")

        org = db.scalar(select(Organization).where(Organization.id == user.organization_id))
        if not org:
            raise UnauthorizedError("Organization not found.", code="ORGANIZATION_NOT_FOUND")

        token = create_access_token(user_id=user.id, organization_id=org.id)

        return AuthResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
            organization=OrganizationResponse.model_validate(org),
        )
