"""
Consolidated ML Training Pipeline
Executes priority classification, wait-time estimation, arrival forecasting,
consultation duration estimation, multi-department demand forecasting, and queue abandonment risk training.
Emits genuine computed metrics to ml/model_metadata.json.
"""

import json
from datetime import datetime
from pathlib import Path
from train_priority import train_priority_model
from train_wait_time import train_wait_time_model
from train_arrivals import train_arrival_model
from train_duration import train_duration_model
from train_demand import train_demand_model
from train_abandonment import train_abandonment_model

METADATA_PATH = Path("ml/model_metadata.json")

def train_all():
    print("=== Starting Complete Hospital AI ML Training Suite ===")
    
    print("\n[1/6] Training Patient Priority / Triage Advisory Model...")
    priority_metrics = train_priority_model()
    
    print("\n[2/6] Training Waiting-Time Estimation Model...")
    wait_time_metrics = train_wait_time_model()
    
    print("\n[3/6] Training Patient Arrival Forecasting Model...")
    arrival_metrics = train_arrival_model()

    print("\n[4/6] Training Consultation Duration Estimation Model...")
    duration_metrics = train_duration_model()

    print("\n[5/6] Training Multi-Department Demand Forecaster...")
    demand_metrics = train_demand_model()

    print("\n[6/6] Training Queue Abandonment (LWBS) Risk Model...")
    abandonment_metrics = train_abandonment_model()
    
    def extract_metrics(res):
        if isinstance(res, dict) and "metrics" in res and isinstance(res["metrics"], dict) and len(res["metrics"]) > 0:
            return res["metrics"]
        return res if isinstance(res, dict) else {}

    metadata = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "primary_dataset": "PhysioNet MIMIC-IV-ED Demo v2.2 + Hospital Operations Stream",
        "dataset_citation": "Johnson, A., Bulgarelli, L., Pollard, T., Celi, L. A., Mark, R., & Horng, S. (2023). MIMIC-IV-ED (version 2.2). PhysioNet.",
        "disclaimer": "AI predictions are decision-support estimates and are not a medical diagnosis or substitute for clinical judgment.",
        "models": {
            "triage_priority_classifier": {
                "name": "Triage Acuity Decision-Support Classifier",
                "version": "v1.1.0",
                "algorithm": "RandomForestClassifier(n_estimators=120, max_depth=6, class_weight='balanced')",
                "target": "Emergency Severity Index Acuity Advisory (ESI 1-4)",
                "artifact_file": "ml/models/priority_model_v1.joblib",
                "metrics": extract_metrics(priority_metrics)
            },
            "wait_time_regressor": {
                "name": "Queue Waiting-Time Estimator",
                "version": "v1.1.0",
                "algorithm": "GradientBoostingRegressor(n_estimators=140, max_depth=4, lr=0.08)",
                "target": "Estimated Waiting Time in Minutes",
                "artifact_file": "ml/models/wait_time_model_v1.joblib",
                "metrics": extract_metrics(wait_time_metrics)
            },
            "arrival_forecaster": {
                "name": "Patient Arrival Volume Forecaster",
                "version": "v1.1.0",
                "algorithm": "RandomForestRegressor(n_estimators=120, max_depth=6)",
                "target": "Predicted Incoming Patients Next 30-60 Minutes",
                "artifact_file": "ml/models/arrival_model_v1.joblib",
                "metrics": extract_metrics(arrival_metrics)
            },
            "consultation_duration_regressor": {
                "name": "Consultation Duration Predictor",
                "version": "v1.1.0",
                "algorithm": "GradientBoostingRegressor(n_estimators=120, max_depth=4, lr=0.08)",
                "target": "Predicted Physician Consultation Duration (Minutes)",
                "artifact_file": "ml/models/duration_model.joblib",
                "metrics": extract_metrics(duration_metrics)
            },
            "department_demand_forecaster": {
                "name": "Multi-Department Hourly Demand Forecaster",
                "version": "v1.1.0",
                "algorithm": "RandomForestRegressor(n_estimators=100, max_depth=8)",
                "target": "Predicted Department Inflow Rate (Patients/Hour)",
                "artifact_file": "ml/models/demand_model.joblib",
                "metrics": extract_metrics(demand_metrics)
            },
            "queue_abandonment_classifier": {
                "name": "Queue Abandonment (LWBS) Risk Model",
                "version": "v1.1.0",
                "algorithm": "GradientBoostingClassifier(n_estimators=100, max_depth=3)",
                "target": "Probability of Patient Leaving Without Being Seen",
                "artifact_file": "ml/models/abandonment_model.joblib",
                "metrics": extract_metrics(abandonment_metrics)
            }
        }
    }
    
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
        
    print(f"\nAll model metadata successfully exported to {METADATA_PATH}")
    print("=== Training Complete ===")

if __name__ == "__main__":
    train_all()
