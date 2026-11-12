"""Shared dependencies for FastAPI endpoints."""

import uuid

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import UnauthorizedError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.organization import Organization
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Validate bearer token and resolve authenticated user and organization."""
    if not credentials or not credentials.credentials:
        raise UnauthorizedError("Authentication token is required.", code="TOKEN_MISSING")

    payload = decode_access_token(credentials.credentials)
    user_id_str = payload.get("sub")
    org_id_str = payload.get("org_id")

    if not user_id_str or not org_id_str:
        raise UnauthorizedError("Invalid token claims.", code="TOKEN_INVALID")

    try:
        user_uuid = uuid.UUID(user_id_str)
        org_uuid = uuid.UUID(org_id_str)
    except ValueError:
        raise UnauthorizedError("Invalid UUID in token claims.", code="TOKEN_INVALID") from None

    user = db.scalar(select(User).where(User.id == user_uuid, User.organization_id == org_uuid))
    if not user:
        raise UnauthorizedError("User does not exist.", code="USER_NOT_FOUND")

    if not user.is_active:
        raise UnauthorizedError("User account is inactive.", code="ACCOUNT_INACTIVE")

    org = db.scalar(select(Organization).where(Organization.id == org_uuid))
    if not org:
        raise UnauthorizedError("Organization does not exist.", code="ORGANIZATION_NOT_FOUND")

    # Set organization on user object for convenient access
    user.organization = org
    return user
