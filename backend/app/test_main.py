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
    import random
    from datetime import date, timedelta

    # 1. Login as patient1
    login_response = client.post("/api/auth/login", data={"username": "patient1@caresync.com", "password": "patient123"})
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Generate a random future date to avoid collisions with prior test runs
    random_date = str(date.today() + timedelta(days=random.randint(1000, 5000)))
    
    # 2. Book a future appointment
    booking_payload = {
        "doctor_id": 2,  # doctor1 user id is 2 in seed script
        "appointment_date": random_date,
        "start_time": "10:00:00"
    }
    
    # Make first booking
    res1 = client.post("/api/patient/appointments", json=booking_payload, headers=headers)
    assert res1.status_code in [200, 201]
    
    # Make second booking at exact same slot
    res2 = client.post("/api/patient/appointments", json=booking_payload, headers=headers)
    assert res2.status_code == 400
    assert "already booked" in res2.json()["detail"] or "Double bookings are not permitted" in res2.json()["detail"]

def test_notification_marking_read():
    # 1. Login as patient1
    login_response = client.post("/api/auth/login", data={"username": "patient1@caresync.com", "password": "patient123"})
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get notifications
    notifs_res = client.get("/api/patient/notifications", headers=headers)
    assert notifs_res.status_code == 200
    notifs = notifs_res.json()
    
    if len(notifs) > 0:
        target_notif = notifs[0]
        notif_id = target_notif["id"]
        
        # 3. Mark single notification as read
        read_res = client.post(f"/api/patient/notifications/{notif_id}/read", headers=headers)
        assert read_res.status_code == 200
        assert read_res.json() == {"message": "Notification marked as read"}
        
        # 4. Mark all as read
        all_read_res = client.post("/api/patient/notifications/read", headers=headers)
        assert all_read_res.status_code == 200
        assert all_read_res.json() == {"message": "Notifications marked as read"}



