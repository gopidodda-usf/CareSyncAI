from datetime import date, time, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field

# User Schemas
class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str
    role: str  # 'patient', 'doctor', 'admin'
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    specialty_id: Optional[int] = None
    clinic_id: Optional[int] = None
    bio: Optional[str] = None
    consultation_fee: Optional[float] = 0.0

class UserLogin(UserBase):
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(UserBase):
    id: int
    role: str
    name: Optional[str] = None
    profile_picture: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Specialty Schemas
class SpecialtyBase(BaseModel):
    name: str
    description: Optional[str] = None

class SpecialtyResponse(SpecialtyBase):
    id: int

    class Config:
        from_attributes = True

# Clinic Schemas
class ClinicBase(BaseModel):
    name: str
    address: str
    phone: Optional[str] = None

class ClinicResponse(ClinicBase):
    id: int

    class Config:
        from_attributes = True

# Profile Schemas
class PatientResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None

    class Config:
        from_attributes = True

class PatientUpdate(BaseModel):
    first_name: str
    last_name: str
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None

class DoctorAvailabilityBase(BaseModel):
    day_of_week: int  # 0 to 6
    start_time: time
    end_time: time
    is_active: bool = True

class DoctorAvailabilityCreate(DoctorAvailabilityBase):
    pass

class DoctorAvailabilityResponse(DoctorAvailabilityBase):
    id: int
    doctor_id: int

    class Config:
        from_attributes = True

class DoctorProfileResponse(BaseModel):
    bio: Optional[str] = None
    consultation_fee: Decimal
    specialty: Optional[SpecialtyResponse] = None
    clinic: Optional[ClinicResponse] = None

    class Config:
        from_attributes = True

class DoctorResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone: Optional[str] = None
    user: UserResponse
    specialty: Optional[SpecialtyResponse] = None
    clinic: Optional[ClinicResponse] = None
    bio: Optional[str] = None
    consultation_fee: Decimal

    class Config:
        from_attributes = True

class DoctorBriefResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone: Optional[str] = None
    specialty_name: Optional[str] = None
    clinic_name: Optional[str] = None
    consultation_fee: Decimal
    bio: Optional[str] = None

    class Config:
        from_attributes = True

# Medical Note Schemas
class MedicalNoteBase(BaseModel):
    symptoms: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment_plan: Optional[str] = None

class MedicalNoteCreate(MedicalNoteBase):
    pass

class MedicalNoteResponse(MedicalNoteBase):
    id: int
    appointment_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Feedback Schemas
class FeedbackBase(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comments: Optional[str] = None

class FeedbackCreate(FeedbackBase):
    pass

class FeedbackResponse(FeedbackBase):
    id: int
    appointment_id: int

    class Config:
        from_attributes = True

# Appointment Schemas
class AppointmentCreate(BaseModel):
    doctor_id: int
    appointment_date: date
    start_time: time

class AppointmentReschedule(BaseModel):
    appointment_date: date
    start_time: time

class AppointmentStatusUpdate(BaseModel):
    status: str  # 'scheduled', 'completed', 'cancelled', 'no_show'

class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    appointment_date: date
    start_time: time
    status: str
    created_at: datetime
    patient: Optional[PatientResponse] = None
    doctor: Optional[DoctorResponse] = None
    medical_note: Optional[MedicalNoteResponse] = None
    feedback: Optional[FeedbackResponse] = None

    class Config:
        from_attributes = True

# Notification Schemas
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Profile Update payload schemas
class PatientProfileUpdate(BaseModel):
    first_name: str
    last_name: str
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    profile_picture: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

class DoctorProfileUpdate(BaseModel):
    first_name: str
    last_name: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    consultation_fee: Optional[Decimal] = None
    profile_picture: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

class AdminProfileUpdate(BaseModel):
    name: str
    email: Optional[str] = None
    profile_picture: Optional[str] = None
    password: Optional[str] = None
