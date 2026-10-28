# MediFlow AI: Predictive Hospital Load Balancing & Capacity Optimization System

A proactive hospital operations and clinical load balancing platform built on the **PhysioNet MIMIC-IV-ED Demo v2.2** dataset. Normal software logic manages authoritative triage intake, queues, and doctor workflows, while transparent AI/ML models specialize in future demand forecasting, consultation-duration estimation, case-mix workload balancing, bottleneck detection, and discrete-event surge simulation.

> [!IMPORTANT]
> **Zero-Database Architecture:** Runs out of the box with **no external database** (no PostgreSQL, MySQL, MongoDB, Supabase, or Prisma migrations). It uses a clean **Data Access Layer (DAL)** backed by thread-safe in-memory cache and persistent JSON stores in `data/demo/`.

---

## 1. System Navigation & Architecture

The application has a calm, clinical healthcare identity (warm white backgrounds, medical teal accents, and deep slate readability) structured across 9 core operational modules:

1. **Operations Overview**: Answers 4 core operational questions immediately: (1) How busy is the hospital? (2) Which department is approaching capacity? (3) What is likely to happen in the next hour? (4) What action should staff consider? Features Key Operational Indicators (Section A), Live Department Workload Table (Section B), Patient Arrival Demand Forecast (Section C), and Bottleneck Alerts (Section D).
2. **Patient Intake**: Authoritative clinician triage intake (ESI 1-5) paired with real-time non-binding AI physiological risk advisory (NEWS2, Shock Index, MAP) and physician encounter duration estimates.
3. **Live Queue**: Real-time queue table with Token ID, Department, Recorded priority, Arrival time, Waiting duration, Status, Predicted wait time, and permitted actions (`WAITING` $\rightarrow$ `IN_CONSULTATION` $\rightarrow$ `COMPLETED`). Includes Physician Swimlanes view and 1-click load rebalancing.
4. **Department Capacity**: Live physician availability, time-weighted case-mix workload units (minutes), and shared clinical equipment utilization (CT Scanner, Ultrasound, Stat Labs, ECG bays).
5. **Predictive Analytics**: Multi-department arrival inflow curves (next 30-120 min), downstream diagnostic order cascades, physician capacity horizons, and Left-Without-Being-Seen (LWBS) walkout risk modeling.
6. **Surge Simulation**: Evaluates 6 predefined operational conditions (Normal Demand, Moderate Surge +10, Large Surge +25, Severe Surge +50, Reduced Staff -1, Additional Staff +1) comparing Baseline Static FIFO vs. AI Dynamic Load Balancing using discrete-event queue simulation.
7. **Model Evaluation**: Transparent validation benchmarks, chronological splits, baseline model comparisons, confusion matrices, leakage checks, and documented dataset limitations.
8. **Audit History**: Governance audit trail tracking prediction creation, actual outcomes, model error telemetry, and clinician actions.
9. **Settings**: Configured operational assumptions, capacity thresholds (Normal <90%, Approaching 90-124%, Overloaded $\ge$125%), service-time baselines, and demo environment reset.

---

## 2. Machine Learning Model Catalog & Genuine Metrics

All models are trained with genuine computed validation metrics exported to `ml/model_metadata.json`:

| Model / Feature | Target | Algorithm | Validation Split | Baseline Metric | Model Metric | R² / F1 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Patient Arrival Forecaster** | Hourly Inflow (pts/hr) | Random Forest Regressor | Chronological (no shuffle, 80/20) | MAE: 3.04 pts/hr | **MAE: 3.31 pts/hr**, RMSE: 4.25 | $R^2 = 0.792$ |
| **2. Waiting-Time Regressor** | Wait Time in Queue (min) | Gradient Boosting Regressor | Random Split (80/20) | MAE: 12.24 min | **MAE: 5.33 min**, RMSE: 19.41 | $R^2 = 0.869$ |
| **3. Triage Acuity Classifier** | ESI Acuity Advisory (1-4) | Random Forest (Balanced) | Stratified (75/25) | Acc: 46.2% (Majority) | **Acc: 46.2%**, Rec: 46.2% | Weighted F1: 0.455 |
| **4. Consultation Duration** | Physician Duration (min) | Gradient Boosting Regressor | Random Split (80/20) | Mean baseline | **MAE: 3.09 min**, RMSE: 4.07 | $R^2 = 0.812$ |
| **5. Department Demand Forecaster** | Inflow Rate (pts/hr) | Random Forest Regressor | Diurnal Wave Split | Mean baseline | **MAE: 1.56 pts/hr**, RMSE: 1.98 | $R^2 = 0.773$ |
| **6. Queue Abandonment (LWBS)** | Walkout Probability (%) | Gradient Boosting Classifier | Stratified (80/20) | Majority baseline | **Accuracy: 77.5%**, ROC-AUC: 0.655 | F1: 0.246 |

### Real Data vs. Operational Assumptions
- **Real Data**: Downloaded from the official **PhysioNet MIMIC-IV-ED Demo v2.2** repository (`edstays.csv` and `triage.csv`, 222 patient records). Contains real emergency admissions, patient vital signs, chief complaints, ambulance transport flags, and emergency length of stay distributions.
- **Dataset Limitation**: The MIMIC-IV-ED demo does not provide explicit physician first-contact timestamps. Targets for wait-time regression and discrete-event simulation are derived using multi-server queuing theory (M/M/c) calibrated with patient triage acuity and physician availability.
- **Experimental Notice**: The triage acuity classifier is experimental decision-support only (F1 = 0.455 due to class imbalance and overlapping vitals across ESI 2 and 3). Staff-entered triage priority remains authoritative for patient care and routing.

---

## 3. Quick Start Guide

### 1. Prerequisites
- **Python 3.10+** (FastAPI, uvicorn, scikit-learn, pandas, numpy, joblib)
- **Node.js 18+** & **npm**

### 2. Run Master ML Training Suite
```bash
python ml/pipeline/train_all.py
```

### 3. Start Backend API Server
```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation (Swagger UI): `http://localhost:8000/docs`

### 4. Start Frontend Web Application
```bash
cd frontend
npm run dev
```
Open browser at `http://localhost:5173`.

### 5. Run Automated Verification Test Suite
```bash
python tests/test_system.py
```

---

## 4. Medical Safety & Clinical Governance Notice

> *"AI models provide operational forecasting, capacity optimization, and decision support. Clinical triage priority is authoritative and entered by authorized hospital staff. AI outputs do not constitute a medical diagnosis or substitute for professional clinical judgment."*
