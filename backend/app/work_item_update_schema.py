from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, field_validator

from app.work_item_schemas import PRIORITIES, STATUSES

class WorkItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=240)
    description: str | None = Field(default=None, max_length=10000)
    product: str | None = Field(default=None, max_length=120)
    category: str | None = Field(default=None, max_length=120)
    requester: str | None = Field(default=None, max_length=255)
    owner: str | None = Field(default=None, max_length=255)
    team_id: UUID | None = None
    status: str | None = None
    priority: str | None = None
    due_at: datetime | None = None

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str | None) -> str | None:
        if value is None:
            raise ValueError("Title cannot be null")
        value = value.strip()
        if not value:
            raise ValueError("Title cannot be blank")
        return value

    @field_validator("status")
    @classmethod
    def known_status(cls, value: str | None) -> str | None:
        if value is None:
            raise ValueError("Status cannot be null")
        if value not in STATUSES:
            raise ValueError("Unknown status")
        return value

    @field_validator("priority")
    @classmethod
    def known_priority(cls, value: str | None) -> str | None:
        if value is None:
            raise ValueError("Priority cannot be null")
        if value not in PRIORITIES:
            raise ValueError("Unknown priority")
        return value
