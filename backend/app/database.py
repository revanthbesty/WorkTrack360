"""Database engine/session setup.

Importing this module does not connect to the database. Set DATABASE_URL in the
runtime environment before using get_session. Never use SQLite for production.
"""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseSettings(BaseSettings):
    database_url: str = "sqlite+pysqlite:///./worktrack360-dev.db"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


_db_settings = DatabaseSettings()
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
