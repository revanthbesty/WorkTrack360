from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base, Workspace


def test_workspace_can_be_persisted_in_test_database() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    with session_factory() as session:
        session.add(Workspace(name="Test Workspace", slug="test-workspace"))
        session.commit()
        assert session.query(Workspace).count() == 1
