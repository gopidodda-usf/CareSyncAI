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
        "new_password": ""
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
        "new_password": ""
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
        "new_password": ""
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
        "new_password": "newpassword123"
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
