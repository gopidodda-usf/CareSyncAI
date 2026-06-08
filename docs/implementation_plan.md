# Implementation Plan — Strict Profile Constraints & Password Verification

This plan outlines changes to restrict email updates, enforce 10-digit auto-hyphenated phone numbers, and implement a secure password change flow requiring old password verification and password confirmation.

---

## User Review Required

> [!IMPORTANT]
> **API Changes:**
> - The email field is removed from the update payload. The backend will no longer accept email changes.
> - Password changes will now require validation of the `old_password` before the new one is hashed and stored.
> - Phone numbers must strictly match the `XXX-XXX-XXXX` format or the API will return HTTP 400 validation errors.

---

## Proposed Changes

### 1. Pydantic Request Validation Schemas

#### [MODIFY] [schemas.py](file:///Users/jokerfox6091/Desktop/CareSync%20AI/backend/app/schemas/schemas.py)
* Update `PatientProfileUpdate` and `DoctorProfileUpdate`:
  * Remove `email: Optional[str]` and `password: Optional[str]`.
  * Add `phone: Optional[str] = Field(None, pattern=r"^\d{3}-\d{3}-\d{4}$")` to enforce strict formatting.
  * Add `old_password: Optional[str] = None` and `new_password: Optional[str] = None`.
* Update `AdminProfileUpdate`:
  * Remove `email: Optional[str]` and `password: Optional[str]`.
  * Add `old_password: Optional[str] = None` and `new_password: Optional[str] = None`.

---

### 2. Backend Routes & Controllers

#### [MODIFY] [patient_routes.py](file:///Users/jokerfox6091/Desktop/CareSync%20AI/backend/app/routes/patient_routes.py)
* Remove the `email` update code blocks from `update_patient_profile`.
* Implement the password check logic:
  ```python
  if profile_data.new_password:
      if not profile_data.old_password:
          raise HTTPException(status_code=400, detail="Old password is required to change password")
      if not verify_password(profile_data.old_password, current_user.hashed_password):
          raise HTTPException(status_code=400, detail="Incorrect old password")
      current_user.hashed_password = get_password_hash(profile_data.new_password)
  ```

#### [MODIFY] [doctor_routes.py](file:///Users/jokerfox6091/Desktop/CareSync%20AI/backend/app/routes/doctor_routes.py)
* Remove the `email` update block from `update_doctor_profile`.
* Implement the matching `old_password` validation and hashing logic.

#### [MODIFY] [admin_routes.py](file:///Users/jokerfox6091/Desktop/CareSync%20AI/backend/app/routes/admin_routes.py)
* Remove the `email` update block from `update_admin_profile`.
* Implement the matching `old_password` validation and hashing logic.

---

### 3. Frontend Dashboards (Patient, Doctor, Admin)

#### [MODIFY] [PatientDashboard.jsx](file:///Users/jokerfox6091/Desktop/CareSync%20AI/frontend/src/pages/PatientDashboard.jsx), [DoctorDashboard.jsx](file:///Users/jokerfox6091/Desktop/CareSync%20AI/frontend/src/pages/DoctorDashboard.jsx), and [AdminDashboard.jsx](file:///Users/jokerfox6091/Desktop/CareSync%20AI/frontend/src/pages/AdminDashboard.jsx)

1. **Email Input Lock:**
   * Disable the Email input field: `<input type="email" disabled value={email} className="... opacity-50 cursor-not-allowed bg-slate-900/50" />`.
   
2. **Phone Number Auto-formatting (Patient and Doctor only):**
   * Write an auto-hyphenation utility function `formatPhone` that strips non-digits and inserts hyphens:
     - `813` + `9` -> `813-9`
     - `813-925` + `4` -> `813-925-4`
   * Bind `onChange` of the single phone text field to format inputs on the fly and restrict inputs to a maximum of 12 characters (`maxLength={12}`).

3. **Secure Password Inputs:**
   * Replace the single `New Password` input field in the forms with three inputs:
     - **Old Password** (`oldPassword` state)
     - **New Password** (`newPassword` state)
     - **Confirm New Password** (`confirmPassword` state)
   * On submit:
     * If the user is attempting to change password (i.e. `newPassword` has been typed):
       * Validate that `oldPassword` is not empty.
       * Validate that `newPassword` matches `confirmPassword`.
     * Include `old_password: oldPassword` and `new_password: newPassword` in the JSON request body.
     * Reset password fields upon a successful submit.

---

## Verification Plan

### Automated Tests
* Update tests in `test_profile.py` to match the new schema structure (use `old_password` and `new_password` instead of `password`, and remove `email` updates from payloads).
* Verify that submitting an incorrect `old_password` returns HTTP 400.
* Verify that submitting an invalid phone format (e.g. `1234567890` or `123-4567-890`) returns HTTP 422.
* Run all pytest checks: `PYTHONPATH=backend .venv/bin/pytest`.

### Manual Verification
1. Open the profile setting view for Patient, Doctor, or Admin.
2. Verify that the email field is visibly locked and non-editable.
3. Type numbers into the phone input, confirming it automatically inserts hyphens at positions 4 and 8 (e.g., `813-555-0199`) and stops at 12 characters.
4. Try changing the password:
   - Provide wrong old password -> confirm it raises an error.
   - Provide non-matching new passwords -> confirm frontend flags it.
   - Provide correct credentials -> verify login works under the new password.
