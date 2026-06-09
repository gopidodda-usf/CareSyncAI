# Product Requirement Document (PRD) — CareSync AI

## 1. Overview & Business Objectives
CareSync AI is an enterprise-grade, intelligence-driven healthcare scheduling and clinical operations platform. The platform is designed to optimize patient scheduling, assist doctors with clinical documentation, automate administrative tasks, and mitigate financial losses from missed appointments through machine learning intelligence and generative AI.

The platform serves three primary user roles:
*   **Patients:** Facilitates doctor discovery, interactive scheduling via smart calendars, symptom triaging, and personal health tracking.
*   **Doctors:** Provides daily agendas, clinical workspace note editors, calendar visualizers, weekly availability selectors, personal daily notes, and earnings dashboards.
*   **Administrators:** Offers global system control, operational metrics charts, a system-wide user registry with advanced search/sort, and credential modification modals.

---

## 2. User Roles & Detailed Feature Specifications

### 2.1. Patient Workspace
The Patient dashboard provides an intuitive, glassmorphic layout for health management.
1.  **Home Landing Page:**
    *   **Verified Insurance & Trust Badges:** Display verification status indicators.
    *   **Operational Key Performance Indicators (KPIs):** Aggregate cards detailing total bookings, upcoming visits, and completed consultations.
    *   **Closest Upcoming Consultation:** Highlight card detailing the doctor, specialty, clinic location, date, and 12-hour formatted time.
    *   **Past Consultations & Records:** Scrollable grid showing past 3 appointments and a full history table. Clickable entries open a popup details modal displaying the clinical note (Symptom, Diagnosis, Treatment) written by the doctor.
2.  **Doctor Search & Discovery:**
    *   A searchable grid of active doctors, filterable by medical specialty and clinic location.
    *   Displays doctor bios, clinic phone numbers, and active consultation fees.
3.  **Smart Booking & Rescheduling Modal:**
    *   **Inline Monthly Grid Calendar:** Replaces basic dropdowns with an interactive month calendar.
    *   **3-Month Booking Boundary:** Restricts scheduling strictly from `today` to `today + 92 days` (3 months). Dates outside this range are disabled and grayed out.
    *   **Busy Slots Cross-Referencing:** Queries the backend to identify slots already booked by other patients, slots overlapping with the patient's existing schedule, or slots outside the doctor's weekly configured availability.
    *   **AM/PM Dynamic Slots:** Generates 12-hour formatted time slots (e.g. `09:30 AM`, `02:00 PM`). Booked or unavailable slots are styled with a blur filter (`blur-[0.6px] opacity-40`) and are non-interactive.
4.  **Interactive Alerts Drawer:**
    *   Clickable header badge with a pulsing notification dot when there are unread alerts.
    *   A right-side sliding drawer showing recent system notifications.
    *   Allows single dismissals (`POST /api/patient/notifications/{id}/read`) or batch dismissals (`POST /api/patient/notifications/read`).
    *   Includes a "Take Action" link for appointment updates, which automatically closes the drawer and redirects the user to the "My Appointments" tab.
5.  **AI Support Chat Drawer (Help Menu):**
    *   Triggered from a "Help" question-mark button in the main header.
    *   Contains the Gemini-powered chat assistant for symptom validation and medical FAQs.

