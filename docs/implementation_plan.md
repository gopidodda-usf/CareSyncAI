# Technical Implementation Plan — CareSync AI

## 1. System Architecture & Component Mapping

CareSync AI utilizes a modern, modular client-server architecture built on a high-performance Python backend and a responsive React Single Page Application (SPA) frontend.

```
┌───────────────────────────────────────────────────────────────┐
│                      REACTIONS CLIENT (SPA)                   │
│      React Router (Gateways) ◄──► Axios Interceptors          │
│               ▲                           ▲                   │
│               │ state                     │ HTTP / JWT        │
│               ▼                           ▼                   │
│      AuthContext Provider        API Services Wrapper         │
└───────────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────┐
│                       FASTAPI APPLICATION                     │
│    CORS Middleware ──► APIRouters (Auth, Patient, Doc, Admin)  │
│                                   │                           │
│     ┌─────────────────────────────┼────────────────────────┐  │
│     ▼                             ▼                        ▼  │
│  SQLAlchemy ORM             Pydantic Schemas          Dependencies  │
└─────┬─────────────────────────────┬────────────────────────┬──┘
      │ SQL                         │                        │ API
      ▼                             ▼                        ▼
┌──────────────┐             ┌──────────────┐         ┌──────────────┐
│  POSTGRESQL  │             │ ML PREDICTOR │         │  GEMINI AI   │
│  (Local DB)  │             │ Scikit-learn │         │ google-genai │
└──────────────┘             └──────────────┘         └──────────────┘
```

*   **Frontend Client:** Compiled using Vite, structured via Tailwind CSS for styling, Recharts for dashboard analytics, and Axios for token-handling API requests.
*   **Backend Server:** Powered by FastAPI and Uvicorn, using SQLAlchemy for database operations and Pydantic for validation.
*   **Intelligence & Models:** Includes a Python-based Random Forest classifier for no-show probability lookups and the `google-genai` SDK for natural language health triage.

---

## 2. Database Schema & Relational Structure

