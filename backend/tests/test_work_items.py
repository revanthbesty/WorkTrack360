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
        visible_team = Team(workspace_id=workspace_a.id, name="Demo Support Team")
        foreign_team = Team(workspace_id=workspace_b.id, name="Private team")
        session.add_all([visible_team, foreign_team])
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


def test_create_and_update_support_metadata() -> None:
    client, _, _, visible_item_id, _ = make_test_client()
    created = client.post("/api/v1/work-items", json={
        "title": "Product support ticket",
        "product": "Glacier CRD IV",
        "category": "Customer ticket",
        "requester": "Client contact",
        "owner": "Product Support",
    })
    assert created.status_code == 201
    assert created.json()["product"] == "Glacier CRD IV"
    assert created.json()["category"] == "Customer ticket"
    assert created.json()["requester"] == "Client contact"
    assert created.json()["owner"] == "Product Support"

    updated = client.patch(f"/api/v1/work-items/{visible_item_id}", json={
        "product": "Oxbow",
        "category": "Software/Internal Team",
        "requester": "Business Development",
        "owner": "Engineering",
    })
    assert updated.status_code == 200
    assert updated.json()["product"] == "Oxbow"
    assert updated.json()["category"] == "Software/Internal Team"
    assert updated.json()["requester"] == "Business Development"
    assert updated.json()["owner"] == "Engineering"


def test_cross_workspace_item_cannot_be_updated() -> None:
    client, _, _, _, hidden_item_id = make_test_client()
    response = client.patch(f"/api/v1/work-items/{hidden_item_id}", json={"title": "Attempted change"})
    assert response.status_code == 404


def test_invalid_work_item_id_is_rejected() -> None:
    client, _, _, _, _ = make_test_client()
    response = client.get("/api/v1/work-items/not-a-uuid")
    assert response.status_code == 422


def test_work_item_creation_requires_recognized_workspace_role() -> None:
    client, _, workspace_id, _, _ = make_test_client()
    app.dependency_overrides[current_principal] = lambda: Principal(subject="no-role-user", workspace_id=workspace_id, roles=frozenset())
    response = client.post("/api/v1/work-items", json={"title": "Should be denied"})
    assert response.status_code == 403


def test_reads_require_a_recognized_workspace_role() -> None:
    client, _, workspace_id, _, _ = make_test_client()
    app.dependency_overrides[current_principal] = lambda: Principal(subject="no-role-user", workspace_id=workspace_id, roles=frozenset())
    response = client.get("/api/v1/work-items")
    assert response.status_code == 403


def test_viewer_can_read_but_cannot_create_work_items() -> None:
    client, _, workspace_id, _, _ = make_test_client()
    app.dependency_overrides[current_principal] = lambda: Principal(
        subject="viewer-user", workspace_id=workspace_id, roles=frozenset({"viewer"})
    )
    response = client.post("/api/v1/work-items", json={"title": "Should be denied"})
    assert response.status_code == 403


def test_viewer_cannot_update_work_items() -> None:
    client, _, workspace_id, visible_item_id, _ = make_test_client()
    app.dependency_overrides[current_principal] = lambda: Principal(
        subject="viewer-user", workspace_id=workspace_id, roles=frozenset({"viewer"})
    )
    response = client.patch(
        f"/api/v1/work-items/{visible_item_id}",
        json={"title": "Viewer must not change this"},
    )
    assert response.status_code == 403


def test_empty_work_item_update_is_rejected() -> None:
    client, _, _, visible_item_id, _ = make_test_client()
    response = client.patch(f"/api/v1/work-items/{visible_item_id}", json={})
    assert response.status_code == 400


def test_work_item_list_rejects_limit_above_maximum() -> None:
    client, _, _, _, _ = make_test_client()
    response = client.get("/api/v1/work-items?limit=101")
    assert response.status_code == 422



def test_team_directory_only_returns_active_teams_from_current_workspace() -> None:
    client, _, _, _, _ = make_test_client()
    response = client.get("/api/v1/teams")
    assert response.status_code == 200
    assert [team["name"] for team in response.json()] == ["Demo Support Team"]
    assert all("id" in team for team in response.json())
