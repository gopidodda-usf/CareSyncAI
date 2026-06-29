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

from app.services.geocoding import geocode_address

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
    
    # Restrict public registration to patients only
    if user_data.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only patient registration is publicly allowed."
        )
        
    # Validate address fields
    if (not user_data.street_address_1 or 
        not user_data.city or 
        not user_data.state or 
        not user_data.zip_code or 
        not user_data.county):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Address fields (Street Address 1, City, State, Zip Code, County) are mandatory."
        )
        
    # Geocode patient address
    lat, lon = geocode_address(
        user_data.street_address_1,
        user_data.street_address_2,
        user_data.city,
        user_data.state,
        user_data.zip_code
    )
    
    # Hash password and create User
    hashed = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        hashed_password=hashed,
        role="patient"
    )
    db.add(user)
    db.flush()  # Obtain user.id
    
    # Create patient profile
    patient = Patient(
        id=user.id,
        first_name=user_data.first_name or "New",
        last_name=user_data.last_name or "Patient",
        phone=user_data.phone,
        date_of_birth=user_data.date_of_birth,
        gender=user_data.gender,
        street_address_1=user_data.street_address_1,
        street_address_2=user_data.street_address_2,
        city=user_data.city,
        state=user_data.state,
        zip_code=user_data.zip_code,
        county=user_data.county,
        latitude=lat,
        longitude=lon
    )
    db.add(patient)
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
