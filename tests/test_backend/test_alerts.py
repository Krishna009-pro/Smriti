import sys
import os
import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.main import app, watcher, sse_listeners, alert_sender
from backend.db.models import Base
from backend.db.session import get_db
from backend.services.ingestion_service import IngestionService

# Use temporary file-based SQLite database for alerts tests
SQLALCHEMY_DATABASE_URL = "sqlite:///test_alerts_temp.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override get_db dependency
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(autouse=True)
def setup_db():
    # Apply override
    app.dependency_overrides[get_db] = override_get_db
    
    # Save original session factory and override
    orig_session_factory = watcher.session_factory
    watcher.session_factory = TestingSessionLocal
    
    # Mock Telegram calls to prevent hanging/network traffic
    orig_send_alert = alert_sender.send_telegram_alert
    async def mock_send_alert(*args, **kwargs):
        return True
    alert_sender.send_telegram_alert = mock_send_alert
    
    Base.metadata.create_all(bind=engine)
    
    # Run cached ingestion to seed nodes/edges for the tests
    db = TestingSessionLocal()
    try:
        ingest = IngestionService(db)
        ingest.ingest_pid("dummy_pid.pdf", use_cache=True)
        ingest.ingest_shift_notes("dummy_notes.txt", use_cache=True)
    finally:
        db.close()
        
    yield
    
    # Tear down override
    app.dependency_overrides.clear()
    watcher.session_factory = orig_session_factory
    alert_sender.send_telegram_alert = orig_send_alert
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("test_alerts_temp.db"):
        try:
            os.remove("test_alerts_temp.db")
        except Exception:
            pass

client = TestClient(app)

@pytest.mark.anyio
async def test_watcher_matching_and_sse():
    # Manually start the watcher task loop
    await watcher.start()
    
    # 1. Create a dummy listener queue to capture the sse dispatch
    queue = asyncio.Queue()
    sse_listeners.append(queue)
    
    try:
        # 2. Simulate telemetry reading matching FIX-102 telemetry_signature:
        # P-102 with pressure drop > 15% (e.g. delta_pct=18.0)
        reading = {
            "equipment_id": "P-102",
            "metric": "pressure",
            "value": 75.0,
            "delta_pct": 18.0
        }
        
        # Inject reading directly into watcher queue
        await watcher.telemetry_queue.put(reading)
        
        # Wait for the alert to be published to our listener queue
        alert = await asyncio.wait_for(queue.get(), timeout=3.0)
        
        assert alert is not None
        assert alert["equipment_id"] == "P-102"
        assert alert["suggested_fix"] == "Clear upstream Valve V-101"
        assert "seal leaking" in alert["symptom"]
        assert alert["telemetry"]["delta_pct"] == 18.0
        
    finally:
        try:
            sse_listeners.remove(queue)
        except ValueError:
            pass
        # Manually stop the watcher task loop
        await watcher.stop()

def test_api_manual_trigger():
    # 1. Call `/api/alerts/trigger` with P-102 and a custom symptom
    response = client.post(
        "/api/alerts/trigger",
        params={"equipment_id": "P-102", "symptom": "Vibration levels high"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "triggered"
    assert response.json()["equipment_id"] == "P-102"
    assert response.json()["alert_sent"] is True

def test_api_telemetry_simulate():
    # 1. Call `/api/telemetry/simulate` with reading payload
    response = client.post(
        "/api/telemetry/simulate",
        json={
            "equipment_id": "P-102",
            "metric": "pressure",
            "value": 65.0,
            "delta_pct": 22.0
        }
    )
    assert response.status_code == 200
    assert response.json()["status"] == "triggered"
    assert response.json()["reading"]["delta_pct"] == 22.0
    assert response.json()["alert_sent"] is True
