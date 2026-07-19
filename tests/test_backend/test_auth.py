import sys
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.main import app
from backend.db.models import Base
from backend.db.session import get_db
from backend.auth.security import hash_password, verify_password, decode_access_token

# Setup temporary file-based SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///test_temp.db"
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
    # Apply dependency override
    app.dependency_overrides[get_db] = override_get_db
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield
    # Remove dependency override
    app.dependency_overrides.clear()
    # Drop tables
    Base.metadata.drop_all(bind=engine)
    # Delete temporary database file
    if os.path.exists("test_temp.db"):
        try:
            os.remove("test_temp.db")
        except Exception:
            pass

client = TestClient(app)

def test_password_utils():
    raw_pass = "mypassword"
    hashed = hash_password(raw_pass)
    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed)
    assert not verify_password("wrongpass", hashed)

def test_register_and_login():
    # 1. Register a user
    reg_response = client.post(
        "/api/auth/register",
        json={"username": "arjun", "password": "arjunpassword", "role": "technician"}
    )
    assert reg_response.status_code == 201
    assert reg_response.json()["username"] == "arjun"
    assert reg_response.json()["role"] == "technician"
    assert "id" in reg_response.json()

    # 2. Login
    login_response = client.post(
        "/api/auth/login",
        data={"username": "arjun", "password": "arjunpassword"}
    )
    assert login_response.status_code == 200
    token_data = login_response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

    # Decode token check
    payload = decode_access_token(token_data["access_token"])
    assert payload["sub"] == "arjun"
    assert payload["role"] == "technician"

def test_protected_routes():
    # Register engineer and technician
    client.post(
        "/api/auth/register",
        json={"username": "engineer1", "password": "password123", "role": "engineer"}
    )
    client.post(
        "/api/auth/register",
        json={"username": "tech1", "password": "password123", "role": "technician"}
    )

    # Login both
    eng_token = client.post("/api/auth/login", data={"username": "engineer1", "password": "password123"}).json()["access_token"]
    tech_token = client.post("/api/auth/login", data={"username": "tech1", "password": "password123"}).json()["access_token"]

    # 1. Access protected route without token (Unauthorized)
    response = client.get("/api/demo/protected")
    assert response.status_code == 401

    # 2. Access protected route with token (Success)
    response = client.get("/api/demo/protected", headers={"Authorization": f"Bearer {tech_token}"})
    assert response.status_code == 200
    assert response.json()["username"] == "tech1"

    # 3. Access engineer-only route with tech token (Forbidden)
    response = client.get("/api/demo/engineer-only", headers={"Authorization": f"Bearer {tech_token}"})
    assert response.status_code == 403

    # 4. Access engineer-only route with engineer token (Success)
    response = client.get("/api/demo/engineer-only", headers={"Authorization": f"Bearer {eng_token}"})
    assert response.status_code == 200
    assert "Hello engineer1" in response.json()["message"]
