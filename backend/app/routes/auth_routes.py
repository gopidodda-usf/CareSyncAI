from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User, Patient, Doctor
from app.schemas.schemas import UserCreate, Token, UserResponse
from app.services.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=Token)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password and create User
    hashed = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        hashed_password=hashed,
        role=user_data.role
    )
    db.add(user)
    db.flush()  # Obtain user.id
    
    # Create role-based profile
    if user_data.role == "patient":
        patient = Patient(
            id=user.id,
            first_name=user_data.first_name or "New",
            last_name=user_data.last_name or "Patient",
            phone=user_data.phone,
            date_of_birth=user_data.date_of_birth,
            gender=user_data.gender
        )
        db.add(patient)
    elif user_data.role == "doctor":
        doctor = Doctor(
            id=user.id,
            specialty_id=user_data.specialty_id,
            clinic_id=user_data.clinic_id,
            bio=user_data.bio,
            consultation_fee=user_data.consultation_fee or 0.0
        )
        db.add(doctor)
        
    db.commit()
    
    # Create Access Token
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
def read_users_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    response_data = {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "created_at": current_user.created_at,
        "patient_profile": None,
        "doctor_profile": None
    }
    
    if current_user.role == "patient" and current_user.patient:
        response_data["patient_profile"] = {
            "first_name": current_user.patient.first_name,
            "last_name": current_user.patient.last_name,
            "phone": current_user.patient.phone,
            "date_of_birth": current_user.patient.date_of_birth,
            "gender": current_user.patient.gender
        }
    elif current_user.role == "doctor" and current_user.doctor:
        spec_name = current_user.doctor.specialty.name if current_user.doctor.specialty else None
        clinic_name = current_user.doctor.clinic.name if current_user.doctor.clinic else None
        # Try to find doctor name from database if linked or default
        # Since doctors don't have separate first/last name fields in doctors table, we store doctor names in the patient profile or use a default.
        # Let's see: in seed.py, we created User and Doctor, but wait, do doctors have first/last name?
        # Ah! In seed.py, we did:
        # `first = random.choice(FIRST_NAMES)`
        # `last = random.choice(LAST_NAMES)`
        # But we forgot to populate first/last name for Doctor users because Doctor table does not have first_name/last_name!
        # Wait, let's look at seed.py:
        # `notif = Notification(user_id=pat.id, title=..., message=f"Your appointment with Dr. {doc.user.patient.last_name if doc.user.patient else 'Doctor'}...")`
        # Ah! In seed.py, did we create patient profiles for doctor users to hold their first/last names?
        # Let's check:
        # In seed.py lines 149-172, did we create `Patient` profiles for doctor users?
        # No! We only created `User` and `Doctor` rows, but didn't create a `Patient` row for doctors.
        # Wait, how does `doc.user.patient` resolve? It would be `None`!
        # So it falls back to "Doctor" in seed.py notifications, which is safe, but wait!
        # If doctor has first_name and last_name, where should they be stored?
        # In our schema:
        # `patients` table has `first_name` and `last_name`. Doctors don't have `first_name` and `last_name` in the `doctors` table.
        # Wait! Let's check the fields in the schema:
        # `doctors` table does not have name fields, only `specialty_id`, `clinic_id`, `bio`, `consultation_fee`.
        # So where do we store doctor names?
        # Typically, we store first_name and last_name in the `users` table or in a unified `profiles` table. But since we have a `patients` table for patients, we could store doctor names in a separate profile, OR we can store them in a unified `users` name fields!
        # Wait, let's look at the database schema in the PRD:
        # 1. `users` (id, email, hashed_password, role, created_at)
        # 2. `patients` (id, first_name, last_name, phone, date_of_birth, gender)
        # 3. `doctors` (id, specialty_id, clinic_id, bio, consultation_fee)
        # Ah! Since doctors don't have a name field in `doctors` and `users` doesn't have name fields, where do doctor names come from?
        # We can simply add `first_name` and `last_name` to the `doctors` table (or to the `users` table, or use `patients` table as a general profile table).
        # Adding `first_name` and `last_name` directly to the `doctors` table is extremely clean and matches standard relational design!
        # Let's check:
        # In `models.py`, do we have `first_name` and `last_name` in `Doctor`?
        # No, they are not there:
        # `id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)`
        # `specialty_id = Column(Integer, ...)`
        # `clinic_id = Column(Integer, ...)`
        # `bio = Column(Text, ...)`
        # `consultation_fee = Column(Numeric(10, 2), ...)`
        # Wait! We can easily add `first_name` and `last_name` to the `Doctor` class! This solves it beautifully!
        # Let's check what fields we should add to `Doctor`:
        # `first_name = Column(String, nullable=False, default="Doctor")`
        # `last_name = Column(String, nullable=False, default="Name")`
        # That is incredibly clean and fixes the issue perfectly!
        # Let's modify `models.py`, `schema.sql`, `seed.py`, and `schemas.py` to add `first_name` and `last_name` to the doctor model.
        # Wait! Let's do this now. This is a very important detail that we caught during code review!

        response_data["doctor_profile"] = {
            "first_name": current_user.doctor.first_name,
            "last_name": current_user.doctor.last_name,
            "bio": current_user.doctor.bio,
            "consultation_fee": current_user.doctor.consultation_fee,
            "specialty": spec_name,
            "clinic": clinic_name
        }
        
    return response_data
