from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.models import (
    User, Patient, Doctor, Specialty, Clinic, Appointment
)
from app.schemas.schemas import ClinicBase, SpecialtyBase, AdminProfileUpdate, AdminUserUpdate, BulkDeleteRequest, UserCreate
from app.services.auth import get_current_admin, get_password_hash, verify_password
from app.services.analytics import get_admin_dashboard_analytics
from app.services.geocoding import geocode_address

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
            "name": u.name or "Admin",
            "street_address_1": "",
            "street_address_2": "",
            "city": "",
            "state": "",
            "zip_code": "",
            "county": ""
        }
        if u.role == "patient" and u.patient:
            detail["name"] = f"{u.patient.first_name} {u.patient.last_name}"
            detail["first_name"] = u.patient.first_name
            detail["last_name"] = u.patient.last_name
            detail["phone"] = u.patient.phone
            detail["street_address_1"] = u.patient.street_address_1
            detail["street_address_2"] = u.patient.street_address_2
            detail["city"] = u.patient.city
            detail["state"] = u.patient.state
            detail["zip_code"] = u.patient.zip_code
            detail["county"] = u.patient.county
            detail["registered_at"] = u.patient.created_at
        elif u.role == "doctor" and u.doctor:
            detail["name"] = f"Dr. {u.doctor.first_name} {u.doctor.last_name}"
            detail["first_name"] = u.doctor.first_name
            detail["last_name"] = u.doctor.last_name
            detail["phone"] = u.doctor.phone
            detail["street_address_1"] = u.doctor.street_address_1
            detail["street_address_2"] = u.doctor.street_address_2
            detail["city"] = u.doctor.city
            detail["state"] = u.doctor.state
            detail["zip_code"] = u.doctor.zip_code
            detail["county"] = u.doctor.county
            detail["specialty_id"] = u.doctor.specialty_id
            detail["clinic_id"] = u.doctor.clinic_id
            detail["secondary_specialties"] = [{"id": s.id, "name": s.name} for s in u.doctor.secondary_specialties]
            detail["onboarded_at"] = u.doctor.created_at
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
    # Geocode the clinic address
    lat, lon = geocode_address(
        clinic_data.street_address_1,
        clinic_data.street_address_2,
        clinic_data.city,
        clinic_data.state,
        clinic_data.zip_code
    )
    
    # Construct fallback full address string
    full_address = f"{clinic_data.street_address_1}, "
    if clinic_data.street_address_2:
        full_address += f"{clinic_data.street_address_2}, "
    full_address += f"{clinic_data.city}, {clinic_data.state} {clinic_data.zip_code}"

    clinic = Clinic(
        name=clinic_data.name,
        address=full_address,
        phone=clinic_data.phone,
        street_address_1=clinic_data.street_address_1,
        street_address_2=clinic_data.street_address_2,
        city=clinic_data.city,
        state=clinic_data.state,
        zip_code=clinic_data.zip_code,
        county=clinic_data.county,
        latitude=lat,
        longitude=lon
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
    from datetime import date
    today = date.today()
    
    # Count stats
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_patients = db.query(func.count(Patient.id)).scalar() or 0
    total_doctors = db.query(func.count(Doctor.id)).scalar() or 0
    total_appointments = db.query(func.count(Appointment.id)).filter(Appointment.appointment_date >= today).scalar() or 0
    
    # Active today stats
    active_doctors_today = db.query(func.count(func.distinct(Appointment.doctor_id)))\
        .filter(Appointment.appointment_date == today, Appointment.status.in_(["scheduled", "completed"])).scalar() or 0
        
    active_patients_today = db.query(func.count(func.distinct(Appointment.patient_id)))\
        .filter(Appointment.appointment_date == today, Appointment.status.in_(["scheduled", "completed"])).scalar() or 0
        
    today_appointments = db.query(func.count(Appointment.id))\
        .filter(Appointment.appointment_date == today).scalar() or 0
        
    today_completed = db.query(func.count(Appointment.id))\
        .filter(Appointment.appointment_date == today, Appointment.status == "completed").scalar() or 0
        
    today_cancelled = db.query(func.count(Appointment.id))\
        .filter(Appointment.appointment_date == today, Appointment.status == "cancelled").scalar() or 0
        
    today_pending = db.query(func.count(Appointment.id))\
        .filter(Appointment.appointment_date == today, Appointment.status == "scheduled").scalar() or 0
    
    # Status breakdown (all-time/future status counts)
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
        "active_doctors_today": active_doctors_today,
        "active_patients_today": active_patients_today,
        "today_appointments": today_appointments,
        "today_completed": today_completed,
        "today_cancelled": today_cancelled,
        "today_pending": today_pending,
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
        
    # Calculate coords if address fields are supplied
    lat = None
    lon = None
    if user_data.street_address_1 and user_data.city and user_data.state and user_data.zip_code:
        lat, lon = geocode_address(
            user_data.street_address_1,
            user_data.street_address_2,
            user_data.city,
            user_data.state,
            user_data.zip_code
        )

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
                phone=user_data.phone,
                street_address_1=user_data.street_address_1 or "123 Main St",
                street_address_2=user_data.street_address_2,
                city=user_data.city or "City",
                state=user_data.state or "State",
                zip_code=user_data.zip_code or "00000",
                county=user_data.county or "County",
                latitude=lat,
                longitude=lon
            )
            db.add(patient_profile)
        elif user_data.role == "doctor":
            doctor_profile = Doctor(
                id=user_to_update.id,
                first_name=user_data.first_name or "Doctor",
                last_name=user_data.last_name or "Name",
                phone=user_data.phone,
                specialty_id=user_data.specialty_id,
                clinic_id=user_data.clinic_id,
                street_address_1=user_data.street_address_1 or "123 Main St",
                street_address_2=user_data.street_address_2,
                city=user_data.city or "City",
                state=user_data.state or "State",
                zip_code=user_data.zip_code or "00000",
                county=user_data.county or "County",
                latitude=lat,
                longitude=lon
            )
            if user_data.secondary_specialty_ids:
                specs = db.query(Specialty).filter(Specialty.id.in_(user_data.secondary_specialty_ids)).all()
                doctor_profile.secondary_specialties = specs
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
            
            # Address updates
            if user_data.street_address_1 is not None:
                user_to_update.patient.street_address_1 = user_data.street_address_1
                user_to_update.patient.street_address_2 = user_data.street_address_2
                user_to_update.patient.city = user_data.city
                user_to_update.patient.state = user_data.state
                user_to_update.patient.zip_code = user_data.zip_code
                user_to_update.patient.county = user_data.county
                user_to_update.patient.latitude = lat
                user_to_update.patient.longitude = lon
                
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
            if user_data.specialty_id is not None:
                user_to_update.doctor.specialty_id = user_data.specialty_id
            if user_data.clinic_id is not None:
                user_to_update.doctor.clinic_id = user_data.clinic_id
            if user_data.secondary_specialty_ids is not None:
                specs = db.query(Specialty).filter(Specialty.id.in_(user_data.secondary_specialty_ids)).all()
                user_to_update.doctor.secondary_specialties = specs
            
            # Address updates
            if user_data.street_address_1 is not None:
                user_to_update.doctor.street_address_1 = user_data.street_address_1
                user_to_update.doctor.street_address_2 = user_data.street_address_2
                user_to_update.doctor.city = user_data.city
                user_to_update.doctor.state = user_data.state
                user_to_update.doctor.zip_code = user_data.zip_code
                user_to_update.doctor.county = user_data.county
                user_to_update.doctor.latitude = lat
                user_to_update.doctor.longitude = lon
                
        elif user_to_update.role == "admin":
            if user_data.name is not None:
                user_to_update.name = user_data.name.strip()
            elif user_data.first_name or user_data.last_name:
                user_to_update.name = f"{user_data.first_name or ''} {user_data.last_name or ''}".strip()
                
    db.commit()
    return {"message": "User details updated successfully"}

