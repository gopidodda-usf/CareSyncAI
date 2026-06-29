import os
from google import genai
from google.genai import types

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

def get_gemini_client():
    if not GEMINI_API_KEY:
        return None
    try:
        return genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"Error initializing Gemini client: {e}")
        return None

def recommend_specialty(symptom_description: str) -> dict:
    """Classifies patient symptoms to recommend a doctor specialty."""
    client = get_gemini_client()
    
    if client:
        try:
            prompt = (
                "You are an expert medical triage assistant. Analyze the following patient symptoms and recommend "
                "the most appropriate medical specialty from this list: [Family Medicine, Pediatrics, Internal Medicine, Obstetrics and Gynecology (OB/GYN), Dermatology, Cardiology, Orthopedics, Gastroenterology, Ophthalmology, Psychiatry, Allergy and Immunology, Endocrinology, Neurology, Physical Therapy]. "
                "Return the response strictly as a JSON object with two fields: 'specialty' (the exact name of the specialty) and "
                "'reasoning' (a brief, patient-friendly explanation of why you chose it). "
                f"Symptom description: \"{symptom_description}\""
            )
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            import json
            # Clean response text in case it contains markdown block wraps
            cleaned_text = response.text.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]
            return json.loads(cleaned_text)
        except Exception as e:
            print(f"Gemini API error during specialty recommendation: {e}. Falling back to rule-based matching.")
            
    # Mock / Rule-Based Fallback
    text = symptom_description.lower()
    
    if any(k in text for k in ["heart", "chest", "cardio", "pulse", "palpitations", "pressure"]):
        spec = "Cardiology"
        reason = "Based on your symptoms involving chest pressure/palpitations, it is safest to consult with a Cardiologist to check your cardiovascular health."
    elif any(k in text for k in ["child", "kid", "baby", "pediatric", "toddler", "son", "daughter"]):
        spec = "Pediatrics"
        reason = "As these symptoms concern a child, a Pediatrician is best suited to evaluate and provide age-appropriate treatment."
    elif any(k in text for k in ["skin", "rash", "itch", "acne", "spot", "moles", "eczema", "dermatology"]):
        spec = "Dermatology"
        reason = "For skin irritation, dry patches, or rashes, a Dermatologist specializes in diagnosing and treating integumentary conditions."
    elif any(k in text for k in ["brain", "nerve", "seizure", "numbness", "dizzy", "migraine", "neurology"]):
        spec = "Neurology"
        reason = "Symptoms involving numbness, dizziness, or severe migraines warrant evaluation by a Neurologist to assess nervous system function."
    elif any(k in text for k in ["bone", "joint", "muscle", "knee", "back", "fracture", "sprain", "ortho"]):
        spec = "Orthopedics"
        reason = "For musculoskeletal issues, back strain, or joint aches, an Orthopedist specializes in bone and muscle alignment and recovery."
    else:
        spec = "Family Medicine"
        reason = "Your symptoms are broad, so we recommend starting with a Family Medicine practitioner. They can run initial diagnostics and refer you if specialized care is needed."
        
    return {
        "specialty": spec,
        "reasoning": f"🤖 (CareSync AI Fallback Engine): {reason}"
    }

def summarize_consultation_notes(symptoms: str, diagnosis: str, treatment_plan: str) -> str:
    """Summarizes doctor's complex medical notes into a patient-friendly summary."""
    client = get_gemini_client()
    
    if client:
        try:
            prompt = (
                "You are a compassionate doctor's assistant. Summarize these clinical notes into a clear, patient-friendly "
                "summary. Use simple, non-medical terms. Break it down into: 1. What you came in for (Symptoms), "
                "2. What we found (Diagnosis), and 3. What to do next (Treatment Plan). "
                f"Symptoms: \"{symptoms}\"\n"
                f"Diagnosis: \"{diagnosis}\"\n"
                f"Treatment Plan: \"{treatment_plan}\""
            )
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            return response.text.strip()
        except Exception as e:
            print(f"Gemini API error during summarization: {e}. Falling back to default summarizer.")
            
    # Mock / Simple Fallback
    return (
        f"🤖 **CareSync Patient-Friendly Consultation Summary**\n\n"
        f"*   **Symptom Review:** You reported experiencing: *\"{symptoms}\"*.\n"
        f"*   **Clinical Findings:** The doctor diagnosed this as **{diagnosis}**.\n"
        f"*   **Your Care Plan:**\n"
        f"    *   Follow this treatment plan: *{treatment_plan}*\n"
        f"    *   Get plenty of rest, stay hydrated, and follow up if symptoms do not improve."
    )

def chat_assistant(messages: list) -> str:
    """Simulates a conversation with a virtual AI assistant using historical messages."""
    client = get_gemini_client()
    
    # Format messages for Gemini api
    # google-genai expects contents to be a string or list of contents
    if client:
        try:
            # We take the last user message and send it with system context
            last_message = messages[-1]["content"] if messages else "Hello"
            prompt = (
                "You are CareSync AI, a friendly and helpful virtual medical assistant for a clinic platform. "
                "Your role is to help patients answer general health FAQs, explain common clinical terms, and guide them on booking the right specialty. "
                "Always include a disclaimer that you are an AI assistant and they should consult a real doctor for emergencies. "
                f"Patient asks: \"{last_message}\""
            )
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            return response.text.strip()
        except Exception as e:
            print(f"Gemini API error during chatbot: {e}. Falling back to chatbot fallback.")
            
    # Mock / Rule-Based Chatbot
    last_user_msg = messages[-1]["content"].lower() if messages else "hello"
    
    if any(k in last_user_msg for k in ["book", "appointment", "schedule", "doctor"]):
        return (
            "🤖 **CareSync Assistant:** You can book an appointment by selecting 'Search Doctors' in your dashboard. "
            "Filter by specialty or location, choose a doctor, click 'Book Appointment', and select an available time slot. "
            "\n\n*Disclaimer: I am an AI assistant, not a doctor. For urgent health matters, please consult a physician.*"
        )
    elif any(k in last_user_msg for k in ["symptom", "pain", "hurt", "sick", "cough"]):
        return (
            "🤖 **CareSync Assistant:** I'm sorry you're not feeling well. You can describe your symptoms in our 'AI Symptom Matcher' "
            "to find out which doctor specialty you should book. "
            "\n\n*Disclaimer: I am an AI, not a doctor. If you are experiencing a medical emergency, please call 911 or visit the nearest ER immediately.*"
        )
    else:
        return (
            "🤖 **CareSync Assistant:** Hello! How can I help you today? I can guide you on scheduling doctor appointments, "
            "explain clinic features, or help you match your symptoms to a doctor's specialty. "
            "\n\n*Disclaimer: I am an AI assistant. Always consult a healthcare professional for clinical advice.*"
        )
