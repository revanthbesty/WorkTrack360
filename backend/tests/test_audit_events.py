from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.auth import Principal, current_principal
from app.database import get_session
from app.main import app
from app.models import AuditEvent, Base, Workspace


def test_work_item_creation_persists_audit_event() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    workspace = Workspace(name="Audit Test Workspace", slug="audit-test")
    with factory() as session:
        session.add(workspace)
        session.commit()
        workspace_id = workspace.id

    def session_override():
        session = factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_session] = session_override
    app.dependency_overrides[current_principal] = lambda: Principal(
        subject="audit-test-user",
        workspace_id=workspace_id,
        roles=frozenset({"member"}),
    )
    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/work-items",
                json={"title": "Audited work item"},
            )
        assert response.status_code == 201
        item_key = response.json()["key"]
        with factory() as session:
            event = session.scalar(
                select(AuditEvent).where(
                    AuditEvent.workspace_id == workspace_id,
                    AuditEvent.actor_subject == "audit-test-user",
                    AuditEvent.action == "work_item.created",
                    AuditEvent.entity_type == "work_item",
                    AuditEvent.entity_id == item_key,
                )
            )
            assert event is not None
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
