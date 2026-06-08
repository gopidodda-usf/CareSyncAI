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

    # 3. Update patient profile
    payload = {
        "first_name": "UpdatedPatient",
        "last_name": patient_profile["last_name"],
        "phone": "555-9999",
        "date_of_birth": patient_profile["date_of_birth"],
        "gender": "Other",
        "profile_picture": "https://avatar.url/1",
        "email": "patient1@caresync.com", # keep same email
        "password": "" # keep same password
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
    assert me2["patient_profile"]["phone"] == "555-9999"
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
        "phone": "555-8888",
        "bio": "My new professional bio.",
        "consultation_fee": 125.00,
        "profile_picture": "https://avatar.url/2",
        "email": "doctor1@caresync.com",
        "password": ""
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
    assert me2["doctor_profile"]["phone"] == "555-8888"
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

    # 3. Update admin profile
    payload = {
        "name": "Updated Admin Name",
        "profile_picture": "https://avatar.url/admin",
        "email": "admin@caresync.com",
        "password": "newadminpassword"
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
        "email": "admin@caresync.com",
        "password": "admin123"
    }
    revert_res = client.put("/api/admin/profile", json=revert_payload, headers={"Authorization": f"Bearer {token2}"})
    assert revert_res.status_code == 200

