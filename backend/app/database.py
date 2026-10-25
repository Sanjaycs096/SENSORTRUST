"""
SensorTrust — Database Connection and Session Management
SQLAlchemy 2.x persistence engine for SQLite and future PostgreSQL compatibility.
"""

from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings

# Engine configuration
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    future=True
)

# Enable foreign keys for SQLite
if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True
)

Base = declarative_base()


from sqlalchemy import text


def upgrade_database_schema(engine):
    """Idempotently adds missing columns to existing SQLite tables without losing history."""
    with engine.connect() as conn:
        try:
            res = conn.execute(text("PRAGMA table_info(review_records)")).fetchall()
            existing_cols = {row[1] for row in res}
            if existing_cols:
                if "tx_hash" not in existing_cols:
                    conn.execute(text("ALTER TABLE review_records ADD COLUMN tx_hash VARCHAR(128)"))
                if "block_number" not in existing_cols:
                    conn.execute(text("ALTER TABLE review_records ADD COLUMN block_number INTEGER"))
                if "contract_address" not in existing_cols:
                    conn.execute(text("ALTER TABLE review_records ADD COLUMN contract_address VARCHAR(128)"))
                if "status" not in existing_cols:
                    conn.execute(text("ALTER TABLE review_records ADD COLUMN status VARCHAR(32) DEFAULT 'CONFIRMED'"))
                conn.commit()
        except Exception:
            pass


def get_db() -> Generator[Session, None, None]:
    """Dependency for providing a transactional database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
