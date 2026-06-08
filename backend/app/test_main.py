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

def test_double_booking_prevention():
    # 1. Login as patient1
    login_response = client.post("/api/auth/login", data={"username": "patient1@caresync.com", "password": "patient123"})
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Book a future appointment
    booking_payload = {
        "doctor_id": 2,  # doctor1 user id is 2 in seed script
        "appointment_date": "2030-10-10",
        "start_time": "10:00:00"
    }
    
    # Make first booking
    res1 = client.post("/api/patient/appointments", json=booking_payload, headers=headers)
    assert res1.status_code in [200, 201]
    
    # Make second booking at exact same slot
    res2 = client.post("/api/patient/appointments", json=booking_payload, headers=headers)
    assert res2.status_code == 400
    assert "already booked" in res2.json()["detail"] or "Double bookings are not permitted" in res2.json()["detail"]

