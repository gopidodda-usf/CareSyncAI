from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import (
    User, Patient, Doctor, Specialty, Clinic, 
    DoctorAvailability, Appointment, AppointmentFeedback, Notification
)
from app.schemas.schemas import (
    DoctorBriefResponse, DoctorAvailabilityResponse,
    AppointmentCreate, AppointmentResponse, AppointmentReschedule,
    FeedbackCreate, FeedbackResponse, SpecialtyResponse, ClinicResponse,
    NotificationResponse
)
from app.services.auth import get_current_patient

router = APIRouter(prefix="/api/patient", tags=["patient"])

@router.get("/specialties", response_model=List[SpecialtyResponse])
def get_specialties(db: Session = Depends(get_db), current_user: User = Depends(get_current_patient)):
    return db.query(Specialty).all()

@router.get("/clinics", response_model=List[ClinicResponse])
def get_clinics(db: Session = Depends(get_db), current_user: User = Depends(get_current_patient)):
    return db.query(Clinic).all()

@router.get("/doctors", response_model=List[DoctorBriefResponse])
def search_doctors(
    specialty_id: Optional[int] = None,
    clinic_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_patient)
):
    query = db.query(Doctor)
    if specialty_id:
        query = query.filter(Doctor.specialty_id == specialty_id)
    if clinic_id:
        query = query.filter(Doctor.clinic_id == clinic_id)
    
    doctors = query.all()
    results = []
    for doc in doctors:
        # Check search term against doctor name
        full_name = f"{doc.first_name} {doc.last_name}".lower()
        if search and search.lower() not in full_name:
            continue
            
        results.append(DoctorBriefResponse(
            id=doc.id,
            first_name=doc.first_name,
            last_name=doc.last_name,
            specialty_name=doc.specialty.name if doc.specialty else None,
            clinic_name=doc.clinic.name if doc.clinic else None,
            consultation_fee=doc.consultation_fee,
            bio=doc.bio
        ))
    return results

@router.get("/doctors/{doctor_id}/availability", response_model=List[DoctorAvailabilityResponse])
def get_doctor_availability(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_patient)
):
    return db.query(DoctorAvailability).filter(
        DoctorAvailability.doctor_id == doctor_id,
        DoctorAvailability.is_active == True
    ).all()

@router.post("/appointments", response_model=AppointmentResponse)
def book_appointment(
    appt_data: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_patient)
):
    # Verify doctor exists
    doctor = db.query(Doctor).filter(Doctor.id == appt_data.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    # Check if the date is in the past
    if appt_data.appointment_date < date.today():
        raise HTTPException(status_code=400, detail="Cannot book appointments in the past")
        
    # Check if the doctor is already booked at this date and time
    existing_doc_appt = db.query(Appointment).filter(
        Appointment.doctor_id == appt_data.doctor_id,
        Appointment.appointment_date == appt_data.appointment_date,
        Appointment.start_time == appt_data.start_time,
        Appointment.status.in_(["scheduled", "completed"])
    ).first()
    if existing_doc_appt:
        raise HTTPException(
            status_code=400,
            detail="This slot is already booked for Dr. " + doctor.last_name + ". Please select another date or time."
        )

    # Check if the patient has another appointment at this date and time
    existing_patient_appt = db.query(Appointment).filter(
        Appointment.patient_id == current_user.id,
        Appointment.appointment_date == appt_data.appointment_date,
        Appointment.start_time == appt_data.start_time,
        Appointment.status.in_(["scheduled", "completed"])
    ).first()
    if existing_patient_appt:
        raise HTTPException(
            status_code=400,
            detail="You already have an appointment scheduled at this time. Double bookings are not permitted."
        )

    # Create the appointment
    appt = Appointment(
        patient_id=current_user.id,
        doctor_id=appt_data.doctor_id,
        appointment_date=appt_data.appointment_date,
        start_time=appt_data.start_time,
        status="scheduled"
    )
    db.add(appt)
    db.flush()
    
    # Create a notification
    notif = Notification(
        user_id=current_user.id,
        title="Appointment Booked",
        message=f"You successfully booked an appointment with Dr. {doctor.last_name} on {appt.appointment_date} at {appt.start_time}."
    )
    db.add(notif)
    db.commit()
    db.refresh(appt)
    return appt

@router.get("/appointments", response_model=List[AppointmentResponse])
def get_appointment_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_patient)
):
    return db.query(Appointment).filter(
        Appointment.patient_id == current_user.id
    ).order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc()).all()