@router.post("/users")
def create_user_by_admin(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
        
    if user_data.role not in ["patient", "doctor", "admin"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid role"
        )
        
    # Geocode address if patient or doctor
    lat = None
    lon = None
    if user_data.role in ["patient", "doctor"]:
        s1 = user_data.street_address_1 or "123 Main St"
        s2 = user_data.street_address_2
        city = user_data.city or "City"
        state = user_data.state or "State"
        zip_code = user_data.zip_code or "00000"
        county = user_data.county or "County"
        
        lat, lon = geocode_address(s1, s2, city, state, zip_code)
    else:
        s1 = s2 = city = state = zip_code = county = None

    # Hash password
    hashed = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        hashed_password=hashed,
        role=user_data.role,
        name=f"{user_data.first_name or ''} {user_data.last_name or ''}".strip() or "Admin" if user_data.role == "admin" else None
    )
    db.add(user)
    db.flush()  # Obtain user.id
    
    if user_data.role == "patient":
        patient = Patient(
            id=user.id,
            first_name=user_data.first_name or "Patient",
            last_name=user_data.last_name or "Name",
            phone=user_data.phone,
            street_address_1=s1,
            street_address_2=s2,
            city=city,
            state=state,
            zip_code=zip_code,
            county=county,
            latitude=lat,
            longitude=lon
        )
        db.add(patient)
    elif user_data.role == "doctor":
        doctor = Doctor(
            id=user.id,
            first_name=user_data.first_name or "Doctor",
            last_name=user_data.last_name or "Name",
            phone=user_data.phone,
            specialty_id=user_data.specialty_id,
            clinic_id=user_data.clinic_id,
            street_address_1=s1,
            street_address_2=s2,
            city=city,
            state=state,
            zip_code=zip_code,
            county=county,
            latitude=lat,
            longitude=lon
        )
        if user_data.secondary_specialty_ids:
            specs = db.query(Specialty).filter(Specialty.id.in_(user_data.secondary_specialty_ids)).all()
            doctor.secondary_specialties = specs
        db.add(doctor)
        
    db.commit()
    return {"message": "User created successfully", "user_id": user.id}

