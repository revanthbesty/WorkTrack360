import pytest
from pydantic import ValidationError

from app.work_item_update_schema import WorkItemUpdate


def test_partial_update_accepts_only_changed_fields() -> None:
    update = WorkItemUpdate(title="Revised title")
    assert update.model_dump(exclude_unset=True) == {"title": "Revised title"}


def test_partial_update_rejects_null_title() -> None:
    with pytest.raises(ValidationError):
        WorkItemUpdate(title=None)


def test_partial_update_rejects_unknown_status() -> None:
    with pytest.raises(ValidationError):
        WorkItemUpdate(status="Unknown")


def test_partial_update_allows_clearing_due_date() -> None:
    update = WorkItemUpdate(due_at=None)
    assert "due_at" in update.model_dump(exclude_unset=True)
    assert update.due_at is None
