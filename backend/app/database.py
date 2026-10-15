"""Database engine/session setup.

Importing this module does not connect to the database. Production must set a PostgreSQL
DATABASE_URL; a local SQLite file is permitted only in development.
"""
from collections.abc import Generator

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


class DatabaseSettings(BaseSettings):
    app_env: str = "development"
    database_url: str = "sqlite+pysqlite:///./worktrack360-dev.db"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


_db_settings = DatabaseSettings()
if _db_settings.app_env.lower() not in {"development", "test"} and _db_settings.database_url.startswith("sqlite"):
    raise RuntimeError("Production requires DATABASE_URL to point to PostgreSQL; SQLite is development-only.")
_connect_args = {"check_same_thread": False} if _db_settings.database_url.startswith("sqlite") else {}
engine = create_engine(_db_settings.database_url, pool_pre_ping=True, connect_args=_connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_session() -> Generator[Session, None, None]:
    """Yield a request-scoped session; route handlers must enforce tenant scope."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
