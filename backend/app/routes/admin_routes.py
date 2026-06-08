from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.models import (
    User, Patient, Doctor, Specialty, Clinic, Appointment
)
from app.schemas.schemas import ClinicBase, SpecialtyBase, AdminProfileUpdate, AdminUserUpdate
from app.services.auth import get_current_admin, get_password_hash, verify_password
from app.services.analytics import get_admin_dashboard_analytics

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/users")
def get_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    results = []
    for u in users:
        detail = {
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at,
            "name": u.name or "Admin"
        }
        if u.role == "patient" and u.patient:
            detail["name"] = f"{u.patient.first_name} {u.patient.last_name}"
            detail["first_name"] = u.patient.first_name
            detail["last_name"] = u.patient.last_name
            detail["phone"] = u.patient.phone
        elif u.role == "doctor" and u.doctor:
            detail["name"] = f"Dr. {u.doctor.first_name} {u.doctor.last_name}"
            detail["first_name"] = u.doctor.first_name
            detail["last_name"] = u.doctor.last_name
            detail["phone"] = u.doctor.phone
        else:
            detail["name"] = u.name or "Admin"
            names = (u.name or "Admin").split(" ")
            detail["first_name"] = names[0] if names else ""
            detail["last_name"] = " ".join(names[1:]) if len(names) > 1 else ""
            detail["phone"] = ""
            
        results.append(detail)
    return results

@router.post("/clinics")
def create_clinic(clinic_data: ClinicBase, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    clinic = Clinic(
        name=clinic_data.name,
        address=clinic_data.address,
        phone=clinic_data.phone
    )
    db.add(clinic)
    db.commit()
    db.refresh(clinic)
    return clinic

@router.post("/specialties")
def create_specialty(spec_data: SpecialtyBase, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    existing = db.query(Specialty).filter(Specialty.name == spec_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Specialty already exists")
        
    spec = Specialty(
        name=spec_data.name,
        description=spec_data.description
    )
    db.add(spec)
    db.commit()
    db.refresh(spec)
    return spec

@router.get("/analytics/overview")
def get_system_overview(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    # Count stats
    total_users = db.query(func.count(User.id)).scalar()
    total_patients = db.query(func.count(Patient.id)).scalar()
    total_doctors = db.query(func.count(Doctor.id)).scalar()
    total_appointments = db.query(func.count(Appointment.id)).scalar()
    
    # Status breakdown
    status_counts = db.query(
        Appointment.status, 
        func.count(Appointment.id)
    ).group_by(Appointment.status).all()
    
    status_breakdown = {status: count for status, count in status_counts}
    
    return {
        "total_users": total_users,
        "total_patients": total_patients,
        "total_doctors": total_doctors,
        "total_appointments": total_appointments,
        "status_breakdown": {
            "scheduled": status_breakdown.get("scheduled", 0),
            "completed": status_breakdown.get("completed", 0),
            "cancelled": status_breakdown.get("cancelled", 0),
            "no_show": status_breakdown.get("no_show", 0)
        }
    }

@router.get("/analytics/dashboard")
def get_dashboard_charts(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    return get_admin_dashboard_analytics(db)

@router.put("/profile")
def update_admin_profile(
    profile_data: AdminProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    if profile_data.profile_picture is not None:
        current_user.profile_picture = profile_data.profile_picture
        
    if profile_data.name is not None:
        current_user.name = profile_data.name.strip()
        
    if profile_data.new_password:
        if not profile_data.old_password:
            raise HTTPException(status_code=400, detail="Old password is required to change password")
        if not verify_password(profile_data.old_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect old password")
        current_user.hashed_password = get_password_hash(profile_data.new_password)
        
    db.commit()
    return {"message": "Profile updated successfully"}


@router.put("/users/{user_id}")
def update_user_by_admin(
    user_id: int,
    user_data: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    user_to_update = db.query(User).filter(User.id == user_id).first()
    if not user_to_update:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Check email uniqueness if email is changed
    if user_data.email and user_data.email.strip() != user_to_update.email:
        existing = db.query(User).filter(User.email == user_data.email.strip()).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email is already registered")
        user_to_update.email = user_data.email.strip()
        
    # Update password if provided
    if user_data.password:
        if len(user_data.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        user_to_update.hashed_password = get_password_hash(user_data.password)
        
    # Update role and profiles
    old_role = user_to_update.role
    if user_data.role and user_data.role != old_role:
        if user_data.role not in ["patient", "doctor", "admin"]:
            raise HTTPException(status_code=400, detail="Invalid role")
        
        # Clean up old profile
        if old_role == "patient" and user_to_update.patient:
            db.delete(user_to_update.patient)
        elif old_role == "doctor" and user_to_update.doctor:
            db.delete(user_to_update.doctor)
            
        user_to_update.role = user_data.role
        
        # Initialize new profile if needed
        if user_data.role == "patient":
            patient_profile = Patient(
                id=user_to_update.id,
                first_name=user_data.first_name or "Patient",
                last_name=user_data.last_name or "Name",
                phone=user_data.phone
            )
            db.add(patient_profile)
        elif user_data.role == "doctor":
            doctor_profile = Doctor(
                id=user_to_update.id,
                first_name=user_data.first_name or "Doctor",
                last_name=user_data.last_name or "Name",
                phone=user_data.phone
            )
            db.add(doctor_profile)
        elif user_data.role == "admin":
            user_to_update.name = user_data.name or f"{user_data.first_name or ''} {user_data.last_name or ''}".strip() or "Admin"
    else:
        # Role didn't change, update the active profile
        if user_to_update.role == "patient":
            if not user_to_update.patient:
                user_to_update.patient = Patient(id=user_to_update.id, first_name="Patient", last_name="Name")
                db.add(user_to_update.patient)
            if user_data.first_name is not None:
                user_to_update.patient.first_name = user_data.first_name.strip()
            if user_data.last_name is not None:
                user_to_update.patient.last_name = user_data.last_name.strip()
            if user_data.phone is not None:
                user_to_update.patient.phone = user_data.phone
        elif user_to_update.role == "doctor":
            if not user_to_update.doctor:
                user_to_update.doctor = Doctor(id=user_to_update.id, first_name="Doctor", last_name="Name")
                db.add(user_to_update.doctor)
            if user_data.first_name is not None:
                user_to_update.doctor.first_name = user_data.first_name.strip()
            if user_data.last_name is not None:
                user_to_update.doctor.last_name = user_data.last_name.strip()
            if user_data.phone is not None:
                user_to_update.doctor.phone = user_data.phone
        elif user_to_update.role == "admin":
            if user_data.name is not None:
                user_to_update.name = user_data.name.strip()
            elif user_data.first_name or user_data.last_name:
                user_to_update.name = f"{user_data.first_name or ''} {user_data.last_name or ''}".strip()
                
    db.commit()
    return {"message": "User details updated successfully"}
