# Machine Learning Pipeline & Methodology

## Pipeline Overview

```
Raw MIMIC-IV-ED Data
        │
        ▼
Data Preprocessing & Vital Signs Sanitization
        │
        ▼
Clinical Feature Engineering (Shock Index, MAP, NEWS2)
        │
        ▼
Stratified Train/Test Split (75% / 25%)
        │
        ▼
Model Training & Evaluation
 ├── Model 1: Random Forest Classifier (Triage Acuity ESI 1-4)
 ├── Model 2: Gradient Boosting Regressor (Waiting Time in Minutes)
 └── Model 3: Random Forest Regressor (Arrival Volume Forecaster)
        │
        ▼
Joblib Model Serialization (`ml/models/*.joblib`)
        │
        ▼
Runtime REST API Inference Service (`ml_service.py`)
```

## Model 1: Emergency Triage Priority Prediction
- **Target**: ESI Acuity (1: Resuscitation, 2: High/Emergent, 3: Medium/Urgent, 4: Low/Less Urgent)
- **Algorithm**: `RandomForestClassifier(n_estimators=120, max_depth=6, class_weight='balanced')`
- **Features**: `temp_c`, `heartrate`, `resprate`, `o2sat`, `sbp`, `dbp`, `pain_score`, `shock_index`, `pulse_pressure`, `mean_arterial_pressure`, `vitals_risk_score`, `is_male`, `is_ambulance`, `high_risk_complaint`
- **Calculated Metrics**:
  - Accuracy: **46.15%** (Multi-class balanced)
  - Precision: **46.92%**
  - Recall: **46.15%**
  - F1-Score: **45.54%**
- **Medical Disclaimer**:
  > *"AI predictions are decision-support estimates and are not a medical diagnosis or substitute for clinical judgment."*

## Model 2: Queue Waiting-Time Estimation
- **Target**: Waiting time in minutes
- **Algorithm**: `GradientBoostingRegressor(n_estimators=140, max_depth=4, learning_rate=0.08)`
- **Features**: `queue_length`, `patients_ahead`, `doctor_availability`, `priority_numeric`, `base_consult_time`, `doctor_workload_pct`, `arrival_hour`, `shock_index`
- **Calculated Metrics**:
  - MAE: **8.44 minutes**
  - RMSE: **29.62 minutes**
  - $R^2$ Score: **0.8134**

## Model 3: Patient Arrival Volume Forecasting
- **Target**: Expected incoming arrivals over next 30-60 minutes
- **Algorithm**: `RandomForestRegressor(n_estimators=100, max_depth=6)`
- **Features**: `hour_of_day`, `day_of_week`, `is_weekend`, `prev_hour_arrivals`, `rolling_3hr_avg`, `current_active_queue`
- **Calculated Metrics**:
  - MAE: **3.23 patients/hour**
  - RMSE: **4.28**
  - $R^2$ Score: **0.8050**