The database schema is defined in [schema.sql](file:///Users/jokerfox6091/Desktop/CareSync%20AI/database/schema.sql) and implemented in Python in [models.py](file:///Users/jokerfox6091/Desktop/CareSync%20AI/backend/app/models/models.py).

### 2.1. Table Definitions & Constraints
1.  **`users`**: Contains core security records.
    *   `id` (Integer, Primary Key)
    *   `email` (String, Unique, Indexed, Non-nullable)
    *   `hashed_password` (String, Non-nullable)
    *   `role` (String, enforces `'patient'`, `'doctor'`, or `'admin'`)
    *   `name` (String, optional for admins)
    *   `profile_picture` (Text, stores Base64 string for avatars)
2.  **`specialties`**: Defines clinical medical disciplines.
    *   `id` (Integer, Primary Key)
    *   `name` (String, Unique)
    *   `description` (Text)
3.  **`clinics`**: Location coordinates and contact points.
    *   `id` (Integer, Primary Key)
    *   `name` (String, Non-nullable)
    *   `address` (String)
    *   `phone` (String)
4.  **`patients`**: Links to `users` with patient-specific info.
    *   `id` (Integer, Primary Key, Foreign Key -> `users.id` ON DELETE CASCADE)
    *   `first_name` (String)
    *   `last_name` (String)
    *   `phone` (String, complies with `XXX-XXX-XXXX` formatting)
    *   `date_of_birth` (Date)
    *   `gender` (String)
5.  **`doctors`**: Links to `users` with doctor-specific info.
    *   `id` (Integer, Primary Key, Foreign Key -> `users.id` ON DELETE CASCADE)
    *   `first_name` (String)
    *   `last_name` (String)
    *   `phone` (String, complies with `XXX-XXX-XXXX` formatting)
    *   `specialty_id` (Integer, Foreign Key -> `specialties.id`)
    *   `clinic_id` (Integer, Foreign Key -> `clinics.id`)
    *   `bio` (Text)
    *   `consultation_fee` (Integer)
6.  **`doctor_availability`**: Maps days of week to availability periods.
    *   `id` (Integer, Primary Key)
    *   `doctor_id` (Integer, Foreign Key -> `doctors.id` ON DELETE CASCADE)
    *   `day_of_week` (Integer, ranges `1` (Monday) to `7` (Sunday))
    *   `start_time` (Time)
    *   `end_time` (Time)
    *   `is_active` (Boolean, default `True`)
7.  **`doctor_daily_notes`**: Memo attachments for doctors.
    *   `id` (Integer, Primary Key)
    *   `doctor_id` (Integer, Foreign Key -> `doctors.id` ON DELETE CASCADE)
    *   `note_date` (Date, Non-nullable)
    *   `content` (Text, Non-nullable)
    *   *Constraint:* `UniqueConstraint("doctor_id", "note_date")` prevents duplicate memos.
8.  **`appointments`**: Central transactions table.
    *   `id` (Integer, Primary Key)
    *   `patient_id` (Integer, Foreign Key -> `patients.id` ON DELETE CASCADE)
    *   `doctor_id` (Integer, Foreign Key -> `doctors.id` ON DELETE CASCADE)
    *   `appointment_date` (Date, Non-nullable)
    *   `start_time` (Time, Non-nullable)
    *   `status` (String, default `'scheduled'`; restricts to `'scheduled'`, `'completed'`, `'cancelled'`, `'no_show'`)
    *   `cancellation_reason` (String, optional log description)
9.  **`medical_notes`**: Session summaries for completed consultations.
    *   `id` (Integer, Primary Key)
    *   `appointment_id` (Integer, Foreign Key -> `appointments.id` ON DELETE CASCADE, Unique)
    *   `symptoms` (Text)
    *   `diagnosis` (Text)
    *   `treatment_plan` (Text)
10. **`appointment_feedback`**: Ratings and reviews.
    *   `id` (Integer, Primary Key)
    *   `appointment_id` (Integer, Foreign Key -> `appointments.id` ON DELETE CASCADE, Unique)
    *   `rating` (Integer, scale `1` to `5`)
    *   `comments` (Text)
11. **`notifications`**: Dispatched alert logs.
    *   `id` (Integer, Primary Key)
    *   `user_id` (Integer, Foreign Key -> `users.id` ON DELETE CASCADE)
    *   `title` (String)
    *   `message` (Text)
    *   `is_read` (Boolean, default `False`)

---

## 3. API Route Structure

All endpoints are built using FastAPI routers in `backend/app/routes/`.

### 3.1. Authentication Router (`/api/auth`)
*   `POST /register`: Accepts `UserCreate` Pydantic payload, hashes password via bcrypt, creates user record, and logs in.
*   `POST /login`: Accepts `username` (email) and `password`. Returns JWT payload.
*   `GET /me`: Returns current user identity and profile details.

### 3.2. Patient Router (`/api/patient`)
*   `GET /doctors`: Queries active doctor list with specialties and locations.
*   `GET /doctors/{doctor_id}/booked-slots`: Returns all booked and busy slots for a doctor to restrict scheduling conflicts.
*   `POST /appointments`: Schedules a new appointment. Enforces 3-month future booking limits, availability checks, and overlapping conflict validations.
*   `POST /appointments/{appt_id}/reschedule`: Updates date and time.
*   `POST /appointments/{appt_id}/cancel`: Cancels an appointment.
*   `PUT /profile`: Modifies patient profile details (strict phone regex, locked email, 3-field password change flow).
*   `GET /notifications`: Lists user alert notifications.
*   `POST /notifications/{notif_id}/read`: Marks a single notification as read.
*   `POST /notifications/read`: Marks all notifications as read.

### 3.3. Doctor Router (`/api/doctor`)
*   `GET /appointments`: Lists doctor's appointments.
*   `POST /appointments/{appt_id}/cancel`: Cancels an appointment and logs the reason.
*   `PUT /availability`: Updates availability slots in a single atomic transaction.
*   `GET /daily-notes`: Fetches all daily notes for the doctor.
*   `POST /daily-notes`: Upserts daily note content for a specific date (deletes the record if content is empty).
*   `PUT /profile`: Modifies doctor profile details.

### 3.4. Admin Router (`/api/admin`)
*   `GET /analytics/overview`: Returns aggregate counts (Total patients, active doctors, ratings).
*   `GET /analytics/dashboard`: Returns Recharts chart stats (wait times, demand, no-show rates).
*   `GET /users`: Lists user registry with search, filter, and sort queries.
*   `PUT /users/{user_id}`: Modifies target user credentials, roles, and profiles.
*   `PUT /profile`: Modifies admin profile details.

---

## 4. Frontend State & Component Architecture

The frontend React application is structured in `frontend/src/`.

*   **`AuthContext.jsx`**: Manages global user state, token parsing, and auto-login restorations.
*   **`api.js`**: Axios interceptors append JWT bearer tokens automatically and handle error fallbacks.
*   **Dashboard Workspaces:**
    *   **Sidebar Navigation:** Role-specific tabs (Home Page, Search, Workspace, Calendar, Earnings, Profile). The user card triggers the Profile Settings tab.
    *   **Modal Overlays:** Glassmorphic modal controls for details, inline availability editing, appointment cancellations, and avatar zoom views.
    *   **Input Formatting Helpers:** `formatPhone` formats inputs as `XXX-XXX-XXXX` as the user types.

---

## 5. Machine Learning & GenAI Engine
1.  **No-Show Predictor (`backend/app/ml/no_show_model.py`):**
    *   Trains a Scikit-Learn `RandomForestClassifier` on 366 data points.
    *   Features: Patient Age, Appointment Hour, Day of Week, Doctor ID, Specialty ID.
    *   Dynamic training is triggered on backend startup (`app.on_event("startup")`) to ensure the model is trained and ready locally.
2.  **Gemini Service (`backend/app/services/gemini_service.py`):**
    *   Calls the Gemini API (`google-genai` SDK) for symptom recommendations, session note summaries, and medical FAQ chats.
    *   Includes rule-based fallback heuristics to handle high demand or API connectivity issues.
