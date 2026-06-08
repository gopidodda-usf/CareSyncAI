# Implementation Plan — Inline Profile Trigger & Local File Upload

This plan outlines the steps to merge the profile customization view activation directly into the existing sidebar user info block and replace the profile picture URL text input with a direct local image file upload.

---

## User Review Required

> [!NOTE]
> **No Backend Modifications Required:**
> Because the `profile_picture` column in the database is defined as a `Text` data type, it can natively store base64-encoded image data URLs (`data:image/png;base64,...`). The frontend will handle file-to-base64 conversion. No database migrations, API routing, or model changes are necessary.

---

## Proposed Changes

### Frontend Components

#### [MODIFY] [PatientDashboard.jsx](file:///Users/jokerfox6091/Desktop/CareSync%20AI/frontend/src/pages/PatientDashboard.jsx)
1. **Sidebar Navigation & Link Cleanup:**
   - Remove the `{ id: 'profile', label: 'My Profile Settings', icon: User }` entry from the sidebar navigation array.
   - Bind `onClick={() => setActiveTab('profile')}` to the user profile card `div` in the sidebar.
   - Style the profile card to indicate clickability: add `cursor-pointer hover:bg-slate-800/40 active:scale-95 transition-all` classes.
   - Highlight the profile card when active by dynamically changing borders/bg:
     `activeTab === 'profile' ? 'border-sky-500/40 bg-sky-500/10 text-sky-300' : 'border-slate-800 bg-slate-800/20'`
2. **File Upload Integration:**
   - Remove the `Profile Picture URL` text input field in the Patient Profile Settings form.
   - Insert an file `<input type="file" accept="image/png, image/jpeg" />` element.
   - Add a `handleFileChange` handler that checks file size (caps at 2MB) and converts the local image to a base64 string using `FileReader`.
   - Update `profilePic` and `profilePicPreview` states with the base64 output.

#### [MODIFY] [DoctorDashboard.jsx](file:///Users/jokerfox6091/Desktop/CareSync%20AI/frontend/src/pages/DoctorDashboard.jsx)
1. **Sidebar Navigation & Link Cleanup:**
   - Remove the profile navigation tab link from the main sidebar links list.
   - Add `onClick={() => setActiveTab('profile')}` to the doctor user profile card in the sidebar.
   - Add hover, active-click styles, and highlight state for the card when `activeTab === 'profile'`.
2. **File Upload Integration:**
   - Replace the profile picture URL text field in the doctor settings form with a local file upload input.
   - Add a `handleFileChange` method using `FileReader` to read local files as base64 data URLs.

#### [MODIFY] [AdminDashboard.jsx](file:///Users/jokerfox6091/Desktop/CareSync%20AI/frontend/src/pages/AdminDashboard.jsx)
1. **Sidebar Navigation & Link Cleanup:**
   - Remove the `profile` object from the sidebar navigation array.
   - Bind `onClick={() => setActiveTab('profile')}` to the admin user profile card in the sidebar.
   - Add hover, active scale, and visual active highlights to the profile card.
2. **File Upload Integration:**
   - Replace the admin settings URL input with a local image file upload input.
   - Add a `handleFileChange` method to convert local files to base64.

---

## Verification Plan

### Automated Tests
- Run existing test suites (`PYTHONPATH=backend .venv/bin/pytest`) to confirm backend endpoints continue to function correctly (since base64 data URLs are normal strings, backend tests remain fully valid).

### Manual Verification
1. Log in as a patient, doctor, and admin.
2. Verify that clicking on the user card in the sidebar immediately triggers the profile settings view in the main panel.
3. Click a "Upload Profile Picture" button in the form, select a local `.png` or `.jpg` file, verify that the image preview refreshes instantly.
4. Save the profile changes, and verify that the sidebar avatar updates immediately.
5. Log out, log back in, and verify the uploaded profile picture persists.
