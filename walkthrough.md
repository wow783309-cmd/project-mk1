# Patient Queue System - Walkthrough

## Prerequisites
- Node.js installed
- Dependencies installed (`npm install`)

## Running the Application

You need to run both the backend server and the frontend development server.

### 1. Start the Backend Server
Open a terminal and run:
```bash
npm run server
```
This starts the Express server on port 3000 with Socket.io and SQLite.

### 2. Start the Frontend
Open a **new** terminal and run:
```bash
npm run dev
```
This starts the Vite dev server (usually at http://localhost:5173).

## Verification Steps

Open the application in your browser (e.g., `http://localhost:5173`).

### 1. Setup Views
Open three separate tabs or windows to simulate the different roles:
- **Tab 1 (Admin)**: `http://localhost:5173/admin`
- **Tab 2 (Nurse)**: `http://localhost:5173/nurse`
- **Tab 3 (TV)**: `http://localhost:5173/tv`

### 2. Manage Doctors (Admin)
1. Go to the **Admin Panel** and click the **Manage Doctors** tab.
2. Add a new Doctor (e.g., "Dr. Strange").
3. **NEW**: Enter a Schedule (e.g., "Mon-Fri 9am-5pm").
4. **NEW**: Verify that the Doctor ID is displayed in the list (e.g., `[ID: 1] Dr. Strange`).

### 3. Register a Patient (Admin)
1. Go to the **Registration & Queue** tab.
2. Fill in the "Register Patient" form.
3. Click **Register**.
4. **NEW**: Verify that the Patient ID is displayed in the "Select Patient" dropdown.

### 4. Create a Queue (Admin)
1. Select the patient and doctor.
2. Click **Generate Queue Number**.

### 5. Nurse Master View (Nurse) - **NEW**
1. Go to the **Nurse Dashboard**.
2. Click the **Show All Queues** button in the header.
3. Verify that you see a table with **ALL** patients, showing:
    - Queue Number
    - Patient Name
    - Doctor Name
    - Room Number
    - Status
    - Actions (Call, Arrived, Complete, Skip)
4. You can control any patient from this view.

### 6. Assign Room & Host (Nurse)
1. Select a doctor from the "Hosting Doctor" dropdown.
2. Assign a Room Number (e.g., "10").
3. Manage the queue for that specific doctor.

### 7. TV Filtering (TV)
1. Open `http://localhost:5173/tv?room=10`.
2. Verify that the queue for Room 10 is displayed.

## Verification Proof
![TV Display Calling](/Users/aungkhantmin/.gemini/antigravity/brain/e56ed508-cfab-4710-9b3e-d4899bda027a/tv_display_calling_1763701745072.png)

### Nurse Master View
![Nurse Master View](/Users/aungkhantmin/.gemini/antigravity/brain/e56ed508-cfab-4710-9b3e-d4899bda027a/nurse_master_view_1763736929803.png)

### 8. Queue Reordering (Nurse) - **NEW**
1. Go to the **Nurse Dashboard**.
2. Hover over a patient in the "Waiting" list.
3. Use the **Up (▲)** and **Down (▼)** arrows to change the patient's position.
4. Verify that the order updates immediately.

### 4. Dashboard Enhancements
1.  **Admin Live Queue**:
    -   Go to `http://localhost:5173/admin`.
    -   Click the "Live Queue" tab.
    -   Verify the table shows real-time patient status.
2.  **Nurse Master View**:
    -   Go to `http://localhost:5173/nurse`.
    -   Verify the "Master Queue List" is visible by default.
3.  **Late Patient Handling**:
    -   In the "Waiting" list, hover over a patient card.
    -   Click the "Late ➔" button.
    -   Verify the patient moves to the end of the list.

![Nurse Dashboard Late Button](nurse_after_late_click_1763738888325.png)

### Per-Doctor Queue Logic
1.  **Clear Database**: Run `node scripts/clear_queue.cjs` (optional, for clean start).
2.  **Register Patients**:
    *   Register "Patient A" -> Assign to **Dr. Smith**.
    *   Register "Patient B" -> Assign to **Dr. Jones**.
3.  **Verify Admin Panel**:
    *   Go to "Live Queue".
    *   Confirm two separate tables appear.
    *   Confirm **BOTH** patients have **Queue #1** (since they are first for their respective doctors).
4.  **Verify Nurse Dashboard**:
    *   Go to Nurse Dashboard.
    *   Confirm "Master Queue List" is grouped by Doctor.
    *   Confirm independent numbering (e.g., 1, 2, 3 for Dr. Smith; 1, 2 for Dr. Jones).

![Nurse Grouped Queues](nurse_grouped_queues_final_1763739481865.png)

### Queue Reordering Success
![Queue Reordering Success](/Users/aungkhantmin/.gemini/antigravity/brain/e56ed508-cfab-4710-9b3e-d4899bda027a/reorder_success_1763738283559.png)

### Room-Based Management
1.  **Assign Rooms**:
    *   Click "Manage Rooms" in the Nurse Dashboard header.
    *   Assign specific rooms to doctors (e.g., Dr. Smith -> Room 5).
2.  **Filter by Room**:
    *   Click the room number button (e.g., "5") in the filter bar.
    *   Verify that only queues for doctors in that room are displayed.
    *   Verify that the "Waiting" and "Active" lists also filter accordingly.

![Nurse Room Filter](/Users/aungkhantmin/.gemini/antigravity/brain/e56ed508-cfab-4710-9b3e-d4899bda027a/nurse_room_5_filter_1763739931112.png)

### Admin Workflow Overhaul
1.  **Quick Check-in**:
    *   Go to **Admin Panel**.
    *   Enter "Patient Name" and Select "Doctor".
    *   Click "Check In".
    *   Verify patient appears in "Today's Registrations".
2.  **Edit Registration**:
    *   Click "Edit" on a patient row.
    *   Change Name or Doctor.
    *   Click "Save Changes".
    *   Verify updates in the table.
3.  **Delete Registration**:
    *   Click "Delete" on a patient row.
    *   Confirm deletion.
    *   Verify patient is removed.

![Admin Registrations Table](/Users/aungkhantmin/.gemini/antigravity/brain/e56ed508-cfab-4710-9b3e-d4899bda027a/admin_registrations_table_1763741082977.png)

### Drag & Drop and TV Enhancements
1.  **Drag & Drop Reordering**:
    *   Go to **Nurse Dashboard**.
    *   Drag a patient in the "Waiting" list to a new position.
    *   Verify the order updates immediately.
    *   Use the "Up/Down" arrows or "Late" button for alternative reordering.
2.  **TV Multi-Room Support**:
    *   Open `http://localhost:5173/tv?rooms=1,2`.
    *   Verify the title shows "ROOMS 1, 2 QUEUE".
    *   Verify queues for both Room 1 and Room 2 are displayed.

![TV Multi-Room Display](/Users/aungkhantmin/.gemini/antigravity/brain/e56ed508-cfab-4710-9b3e-d4899bda027a/tv_multi_room_final_1763790089806.png)
