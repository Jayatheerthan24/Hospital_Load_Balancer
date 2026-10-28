"""
Multi-Department Future Demand & Arrival Forecasting Model Training
Predicts expected arrival volume across hospital departments over next 30-120 minutes.
Uses diurnal wave decomposition, day-of-week seasonality, and recent rolling volume.
"""

import os
import json
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib

MODEL_DIR = Path("ml/models")

DEPARTMENTS = ["DEP-EMG", "DEP-GEN", "DEP-CRD", "DEP-ORT", "DEP-PED"]

def build_demand_training_data(n_hours: int = 1440): # 60 days of hourly data
    np.random.seed(42)
    records = []
    
    # Base diurnal arrival curves per department
    dept_weights = {
        "DEP-EMG": {"base": 8.0, "peak_hr": 14, "amp": 6.0},
        "DEP-GEN": {"base": 12.0, "peak_hr": 10, "amp": 9.0},
        "DEP-CRD": {"base": 5.0, "peak_hr": 11, "amp": 4.0},
        "DEP-ORT": {"base": 6.0, "peak_hr": 15, "amp": 5.0},
        "DEP-PED": {"base": 7.0, "peak_hr": 18, "amp": 6.5}
    }
    
    for h_idx in range(n_hours):
        hour = h_idx % 24
        day_of_week = (h_idx // 24) % 7
        is_weekend = 1 if day_of_week in [5, 6] else 0
        
        # Diurnal sin/cos
        sin_hr = np.sin(2 * np.pi * hour / 24)
        cos_hr = np.cos(2 * np.pi * hour / 24)
        
        for d_id in DEPARTMENTS:
            cfg = dept_weights[d_id]
            # Gaussian bell curve for diurnal peak
            hour_diff = np.abs(hour - cfg["peak_hr"])
            if hour_diff > 12:
                hour_diff = 24 - hour_diff
            diurnal_factor = np.exp(-(hour_diff**2) / (2 * (3.5**2)))
            
            weekend_multiplier = 0.75 if (is_weekend and d_id != "DEP-EMG") else (1.2 if is_weekend else 1.0)
            expected_arrivals = (cfg["base"] + cfg["amp"] * diurnal_factor) * weekend_multiplier
            
            # Simulated rolling arrival rate with some autoregression
            lag_1 = max(0.0, expected_arrivals + np.random.normal(0, 1.5))
            lag_2 = max(0.0, expected_arrivals + np.random.normal(0, 2.0))
            
            # Target next 60-minute arrivals
            actual_next_hour = max(0.0, expected_arrivals + np.random.normal(0, 1.8))
            
            dept_idx = DEPARTMENTS.index(d_id)
            records.append({
                "hour": hour,
                "day_of_week": day_of_week,
                "is_weekend": is_weekend,
                "sin_hr": sin_hr,
                "cos_hr": cos_hr,
                "dept_idx": dept_idx,
                "lag_1_arrivals": lag_1,
                "lag_2_arrivals": lag_2,
                "target_demand": round(actual_next_hour, 1)
            })
            
    return pd.DataFrame(records)

FEATURE_COLS = [
    "hour", "day_of_week", "is_weekend", "sin_hr", "cos_hr",
    "dept_idx", "lag_1_arrivals", "lag_2_arrivals"
]

def train_demand_model():
    print("--- Training Multi-Department Demand Forecasting Model ---")
    df = build_demand_training_data()
    
    X = df[FEATURE_COLS]
    y = df["target_demand"]
    
    split_idx = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    
    reg = RandomForestRegressor(
        n_estimators=100,
        max_depth=8,
        min_samples_leaf=4,
        random_state=42
    )
    reg.fit(X_train, y_train)
    
    y_pred = reg.predict(X_test)
    mae = float(mean_absolute_error(y_test, y_pred))
    mse = float(mean_squared_error(y_test, y_pred))
    rmse = float(np.sqrt(mse))
    r2 = float(r2_score(y_test, y_pred))
    
    print(f"Demand Model Metrics -> MAE: {mae:.2f} patients/hr | RMSE: {rmse:.2f} | R2: {r2:.4f}")
    
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model_artifact = {
        "model": reg,
        "features": FEATURE_COLS,
        "departments": DEPARTMENTS,
        "metrics": {"mae": mae, "rmse": rmse, "r2": r2, "sample_count": len(df)},
        "version": "1.0.0"
    }
    
    model_path = MODEL_DIR / "demand_model.joblib"
    joblib.dump(model_artifact, model_path)
    print(f"Saved demand model to: {model_path}")
    
    return {
        "name": "Multi-Department Demand Forecaster",
        "algorithm": "Random Forest Regressor",
        "target": "Hourly Demand per Dept (Patients/hr)",
        "features": FEATURE_COLS,
        "metrics": {"mae": mae, "rmse": rmse, "r2": r2},
        "artifact_path": str(model_path)
    }

if __name__ == "__main__":
    train_demand_model()
