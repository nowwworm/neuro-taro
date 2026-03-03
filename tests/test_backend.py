import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.main import app
from backend.database import Base, get_db
import json

# Setup in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_temp.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module")
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.mark.asyncio
async def test_get_or_create_user(setup_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Test default user creation (test_local)
        response = await ac.post("/api/me")
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "test_local"
        assert data["energy"] == 3

@pytest.mark.asyncio
async def test_create_reading(setup_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create reading
        reading_data = {
            "query": "What does my future hold?",
            "cards": [
                {"name": "The Fool", "reversed": False},
                {"name": "The Magician", "reversed": True}
            ]
        }
        response = await ac.post("/api/readings", json=reading_data)
        assert response.status_code == 200
        data = response.json()
        assert "interpretation" in data
        assert data["energy_remaining"] == 2

@pytest.mark.asyncio
async def test_follow_up_reading(setup_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # First create a reading
        reading_data = {
            "query": "Tell me more",
            "cards": [{"name": "The Sun", "reversed": False}]
        }
        r1 = await ac.post("/api/readings", json=reading_data)
        reading_id = r1.json()["id"]

        # Follow up
        follow_up_data = {
            "reading_id": reading_id,
            "query": "Why the Sun?"
        }
        response = await ac.post("/api/follow-up", json=follow_up_data)
        assert response.status_code == 200
        data = response.json()
        assert "interpretation" in data
        assert data["energy_remaining"] == 0 # (3 - 1 - 1 - 1 = 0)
