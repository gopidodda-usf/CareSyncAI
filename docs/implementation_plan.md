# Implementation Plan — CareSync AI

This document details the engineering steps to build the **CareSync AI Healthcare Appointment & Intelligence Platform** from scratch.

---

## User Review Required

> [!IMPORTANT]
> **Git & GitHub Repository:**
> We will initialize a local Git repository in the workspace.
> To keep all documentation version-controlled alongside your code, we will copy the **PRD** and this **Implementation Plan** into a `/docs` folder inside the repository.
> 
> Once the local repo is initialized and has commits, we will provide the exact commands to link it to your GitHub account.

> [!IMPORTANT]
> **Local Database Choice:**
> We have successfully installed and started **PostgreSQL 16** natively using Homebrew. 
> The backend database connection string will default to `postgresql://localhost/caresync` using your local Unix/TCP socket, which requires no password for local convenience.
> 
> The database connection is fully parameterized using the `DATABASE_URL` environment variable.

> [!WARNING]
> **Gemini API Key:**
> To use the GenAI features (Symptom Matching, Notes Summarizer, Chatbot), you will need to provide a `GEMINI_API_KEY` in your backend `.env` file. We will provide detailed instructions on how to set this up.

---

## Open Questions

> [!NOTE]
> Currently, there are no blocking open questions. We will use scikit-learn to build the no-show prediction model using synthetic historical data generated during database seeding, enabling immediate out-of-the-box predictions.

---

## Proposed Changes

We will organize the code structure under the workspace root `/Users/jokerfox6091/Desktop/CareSync AI`.

### 1. Repository & Database Initialization

Initialize the Git repository, setup `.gitignore` files, copy the documentation, and prepare the database model and seed script.

#### [NEW] [docs/prd.md](file:///Users/jokerfox6091/Desktop/CareSync AI/docs/prd.md)
*   The project Product Requirement Document stored in-repo.

#### [NEW] [docs/implementation_plan.md](file:///Users/jokerfox6091/Desktop/CareSync AI/docs/implementation_plan.md)
*   This implementation plan stored in-repo.

#### [NEW] [.gitignore](file:///Users/jokerfox6091/Desktop/CareSync AI/.gitignore)
*   Ignores `.env`, `node_modules`, `.venv`, and standard OS/compiler temp files.

#### [NEW] [schema.sql](file:///Users/jokerfox6091/Desktop/CareSync AI/database/schema.sql)
*   Contains standard PostgreSQL DDL representing our relational database schema.

#### [NEW] [models.py](file:///Users/jokerfox6091/Desktop/CareSync AI/backend/app/models/models.py)
*   SQLAlchemy ORM Models: `User`, `Patient`, `Doctor`, `Specialty`, `Clinic`, `Appointment`, `DoctorAvailability`, `MedicalNote`, `AppointmentFeedback`, `Notification`.

#### [NEW] [seed.py](file:///Users/jokerfox6091/Desktop/CareSync AI/backend/app/seed.py)
*   Python script utilizing SQLAlchemy to seed clinics, specialties, doctors, patients, and a rich history of 500+ appointments (including completed, cancelled, and no-shows) used to train the machine learning models.

---

### 2. Backend Component (FastAPI & Auth)

Build a robust, asynchronous API with secure JWT authorization, role guards, and modular routing.

#### [NEW] [main.py](file:///Users/jokerfox6091/Desktop/CareSync AI/backend/app/main.py)
*   FastAPI application entry point. Configures middleware (CORS), exception handlers, and mounts routers.

#### [NEW] [config.py](file:///Users/jokerfox6091/Desktop/CareSync AI/backend/app/config.py)
*   Pydantic Settings manager loading variables from environment/`.env`.

#### [NEW] [database.py](file:///Users/jokerfox6091/Desktop/CareSync AI/backend/app/database.py)
*   SQLAlchemy engine session setups, database dependency (`get_db`).

#### [NEW] [auth.py](file:///Users/jokerfox6091/Desktop/CareSync AI/backend/app/services/auth.py)
*   Hashing utilities, JWT creation/verification, dependency injectors for current users and roles.

#### [NEW] [schemas.py](file:///Users/jokerfox6091/Desktop/CareSync AI/backend/app/schemas/schemas.py)
*   Pydantic models for validation of requests/responses (e.g., `UserCreate`, `UserResponse`, `AppointmentCreate`, `AvailabilityCreate`).

