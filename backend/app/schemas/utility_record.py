"""Pydantic schemas for Utility Records."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ResourceType = Literal["electricity", "water", "fuel"]


class UtilityRecordCreate(BaseModel):
    """Schema for creating a monthly utility record."""

    resource_type: ResourceType
    period_month: date
    quantity: Decimal = Field(..., gt=0, description="Measured resource consumption quantity (> 0)")
    input_unit: str = Field(..., description="Input unit: kWh for electricity, L or m3 for water, L for fuel")
    amount_inr: Decimal | None = Field(None, ge=0, description="Optional expenditure in INR (>= 0)")
    document_id: uuid.UUID | None = Field(None, description="Optional linked evidence document UUID")
    notes: str | None = Field(None, max_length=500, description="Optional operator notes")


class UtilityRecordUpdate(BaseModel):
    """Schema for updating an existing monthly utility record."""

    quantity: Decimal | None = Field(None, gt=0)
    input_unit: str | None = None
    amount_inr: Decimal | None = Field(None, ge=0)
    document_id: uuid.UUID | None = None
    notes: str | None = Field(None, max_length=500)


class UtilityRecordResponse(BaseModel):
    """Response schema for utility records."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    resource_type: str
    period_month: date
    quantity: Decimal
    unit: str
    amount_inr: Decimal | None = None
    document_id: uuid.UUID | None = None
    notes: str | None = None
    created_by: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime
