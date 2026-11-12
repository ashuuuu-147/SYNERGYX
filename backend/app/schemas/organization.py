"""Organization Pydantic schemas."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

IndustryType = Literal["textile", "food_processing", "metal_fabrication", "packaging", "other"]
ProductionUnitType = Literal["kg", "tonne", "piece", "litre", "unit", "other"]


class OrganizationBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    industry: IndustryType
    location: str = Field(..., min_length=2, max_length=100)
    country_code: str = Field(default="IN", min_length=2, max_length=2)
    production_unit: ProductionUnitType
    allow_external_ai: bool = False


class OrganizationUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=120)
    industry: IndustryType | None = None
    location: str | None = Field(None, min_length=2, max_length=100)
    country_code: str | None = Field(None, min_length=2, max_length=2)
    production_unit: ProductionUnitType | None = None


class OrganizationAiConsentUpdate(BaseModel):
    allow_external_ai: bool


class OrganizationResponse(OrganizationBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