### 2.2. Doctor Workspace
The Doctor Portal is structured into dedicated operational sections:
1.  **Home Page:**
    *   Displays greeting, daily aggregate KPIs (Today's Consultations, Pending Notes, Weekly Availability Hours, Patient Satisfaction).
    *   Provides a "Next Consultation" shortcut card to start a session immediately.
    *   Lists the next 3 upcoming appointments with quick cancellation buttons.
2.  **Workspace (Clinical Consultations):**
    *   Lists daily schedules with status filters (All, Scheduled, Completed, Cancelled, No Show).
    *   **Interactive Consultation Room:** Selecting a scheduled patient focuses the clinical note editor workspace.
    *   **Gemini AI Summarizer:** Generates a patient-friendly summary of the session notes with one click.
    *   **Cancellation Dialog:** Click triggers a glassmorphic modal with a reasons dropdown (Schedule Conflict, Out of Office, Personal Reasons, etc.) to cancel and log the reason.
3.  **Weekly Availability Slot Selector:**
    *   Edit schedule modal featuring checkable days of the week (Monday to Sunday).
    *   Start and End Time dropdowns configured in 30-minute increments.
    *   Validates that the selected start time is strictly prior to the end time before saving.
4.  **Calendar & Daily Notes Tab:**
    *   An interactive monthly grid calendar showing daily stats: completed sessions count (`✅`), average daily review rating (`⭐`), and a note indicator (`📝 Note`).
    *   Navigation restricted to a maximum of 3 months into the future.
    *   Clicking a cell opens a modal showing a scrollable agenda for that date and a text area to upsert personal daily notes (`doctor_daily_notes`).
5.  **Earnings Analytics Tab:**
    *   Aggregate panels: Today's, Month-to-Date, Year-to-Date, and Lifetime Earnings.
    *   Transactions table listing completed session details.
    *   Recharts bar chart showing monthly billing summaries.

### 2.3. Administrator Workspace
The Admin panel enables complete operational oversight.
1.  **Analytics Dashboard:**
    *   Real-time system stats (Total Patients, Active Doctors, Booked Sessions, General Rating).
    *   Charts: Specialty demand shares (Pie Chart), Average wait times by specialty (Bar Chart), and No-show rate trends (Line Chart).
2.  **Manage System Users (Registry):**
    *   List view showing user accounts, roles, emails, and phone numbers.
    *   Advanced controls: live text search (ID, name, email), role filtering, and sort field/order controls.
3.  **User Credentials Update Modal:**
    *   Clicking a user's name in the registry opens a glassmorphic dialog.
    *   Enables modifications to name, email, phone number, role, and password resets.
    *   Role changes automatically delete/provision corresponding patient/doctor profiles in the database.

---

## 3. Security, Validation & Profile Constraints

To maintain database integrity and data quality, strict security constraints are enforced:
1.  **Email Address Lock:** The user's email address is used as their primary identifier. Once created, the email is immutable. Input fields for email in profile settings are locked and disabled (`disabled cursor-not-allowed opacity-60`).
2.  **Hyphenated Phone Format:** Phone numbers submitted by Patients, Doctors, or Admins must strictly comply with the US 10-digit phone format: `XXX-XXX-XXXX` (verified using Pydantic regex pattern `^\d{3}-\d{3}-\d{4}$`). The frontend forms format the input automatically as the user types.
3.  **Three-Field Password Change Flow:** Modifying a password requires:
    *   `old_password` (verified against the database hash using bcrypt).
    *   `new_password` (minimum complexity enforced).
    *   `confirm_password` (validated to match `new_password` on the client side).
4.  **Avatar Image Zoom Overlay:** Profile avatar pictures can be clicked to open a centered, enlarged overlay modal. Local file uploads (`accept="image/png, image/jpeg"`) are handled via a `FileReader` converting files to Base64 strings for native DB storage.

---

## 4. Database Schema Requirements (PostgreSQL)
*   **`users`**: Contains credentials, passwords, role (`patient`, `doctor`, `admin`), name, and profile picture.
*   **`patients`**: Links to `users` with first/last name, dob, gender, and phone.
*   **`doctors`**: Links to `users` with specialty, clinic, bio, and fee.
*   **`doctor_availability`**: Day of week and operating hours.
*   **`doctor_daily_notes`**: Constrained by `(doctor_id, note_date)` for personal daily memos.
*   **`appointments`**: Central transactional records containing dates, times, statuses, and `cancellation_reason`.
*   **`medical_notes`**: Symptoms, diagnosis, and treatment plan.
*   **`appointment_feedback`**: Ratings and comment reviews.
*   **`notifications`**: User alert entries and read/unread flags.
