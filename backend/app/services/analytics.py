from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import (
    Appointment, Doctor, Patient, Specialty, Clinic, 
    DoctorAvailability, AppointmentFeedback
)

def get_admin_dashboard_analytics(db: Session):
    """Aggregates all analytical reports needed for the Admin Dashboard."""
    
    # 1. Specialty Demand Analysis
    specialty_counts = db.query(
        Specialty.name,
        func.count(Appointment.id).label("count")
    ).select_from(Appointment)\
     .join(Doctor, Appointment.doctor_id == Doctor.id)\
     .join(Specialty, Doctor.specialty_id == Specialty.id)\
     .group_by(Specialty.name).all()
     
    specialty_demand = [{"specialty": name, "count": count} for name, count in specialty_counts]
    
    # 2. Peak-Hour Analysis (Appts booked per hour)
    # Extract hour from start_time
    hour_counts = db.query(
        func.extract('hour', Appointment.start_time).label("hour"),
        func.count(Appointment.id).label("count")
    ).group_by(func.extract('hour', Appointment.start_time))\
     .order_by("hour").all()
     
    peak_hours = []
    for hr, count in hour_counts:
        # Format as string, e.g., "09:00"
        hr_int = int(hr)
        label = f"{hr_int:02d}:00"
        peak_hours.append({"time": label, "appointments": count})

    # 3. Patient Visit Trends (Count of appointments in last 7 weeks)
    today = date.today()
    start_date = today - timedelta(weeks=8)
    
    weekly_counts = db.query(
        func.to_char(Appointment.appointment_date, 'YYYY-WW').label("week"),
        func.count(Appointment.id).label("count")
    ).filter(Appointment.appointment_date >= start_date)\
     .group_by(func.to_char(Appointment.appointment_date, 'YYYY-WW'))\
     .order_by("week").all()
     
    visit_trends = [{"week": f"Wk {week.split('-')[1]}", "visits": count} for week, count in weekly_counts]

    # 4. Doctor Utilization Rate (Booked hours vs. available hours in the last 30 days)
    # We'll calculate: Booked Appointments vs. Available slots for each doctor
    # Total available slots in 30 days ~ 4 weeks * 5 days/week = 20 days.
    # If a doctor has 5 active availabilities per week, that's 20 slots/week * 4 = 80 slots per month.
    docs = db.query(Doctor).all()
    doctor_utilization = []
    
    one_month_ago = today - timedelta(days=30)
    
    for doc in docs:
        booked_count = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doc.id,
            Appointment.appointment_date >= one_month_ago,
            Appointment.status.in_(["completed", "scheduled"])
        ).scalar() or 0
        
        # Count weekly availability slots
        weekly_slots = db.query(func.count(DoctorAvailability.id)).filter(
            DoctorAvailability.doctor_id == doc.id,
            DoctorAvailability.is_active == True
        ).scalar() or 0
        
        # Estimate monthly available slots (slots * 4 weeks)
        available_slots = weekly_slots * 4 * 4  # Assume 4 slots per hour, or 4 days/week. Let's make it realistic:
        # If they have weekly availability slots (days they work), they can take e.g. 10 appointments per day.
        # So total capacity = worked days * 10 appointments/day * 4 weeks.
        capacity = weekly_slots * 10 * 4
        if capacity == 0:
            capacity = 40  # default baseline capacity
            
        utilization_rate = min(int((booked_count / capacity) * 100), 100)
        
        doctor_utilization.append({
            "doctor": f"Dr. {doc.last_name}",
            "specialty": doc.specialty.name if doc.specialty else "General",
            "utilization": utilization_rate
        })
        
    # Order by utilization descending and take top 5
    doctor_utilization = sorted(doctor_utilization, key=lambda x: x["utilization"], reverse=True)[:5]

    # 5. Wait-Time Prediction insights per Specialty
    # Base wait times: Cardiology=22, Dermatology=14, Pediatrics=28, General Medicine=18, Neurology=25, Orthopedics=32
    # Add a factor depending on appointment density (appointments booked per day of week)
    specialties = db.query(Specialty).all()
    wait_time_insights = []
    
    for spec in specialties:
        # Get count of today's appointments for this specialty
        appts_count = db.query(func.count(Appointment.id)).select_from(Appointment)\
            .join(Doctor, Appointment.doctor_id == Doctor.id)\
            .filter(
                Doctor.specialty_id == spec.id,
                Appointment.appointment_date == today,
                Appointment.status == "scheduled"
            ).scalar() or 0
            
        base_times = {
            "General Medicine": 15,
            "Cardiology": 25,
            "Pediatrics": 20,
            "Dermatology": 12,
            "Neurology": 22,
            "Orthopedics": 30
        }
        base = base_times.get(spec.name, 15)
        # Add 3 minutes per active appointment waiting today
        predicted_wait = base + (appts_count * 2)
        
        wait_time_insights.append({
            "specialty": spec.name,
            "base_wait_min": base,
            "predicted_wait_min": predicted_wait,
            "active_patients": appts_count
        })

    return {
        "specialty_demand": specialty_demand,
        "peak_hours": peak_hours,
        "visit_trends": visit_trends,
        "doctor_utilization": doctor_utilization,
        "wait_time_insights": wait_time_insights
    }
