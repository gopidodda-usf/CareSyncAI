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
    
    # Generate a random future date to avoid collisions with prior test runs (must be within 3 months limit)
    random_date = str(date.today() + timedelta(days=random.randint(10, 80)))
    
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

def test_doctor_booked_slots():
    import random
    from datetime import date, timedelta

    # 1. Login as patient1
    login_response = client.post("/api/auth/login", data={"username": "patient1@caresync.com", "password": "patient123"})
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Generate a random future date within the 3 months limit
    random_date = str(date.today() + timedelta(days=random.randint(10, 80)))
    doctor_id = 2
    
    # 2. Book an appointment
    booking_payload = {
        "doctor_id": doctor_id,
        "appointment_date": random_date,
        "start_time": "11:00:00"
    }
    res1 = client.post("/api/patient/appointments", json=booking_payload, headers=headers)
    assert res1.status_code in [200, 201]
    
    # 3. Get booked slots
    res_slots = client.get(f"/api/patient/doctors/{doctor_id}/booked-slots", headers=headers)
    assert res_slots.status_code == 200
    slots = res_slots.json()
    
    # Check that our booked slot is in the list
    found = False
    for slot in slots:
        if slot["appointment_date"] == random_date and slot["start_time"] == "11:00:00":
            found = True
            break
    assert found

def test_doctor_availability_bulk_update():
    # 1. Login as doctor1
    login_response = client.post("/api/auth/login", data={"username": "doctor1@caresync.com", "password": "doctor123"})
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get current availability slots
    get_res = client.get("/api/doctor/availability", headers=headers)
    assert get_res.status_code == 200
    original_slots = get_res.json()

    # 3. Perform bulk update
    payload = [
        {
            "day_of_week": 1,
            "start_time": "08:00:00",
            "end_time": "12:00:00",
            "is_active": True
        },
        {
            "day_of_week": 2,
            "start_time": "13:00:00",
            "end_time": "17:00:00",
            "is_active": True
        }
    ]
    put_res = client.put("/api/doctor/availability", json=payload, headers=headers)
    assert put_res.status_code == 200
    assert put_res.json() == {"message": "Availability updated successfully"}

    # 4. Verify slots are updated
    get_res_new = client.get("/api/doctor/availability", headers=headers)
    assert get_res_new.status_code == 200
    new_slots = get_res_new.json()
    assert len(new_slots) == 2
    assert new_slots[0]["day_of_week"] == 1
    assert new_slots[0]["start_time"] == "08:00:00"
    assert new_slots[0]["end_time"] == "12:00:00"
    assert new_slots[1]["day_of_week"] == 2
    assert new_slots[1]["start_time"] == "13:00:00"
    assert new_slots[1]["end_time"] == "17:00:00"

    # 5. Revert slots back to original to keep DB state clean
    revert_payload = []
    for slot in original_slots:
        revert_payload.append({
            "day_of_week": slot["day_of_week"],
            "start_time": slot["start_time"],
            "end_time": slot["end_time"],
            "is_active": slot["is_active"]
        })
    revert_res = client.put("/api/doctor/availability", json=revert_payload, headers=headers)
    assert revert_res.status_code == 200

def test_doctor_cancel_appointment():
    import random
    from datetime import date, timedelta

    # 1. Login as patient1 to book
    login_res = client.post("/api/auth/login", data={"username": "patient1@caresync.com", "password": "patient123"})
    assert login_res.status_code == 200
    p_token = login_res.json()["access_token"]
    p_headers = {"Authorization": f"Bearer {p_token}"}

    # Generate future date
    random_date = str(date.today() + timedelta(days=random.randint(10, 80)))
    booking_payload = {
        "doctor_id": 2,  # doctor1
        "appointment_date": random_date,
        "start_time": "14:00:00"
    }
    book_res = client.post("/api/patient/appointments", json=booking_payload, headers=p_headers)
    assert book_res.status_code in [200, 201]
    appt_id = book_res.json()["id"]

    # 2. Login as doctor1 to cancel
    doc_login_res = client.post("/api/auth/login", data={"username": "doctor1@caresync.com", "password": "doctor123"})
    assert doc_login_res.status_code == 200
    d_token = doc_login_res.json()["access_token"]
    d_headers = {"Authorization": f"Bearer {d_token}"}

    # Cancel the appointment
    cancel_payload = {"reason": "Schedule Conflict / Emergency"}
    cancel_res = client.post(f"/api/doctor/appointments/{appt_id}/cancel", json=cancel_payload, headers=d_headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"
    assert cancel_res.json()["cancellation_reason"] == "Schedule Conflict / Emergency"

    # 3. Verify patient received a notification
    notifs_res = client.get("/api/patient/notifications", headers=p_headers)
    assert notifs_res.status_code == 200
    notifs = notifs_res.json()
    found = any("Cancelled" in n["title"] and "Schedule Conflict" in n["message"] for n in notifs)
    assert found


def test_doctor_daily_notes():
    # 1. Login as doctor1
    doc_login_res = client.post("/api/auth/login", data={"username": "doctor1@caresync.com", "password": "doctor123"})
    assert doc_login_res.status_code == 200
    token = doc_login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get existing daily notes (should be empty or list)
    notes_res = client.get("/api/doctor/daily-notes", headers=headers)
    assert notes_res.status_code == 200
    initial_count = len(notes_res.json())

    # 3. Create a daily note for today
    note_payload = {
        "note_date": "2026-06-09",
        "content": "Prepare for weekly board meeting."
    }
    create_res = client.post("/api/doctor/daily-notes", json=note_payload, headers=headers)
    assert create_res.status_code == 200
    note_id = create_res.json()["id"]
    assert create_res.json()["content"] == "Prepare for weekly board meeting."
    assert create_res.json()["note_date"] == "2026-06-09"

    # 4. Get notes and verify it has increased by 1
    notes_res = client.get("/api/doctor/daily-notes", headers=headers)
    assert notes_res.status_code == 200
    assert len(notes_res.json()) == initial_count + 1

    # 5. Update the daily note
    update_payload = {
        "note_date": "2026-06-09",
        "content": "Prepare for board meeting and surgery."
    }
    update_res = client.post("/api/doctor/daily-notes", json=update_payload, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["id"] == note_id
    assert update_res.json()["content"] == "Prepare for board meeting and surgery."

    # 6. Delete the note by sending empty content
    delete_payload = {
        "note_date": "2026-06-09",
        "content": "   " # whitespace content should also trigger deletion
    }
    delete_res = client.post("/api/doctor/daily-notes", json=delete_payload, headers=headers)
    assert delete_res.status_code == 200
    assert delete_res.json() is None

    # 7. Get notes and verify it's back to initial count
    notes_res = client.get("/api/doctor/daily-notes", headers=headers)
    assert notes_res.status_code == 200
    assert len(notes_res.json()) == initial_count







