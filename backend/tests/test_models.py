from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.models import AuditEvent, Base, Team, WorkItem, WorkflowOption, Workspace


def test_workspace_scoped_models_create_and_link() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        workspace = Workspace(name="Example Workspace", slug="example-workspace")
        session.add(workspace)
        session.flush()
        team = Team(workspace_id=workspace.id, name="Product Support")
        session.add(team)
        session.flush()
        item = WorkItem(workspace_id=workspace.id, team_id=team.id, key="WT-1", title="Validate report", status="Open", priority="High")
        option = WorkflowOption(workspace_id=workspace.id, field_key="status", value="Needs review", sort_order=1)
        audit = AuditEvent(workspace_id=workspace.id, action="work_item.created", entity_type="work_item", entity_id="WT-1")
        session.add_all([item, option, audit])
        session.commit()
        stored = session.scalar(select(WorkItem).where(WorkItem.key == "WT-1"))
        assert stored is not None
        assert stored.workspace_id == workspace.id
        assert stored.team is not None and stored.team.name == "Product Support"
        assert session.scalar(select(WorkflowOption).where(WorkflowOption.workspace_id == workspace.id)).value == "Needs review"
        assert session.scalar(select(AuditEvent).where(AuditEvent.workspace_id == workspace.id)).action == "work_item.created"
