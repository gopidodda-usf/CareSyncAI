from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_patient_profile_update():
    # 1. Login as patient1
    login_response = client.post("/api/auth/login", data={"username": "patient1@caresync.com", "password": "patient123"})
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get current profile details
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    me = me_res.json()
    assert me["role"] == "patient"
    patient_profile = me["patient_profile"]

    # 3. Update patient profile with valid phone format (XXX-XXX-XXXX)
    payload = {
        "first_name": "UpdatedPatient",
        "last_name": patient_profile["last_name"],
        "phone": "555-999-9999",
        "date_of_birth": patient_profile["date_of_birth"],
        "gender": "Other",
        "profile_picture": "https://avatar.url/1",
        "old_password": "",
        "new_password": "",
        "street_address_1": "123 Patient St",
        "street_address_2": "Apt 2",
        "city": "Miami",
        "state": "FL",
        "zip_code": "33101",
        "county": "Miami-Dade"
    }
    
    update_res = client.put("/api/patient/profile", json=payload, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json() == {"message": "Profile updated successfully"}

    # 4. Get updated profile details
    me_res2 = client.get("/api/auth/me", headers=headers)
    assert me_res2.status_code == 200
    me2 = me_res2.json()
    assert me2["profile_picture"] == "https://avatar.url/1"
    assert me2["patient_profile"]["first_name"] == "UpdatedPatient"
    assert me2["patient_profile"]["phone"] == "555-999-9999"
    assert me2["patient_profile"]["gender"] == "Other"

    # 5. Revert changes to keep test idempotent
    revert_payload = {
        "first_name": patient_profile["first_name"],
        "last_name": patient_profile["last_name"],
        "phone": patient_profile["phone"],
        "date_of_birth": patient_profile["date_of_birth"],
        "gender": patient_profile["gender"],
        "profile_picture": me.get("profile_picture"),
        "old_password": "",
        "new_password": "",
        "street_address_1": "123 Patient St",
        "street_address_2": "Apt 2",
        "city": "Miami",
        "state": "FL",
        "zip_code": "33101",
        "county": "Miami-Dade"
    }
    revert_res = client.put("/api/patient/profile", json=revert_payload, headers=headers)
    assert revert_res.status_code == 200

def test_doctor_profile_update():
    # 1. Login as doctor1
    login_response = client.post("/api/auth/login", data={"username": "doctor1@caresync.com", "password": "doctor123"})
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get current profile details
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    me = me_res.json()
    assert me["role"] == "doctor"
    doctor_profile = me["doctor_profile"]

    # 3. Update doctor profile
    payload = {
        "first_name": "UpdatedDoctor",
        "last_name": doctor_profile["last_name"],
        "phone": "555-888-8888",
        "bio": "My new professional bio.",
        "consultation_fee": 125.00,
        "profile_picture": "https://avatar.url/2",
        "old_password": "",
        "new_password": "",
        "street_address_1": "456 Doctor Ave",
        "street_address_2": "Suite 100",
        "city": "Boston",
        "state": "MA",
        "zip_code": "02108",
        "county": "Suffolk"
    }
    
    update_res = client.put("/api/doctor/profile", json=payload, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json() == {"message": "Profile updated successfully"}

    # 4. Get updated profile details
    me_res2 = client.get("/api/auth/me", headers=headers)
    assert me_res2.status_code == 200
    me2 = me_res2.json()
    assert me2["profile_picture"] == "https://avatar.url/2"
    assert me2["doctor_profile"]["first_name"] == "UpdatedDoctor"
    assert me2["doctor_profile"]["phone"] == "555-888-8888"
    assert me2["doctor_profile"]["bio"] == "My new professional bio."
    assert float(me2["doctor_profile"]["consultation_fee"]) == 125.00

    # 5. Revert changes to keep test idempotent
    revert_payload = {
        "first_name": doctor_profile["first_name"],
        "last_name": doctor_profile["last_name"],
        "phone": doctor_profile["phone"],
        "bio": doctor_profile["bio"],
        "consultation_fee": float(doctor_profile["consultation_fee"]),
        "profile_picture": me.get("profile_picture"),
        "old_password": "",
        "new_password": "",
        "street_address_1": "456 Doctor Ave",
        "street_address_2": "Suite 100",
        "city": "Boston",
        "state": "MA",
        "zip_code": "02108",
        "county": "Suffolk"
    }
    revert_res = client.put("/api/doctor/profile", json=revert_payload, headers=headers)
    assert revert_res.status_code == 200

def test_admin_profile_update():
    # 1. Login as admin
    login_response = client.post("/api/auth/login", data={"username": "admin@caresync.com", "password": "admin123"})
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get current profile details
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    me = me_res.json()
    assert me["role"] == "admin"

    # 3. Update admin profile password
    payload = {
        "name": "Updated Admin Name",
        "profile_picture": "https://avatar.url/admin",
        "old_password": "admin123",
        "new_password": "newadminpassword"
    }
    
    update_res = client.put("/api/admin/profile", json=payload, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json() == {"message": "Profile updated successfully"}

    # 4. Get updated profile details
    me_res2 = client.get("/api/auth/me", headers=headers)
    assert me_res2.status_code == 200
    me2 = me_res2.json()
    assert me2["name"] == "Updated Admin Name"
    assert me2["profile_picture"] == "https://avatar.url/admin"

    # 5. Check login with new password
    login_response2 = client.post("/api/auth/login", data={"username": "admin@caresync.com", "password": "newadminpassword"})
    assert login_response2.status_code == 200
    token2 = login_response2.json()["access_token"]

    # 6. Revert changes to keep test idempotent
    revert_payload = {
        "name": "CareSync Admin",
        "profile_picture": me.get("profile_picture"),
        "old_password": "newadminpassword",
        "new_password": "admin123"
    }
    revert_res = client.put("/api/admin/profile", json=revert_payload, headers={"Authorization": f"Bearer {token2}"})
    assert revert_res.status_code == 200

def test_invalid_phone_number_format():
    # Login as patient
    login_response = client.post("/api/auth/login", data={"username": "patient1@caresync.com", "password": "patient123"})
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Try 10-digit number without hyphens
    payload = {
        "first_name": "Test",
        "last_name": "Patient",
        "phone": "1234567890", # invalid format
        "old_password": "",
        "new_password": "",
        "street_address_1": "123 Patient St",
        "street_address_2": "Apt 2",
        "city": "Miami",
        "state": "FL",
        "zip_code": "33101",
        "county": "Miami-Dade"
    }
    res = client.put("/api/patient/profile", json=payload, headers=headers)
    assert res.status_code == 422 # Pydantic validation error

    # Try format with wrong hyphen spacing
    payload["phone"] = "123-4567-890"
    res = client.put("/api/patient/profile", json=payload, headers=headers)
    assert res.status_code == 422

def test_incorrect_old_password():
    # Login as patient
    login_response = client.post("/api/auth/login", data={"username": "patient1@caresync.com", "password": "patient123"})
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt password change with wrong old password
    payload = {
        "first_name": "Test",
        "last_name": "Patient",
        "phone": "555-123-4567",
        "old_password": "wrongpassword",
        "new_password": "newpassword123",
        "street_address_1": "123 Patient St",
        "street_address_2": "Apt 2",
        "city": "Miami",
        "state": "FL",
        "zip_code": "33101",
        "county": "Miami-Dade"
    }
    res = client.put("/api/patient/profile", json=payload, headers=headers)
    assert res.status_code == 400
    assert res.json()["detail"] == "Incorrect old password"

def test_admin_get_users():
    # 1. Login as admin
    login_response = client.post("/api/auth/login", data={"username": "admin@caresync.com", "password": "admin123"})
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Query users list
    res = client.get("/api/admin/users", headers=headers)
    assert res.status_code == 200
    users = res.json()
    assert len(users) > 0
    # 3. Check that first_name and last_name are populated in the response
    for user in users:
        assert "first_name" in user
        assert "last_name" in user
        if user["role"] == "patient":
            assert user["first_name"] != ""

def test_admin_update_other_user():
    # 1. Login as admin
    login_response = client.post("/api/auth/login", data={"username": "admin@caresync.com", "password": "admin123"})
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Find patient1 user id dynamically first by logging in
    login_pat = client.post("/api/auth/login", data={"username": "patient1@caresync.com", "password": "patient123"})
    assert login_pat.status_code == 200
    pat_token = login_pat.json()["access_token"]
    me_pat = client.get("/api/auth/me", headers={"Authorization": f"Bearer {pat_token}"}).json()
    pat_id = me_pat["id"]
    pat_first = me_pat["patient_profile"]["first_name"]
    pat_last = me_pat["patient_profile"]["last_name"]
    pat_phone = me_pat["patient_profile"]["phone"]

    # 2. Update Patient 1 details dynamically using pat_id
    payload = {
        "email": "updated_patient1@caresync.com",
        "role": "patient",
        "first_name": "AdminUpdatedPat",
        "last_name": pat_last,
        "phone": "999-999-9999",
        "password": "newpatientpassword"
    }
    update_res = client.put(f"/api/admin/users/{pat_id}", json=payload, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json() == {"message": "User details updated successfully"}

    # 3. Verify Patient 1 can log in with new email and password
    login_patient = client.post("/api/auth/login", data={"username": "updated_patient1@caresync.com", "password": "newpatientpassword"})
    assert login_patient.status_code == 200
    patient_token = login_patient.json()["access_token"]
    
    # Check details of patient 1
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {patient_token}"})
    assert me_res.status_code == 200
    me = me_res.json()
    assert me["email"] == "updated_patient1@caresync.com"
    assert me["patient_profile"]["first_name"] == "AdminUpdatedPat"
    assert me["patient_profile"]["phone"] == "999-999-9999"

    # 4. Revert changes to keep test idempotent
    revert_payload = {
        "email": "patient1@caresync.com",
        "role": "patient",
        "first_name": pat_first,
        "last_name": pat_last,
        "phone": pat_phone,
        "password": "patient123"
    }
    revert_res = client.put(f"/api/admin/users/{pat_id}", json=revert_payload, headers=headers)
    assert revert_res.status_code == 200
