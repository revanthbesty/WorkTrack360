import pytest
from pydantic import ValidationError

from app.work_item_schemas import WorkItemCreate


def test_title_is_trimmed() -> None:
    item = WorkItemCreate(title="  Prepare client report  ")
    assert item.title == "Prepare client report"


def test_blank_title_is_rejected() -> None:
    with pytest.raises(ValidationError):
        WorkItemCreate(title="   ")


def test_unknown_status_is_rejected() -> None:
    with pytest.raises(ValidationError):
        WorkItemCreate(title="Test item", status="Not a status")


def test_unknown_priority_is_rejected() -> None:
    with pytest.raises(ValidationError):
        WorkItemCreate(title="Test item", priority="Critical-ish")
