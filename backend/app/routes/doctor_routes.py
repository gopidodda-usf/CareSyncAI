from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import (
    User, Doctor, Appointment, MedicalNote, 
    DoctorAvailability, Notification, Patient
)
from app.schemas.schemas import (
    AppointmentResponse, AppointmentStatusUpdate,
    MedicalNoteCreate, MedicalNoteResponse,
    DoctorAvailabilityCreate, DoctorAvailabilityResponse
)
from app.services.auth import get_current_doctor

router = APIRouter(prefix="/api/doctor", tags=["doctor"])

@router.get("/appointments", response_model=List[AppointmentResponse])
def get_doctor_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_doctor)
):
    return db.query(Appointment).filter(
        Appointment.doctor_id == current_user.id
    ).order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc()).all()

@router.post("/appointments/{appt_id}/status", response_model=AppointmentResponse)
def update_appointment_status(
    appt_id: int,
    status_data: AppointmentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_doctor)
):
    appt = db.query(Appointment).filter(
        Appointment.id == appt_id,
        Appointment.doctor_id == current_user.id
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    status_str = status_data.status.lower()
    if status_str not in ["scheduled", "completed", "cancelled", "no_show"]:
        raise HTTPException(status_code=400, detail="Invalid appointment status")
        
    appt.status = status_str
    
    # Notify patient
    notif = Notification(
        user_id=appt.patient_id,
        title=f"Appointment Status Update",
        message=f"Dr. {current_user.doctor.last_name} has marked your appointment on {appt.appointment_date} as {status_str.upper()}."
    )
    db.add(notif)
    db.commit()
    db.refresh(appt)
    return appt

@router.post("/appointments/{appt_id}/notes", response_model=MedicalNoteResponse)
def save_medical_note(
    appt_id: int,
    note_data: MedicalNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_doctor)
):
    appt = db.query(Appointment).filter(
        Appointment.id == appt_id,
        Appointment.doctor_id == current_user.id
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    # Check if a note already exists
    note = db.query(MedicalNote).filter(MedicalNote.appointment_id == appt_id).first()
    if note:
        note.symptoms = note_data.symptoms
        note.diagnosis = note_data.diagnosis
        note.treatment_plan = note_data.treatment_plan
    else:
        note = MedicalNote(
            appointment_id=appt_id,
            symptoms=note_data.symptoms,
            diagnosis=note_data.diagnosis,
            treatment_plan=note_data.treatment_plan
        )
        db.add(note)
        
    db.commit()
    db.refresh(note)
    return note

@router.get("/availability", response_model=List[DoctorAvailabilityResponse])
def get_availability(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_doctor)
):
    return db.query(DoctorAvailability).filter(
        DoctorAvailability.doctor_id == current_user.id
    ).order_by(DoctorAvailability.day_of_week, DoctorAvailability.start_time).all()

@router.post("/availability", response_model=DoctorAvailabilityResponse)
def add_availability(
    avail_data: DoctorAvailabilityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_doctor)
):
    # Check overlap
    existing = db.query(DoctorAvailability).filter(
        DoctorAvailability.doctor_id == current_user.id,
        DoctorAvailability.day_of_week == avail_data.day_of_week,
        DoctorAvailability.start_time == avail_data.start_time,
        DoctorAvailability.end_time == avail_data.end_time
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Availability slot already exists")
        
    avail = DoctorAvailability(
        doctor_id=current_user.id,
        day_of_week=avail_data.day_of_week,
        start_time=avail_data.start_time,
        end_time=avail_data.end_time,
        is_active=avail_data.is_active
    )
    db.add(avail)
    db.commit()
    db.refresh(avail)
    return avail

@router.delete("/availability/{slot_id}")
def delete_availability(
    slot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_doctor)
):
    slot = db.query(DoctorAvailability).filter(
        DoctorAvailability.id == slot_id,
        DoctorAvailability.doctor_id == current_user.id
    ).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Availability slot not found")
        
    db.delete(slot)
    db.commit()
    return {"message": "Availability slot deleted successfully"}

@router.get("/patients/{patient_id}/history", response_model=List[AppointmentResponse])
def get_patient_clinical_history(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_doctor)
):
    # Verify patient exists
    pat = db.query(Patient).filter(Patient.id == patient_id).first()
    if not pat:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    # Returns all completed consultations for this patient to show clinical background
    return db.query(Appointment).filter(
        Appointment.patient_id == patient_id,
        Appointment.status == "completed"
    ).order_by(Appointment.appointment_date.desc()).all()
