"""Database configuration and table initialization for the fitness app."""

from __future__ import annotations

import os
from typing import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

load_dotenv()

DEFAULT_DATABASE_URL = "sqlite:///./fitness_app.db"


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


def _get_database_url() -> str:
    """Resolve the application database URL from the environment."""

    return os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)


DATABASE_URL = _get_database_url()

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


def get_db_session() -> Generator[Session, None, None]:
    """Yield a database session for request-scoped usage."""

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def create_database_tables() -> None:
    """Create all configured database tables."""

    from app.models import db_models  # noqa: F401

    Base.metadata.create_all(bind=engine)
