from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_welcome_route():
    response = client.get("/")
    assert response.status_code == 200
    assert "Welcome to CareSync" in response.json()["message"]

def test_invalid_login():
    response = client.post("/api/auth/login", data={"username": "wrong@user.com", "password": "wrongpassword"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"
