# CareSync AI — Healthcare Appointment & Intelligence Platform

CareSync AI is an enterprise-grade, intelligence-driven healthcare scheduling and clinical operations platform. It supports patients, doctors, and administrators with role-based dashboards, AI-driven symptom analysis, clinic metrics, and wait-time estimations.

## System Architecture & Features

- **Authentication:** Role-based secure access using JWT tokens and pure bcrypt hashing.
- **Patient Dashboard:** Find specialists, check doctor schedules, book/cancel/reschedule appointments, submit ratings, match symptoms using Gemini AI, and chat with an interactive FAQ assistant.
- **Doctor Dashboard:** Manage slots, update appointment statuses, write medical session notes, generate one-click AI-friendly patient summaries, and review historical clinical profiles.
- **Admin Dashboard:** CRUD clinic/specialties, manage users, and view operational analytics charts powered by Recharts (doctor utilization, patient visit trends, peak hours, specialty demand, and real-time wait-time analytics).
- **Machine Learning Layer:** Logistic Regression / Random Forest pipeline predicting appointment no-shows based on hour, weekday, patient age, and specialty.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- PostgreSQL (v14+) running locally on port `5432` with a database named `caresync`.

---

### 1. Database & Backend Setup

1. **Verify PostgreSQL is active:**
   Make sure you have started your local PostgreSQL server and created the `caresync` database. (This was done automatically during setup: `createdb caresync`).

2. **Navigate to the root directory & create virtual environment:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the `backend/` directory or run the backend with these env variables:
   ```env
   DATABASE_URL=postgresql://localhost/caresync
   GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
   ```
   *Note: If no `GEMINI_API_KEY` is provided, CareSync AI will automatically activate its robust rule-based Triager and Summarization Fallback Engine so the entire app remains fully interactive.*

4. **Seed the database:**
   To drop existing tables and seed 10 doctors, 50 patients, and 550 historical appointments (crucial for training the ML no-show predictor), run:
   ```bash
   PYTHONPATH=backend .venv/bin/python -m app.seed
   ```

5. **Train the ML model:**
   ```bash
   PYTHONPATH=backend .venv/bin/python -m app.ml.no_show_model
   ```

6. **Start the FastAPI backend server:**
   ```bash
   PYTHONPATH=backend .venv/bin/uvicorn app.main:app --reload
   ```
   The backend will start at `http://localhost:8000`. You can visit `http://localhost:8000/docs` to see the interactive Swagger DCO.

---

### 2. Frontend Setup

1. **Navigate to the frontend folder:**
   ```bash
   cd frontend
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Start the Vite development server:**
   ```bash
   npm run dev
   ```
   The React application will launch at `http://localhost:5173`.

---

## Seed Test Credentials

You can use these credentials immediately to log into any of the role dashboards:

### Patients (Patient Dashboard)
- **Email:** `patient1@caresync.com` (up to `patient50@caresync.com`)
- **Password:** `patient123`

### Doctors (Doctor Dashboard)
- **Email:** `doctor1@caresync.com` (up to `doctor10@caresync.com`)
- **Password:** `doctor123`

### Administrators (Admin Dashboard)
- **Email:** `admin@caresync.com`
- **Password:** `admin123`

---

## Repository Version Control

To upload this repository to your GitHub account:

1. Create a blank repository on [github.com](https://github.com/) (do not check "Initialize this repository with a README").
2. Run these commands in your project root folder:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```
