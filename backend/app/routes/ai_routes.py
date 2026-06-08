from datetime import date, time
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.models import User
from app.services.auth import get_current_user
from app.services import gemini_service
from app.ml import no_show_model

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Request/Response schemas for AI
class SymptomRequest(BaseModel):
    symptoms: str

class SummarizeRequest(BaseModel):
    symptoms: str
    diagnosis: str
    treatment_plan: str

class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

@router.post("/recommend-specialty")
def recommend_specialty(req: SymptomRequest, current_user: User = Depends(get_current_user)):
    if not req.symptoms.strip():
        raise HTTPException(status_code=400, detail="Symptoms text cannot be empty")
    return gemini_service.recommend_specialty(req.symptoms)

@router.post("/summarize-notes")
def summarize_notes(req: SummarizeRequest, current_user: User = Depends(get_current_user)):
    return {
        "summary": gemini_service.summarize_consultation_notes(
            req.symptoms, req.diagnosis, req.treatment_plan
        )
    }

@router.post("/chat")
def chat_with_assistant(req: ChatRequest, current_user: User = Depends(get_current_user)):
    # Convert Pydantic schemas to standard dictionaries
    msg_list = [{"role": m.role, "content": m.content} for m in req.messages]
    if not msg_list:
        raise HTTPException(status_code=400, detail="Message list cannot be empty")
        
    return {
        "response": gemini_service.chat_assistant(msg_list)
    }

@router.get("/predict-no-show")
def predict_no_show_prob(
    patient_id: int = Query(...),
    doctor_id: int = Query(...),
    appt_date: date = Query(...),
    start_time: time = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Integrates the Machine Learning no-show prediction model with a direct API endpoint."""
    prob = no_show_model.predict_no_show(
        db, patient_id, doctor_id, appt_date, start_time
    )
    return {
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "appointment_date": appt_date,
        "start_time": start_time,
        "no_show_probability": prob,
        "risk_level": "High" if prob > 0.40 else ("Medium" if prob > 0.20 else "Low")
    }