@router.post("/appointments/{appt_id}/cancel")
def cancel_appointment(
    appt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_patient)
):
    appt = db.query(Appointment).filter(
        Appointment.id == appt_id,
        Appointment.patient_id == current_user.id
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    if appt.status in ["completed", "no_show"]:
        raise HTTPException(status_code=400, detail="Cannot cancel completed or past appointments")
        
    appt.status = "cancelled"
    
    # Create notification
    notif = Notification(
        user_id=current_user.id,
        title="Appointment Cancelled",
        message=f"Your appointment with Dr. {appt.doctor.last_name} on {appt.appointment_date} has been cancelled."
    )
    db.add(notif)
    db.commit()
    return {"message": "Appointment cancelled successfully"}

@router.post("/appointments/{appt_id}/reschedule", response_model=AppointmentResponse)
def reschedule_appointment(
    appt_id: int,
    resched_data: AppointmentReschedule,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_patient)
):
    appt = db.query(Appointment).filter(
        Appointment.id == appt_id,
        Appointment.patient_id == current_user.id
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    if appt.status in ["completed", "no_show"]:
        raise HTTPException(status_code=400, detail="Cannot reschedule completed or past appointments")
        
    if resched_data.appointment_date < date.today():
        raise HTTPException(status_code=400, detail="Cannot reschedule to a past date")
        
    # Check if the doctor is already booked at this new date and time
    existing_doc_appt = db.query(Appointment).filter(
        Appointment.doctor_id == appt.doctor_id,
        Appointment.appointment_date == resched_data.appointment_date,
        Appointment.start_time == resched_data.start_time,
        Appointment.id != appt_id,
        Appointment.status.in_(["scheduled", "completed"])
    ).first()
    if existing_doc_appt:
        raise HTTPException(
            status_code=400,
            detail="The doctor is already booked at this new slot. Please select another time."
        )

    # Check if the patient has another appointment at this new date and time
    existing_patient_appt = db.query(Appointment).filter(
        Appointment.patient_id == current_user.id,
        Appointment.appointment_date == resched_data.appointment_date,
        Appointment.start_time == resched_data.start_time,
        Appointment.id != appt_id,
        Appointment.status.in_(["scheduled", "completed"])
    ).first()
    if existing_patient_appt:
        raise HTTPException(
            status_code=400,
            detail="You already have another appointment scheduled at this new time."
        )
        
    appt.appointment_date = resched_data.appointment_date
    appt.start_time = resched_data.start_time
    appt.status = "scheduled"  # reset in case it was cancelled
    
    # Create notification
    notif = Notification(
        user_id=current_user.id,
        title="Appointment Rescheduled",
        message=f"Your appointment with Dr. {appt.doctor.last_name} has been rescheduled to {appt.appointment_date} at {appt.start_time}."
    )
    db.add(notif)
    db.commit()
    db.refresh(appt)
    return appt

@router.post("/appointments/{appt_id}/feedback", response_model=FeedbackResponse)
def leave_feedback(
    appt_id: int,
    fb_data: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_patient)
):
    appt = db.query(Appointment).filter(
        Appointment.id == appt_id,
        Appointment.patient_id == current_user.id
    ).first()
    
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    if appt.status != "completed":
        raise HTTPException(status_code=400, detail="Can only leave feedback for completed appointments")
        
    # Check if feedback already exists
    existing_fb = db.query(AppointmentFeedback).filter(AppointmentFeedback.appointment_id == appt_id).first()
    if existing_fb:
        existing_fb.rating = fb_data.rating
        existing_fb.comments = fb_data.comments
        db.commit()
        db.refresh(existing_fb)
        return existing_fb
        
    fb = AppointmentFeedback(
        appointment_id=appt_id,
        rating=fb_data.rating,
        comments=fb_data.comments
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return fb

@router.get("/notifications", response_model=List[NotificationResponse])
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_patient)):
    return db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(20).all()

@router.post("/notifications/read")
def mark_notifications_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_patient)):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"message": "Notifications marked as read"}

@router.post("/notifications/{notif_id}/read")
def mark_single_notification_read(notif_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_patient)):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}

