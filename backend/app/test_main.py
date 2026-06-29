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
    
    # Generate a random future weekday date to avoid collisions with prior test runs (must be within 3 months limit)
    candidate_dates = []
    for d in range(20, 80):
        c_date = date.today() + timedelta(days=d)
        if c_date.weekday() < 5:  # Monday to Friday
            candidate_dates.append(str(c_date))
    random_date = random.choice(candidate_dates)
    
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

def test_public_registration_disallowed_roles():
    # Attempt to register a doctor publicly
    payload = {
        "email": "public_doc@caresync.com",
        "password": "doctorpassword",
        "role": "doctor",
        "first_name": "Public",
        "last_name": "Doctor",
        "phone": "555-000-1111",
        "street_address_1": "123 Doc St",
        "city": "Miami",
        "state": "FL",
        "zip_code": "33101",
        "county": "Miami-Dade"
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 400
    assert "Only patient registration is publicly allowed" in res.json()["detail"]

    # Attempt to register an admin publicly
    payload["role"] = "admin"
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 400
    assert "Only patient registration is publicly allowed" in res.json()["detail"]

    # Successfully register a patient
    import uuid
    payload["role"] = "patient"
    payload["email"] = f"public_patient_{uuid.uuid4().hex[:8]}@caresync.com"
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 200
    assert "access_token" in res.json()

def test_admin_bulk_delete():
    # 1. Login as admin
    login_response = client.post("/api/auth/login", data={"username": "admin@caresync.com", "password": "admin123"})
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Register two dummy patient users to delete
    pat1_payload = {
        "email": "dummy_pat1@caresync.com",
        "password": "patient123",
        "role": "patient",
        "first_name": "Dummy",
        "last_name": "One",
        "phone": "555-111-2222",
        "street_address_1": "123 Street",
        "city": "Miami",
        "state": "FL",
        "zip_code": "33101",
        "county": "Miami-Dade"
    }
    res1 = client.post("/api/auth/register", json=pat1_payload)
    assert res1.status_code == 200
    
    pat2_payload = {
        "email": "dummy_pat2@caresync.com",
        "password": "patient123",
        "role": "patient",
        "first_name": "Dummy",
        "last_name": "Two",
        "phone": "555-111-3333",
        "street_address_1": "124 Street",
        "city": "Miami",
        "state": "FL",
        "zip_code": "33101",
        "county": "Miami-Dade"
    }
    res2 = client.post("/api/auth/register", json=pat2_payload)
    assert res2.status_code == 200

    # Get user details to retrieve IDs
    users_res = client.get("/api/admin/users", headers=headers)
    assert users_res.status_code == 200
    users = users_res.json()
    
    dummy_ids = [u["id"] for u in users if u["email"] in ["dummy_pat1@caresync.com", "dummy_pat2@caresync.com"]]
    assert len(dummy_ids) == 2

    # 3. Call bulk delete
    bulk_del_payload = {"user_ids": dummy_ids}
    del_res = client.post("/api/admin/users/bulk-delete", json=bulk_del_payload, headers=headers)
    assert del_res.status_code == 200
    assert "Successfully deleted 2 users" in del_res.json()["message"]

    # Verify they are gone
    users_res_after = client.get("/api/admin/users", headers=headers)
    emails_after = [u["email"] for u in users_res_after.json()]
    assert "dummy_pat1@caresync.com" not in emails_after
    assert "dummy_pat2@caresync.com" not in emails_after

def test_location_based_doctor_search():
    # Login as patient1
    login_response = client.post("/api/auth/login", data={"username": "patient1@caresync.com", "password": "patient123"})
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Search with coordinates (Miami center)
    res = client.get("/api/patient/doctors?lat=25.7617&lng=-80.1918", headers=headers)
    assert res.status_code == 200
    docs = res.json()
    assert len(docs) > 0
    # First doctor should have distance computed
    assert docs[0]["distance"] is not None
    
    # Sort check: distances should be ascending
    distances = [d["distance"] for d in docs if d["distance"] is not None]
    assert distances == sorted(distances)

    # Search with location text filter (e.g. city Miami)
    res_text = client.get("/api/patient/doctors?location_query=Miami", headers=headers)
    assert res_text.status_code == 200
    text_docs = res_text.json()
    for d in text_docs:
        assert d["city"].lower() == "miami"

def test_location_based_clinic_search():
    # Login as patient1
    login_response = client.post("/api/auth/login", data={"username": "patient1@caresync.com", "password": "patient123"})
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Search clinics near Boston
    res = client.get("/api/patient/clinics-search?lat=42.3601&lng=-71.0589", headers=headers)
    assert res.status_code == 200
    clinics = res.json()
    assert len(clinics) > 0
    assert clinics[0]["distance"] is not None
    # Boston clinic should be closest
    assert clinics[0]["city"].lower() == "boston"
    # Specialties should be dynamically computed list
    assert isinstance(clinics[0]["specialties"], list)

def test_admin_create_user():
    # 1. Login as admin
    login_response = client.post("/api/auth/login", data={"username": "admin@caresync.com", "password": "admin123"})
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create a new patient via admin endpoint
    import uuid
    email = f"admin_created_{uuid.uuid4().hex[:8]}@caresync.com"
    payload = {
        "email": email,
        "password": "patientpassword",
        "role": "patient",
        "first_name": "AdminCreated",
        "last_name": "Patient",
        "phone": "555-999-8888",
        "street_address_1": "100 Admin St",
        "city": "Boston",
        "state": "MA",
        "zip_code": "02108",
        "county": "Suffolk"
    }

    res = client.post("/api/admin/users", json=payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["message"] == "User created successfully"

    # 3. Verify they can login
    login_res = client.post("/api/auth/login", data={"username": email, "password": "patientpassword"})
    assert login_res.status_code == 200

def test_admin_create_and_update_doctor():
    # 1. Login as admin
    login_response = client.post("/api/auth/login", data={"username": "admin@caresync.com", "password": "admin123"})
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create specialty
    import uuid
    spec_name_1 = f"Cardiology Test {uuid.uuid4().hex[:4]}"
    spec_name_2 = f"Pediatrics Test {uuid.uuid4().hex[:4]}"
    spec1_res = client.post("/api/admin/specialties", json={"name": spec_name_1, "description": "Heart stuff"}, headers=headers)
    assert spec1_res.status_code == 200
    spec1_id = spec1_res.json()["id"]

    spec2_res = client.post("/api/admin/specialties", json={"name": spec_name_2, "description": "Kid stuff"}, headers=headers)
    assert spec2_res.status_code == 200
    spec2_id = spec2_res.json()["id"]

    # 3. Create clinic
    clinic_res = client.post("/api/admin/clinics", json={
        "name": f"Clinic Test {uuid.uuid4().hex[:4]}",
        "phone": "555-777-8888",
        "street_address_1": "789 Clinic Rd",
        "city": "Boston",
        "state": "MA",
        "zip_code": "02108",
        "county": "Suffolk"
    }, headers=headers)
    assert clinic_res.status_code == 200
    clinic_id = clinic_res.json()["id"]

    # 4. Create doctor
    email = f"doc_{uuid.uuid4().hex[:8]}@caresync.com"
    payload = {
        "email": email,
        "password": "doctorpassword",
        "role": "doctor",
        "first_name": "John",
        "last_name": "Doe",
        "phone": "555-123-4567",
        "specialty_id": spec1_id,
        "clinic_id": clinic_id,
        "secondary_specialty_ids": [spec2_id],
        "street_address_1": "789 Clinic Rd",
        "city": "Boston",
        "state": "MA",
        "zip_code": "02108",
        "county": "Suffolk"
    }
    create_res = client.post("/api/admin/users", json=payload, headers=headers)
    assert create_res.status_code == 200
    doc_user_id = create_res.json()["user_id"]

    # Verify doctor fields in user list
    users_res = client.get("/api/admin/users", headers=headers)
    assert users_res.status_code == 200
    users = users_res.json()
    doc_user = next((u for u in users if u["id"] == doc_user_id), None)
    assert doc_user is not None
    assert doc_user["specialty_id"] == spec1_id
    assert doc_user["clinic_id"] == clinic_id
    assert len(doc_user["secondary_specialties"]) == 1
    assert doc_user["secondary_specialties"][0]["id"] == spec2_id

    # 5. Update doctor
    update_payload = {
        "email": email,
        "role": "doctor",
        "first_name": "John Updated",
        "last_name": "Doe",
        "phone": "555-123-4567",
        "specialty_id": spec2_id, # switch primary
        "clinic_id": clinic_id,
        "secondary_specialty_ids": [spec1_id], # switch secondary
        "street_address_1": "789 Clinic Rd",
        "city": "Boston",
        "state": "MA",
        "zip_code": "02108",
        "county": "Suffolk"
    }
    update_res = client.put(f"/api/admin/users/{doc_user_id}", json=update_payload, headers=headers)
    assert update_res.status_code == 200

    # Verify updated fields
    users_res = client.get("/api/admin/users", headers=headers)
    users = users_res.json()
    doc_user = next((u for u in users if u["id"] == doc_user_id), None)
    assert doc_user["specialty_id"] == spec2_id
    assert len(doc_user["secondary_specialties"]) == 1
    assert doc_user["secondary_specialties"][0]["id"] == spec1_id

def test_clinic_deletion_cascade():
    # 1. Login as admin
    login_response = client.post("/api/auth/login", data={"username": "admin@caresync.com", "password": "admin123"})
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create clinic
    import uuid
    clinic_res = client.post("/api/admin/clinics", json={
        "name": f"Cascade Clinic {uuid.uuid4().hex[:4]}",
        "phone": "555-777-9999",
        "street_address_1": "999 Cascade St",
        "city": "Boston",
        "state": "MA",
        "zip_code": "02108",
        "county": "Suffolk"
    }, headers=headers)
    assert clinic_res.status_code == 200
    clinic_id = clinic_res.json()["id"]

    # 3. Create doctor user associated with that clinic
    email = f"cascade_doc_{uuid.uuid4().hex[:8]}@caresync.com"
    payload = {
        "email": email,
        "password": "doctorpassword",
        "role": "doctor",
        "first_name": "Cascade",
        "last_name": "Doctor",
        "phone": "555-999-0000",
        "clinic_id": clinic_id,
        "street_address_1": "999 Cascade St",
        "city": "Boston",
        "state": "MA",
        "zip_code": "02108",
        "county": "Suffolk"
    }
    create_res = client.post("/api/admin/users", json=payload, headers=headers)
    assert create_res.status_code == 200
    doc_user_id = create_res.json()["user_id"]

    # Check that doctor is in user list
    users_res = client.get("/api/admin/users", headers=headers)
    users = users_res.json()
    assert any(u["id"] == doc_user_id for u in users)

    # 4. Delete clinic
    del_res = client.delete(f"/api/admin/clinics/{clinic_id}", headers=headers)
    assert del_res.status_code == 200

    # 5. Verify doctor user is deleted from user list
    users_res = client.get("/api/admin/users", headers=headers)
    users = users_res.json()
    assert not any(u["id"] == doc_user_id for u in users)








