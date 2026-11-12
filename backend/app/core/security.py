"""Password hashing with Argon2 and JWT bearer token creation and verification."""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

from app.core.config import settings
from app.core.errors import UnauthorizedError

# Password hashing with Argon2
password_hasher = PasswordHash((Argon2Hasher(),))


def hash_password(password: str) -> str:
    """Hash plaintext password with Argon2."""
    return password_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against Argon2 hash."""
    return password_hasher.verify(plain_password, hashed_password)


def create_access_token(
    user_id: uuid.UUID,
    organization_id: uuid.UUID,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a short-lived signed JWT bearer token."""
    now = datetime.now(UTC)
    expire = now + (expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES))

    payload: dict[str, Any] = {
        "sub": str(user_id),
        "org_id": str(organization_id),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
    }

    token = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return token


def decode_access_token(token: str) -> dict[str, Any]:
    """Validate and decode a JWT bearer token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            issuer=settings.JWT_ISSUER,
            audience=settings.JWT_AUDIENCE,
            options={"require": ["sub", "org_id", "exp", "iat", "iss", "aud"]},
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError("Token has expired.", code="TOKEN_EXPIRED") from None
    except jwt.InvalidTokenError:
        raise UnauthorizedError("Invalid authentication token.", code="TOKEN_INVALID") from None
