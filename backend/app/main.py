from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth_routes, patient_routes, doctor_routes, admin_routes, ai_routes

app = FastAPI(
    title="CareSync AI — Healthcare Appointment & Intelligence Platform API",
    version="1.0.0",
    description="Backend API services supporting patients, doctors, admins, and AI features."
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount APIRouters
app.include_router(auth_routes.router)
app.include_router(patient_routes.router)
app.include_router(doctor_routes.router)
app.include_router(admin_routes.router)
app.include_router(ai_routes.router)

@app.on_event("startup")
def startup_event():
    try:
        from app.ml.no_show_model import load_data_and_train
        load_data_and_train()
    except Exception as e:
        print(f"Error training model on startup: {e}")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to CareSync AI Healthcare API. Refer to /docs for interactive Swagger API documentation."
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
