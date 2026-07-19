import sys
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.db.models import Base, KnowledgeNode, KnowledgeEdge
from backend.services.chat_service import ChatService
from backend.main import app

# SQLite database setup for chat tests
SQLALCHEMY_DATABASE_URL = "sqlite:///test_chat_temp.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    # Insert mock nodes & edges for testing
    session = TestingSessionLocal()
    p102 = KnowledgeNode(id="P-102", name="Centrifugal Pump P-102", type="equipment")
    fix102 = KnowledgeNode(id="FIX-102", name="Clear upstream Valve V-101", type="fix")
    edge = KnowledgeEdge(
        id="edge-102",
        source_id="P-102",
        target_id="FIX-102",
        relation_type="has_known_fix",
        symptom_description="pressure drop",
        confidence=0.82
    )
    session.add(p102)
    session.add(fix102)
    session.add(edge)
    session.commit()
    
    # Sync edge embeddings for the vector store
    from backend.services.rag_service import sync_edge_embeddings
    sync_edge_embeddings(session)
    session.close()

    yield

    Base.metadata.drop_all(bind=engine)
    if os.path.exists("test_chat_temp.db"):
        try:
            os.remove("test_chat_temp.db")
        except Exception:
            pass

@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

import anyio

# Test the ChatService functionality directly
def test_chat_service_fallback_with_equipment(db_session):
    from backend.config import settings
    original_key = settings.gemini_api_key
    settings.gemini_api_key = None
    try:
        async def run():
            chat_svc = ChatService(db_session)
            response = await chat_svc.get_copilot_response("What is the fix for pump P-102?")
            assert "P-102" in response
            assert "Clear upstream Valve V-101" in response
            assert "82.0%" in response
        anyio.run(run)
    finally:
        settings.gemini_api_key = original_key

def test_chat_service_fallback_without_equipment(db_session):
    from backend.config import settings
    original_key = settings.gemini_api_key
    settings.gemini_api_key = None
    try:
        async def run():
            chat_svc = ChatService(db_session)
            response = await chat_svc.get_copilot_response("Hello, what is this system about?")
            assert "Welcome!" in response
            assert "Smriti AI assistant" in response or "Smriti Copilot" in response
        anyio.run(run)
    finally:
        settings.gemini_api_key = original_key

# Test the API endpoint directly using FastAPI TestClient
def test_chat_endpoint():
    client = TestClient(app)
    response = client.post("/api/chat", json={"message": "Show remedy for P-102"})
    assert response.status_code == 200
    res_data = response.json()
    assert "response" in res_data
    assert "P-102" in res_data["response"]

def test_chat_vision_endpoint(monkeypatch):
    client = TestClient(app)
    
    async def mock_extract(*args, **kwargs):
        return "P-102"
        
    monkeypatch.setattr("backend.services.rag_service.extract_equipment_from_image", mock_extract)
    
    files = {"file": ("nameplate.jpg", b"fake_image_bytes", "image/jpeg")}
    response = client.post("/api/chat/vision", files=files)
    
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["identified"] is True
    assert res_data["equipment_id"] == "P-102"
    assert "P-102" in res_data["response"]
