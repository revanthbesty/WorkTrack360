from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from app.auth import Principal, current_principal
from app.database import get_session
from app.main import app
from app.models import Base, Team, WorkItem, Workspace


def make_test_client():
    engine = create_engine("sqlite+pysqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    workspace_a = Workspace(name="Workspace A", slug="workspace-a")
    workspace_b = Workspace(name="Workspace B", slug="workspace-b")
    with factory() as session:
        session.add_all([workspace_a, workspace_b])
        session.flush()
        session.add_all([
            WorkItem(workspace_id=workspace_a.id, key="WT-A1", title="Visible item", status="Open", priority="High"),
            WorkItem(workspace_id=workspace_b.id, key="WT-B1", title="Hidden item", status="Open", priority="Low"),
        ])
        foreign_team = Team(workspace_id=workspace_b.id, name="Private team")
        session.add(foreign_team)
        session.commit()
        foreign_team_id = foreign_team.id
        workspace_a_id = workspace_a.id

    def session_override():
        session = factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_session] = session_override
    app.dependency_overrides[current_principal] = lambda: Principal(subject="test-user", workspace_id=workspace_a_id, roles=frozenset({"member"}))
    return TestClient(app), foreign_team_id, workspace_a_id


def teardown_function() -> None:
    app.dependency_overrides.clear()


def test_list_work_items_only_returns_current_workspace() -> None:
    client, _, _ = make_test_client()
    response = client.get("/api/v1/work-items")
    assert response.status_code == 200
    assert [item["title"] for item in response.json()] == ["Visible item"]


def test_create_rejects_team_from_another_workspace() -> None:
    client, foreign_team_id, _ = make_test_client()
    response = client.post("/api/v1/work-items", json={"title": "New item", "team_id": str(foreign_team_id)})
    assert response.status_code == 404
