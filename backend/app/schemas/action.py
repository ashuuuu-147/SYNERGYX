"""Pydantic schemas for Action Tracker."""

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ActionStatus = Literal["pending", "in_progress", "completed", "cancelled"]


class ActionCreate(BaseModel):
    """Schema for creating an action manually or from a recommendation."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., max_length=180)
    description: str | None = None
    recommendation_id: uuid.UUID | None = None
    status: ActionStatus = "pending"
    due_date: date | None = None
    notes: str | None = Field(None, max_length=1000)


class ActionUpdate(BaseModel):
    """Schema for updating an existing action."""

    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(None, max_length=180)
    description: str | None = None
    status: ActionStatus | None = None
    due_date: date | None = None
    notes: str | None = Field(None, max_length=1000)


class ActionResponse(BaseModel):
    """Schema for serializing action responses."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    recommendation_id: uuid.UUID | None = None
    title: str
    description: str | None = None
    status: ActionStatus
    due_date: date | None = None
    completed_at: datetime | None = None
    notes: str | None = None
    created_by: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime
    recommendation_title: str | None = None
