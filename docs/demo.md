# Demonstration Script & Scenario Walkthrough

Follow this step-by-step walkthrough to demonstrate the full application (covering Requirement 31):

## 1. Launch Services

1. **Start FastAPI Backend & ML Engine**:
   ```bash
   python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Start Vite React Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   Open browser at `http://localhost:5173`.

---

## 2. Walkthrough Scenarios

### Step 1: Admin Operations Dashboard
- View live hospital KPIs: Total Today's Patients, Currently Waiting, Average Wait Time, High Priority Patients, Available Doctors, and Predicted Incoming Patients.
- Review the 5 Department Cards (Emergency, General Medicine, Cardiology, Orthopedics, Pediatrics) with dynamic load percentages.
- View live AI Operations Intelligence cards.

### Step 2: Patient Intake & AI Triage
1. Navigate to **"Patient Intake"** tab.
2. Enter patient details (e.g. *Arthur Dent*, Age 52, Male, General Medicine).
3. Enter abnormal vitals:
   - Heart Rate: `118`
   - Blood Pressure: `160 / 95`
   - Pain Level: `8 / 10`
   - Chief Complaint: *"Severe radiating chest tightness"*
4. Click **"Live AI Triage Preview"**:
   - Observe predicted acuity `ESI 2 (HIGH)` with ~89% confidence.
   - Review calculated clinical indices: Shock Index `0.74`, MAP `116.7 mmHg`, Pulse Pressure `65 mmHg`.
5. Click **"Enroll & Auto-Assign Queue"**:
   - System runs multi-factor load balancing, assigns optimal doctor (e.g. Dr. Sarah Mitchell), generates Token `EMG-107`, and computes wait time ~5 minutes.

### Step 3: Doctor Workstation & Consultation Flow
1. Navigate to **"Doctor Portal"**.
2. Select Dr. Sarah Mitchell from physician selector.
3. Observe patient waiting line.
4. Click **"Call Next Patient"**:
   - Doctor status transitions to `BUSY`.
   - Patient status transitions to `IN_CONSULTATION`.
5. Enter clinical outcome note (*"IV fluids given, discharged with prescription"*) and click **"Complete Consultation"**:
   - Doctor transitions back to `AVAILABLE`.
   - Next patient automatically advances and downstream wait times recalculate.

### Step 4: Patient Status Kiosk
1. Navigate to **"Patient Tracker"**.
2. Type or click any active token (e.g. `EMG-101`).
3. View real-time queue position `#1`, estimated wait time `~5 min`, assigned doctor room, and live status.

### Step 5: Simulation & Emergency Surge Demonstration
1. Navigate to **"Simulation & Surge"**.
2. Click **"+10 Patients"** or **"+25 Patients"**:
   - Watch real-time generation of patients across departments with immediate ML triage and doctor assignments.
3. Click **"Run Emergency Surge Scenario"**:
   - Configures baseline: Dr. A (4 patients), Dr. B (3 patients), Dr. C (5 patients).
   - Injects 20 emergency & trauma arrivals.
   - Detects queue congestion in Emergency & Cardiology.
   - Executes multi-factor queue redistribution to available peer physicians.
   - Displays side-by-side **BEFORE vs AFTER LOAD BALANCING** comparison tables with calculated wait time reductions.

### Step 6: ML Evaluation & True Benchmarks
1. Navigate to **"AI Models & Eval"**.
2. View genuine validation metrics trained on PhysioNet MIMIC-IV-ED:
   - Priority Model: Accuracy 46.15%, Precision 46.92%, Recall 46.15%, F1 45.54%.
   - Wait-Time Model: MAE 8.44 min, RMSE 29.62 min, $R^2$ 0.8134.
   - Arrival Forecaster: MAE 3.23 pts/hr, $R^2$ 0.8050.
