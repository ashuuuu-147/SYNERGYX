"""Pydantic schemas for Production Records."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ProductionRecordCreate(BaseModel):
    """Schema for creating a monthly production record."""

    period_month: date = Field(..., description="Month of production (normalized to 1st of month)")
    quantity: Decimal = Field(..., gt=0, description="Total production output in organization's production unit (> 0)")
    unit: str | None = Field(None, description="Optional unit (must match organization production unit)")
    notes: str | None = Field(
        None, max_length=500, description="Optional notes on production downtime, shift changes, etc."
    )


class ProductionRecordUpdate(BaseModel):
    """Schema for updating an existing monthly production record."""

    quantity: Decimal | None = Field(None, gt=0)
    notes: str | None = Field(None, max_length=500)


class ProductionRecordResponse(BaseModel):
    """Response schema for production records."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    period_month: date
    quantity: Decimal
    unit: str
    notes: str | None = None
    created_by: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime
