import datetime
import random
import bcrypt
from sqlalchemy.orm import Session
from app.database import engine, SessionLocal, Base
from app.models.models import (
    User, Patient, Doctor, Specialty, Clinic, 
    DoctorAvailability, Appointment, MedicalNote, 
    AppointmentFeedback, Notification
)

def get_password_hash(password: str) -> str:
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

# Seed Data lists
SPECIALTIES = [
    {"name": "General Medicine", "description": "Primary healthcare, diagnostics, and family medicine."},
    {"name": "Cardiology", "description": "Specialized care for heart and cardiovascular system diseases."},
    {"name": "Pediatrics", "description": "Medical care for infants, children, and adolescents."},
    {"name": "Dermatology", "description": "Treatment for skin, hair, nails, and related diseases."},
    {"name": "Neurology", "description": "Diagnosis and treatment of nervous system disorders."},
    {"name": "Orthopedics", "description": "Surgical and non-surgical care for musculoskeletal injuries."}
]

CLINICS = [
    {"name": "CareSync Central Hospital", "address": "100 Medical Center Plaza, Downtown", "phone": "555-0100"},
    {"name": "CareSync Westside Family Clinic", "address": "450 Sunset Blvd, Westside", "phone": "555-0200"},
    {"name": "CareSync North Pediatric Center", "address": "890 Forest Parkway, North Hills", "phone": "555-0300"}
]

FIRST_NAMES = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", 
    "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", 
    "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa", 
    "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley", 
    "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle", 
    "Kenneth", "Carol", "Kevin", "Amanda", "Brian", "Dorothy", "George", "Melissa"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", 
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", 
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", 
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker"
]

BIOS = [
    "Dedicated healthcare professional with over 10 years of experience providing comprehensive clinical services.",
    "Passionate specialist committed to patient-centered care and utilizing the latest medical technologies.",
    "Focused on preventative wellness and working collaboratively with patients to achieve optimal long-term health.",
    "Brings extensive clinical training from top-tier institutions, specializing in complex case management.",
    "Enjoys educating patients about lifestyle modifications and self-care strategies alongside medical treatments."
]

SYMPTOMS_DIAGNOSES = [
    {
        "symptoms": "Mild persistent headache for 3 days, slight photophobia, fatigue.",
        "diagnosis": "Tension Headache",
        "treatment": "Rest, hydration, and over-the-counter NSAIDs (Ibuprofen 400mg as needed). Monitor symptoms."
    },
    {
        "symptoms": "Sore throat, pain when swallowing, low-grade fever (100.2F), mild body aches.",
        "diagnosis": "Acute Pharyngitis (Viral)",
        "treatment": "Warm saline gargles, throat lozenges, acetaminophen 500mg for discomfort, increased fluid intake."
    },
    {
        "symptoms": "Persistent dry cough, dry throat, nasal congestion, mild sinus pressure.",
        "diagnosis": "Common Cold / Sinus Congestion",
        "treatment": "Decongestants, steam inhalation, saline nasal spray, rest. Return if fever develops."
    },
    {
        "symptoms": "Localized lower back pain after lifting boxes, stiffness, pain radiates slightly to left buttock.",
        "diagnosis": "Lumbar Muscle Strain",
        "treatment": "Limit heavy lifting, apply heat packs, gentle stretching, muscle relaxant prescribed. Physical therapy if pain persists."
    },
    {
        "symptoms": "Itchy red rash on both forearms, dry scaly skin patches, mild swelling.",
        "diagnosis": "Contact Dermatitis / Eczema flare-up",
        "treatment": "Apply topical hydrocortisone cream 1% twice daily. Avoid scented soaps and triggers. Moisturize frequently."
    },
    {
        "symptoms": "Aching knee joint after jogging, minor swelling, pain increases with stair climbing.",
        "diagnosis": "Patellofemoral Pain Syndrome / Mild Tendonitis",
        "treatment": "R.I.C.E. protocol (Rest, Ice, Compression, Elevation). Temporarily substitute jogging with swimming."
    },
    {
        "symptoms": "Occasional palpitations, lightheadedness when standing up quickly, blood pressure slightly elevated (138/88).",
        "diagnosis": "Mild Hypertension Evaluation",
        "treatment": "Follow-up blood pressure monitoring. Advised low-sodium diet and stress reduction techniques. Schedule repeat visit in 2 weeks."
    },
    {
        "symptoms": "Wheezing, chest tightness, short of breath after walking up stairs, history of asthma.",
        "diagnosis": "Asthma Exacerbation (Mild)",
        "treatment": "Increase Albuterol inhaler usage (2 puffs every 4-6 hours as needed). Continue daily maintenance inhaler. Avoid allergens."
    }
]

