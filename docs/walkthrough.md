# CareSync AI — Comprehensive Implementation Walkthrough

This document outlines the complete codebase architecture of CareSync AI, summarizes verification logs, and details all features, enhancements, and validation routines implemented across the platform.

---

## 1. Codebase Structure & File Map

The codebase is organized into modular directories:

```
CareSync AI/
│
├── docs/
│   ├── prd.md                    # Detailed Product Requirement Document.
│   ├── implementation_plan.md    # Detailed Technical Implementation Plan.
│   └── walkthrough.md            # Comprehensive Walkthrough (this file).
│
├── database/
│   └── schema.sql                # PostgreSQL DDL reference schema.
│
├── backend/
│   ├── app/
│   │   ├── models/
│   │   │   └── models.py         # SQLAlchemy DB models (User, Patient, Doctor, etc.)
│   │   ├── schemas/
│   │   │   └── schemas.py        # Pydantic request & response validators
│   │   ├── routes/
│   │   │   ├── auth_routes.py    # JWT Auth, Register, Login endpoints
│   │   │   ├── patient_routes.py # Appointments, search, profile, notifications
│   │   │   ├── doctor_routes.py  # Availability bulk updates, daily notes, cancellations
│   │   │   ├── admin_routes.py   # Registry filters, credential modifications, metrics
│   │   │   └── ai_routes.py      # Triage chats, specialty recommendations, no-show estimates
│   │   ├── services/
│   │   │   ├── auth.py           # Bcrypt password hashing and pyjwt token operations
│   │   │   ├── analytics.py      # Aggregate database queries for dashboards
│   │   │   └── gemini_service.py # Gemini GenAI client wrappers with fallbacks
│   │   ├── ml/
│   │   │   └── no_show_model.py  # Random Forest no-show training & prediction pipeline
│   │   ├── main.py               # FastAPI core entrypoint (with ML startup handler)
│   │   └── database.py           # SQLAlchemy session engine configuration
│   └── requirements.txt          # Python package requirements
│
├── frontend/
│   ├── index.html                # Client wrapper setting responsive viewports
│   ├── tailwind.config.js        # Tailwind configurations
│   ├── postcss.config.js         # CSS compiler configurations
│   └── src/
│       ├── main.jsx              # DOM rendering entrypoint
│       ├── App.jsx               # Router & Protected gateways configurations
│       ├── index.css             # Glassmorphic base styling
│       ├── context/
│       │   └── AuthContext.jsx   # Global user state & token restoration
│       ├── services/
│       │   └── api.js            # Axios client with request interceptors
│       └── pages/
│           ├── LoginRegister.jsx # Toggleable auth page (Patient/Doctor/Admin)
│           ├── PatientDashboard.jsx # Discovery grid, custom calendar, alerts drawer
│           ├── DoctorDashboard.jsx  # Agendas, availability modals, earnings, notes calendar
│           └── AdminDashboard.jsx   # Metrics, registry controls, credential modal
```

---

## 2. Verification & Testing Results

1.  **Database Seeding:** Running `backend/app/seed.py` successfully drops and recreates all tables locally and populates them with specialties, clinics, patients, doctors, and **550 mock appointments** distributed across past and future schedules.
2.  **Machine Learning Training:** Running `backend/app/ml/no_show_model.py` queries **366 completed and no-show appointments** from the local database, fits a Random Forest classifier, and saves `backend/app/ml/no_show_model.pkl`.
3.  **Automated API Tests:** Running `pytest` locally passes all 16 tests covering JWT logins, profile customizations, appointment checks, notifications, daily notes, and doctor cancellations.

---

## 3. How to Run the App Locally

1.  **Start Backend (FastAPI):**
    ```bash
    source .venv/bin/activate
    PYTHONPATH=backend uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
    ```
2.  **Start Frontend (Vite/React):**
    ```bash
    npm --prefix frontend run dev
    ```
3.  Open `http://localhost:5173` in your browser.
4.  Log in using any default seed credential:
    *   **Patient:** `patient1@caresync.com` / `patient123`
    *   **Doctor:** `doctor1@caresync.com` / `doctor123`
    *   **Admin:** `admin@caresync.com` / `admin123`

---

## 4. UX Upgrades: Header Sign Out Integration
To prevent users from having to scroll to the bottom of the navigation sidebar to sign out, a responsive **Sign Out** button was added to the top-right header panel of all three dashboards:
*   On small/mobile screens, the label collapses to render only the `LogOut` icon.
*   On tablet screens and above, it expands to show full text and icon indicators.

---

