import sys
import os
from fastapi.testclient import TestClient

# Add workspace root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from backend.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "smriti-api"}

def test_ingest_pid_placeholder():
    response = client.post("/api/ingest/pid", params={"file_path": "dummy.pdf"})
    assert response.status_code == 202
    assert response.json()["status"] == "accepted"

def test_dashboard_metrics_placeholder():
    response = client.get("/api/dashboard/metrics")
    assert response.status_code == 200
    assert "context_retained_pct" in response.json()
