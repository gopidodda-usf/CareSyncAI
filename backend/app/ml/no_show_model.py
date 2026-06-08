import os
import pickle
import datetime
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

from app.database import SessionLocal, engine
from app.models.models import Appointment, Patient, Doctor

MODEL_PATH = os.path.join(os.path.dirname(__file__), "no_show_model.pkl")

def load_data_and_train():
    """Queries the seeded appointments and trains the Random Forest classifier model."""
    print("Training no-show prediction model...")
    db = SessionLocal()
    try:
        # Load completed and no_show appointments
        appts = db.query(Appointment).filter(
            Appointment.status.in_(["completed", "no_show"])
        ).all()
        
        if len(appts) < 50:
            print(f"Not enough data to train. Only {len(appts)} appointments. Skipping training.")
            return False
            
        data = []
        for a in appts:
            patient = db.query(Patient).filter(Patient.id == a.patient_id).first()
            doctor = db.query(Doctor).filter(Doctor.id == a.doctor_id).first()
            
            if not patient or not doctor:
                continue
                
            # Calculate features
            patient_age = (a.appointment_date - patient.date_of_birth).days / 365.25
            appt_hour = a.start_time.hour + (a.start_time.minute / 60.0)
            day_of_week = a.appointment_date.weekday() # 0 = Monday, ..., 6 = Sunday
            specialty_id = doctor.specialty_id
            
            target = 1 if a.status == "no_show" else 0
            
            data.append({
                "patient_age": patient_age,
                "appt_hour": appt_hour,
                "day_of_week": day_of_week,
                "doctor_id": doctor.id,
                "specialty_id": specialty_id,
                "is_no_show": target
            })
            
        df = pd.DataFrame(data)
        
        # Features and target
        X = df[["patient_age", "appt_hour", "day_of_week", "doctor_id", "specialty_id"]]
        y = df["is_no_show"]
        
        # Preprocessing pipeline
        numeric_features = ["patient_age", "appt_hour", "day_of_week"]
        categorical_features = ["doctor_id", "specialty_id"]
        
        preprocessor = ColumnTransformer(
            transformers=[
                ("num", StandardScaler(), numeric_features),
                ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features)
            ]
        )
        
        # Classifier
        pipeline = Pipeline([
            ("preprocessor", preprocessor),
            ("classifier", RandomForestClassifier(n_estimators=100, random_state=42, max_depth=8))
        ])
        
        # Fit model
        pipeline.fit(X, y)
        
        # Save model
        with open(MODEL_PATH, "wb") as f:
            pickle.dump(pipeline, f)
            
        print(f"Model trained and saved to {MODEL_PATH} successfully. Data points: {len(df)}")
        return True
    finally:
        db.close()

def predict_no_show(
    db: Session, 
    patient_id: int, 
    doctor_id: int, 
    appt_date: datetime.date, 
    appt_time: datetime.time
) -> float:
    """Predicts no-show probability for an appointment using the trained model."""
    # Load patient and doctor profiles
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    
    if not patient or not doctor:
        return 0.15 # fallback standard probability
        
    # Extract features
    patient_age = (appt_date - patient.date_of_birth).days / 365.25
    appt_hour = appt_time.hour + (appt_time.minute / 60.0)
    day_of_week = appt_date.weekday()
    specialty_id = doctor.specialty_id
    
    # Input DataFrame
    input_df = pd.DataFrame([{
        "patient_age": patient_age,
        "appt_hour": appt_hour,
        "day_of_week": day_of_week,
        "doctor_id": doctor_id,
        "specialty_id": specialty_id
    }])
    
    # Load model
    if not os.path.exists(MODEL_PATH):
        # If model doesn't exist, try training it
        success = load_data_and_train()
        if not success or not os.path.exists(MODEL_PATH):
            # Baseline rule-based fallback
            no_show_prob = 0.12
            if appt_hour < 10.0 or appt_hour > 16.0:
                no_show_prob += 0.08
            if patient_age < 30:
                no_show_prob += 0.05
            return min(no_show_prob, 0.95)
            
    with open(MODEL_PATH, "rb") as f:
        pipeline = pickle.load(f)
        
    try:
        # Predict probability of class 1 (no-show)
        probabilities = pipeline.predict_proba(input_df)
        prob = float(probabilities[0][1])
        return round(prob, 4)
    except Exception as e:
        print(f"Error predicting no-show: {e}")
        return 0.15
        
if __name__ == "__main__":
    load_data_and_train()
