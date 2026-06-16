---
title: CareSync Backend
emoji: 🏥
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# CareSync AI - Healthcare Appointment & Intelligence Platform

CareSync AI is an enterprise-grade, intelligence-driven healthcare scheduling and clinical operations platform. It features full role-based workspaces for Patients, Doctors, and Admins, integrated with Gemini AI symptom triaging, automated clinical summaries, Recharts metrics visualization, and a Random Forest machine learning pipeline predicting appointment no-show rates.

---

## 1. Directory Structure & File Map

Below is a detailed map of the files in the repository and their technical roles in the application:

```
CareSync AI/
│
├── docs/
│   ├── prd.md                        # Comprehensive Product Requirements Document.
│   ├── implementation_plan.md        # End-to-end design & implementation blueprint.
│   └── walkthrough.md                # Execution walkthrough and feature validation logs.
│
├── database/
│   └── schema.sql                    # raw DDL database definitions for all tables, constraints, and constraints.
│
├── backend/
│   ├── requirements.txt              # Python dependencies (fastapi, uvicorn, sqlalchemy, psycopg2-binary, scikit-learn, etc.)
│   └── app/
│       ├── main.py                   # Main FastAPI entry point mounting routes, CORS middlewares, and startup handlers.
│       ├── database.py               # SQLAlchemy setup defining the connection engine and get_db session dependency.
│       ├── config.py                 # Configuration loader mapping system environment variables and JWT signing secrets.
│       │
│       ├── models/
│       │   └── models.py                 # SQLAlchemy ORM models (User, Patient, Doctor, Specialty, Clinic, Appointment, etc.)
│       │
│       ├── schemas/
│       │   └── schemas.py                # Pydantic schema validators enforcing data shapes, phone regexes, and security payloads.
│       │
│       ├── routes/
│       │   ├── auth_routes.py            # Endpoint logic for JWT-based User registration, login, and token validations.
│       │   ├── patient_routes.py         # Handles patient profiles, doctor discovery, slot constraints, and notification dismissals.
│       │   ├── doctor_routes.py          # Handles daily notes, availability overrides, appointments cancel/update, and profile settings.
│       │   ├── admin_routes.py           # System-wide metrics, clinic/specialty configurations, and user registry management.
│       │   └── ai_routes.py              # GenAI triage matching, consultation notes summarizing, and triage chat endpoints.
│       │
│       ├── services/
│       │   ├── auth.py                   # Core security services managing Bcrypt password hashes and JWT encode/decode tokens.
│       │   ├── analytics.py              # Pre-aggregated database queries providing wait-time, peak-hour, and no-show stats for Admins.
│       │   └── gemini_service.py         # Gemini GenAI client wrapper equipped with rule-based fallback handlers.
│       │
│       ├── ml/
│       │   ├── no_show_model.py          # Random Forest pipeline training, preprocessing, serialization, and prediction.
│       │   └── no_show_model.pkl         # Pickled classifier model binary.
│       │
│       ├── seed.py                   # Rich database seed generator generating 550+ appointments, users, and medical profiles.
│       └── test_main.py              # Complete pytest API integration check suite covering core endpoints and cancellations.
│       └── test_profile.py           # Pytest suite validating user settings, regex validations, and registry updates.
│
├── frontend/
│   ├── package.json              # Node dependencies (React, React Router, Recharts, Lucide React, Axios, etc.)
│   ├── index.html                # Client wrapper setting responsive viewports, SEO descriptions, and typeface loaders.
│   ├── tailwind.config.js        # CSS layout guidelines.
│   ├── postcss.config.js         # CSS compile configs.
│   │
│   └── src/
│       ├── main.jsx                  # Client entry rendering App within the React DOM.
│       ├── App.jsx                   # Router configuring paths, public gateways, and role-protected layout views.
│       ├── index.css                 # Base styles configuring glassmorphic gradients, dark modes, and slide scrollbars.
│       │
│       ├── context/
│       │   └── AuthContext.jsx       # Context hook caching tokens, maintaining user object state, and handling logout routing.
│       │
│       ├── services/
│       │   └── api.js                # Axios middleware appending tokens automatically and format payloads.
│       │
│       └── pages/
│           ├── LoginRegister.jsx         # Dual register/login page supporting toggleable Patient, Doctor, and Admin roles.
│           ├── PatientDashboard.jsx      # Dashboard rendering Home stats, inline calendar booking, and unread notifications drawer.
│           ├── DoctorDashboard.jsx       # Workspace containing schedule filters, bulk availability selector, and notes calendar.
│           └── AdminDashboard.jsx        # Metrics panels showing specialty demands, wait times, and interactive user management.
```

---

## 2. Database Schema (PostgreSQL)

