"""Authentication request and response schemas."""

from pydantic import BaseModel, EmailStr, Field

from app.schemas.organization import (
    IndustryType,
    OrganizationResponse,
    ProductionUnitType,
)
from app.schemas.user import UserResponse


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=10)
    organization_name: str = Field(..., min_length=2, max_length=120)
    industry: IndustryType
    location: str = Field(..., min_length=2, max_length=100)
    country_code: str = Field(default="IN", min_length=2, max_length=2)
    production_unit: ProductionUnitType


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    organization: OrganizationResponse


class MeResponse(BaseModel):
    user: UserResponse
    organization: OrganizationResponse
