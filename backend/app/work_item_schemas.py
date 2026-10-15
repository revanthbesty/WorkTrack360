from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator

STATUSES = {"Open", "In progress", "Needs review", "Blocked", "Resolved", "Closed"}
PRIORITIES = {"Low", "Medium", "High", "Urgent"}

class WorkItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    description: str | None = Field(default=None, max_length=10000)
    team_id: UUID | None = None
    status: str = "Open"
    priority: str = "Medium"
    due_at: datetime | None = None

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Title cannot be blank")
        return value

    @field_validator("status")
    @classmethod
    def known_status(cls, value: str) -> str:
        if value not in STATUSES:
            raise ValueError("Unknown status")
        return value

    @field_validator("priority")
    @classmethod
    def known_priority(cls, value: str) -> str:
        if value not in PRIORITIES:
            raise ValueError("Unknown priority")
        return value

class WorkItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    key: str
    title: str
    description: str | None
    status: str
    priority: str
    team_id: UUID | None
    due_at: datetime | None
    created_at: datetime
    updated_at: datetime
