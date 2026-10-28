# REST API Specification

Base URL: `http://localhost:8000`

## Endpoints

### 1. Operations & Analytics
- `GET /api/dashboard` - Returns live hospital KPIs, department cards, AI insights, and arrival forecasts.
- `GET /api/analytics` - Returns chart telemetry (priority distributions, doctor workloads, hourly arrival trends).
- `GET /api/analytics/insights` - Returns active AI triage and bottleneck alerts.

### 2. Patient Intake & Tracking
- `GET /api/patients` - List registered patients (supports `?status=WAITING`).
- `GET /api/patients/{id}` - Retrieve patient by ID or Token.
- `POST /api/patients` - Register a patient with vital signs, run ML triage, and load-balance queue assignment.
- `GET /api/patients/track/{query}` - Public tracking kiosk endpoint returning live queue position, patients ahead, and estimated wait.

### 3. Queue & Consultation Lifecycle
- `GET /api/queue` - Full active queue entries.
- `GET /api/queue/doctor/{doctor_id}` - Waiting queue for a specific physician.
- `POST /api/queue/rebalance` - Algorithmic hospital-wide queue redistribution.
- `POST /api/consultations/start` - Move top patient into active consultation room.
- `POST /api/consultations/complete` - Complete consultation with clinical outcome notes and free workstation.

### 4. Doctors & Departments
- `GET /api/doctors` - Roster of all doctors (supports `?department_id=DEP-EMG`).
- `POST /api/doctors/{id}/status` - Toggle doctor status (`AVAILABLE`, `BUSY`, `ON_BREAK`, `OFFLINE`).
- `GET /api/departments` - List of hospital clinical departments.

### 5. AI & ML Predictions
- `POST /api/predict/priority` - Predicts ESI triage priority from vital signs and complaints.
- `POST /api/predict/wait-time` - Predicts waiting time in minutes based on queue physics and doctor state.
- `POST /api/predict/arrivals` - Forecasts incoming volume for the next 30-60 minutes.
- `GET /api/predict/metrics` - Returns genuine computed model validation metrics and feature importances.

### 6. Simulation & Surge Controller
- `POST /api/simulation/batch` - Generates 10, 25, or 50 patients.
- `POST /api/simulation/peak-hour` - Simulates sudden peak volume rush.
- `POST /api/simulation/surge` - Executes prescribed 20-patient Emergency Surge scenario with BEFORE vs AFTER comparison.
- `POST /api/simulation/reset` - Resets active queues to initial demo state.
