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
        "name": current_user.name,
        "profile_picture": current_user.profile_picture,
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
        response_data["doctor_profile"] = {
            "first_name": current_user.doctor.first_name,
            "last_name": current_user.doctor.last_name,
            "phone": current_user.doctor.phone,
            "bio": current_user.doctor.bio,
            "consultation_fee": current_user.doctor.consultation_fee,
            "specialty": spec_name,
            "clinic": clinic_name
        }
        
    return response_data