#### [NEW] [auth_routes.py](file:///Users/jokerfox6091/Desktop/CareSync AI/backend/app/routes/auth_routes.py)
*   Authentication endpoints: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`.

#### [NEW] [patient_routes.py](file:///Users/jokerfox6091/Desktop/CareSync AI/backend/app/routes/patient_routes.py)
*   Search doctors, get availability, schedule/cancel appointments, view appointment history.

#### [NEW] [doctor_routes.py](file:///Users/jokerfox6091/Desktop/CareSync AI/backend/app/routes/doctor_routes.py)
*   Manage slots, update appointment status, add consultation notes.

#### [NEW] [admin_routes.py](file:///Users/jokerfox6091/Desktop/CareSync AI/backend/app/routes/admin_routes.py)
*   Manage users/clinics/specialties, retrieve operational metrics.

---

### 3. Intelligence Layer & ML Component

Train and serve predictive machine learning models for wait times and no-shows.

#### [NEW] [no_show_model.py](file:///Users/jokerfox6091/Desktop/CareSync AI/backend/app/ml/no_show_model.py)
*   ML training script using `scikit-learn`.
*   Features utilized: `appointment_hour`, `day_of_week`, `specialty_id`, `patient_age`, `previous_no_shows`.
*   Model will be saved as a serialized pipeline (pickle) and loaded at application startup to provide `/api/predict/no-show` predictions.

#### [NEW] [analytics.py](file:///Users/jokerfox6091/Desktop/CareSync AI/backend/app/services/analytics.py)
*   Aggregates data for admin dashboards: doctor utilization, peak hours, wait times, visit trends, specialty demand.

---

### 4. Generative AI Component (Gemini Integration)

Integrate Gemini to add advanced conversational and summarization support.

#### [NEW] [gemini_service.py](file:///Users/jokerfox6091/Desktop/CareSync AI/backend/app/services/gemini_service.py)
*   Integrates with the `google-genai` package.
*   Functions:
    *   `recommend_specialty(symptom_description)`: parses symptoms, returns matching specialty name + reasoning.
    *   `summarize_consultation_notes(notes)`: creates patient-friendly summaries of complex clinical diagnoses.
    *   `chat_assistant(messages)`: general medical faq chatbot.

---

### 5. Frontend Component (React Dashboards)

Create a state-of-the-art Single Page Application (SPA) using React, Tailwind CSS, and Recharts.

#### [NEW] [App.jsx](file:///Users/jokerfox6091/Desktop/CareSync AI/frontend/src/App.jsx)
*   Setup React Router DOM paths (`/login`, `/register`, `/patient`, `/doctor`, `/admin`).

#### [NEW] [index.css](file:///Users/jokerfox6091/Desktop/CareSync AI/frontend/src/index.css)
*   Core design system stylesheet with styling variables (gradients, card designs, animations).

#### [NEW] [AuthContext.jsx](file:///Users/jokerfox6091/Desktop/CareSync AI/frontend/src/context/AuthContext.jsx)
*   Global state provider for session management and user roles.

#### [NEW] [api.js](file:///Users/jokerfox6091/Desktop/CareSync AI/frontend/src/services/api.js)
*   Axios instance with interceptors attaching Bearer tokens automatically.

#### [NEW] [PatientDashboard.jsx](file:///Users/jokerfox6091/Desktop/CareSync AI/frontend/src/pages/PatientDashboard.jsx)
*   Search doctors with filters.
*   Interactive booking modal.
*   History list showing summaries and reschedule controls.
*   AI Health Symptom Assistant Chat Interface.

#### [NEW] [DoctorDashboard.jsx](file:///Users/jokerfox6091/Desktop/CareSync AI/frontend/src/pages/DoctorDashboard.jsx)
*   Calendar schedule.
*   Check-in/No-show actions.
*   Clinical Notes Editor (with one-click "AI Summary" generator).
*   Availability manager.

#### [NEW] [AdminDashboard.jsx](file:///Users/jokerfox6091/Desktop/CareSync AI/frontend/src/pages/AdminDashboard.jsx)
*   Interactive panels displaying Recharts visualizations:
    *   *Specialty Demand Heatmaps*
    *   *Wait-time distribution*
    *   *No-show trends*
    *   *Doctor utilization charts*
*   Basic CRUD management panel.

---

## Verification Plan

### Automated Tests
*   `pytest`: Backend endpoint validation tests (e.g. registry, booking validation, status changes).
*   `python -m backend.app.ml.no_show_model`: Run model training verification manually.

### Manual Verification
1.  Verify successful PostgreSQL database connection and server status.
2.  Verify successful database generation and seed data ingestion.
3.  Test role login separation:
    *   Ensure patient can only see `/patient`.
    *   Ensure doctor can only see `/doctor`.
    *   Ensure admin can only see `/admin`.
4.  Simulate doctor-search and booking flow, verifying availability slots update correctly.
5.  Test AI Assistant symptom recommendations and summarize notes flow.
6.  Verify Recharts analytics draw coordinates correctly using historical seeded data.