CareSync AI utilizes PostgreSQL. The core tables are defined in [schema.sql](file:///Users/jokerfox6091/Desktop/CareSync%20AI/database/schema.sql) and managed in Python via [models.py](file:///Users/jokerfox6091/Desktop/CareSync%20AI/backend/app/models/models.py):

* **`users`**: Central auth table. Stores email, hashed password, role (`'patient'`, `'doctor'`, `'admin'`), created timestamp, and optional avatar Base64 string.
* **`specialties`**: Defines medical domains (e.g., Cardiology, Pediatrics) with details.
* **`clinics`**: Locations of clinics including addresses and support contacts.
* **`patients`**: Patient profiles linked one-to-one to `users`. Stores name, dob, gender, and contact phone (formatted as `XXX-XXX-XXXX`).
* **`doctors`**: Doctor profiles linked one-to-one to `users`. Associates doctors with a specialty and clinic, bio descriptions, and active consultation fee.
* **`doctor_availability`**: Weekly scheduling configuration. Maps days of week (0 = Sunday to 6 = Saturday) to active time intervals.
* **`appointments`**: Central transactions table mapping patients and doctors to dates and start times. Tracks status (`'scheduled'`, `'completed'`, `'cancelled'`, `'no_show'`) and logs reasons for cancellations.
* **`doctor_daily_notes`**: Attachment table for daily doctor schedule notes and tasks. Constrained uniquely by `(doctor_id, note_date)` to support clean updates.
* **`medical_notes`**: Clinical consultations notes. Attaches reported symptoms, clinical diagnosis, and treatment plan to completed appointments.
* **`appointment_feedback`**: Ratings (1 to 5) and feedback submitted by patients.
* **`notifications`**: Dispatch system logging and delivering alerts to users. Dismissals toggle the `is_read` boolean flag.

---

## 3. Core Engine Implementations

### 3.1. Machine Learning No-Show Predictor
Located in [no_show_model.py](file:///Users/jokerfox6091/Desktop/CareSync%20AI/backend/app/ml/no_show_model.py):
* **Classifier:** Scikit-Learn `RandomForestClassifier` ensemble.
* **Feature Engineering:** Extracts categorical and numeric features:
  - Patient Age (continuous).
  - Time of day (hour value).
  - Day of week (0-6 weekday index).
  - Doctor ID (categorical target encoding).
  - Specialty ID (categorical target encoding).
* **Pipeline:** Configured within a `ColumnTransformer` with `OneHotEncoder` (for categoricals) and `StandardScaler` (for age/hour), making inference robust.
* **Integration:** Pre-trained during setup and serialized as `no_show_model.pkl`. The patient booking modal queries this model via backend APIs on slot click to display real-time booking advice (e.g. `Low No-Show Risk: 14.5%`).

### 3.2. GenAI Integration (Gemini AI Client)
Located in [gemini_service.py](file:///Users/jokerfox6091/Desktop/CareSync%20AI/backend/app/services/gemini_service.py):
* **Triage & Diagnosis Matching:** Matches patient-reported symptoms to medical specialties (Cardiology, Dermatology, etc.) with brief explanations.
* **Clinical Note Summarization:** Summarizes clinical session logs (Symptoms, Diagnosis, Plan) into patient-friendly, jargon-free health updates.
* **Symptom Chatbot:** Powers a chat assistant inside the patient slide-over drawer to answer general medical FAQs.
* **Robust Fallback Engine:** If no `GEMINI_API_KEY` is provided, CareSync AI automatically triggers its local matching and summarization fallbacks (regex keywords and string formatters) to keep the app fully operational offline.

---

## 4. Getting Started

### 4.1. Prerequisites
- **Node.js** (v18+) & **npm**
- **Python** (v3.10+)
- **PostgreSQL** running locally on port `5432` with a database named `caresync`.

### 4.2. Setup Instructions

#### Step 1: Database Setup
1. Verify PostgreSQL is running.
2. Create the target database:
   ```bash
   createdb caresync
   ```

#### Step 2: Backend Setup
1. Navigate to the root directory and configure a virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. Install Python packages:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Set environment configurations inside a `.env` file under `backend/`:
   ```env
   DATABASE_URL=postgresql://localhost/caresync
   GEMINI_API_KEY=YOUR_GEMINI_KEY_HERE
   ```
4. Seed your database with mock patients, doctors, and 550+ historical records:
   ```bash
   PYTHONPATH=backend .venv/bin/python backend/app/seed.py
   ```
5. Train and serialize the Random Forest ML classifier:
   ```bash
   PYTHONPATH=backend .venv/bin/python backend/app/ml/no_show_model.py
   ```
6. Launch the FastAPI server:
   ```bash
   PYTHONPATH=backend .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *The Swagger API documentation will be available at `http://127.0.0.1:8000/docs`.*

#### Step 3: Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React client dev server:
   ```bash
   npm run dev
   ```
   *The application will open at `http://localhost:5173`.*

---

## 5. Seed Login Credentials

Use these seeded accounts to log in and inspect the role-based dashboard views:

| Role | Email Address | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@caresync.com` | `admin123` | Operational metrics charts & user registries |
| **Doctor** | `doctor1@caresync.com` | `doctor123` | Workspace, calendar notes, bulk scheduler, cancel modal |
| **Patient** | `patient1@caresync.com` | `patient123` | Booking grid, notifications, medical records, AI chatbot |

*Note: You can log in as any patient up to `patient50@caresync.com` and doctor up to `doctor10@caresync.com` using the same patterns.*

---

## 6. Verification and Test Suites

You can run automated checks against the codebase:

### 6.1. Running Unit Tests
With the virtual environment active in the project root, run:
```bash
PYTHONPATH=backend .venv/bin/pytest
```
*Tests cover auth logins, doctor booking conflicts, slot updates, phone validation formats, and admin user updates.*

### 6.2. Production Compilation Build
Confirm React compiles with zero warnings or syntax issues:
```bash
cd frontend
npm run build
```