@router.post("/users/bulk-delete")
def bulk_delete_users(
    req: BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    # Prevent deleting oneself
    if current_admin.id in req.user_ids:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own administrative account."
        )
        
    users_to_delete = db.query(User).filter(User.id.in_(req.user_ids)).all()
    deleted_count = len(users_to_delete)
    
    for user in users_to_delete:
        db.delete(user)
        
    db.commit()
    return {"message": f"Successfully deleted {deleted_count} users."}


@router.delete("/clinics/{clinic_id}")
def delete_clinic(clinic_id: int, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    
    # Find all doctors associated with this clinic
    doctors = db.query(Doctor).filter(Doctor.clinic_id == clinic_id).all()
    doc_user_ids = [d.id for d in doctors]
    
    # Delete the clinic
    db.delete(clinic)
    
    # Explicitly delete all associated doctor users (will cascade delete their Doctor profiles, etc.)
    if doc_user_ids:
        db.query(User).filter(User.id.in_(doc_user_ids)).delete(synchronize_session=False)
        
    db.commit()
    return {"message": "Clinic and all associated doctors deleted successfully"}


@router.delete("/specialties/{specialty_id}")
def delete_specialty(specialty_id: int, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    specialty = db.query(Specialty).filter(Specialty.id == specialty_id).first()
    if not specialty:
        raise HTTPException(status_code=404, detail="Specialty not found")
        
    db.delete(specialty)
    db.commit()
    return {"message": "Specialty deleted successfully"}
