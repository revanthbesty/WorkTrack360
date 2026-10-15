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
        visible_item = WorkItem(workspace_id=workspace_a.id, key="WT-A1", title="Visible item", status="Open", priority="High")
        hidden_item = WorkItem(workspace_id=workspace_b.id, key="WT-B1", title="Hidden item", status="Open", priority="Low")
        session.add_all([visible_item, hidden_item])
        foreign_team = Team(workspace_id=workspace_b.id, name="Private team")
        session.add(foreign_team)
        session.flush()
        foreign_team_id = foreign_team.id
        visible_item_id = visible_item.id
        hidden_item_id = hidden_item.id
        workspace_a_id = workspace_a.id
        session.commit()

    def session_override():
        session = factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_session] = session_override
    app.dependency_overrides[current_principal] = lambda: Principal(subject="test-user", workspace_id=workspace_a_id, roles=frozenset({"member"}))
    return TestClient(app), foreign_team_id, workspace_a_id, visible_item_id, hidden_item_id


def teardown_function() -> None:
    app.dependency_overrides.clear()


def test_list_work_items_only_returns_current_workspace() -> None:
    client, _, _, _, _ = make_test_client()
    response = client.get("/api/v1/work-items")
    assert response.status_code == 200
    assert [item["title"] for item in response.json()] == ["Visible item"]


def test_create_rejects_team_from_another_workspace() -> None:
    client, foreign_team_id, _, _, _ = make_test_client()
    response = client.post("/api/v1/work-items", json={"title": "New item", "team_id": str(foreign_team_id)})
    assert response.status_code == 404


def test_cross_workspace_item_is_not_retrievable() -> None:
    client, _, _, _, hidden_item_id = make_test_client()
    response = client.get(f"/api/v1/work-items/{hidden_item_id}")
    assert response.status_code == 404


def test_update_work_item_records_change_for_current_workspace() -> None:
    client, _, _, visible_item_id, _ = make_test_client()
    response = client.patch(f"/api/v1/work-items/{visible_item_id}", json={"title": "Updated item", "priority": "Urgent"})
    assert response.status_code == 200
    assert response.json()["title"] == "Updated item"
    assert response.json()["priority"] == "Urgent"
