from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.models import (
    User, Patient, Doctor, Specialty, Clinic, Appointment
)
from app.schemas.schemas import ClinicBase, SpecialtyBase, AdminProfileUpdate
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
        elif u.role == "doctor" and u.doctor:
            detail["name"] = f"Dr. {u.doctor.first_name} {u.doctor.last_name}"
            
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