## 5. Interactive Alerts & Drawer (Patient Workspace)
*   **Pulsing Alert Badge:** The static notifications badge in the Patient header was converted into an interactive button that shows a pulsing red dot when unread notifications are present.
*   **Slide-over Drawer:** Clicking the badge slides open a glassmorphic right-side drawer listing notifications.
*   **Actions:** Users can dismiss a single notification, mark all as read, or click "Take Action" on appointment alerts, which marks the alert as read and redirects the user to the "My Appointments" tab.

---

## 6. User Profile Customization
*   **Strict Validations:** Updated Pydantic schemas to enforce US phone formats (`XXX-XXX-XXXX`) using pattern `^\d{3}-\d{3}-\d{4}$`.
*   **Email Lock:** Removed the `email` field from the update payload. The backend blocks email modifications, and the input field is disabled on all frontend forms.
*   **Three-Field Password Flow:** Form updates require typing `old_password`, `new_password`, and `confirm_password`. If a new password is provided, the backend validates the current password hash before saving.
*   **Base64 File Upload:** Profile avatar picture URLs are replaced with direct file selectors (`accept="image/png, image/jpeg"`). The client compresses and converts uploads to Base64 strings for native DB storage.
*   **Avatar Zoom Modal:** Clicking the avatar picture preview in the settings page opens an enlarged modal overlay.

---

## 7. Admin Registry Search, Filter & Sort Controls
The **Manage System Users** view in the Admin dashboard has been updated with:
*   A search bar that matches users by ID, name, or email.
*   A role filter dropdown (`All Users`, `Patients`, `Doctors`, `Admins`).
*   Sorting selectors (sort by User ID, First Name, Last Name, Email, or Registration Date) with a toggle button for Ascending/Descending orders.
*   A computed `useMemo` filter block to keep listing updates instantaneous.

---

## 8. Admin User Credential Modification Dialog
*   Clicking a user's name in the Admin registry table opens a glassmorphic edit modal.
*   Administrators can modify account details, input auto-hyphenated phone numbers, change roles, or reset passwords.
*   **Role Conversions:** Changing a user's role dynamically creates or removes the corresponding patient or doctor profiles in the database.

---

## 9. Patient Dashboard Enhancements & Redesign
1.  **Default Home Page:** Shows insurance status badges, KPI widgets (total bookings, upcoming visits, completed consultations), a next upcoming visit card, a past 3 consultations history summary, and action shortcuts.
2.  **Popup Details Modal:** Clicking past consultations or medical record rows opens a modal displaying the session's clinical notes (symptoms, diagnosis, and treatment plan).
3.  **Inline Booking Calendar:** Replaces basic dropdown selectors with an interactive monthly grid calendar.
    *   **3-Month Boundary:** Limits date selections from today to +3 months (graying out other dates).
    *   **AM/PM Slots:** Generates 12-hour formatted time slots.
    *   **Busy Slots Cross-Referencing:** Conflicting doctor hours, patient schedule overlaps, or booked slots are blurred and disabled.
4.  **AI Support Drawer:** Clicking "Help" in the top header slides open a chat drawer for symptom validation and medical FAQs.

---

## 10. Doctor Weekly Availability Selector
*   Provides an **Edit** button in the Availability panel.
*   Opens a weekly schedule grid showing checkable days (Monday to Sunday) with start and end times in 30-minute increments.
*   Validates that the start time is strictly before the end time.
*   Updates slots atomically via `PUT /api/doctor/availability` (deleting prior slots and saving new entries).

---

## 11. Doctor Home View & Cancellation Log
*   **Doctor Home Landing Page:** Displays greets, KPIs, a next consultation launcher shortcut, and configured availability hours.
*   **Consultation Workspace:** Refitted notes workspace with filters (All, Scheduled, Completed, Cancelled, No Show).
*   **Cancellation Reasons:** Cancelling an appointment opens a dialog with a reasons dropdown (Schedule Conflict, Personal Reasons, Out of Office, etc.). The reason is logged in the database and sent as a notification to the patient.

---

## 12. Doctor calendar & Daily Notes
*   Provides a **Calendar** tab in the Doctor dashboard.
*   Renders a monthly grid view showing aggregate indicators per date: completed count (`✅`), average daily review rating (`⭐`), and a note indicator (`📝 Note`).
*   Clicking a cell opens a dialog displaying a scrollable daily agenda and a text area to upsert personal daily notes (`doctor_daily_notes`).

---

## 13. Rename Workspace tabs & Earnings Tab
*   Renamed "Doctor Home" to **"Home Page"** and "Clinical Consultations" to **"Workspace"**.
*   **Earnings Tab:** Displays financial stats (Today's, MTD, YTD, and Lifetime Earnings), a scrollable list of completed transactions, and a Recharts bar chart visualizing monthly billings.