FEEDBACKS = [
    {"rating": 5, "comments": "Excellent doctor! Very attentive and explained everything clearly."},
    {"rating": 5, "comments": "Great service, wait time was minimal. Highly recommend."},
    {"rating": 4, "comments": "Very professional and friendly. The treatment plan helped immediately."},
    {"rating": 4, "comments": "Good consultation, doctor was thorough. The clinic front desk was slightly busy."},
    {"rating": 3, "comments": "The doctor was nice, but the appointment started 20 minutes late."},
    {"rating": 5, "comments": "Amazing care! Felt listened to and respected throughout the visit."}
]

def seed_db():
    print("Connecting to database...")
    db: Session = SessionLocal()
    
    # 1. Recreate tables
    print("Dropping existing tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)

    # 2. Seed Specialties
    print("Seeding specialties...")
    spec_objects = []
    for spec in SPECIALTIES:
        s = Specialty(name=spec["name"], description=spec["description"])
        db.add(s)
        spec_objects.append(s)
    db.flush()  # populate IDs

    # 3. Seed Clinics
    print("Seeding clinics...")
    clinic_objects = []
    for cl in CLINICS:
        c = Clinic(name=cl["name"], address=cl["address"], phone=cl["phone"])
        db.add(c)
        clinic_objects.append(c)
    db.flush()  # populate IDs

    # 4. Seed Admins
    print("Seeding admin...")
    admin_user = User(
        email="admin@caresync.com",
        hashed_password=get_password_hash("admin123"),
        role="admin"
    )
    db.add(admin_user)
    db.flush()

    # 5. Seed Doctors
    print("Seeding doctors...")
    doctor_objects = []
    hashed_doc_pass = get_password_hash("doctor123")
    
    for i in range(1, 11):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        doc_user = User(
            email=f"doctor{i}@caresync.com",
            hashed_password=hashed_doc_pass,
            role="doctor"
        )
        db.add(doc_user)
        db.flush()

        doc_profile = Doctor(
            id=doc_user.id,
            first_name=first,
            last_name=last,
            specialty_id=random.choice(spec_objects).id,
            clinic_id=random.choice(clinic_objects).id,
            bio=random.choice(BIOS),
            consultation_fee=random.randint(60, 150)
        )
        db.add(doc_profile)
        doctor_objects.append(doc_profile)
        
        # Add availability (Monday to Friday, 9:00 to 17:00)
        for day in range(1, 6):  # 1 = Monday, ..., 5 = Friday
            avail = DoctorAvailability(
                doctor_id=doc_profile.id,
                day_of_week=day,
                start_time=datetime.time(9, 0),
                end_time=datetime.time(17, 0),
                is_active=True
            )
            db.add(avail)
            
    db.flush()

    # 6. Seed Patients
    print("Seeding patients...")
    patient_objects = []
    hashed_pat_pass = get_password_hash("patient123")
    
    for i in range(1, 51):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        pat_user = User(
            email=f"patient{i}@caresync.com",
            hashed_password=hashed_pat_pass,
            role="patient"
        )
        db.add(pat_user)
        db.flush()

        dob = datetime.date.today() - datetime.timedelta(days=random.randint(18*365, 75*365))
        pat_profile = Patient(
            id=pat_user.id,
            first_name=first,
            last_name=last,
            phone=f"555-01{i:02d}",
            date_of_birth=dob,
            gender=random.choice(["Male", "Female", "Other"])
        )
        db.add(pat_profile)
        patient_objects.append(pat_profile)
        
    db.flush()

    # 7. Seed Appointments (500+ items across past 60 days to next 15 days)
    print("Seeding 500+ appointments...")
    start_date = datetime.date.today() - datetime.timedelta(days=60)
    end_date = datetime.date.today() + datetime.timedelta(days=15)
    
    # We want to distribute them evenly
    current_date = start_date
    all_appointments = []

    # Available time slots
    slots = [
        datetime.time(9, 0), datetime.time(9, 30),
        datetime.time(10, 0), datetime.time(10, 30),
        datetime.time(11, 0), datetime.time(11, 30),
        datetime.time(13, 0), datetime.time(13, 30),
        datetime.time(14, 0), datetime.time(14, 30),
        datetime.time(15, 0), datetime.time(15, 30),
        datetime.time(16, 0), datetime.time(16, 30)
    ]

    total_appts = 550
    created_count = 0

    while created_count < total_appts:
        # Pick a random date
        delta_days = random.randint(0, 75)
        appt_date = start_date + datetime.timedelta(days=delta_days)
        
        # Don't schedule on weekends
        if appt_date.weekday() in [5, 6]:
            continue
            
        pat = random.choice(patient_objects)
        doc = random.choice(doctor_objects)
        time_slot = random.choice(slots)
        
        # Determine status
        is_past = appt_date < datetime.date.today()
        
        if is_past:
            # We want some logic behind no-shows for our ML model to learn:
            # Patients with high age might be more likely to show up
            # Appointments at 9:00 AM or 4:30 PM might have higher no-shows
            # Certain doctors might have higher no-shows due to wait-time perception
            patient_age = (appt_date - pat.date_of_birth).days // 365
            no_show_prob = 0.15
            
            if time_slot == datetime.time(9, 0) or time_slot == datetime.time(16, 30):
                no_show_prob += 0.10
            if patient_age < 30:
                no_show_prob += 0.08
            if doc.id % 3 == 0:  # simulate certain doctors having poor time management
                no_show_prob += 0.05
                
            rand_val = random.random()
            if rand_val < no_show_prob:
                status = "no_show"
            elif rand_val < (no_show_prob + 0.15):
                status = "cancelled"
            else:
                status = "completed"
        else:
            # Future appointments
            status = "scheduled"
            if random.random() < 0.10:  # 10% future cancellations
                status = "cancelled"
                
        appt = Appointment(
            patient_id=pat.id,
            doctor_id=doc.id,
            appointment_date=appt_date,
            start_time=time_slot,
            status=status
        )
        db.add(appt)
        db.flush()
        created_count += 1
        
        # Create medical notes for completed past appointments
        if status == "completed":
            case = random.choice(SYMPTOMS_DIAGNOSES)
            note = MedicalNote(
                appointment_id=appt.id,
                symptoms=case["symptoms"],
                diagnosis=case["diagnosis"],
                treatment_plan=case["treatment"],
                created_at=datetime.datetime.combine(appt_date, time_slot) + datetime.timedelta(minutes=30)
            )
            db.add(note)
            
            # Create feedback for 50% of completed ones
            if random.random() < 0.50:
                fb_template = random.choice(FEEDBACKS)
                fb = AppointmentFeedback(
                    appointment_id=appt.id,
                    rating=fb_template["rating"],
                    comments=fb_template["comments"]
                )
                db.add(fb)
                
        # Send a notification for all appointments
        notif = Notification(
            user_id=pat.id,
            title=f"Appointment {status.title()}",
            message=f"Your appointment with Dr. {doc.last_name} on {appt_date} at {time_slot} is {status}.",
            is_read=is_past
        )
        db.add(notif)

    db.commit()
    print(f"Database seeded successfully with {created_count} appointments!")
    db.close()

if __name__ == "__main__":
    seed_db()
