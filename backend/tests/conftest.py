"""
SensorTrust — Pytest Fixtures & Configuration
Configures an isolated SQLite in-memory test database and FastAPI TestClient.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app.services.seed_service import seed_records

# In-memory SQLite with StaticPool so all connections share the same memory DB
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
    future=True
)


@pytest.fixture(scope="function")
def db_session():
    """Provides a fresh database session for each test with tables created and seeded."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    seed_records(session)

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI TestClient with overridden get_db dependency pointing to test database."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def isolate_blockchain_for_unit_tests(request):
    """
    Keeps Phase 3 unit tests isolated from blockchain dependencies by default.
    Tests in test_blockchain.py can enable it explicitly.
    """
    from app.services.blockchain_service import blockchain_service
    if "test_blockchain" in request.node.nodeid or "test_failure_scenarios" in request.node.nodeid:
        yield
    else:
        orig_enabled = blockchain_service.enabled
        blockchain_service.enabled = False
        try:
            yield
        finally:
            blockchain_service.enabled = orig_enabled

