"""
ML Prediction Service
Handles live inference for:
- Triage Acuity Decision-Support Advisory (Random Forest)
- Queue Waiting-Time Estimation (Gradient Boosting)
- Patient Arrival Forecasting (Random Forest)
- Consultation Duration Estimation (Gradient Boosting)
- Multi-Department Demand Forecasting (Random Forest)
- Queue Abandonment / LWBS Risk Prediction (Gradient Boosting)
- Operational Anomaly Detection

Adheres to medical safety guidelines: Staff triage priority is authoritative;
AI models provide operational forecasting, duration estimates, and capacity insights.
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
import joblib

MODELS_DIR = Path("ml/models")
METADATA_PATH = Path("ml/model_metadata.json")

PRIORITY_LABEL_MAP = {
    1: ("RESUSCITATION", "Critical immediate resuscitation required"),
    2: ("HIGH", "Emergent / High priority triage acuity"),
    3: ("MEDIUM", "Urgent / Medium priority triage acuity"),
    4: ("LOW", "Less urgent / Standard priority acuity"),
    5: ("NON_URGENT", "Non-urgent primary care acuity")
}

class MLService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MLService, cls).__new__(cls)
            cls._instance._load_models()
        return cls._instance

    def _load_models(self):
        self.priority_model_data = None
        self.wait_time_model_data = None
        self.arrival_model_data = None
        self.duration_model_data = None
        self.demand_model_data = None
        self.abandonment_model_data = None
        self.metadata = {}

        try:
            p_path = MODELS_DIR / "priority_model_v1.joblib"
            if p_path.exists():
                self.priority_model_data = joblib.load(p_path)

            w_path = MODELS_DIR / "wait_time_model_v1.joblib"
            if w_path.exists():
                self.wait_time_model_data = joblib.load(w_path)

            a_path = MODELS_DIR / "arrival_model_v1.joblib"
            if a_path.exists():
                self.arrival_model_data = joblib.load(a_path)

            d_path = MODELS_DIR / "duration_model.joblib"
            if d_path.exists():
                self.duration_model_data = joblib.load(d_path)

            dem_path = MODELS_DIR / "demand_model.joblib"
            if dem_path.exists():
                self.demand_model_data = joblib.load(dem_path)

            ab_path = MODELS_DIR / "abandonment_model.joblib"
            if ab_path.exists():
                self.abandonment_model_data = joblib.load(ab_path)

            if METADATA_PATH.exists():
                with open(METADATA_PATH, "r") as f:
                    self.metadata = json.load(f)
        except Exception as e:
            print(f"[MLService] Warning loading models: {e}")

    def get_metadata(self) -> Dict[str, Any]:
        if not self.metadata and METADATA_PATH.exists():
            with open(METADATA_PATH, "r") as f:
                self.metadata = json.load(f)
        return self.metadata

    def predict_priority(
        self,
        vitals: Dict[str, Any],
        age: int = 45,
        gender: str = "M",
        chief_complaint: str = "",
        arrival_type: str = "WALK_IN"
    ) -> Dict[str, Any]:
        """
        AI-assisted triage priority estimate advisory based on MIMIC-IV-ED trained Random Forest.
        """
        temp_c = float(vitals.get("temperature", 37.0))
        if temp_c > 50:
            temp_c = round((temp_c - 32) * 5 / 9, 1)

        hr = float(vitals.get("heart_rate", 80.0))
        rr = float(vitals.get("respiratory_rate", 18.0))
        spo2 = float(vitals.get("spo2", 98.0))
        sbp = float(vitals.get("systolic_bp", 120.0))
        dbp = float(vitals.get("diastolic_bp", 80.0))
        pain = float(vitals.get("pain_level", 0.0))

        shock_index = round(hr / max(sbp, 1.0), 3)
        pulse_pressure = round(sbp - dbp, 1)
        map_pressure = round((2 * dbp + sbp) / 3, 1)

        risk_score = 0
        if rr <= 8 or rr >= 25: risk_score += 3
        elif rr >= 21: risk_score += 2
        
        if spo2 <= 91: risk_score += 3
        elif spo2 <= 93: risk_score += 2
        elif spo2 <= 95: risk_score += 1

        if sbp <= 90 or sbp >= 220: risk_score += 3
        elif sbp <= 100: risk_score += 2
        elif sbp <= 110: risk_score += 1

        if hr <= 40 or hr >= 131: risk_score += 3
        elif hr >= 111 or hr <= 50: risk_score += 1

        if temp_c <= 35.0: risk_score += 3
        elif temp_c >= 39.1: risk_score += 2
        elif temp_c >= 38.1 or temp_c <= 36.0: risk_score += 1

        is_male = 1 if gender.upper() == "M" else 0
        is_ambulance = 1 if "AMBULANCE" in arrival_type.upper() else 0

        high_risk_terms = ['chest pain', 'dyspnea', 'shortness of breath', 'sob', 'altered', 'stroke', 'trauma', 'bleeding', 'syncope', 'seizure', 'severe pain']
        high_risk = 1 if any(t in chief_complaint.lower() for t in high_risk_terms) else 0

        features_vector = [
            temp_c, hr, rr, spo2, sbp, dbp, pain,
            shock_index, pulse_pressure, map_pressure,
            risk_score, is_male, is_ambulance, high_risk
        ]

        if self.priority_model_data and "model" in self.priority_model_data:
            model = self.priority_model_data["model"]
            features_names = self.priority_model_data.get("features", [])
            X_df = pd.DataFrame([features_vector], columns=features_names if features_names else None)
            pred_class = int(model.predict(X_df)[0])
            probas = model.predict_proba(X_df)[0]
            confidence = float(np.max(probas))
        else:
            if risk_score >= 5 or shock_index >= 1.0 or spo2 < 90:
                pred_class = 1
                confidence = 0.92
            elif risk_score >= 3 or shock_index >= 0.85 or pain >= 8 or high_risk == 1:
                pred_class = 2
                confidence = 0.85
            elif risk_score >= 1 or pain >= 4:
                pred_class = 3
                confidence = 0.80
            else:
                pred_class = 4
                confidence = 0.88

        priority_str, clinical_desc = PRIORITY_LABEL_MAP.get(pred_class, ("MEDIUM", "Standard urgency"))

        return {
            "predicted_acuity": pred_class,
            "priority": priority_str,
            "confidence": round(confidence, 2),
            "clinical_indicators": {
                "shock_index": shock_index,
                "pulse_pressure": pulse_pressure,
                "mean_arterial_pressure": map_pressure,
                "physiological_risk_score": risk_score,
                "is_high_risk_complaint": bool(high_risk)
            },
            "disclaimer": "AI-assisted triage priority estimate. Not a medical diagnosis or substitute for clinical judgment."
        }

    def predict_duration(
        self,
        acuity: int,
        vitals: Dict[str, Any],
        chief_complaint: str = "",
        arrival_type: str = "WALK_IN",
        gender: str = "M"
    ) -> Dict[str, Any]:
        """
        Estimates physician consultation duration in minutes using Gradient Boosting regressor.
        """
        temp_c = float(vitals.get("temperature", 37.0))
        if temp_c > 50: temp_c = round((temp_c - 32) * 5 / 9, 1)
        hr = float(vitals.get("heart_rate", 80.0))
        rr = float(vitals.get("respiratory_rate", 18.0))
        spo2 = float(vitals.get("spo2", 98.0))
        sbp = float(vitals.get("systolic_bp", 120.0))
        dbp = float(vitals.get("diastolic_bp", 80.0))
        pain = float(vitals.get("pain_level", 0.0))

        shock_index = round(hr / max(sbp, 1.0), 3)
        pulse_pressure = round(sbp - dbp, 1)
        map_pressure = round((2 * dbp + sbp) / 3, 1)

        risk_score = 0
        if rr <= 8 or rr >= 25: risk_score += 3
        elif rr >= 21: risk_score += 2
        if spo2 <= 91: risk_score += 3
        elif spo2 <= 95: risk_score += 1
        if sbp <= 90: risk_score += 3
        if hr >= 110: risk_score += 2
        if temp_c >= 38.5: risk_score += 1

        is_male = 1 if gender.upper() == "M" else 0
        is_ambulance = 1 if "AMBULANCE" in arrival_type.upper() else 0
        high_risk = 1 if any(t in chief_complaint.lower() for t in ['chest pain', 'dyspnea', 'sob', 'altered', 'stroke', 'trauma', 'bleeding', 'fracture']) else 0

        features = [
            acuity, temp_c, hr, rr, spo2, sbp, dbp, pain,
            shock_index, pulse_pressure, map_pressure,
            risk_score, is_male, is_ambulance, high_risk
        ]

        if self.duration_model_data and "model" in self.duration_model_data:
            model = self.duration_model_data["model"]
            feat_names = self.duration_model_data.get("features", [])
            X_df = pd.DataFrame([features], columns=feat_names if feat_names else None)
            pred_dur = float(model.predict(X_df)[0])
            pred_dur = max(round(pred_dur, 1), 8.0)
        else:
            base_dur = {1: 35.0, 2: 25.0, 3: 18.0, 4: 12.0, 5: 10.0}.get(acuity, 18.0)
            pred_dur = base_dur + (risk_score * 2.0) + (high_risk * 4.0)

        return {
            "estimated_duration_minutes": round(pred_dur, 1),
            "range_min": max(5, round(pred_dur - 3.5, 1)),
            "range_max": round(pred_dur + 5.0, 1),
            "complexity_level": "CRITICAL" if pred_dur >= 30 else ("HIGH" if pred_dur >= 22 else ("MEDIUM" if pred_dur >= 14 else "LOW"))
        }

    def predict_waiting_time(
        self,
        queue_length: int,
        patients_ahead: int,
        doctor_available: bool,
        priority: str,
        base_consult_time: int = 18,
        doctor_workload_pct: float = 50.0,
        arrival_hour: int = 14,
        shock_index: float = 0.7
    ) -> Dict[str, Any]:
        """
        Estimates wait time in minutes.
        """
        priority_numeric = {"RESUSCITATION": 1, "HIGH": 2, "MEDIUM": 3, "LOW": 4, "NON_URGENT": 4}.get(priority, 3)
        doc_avail_int = 1 if doctor_available else 0

        features_vector = [
            queue_length,
            patients_ahead,
            doc_avail_int,
            priority_numeric,
            base_consult_time,
            doctor_workload_pct,
            arrival_hour,
            shock_index
        ]

        if self.wait_time_model_data and "model" in self.wait_time_model_data:
            model = self.wait_time_model_data["model"]
            feat_names = self.wait_time_model_data.get("features", [])
            X_df = pd.DataFrame([features_vector], columns=feat_names if feat_names else None)
            pred_wait = float(model.predict(X_df)[0])
            pred_wait = max(round(pred_wait, 1), 2.0 if patients_ahead > 0 else 0.0)
        else:
            mult = {1: 0.1, 2: 0.4, 3: 0.8, 4: 1.0}.get(priority_numeric, 0.8)
            rate = 1.0 if doctor_available else 0.5
            pred_wait = round((patients_ahead * base_consult_time * mult) / rate, 1)

        return {
            "estimated_waiting_time_minutes": round(pred_wait, 1),
            "queue_length": queue_length,
            "patients_ahead": patients_ahead,
            "confidence_interval": [max(0, round(pred_wait - 3, 1)), round(pred_wait + 4, 1)],
            "note": "Estimated based on current queue density and triage acuity."
        }

    def predict_arrivals(
        self,
        hour_of_day: int,
        day_of_week: int,
        prev_hour_arrivals: float,
        rolling_3hr_avg: float,
        current_active_queue: int,
        prev_3hr_arrivals: Optional[float] = None,
        prev_6hr_arrivals: Optional[float] = None,
        rolling_6hr_avg: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Forecasts hospital-wide incoming arrivals in next 30-60 min.
        """
        is_weekend = 1 if day_of_week in [5, 6] else 0
        p3 = prev_3hr_arrivals if prev_3hr_arrivals is not None else prev_hour_arrivals
        p6 = prev_6hr_arrivals if prev_6hr_arrivals is not None else prev_hour_arrivals
        r6 = rolling_6hr_avg if rolling_6hr_avg is not None else rolling_3hr_avg

        feat_map = {
            'hour_of_day': hour_of_day,
            'day_of_week': day_of_week,
            'is_weekend': is_weekend,
            'prev_hour_arrivals': prev_hour_arrivals,
            'prev_3hr_arrivals': p3,
            'prev_6hr_arrivals': p6,
            'rolling_3hr_avg': rolling_3hr_avg,
            'rolling_6hr_avg': r6,
            'current_active_queue': current_active_queue
        }

        if self.arrival_model_data and "model" in self.arrival_model_data:
            model = self.arrival_model_data["model"]
            feat_names = self.arrival_model_data.get("features", [])
            if feat_names:
                features = [feat_map.get(col, 0.0) for col in feat_names]
                X_df = pd.DataFrame([features], columns=feat_names)
            else:
                features = list(feat_map.values())
                X_df = pd.DataFrame([features])
            pred_arrivals = float(model.predict(X_df)[0])
            pred_arrivals = max(round(pred_arrivals, 1), 1.0)
        else:
            diurnal_curve = [3, 2, 2, 2, 3, 5, 8, 12, 16, 18, 19, 17, 16, 15, 16, 17, 19, 20, 18, 15, 12, 9, 6, 4]
            pred_arrivals = float(diurnal_curve[hour_of_day % 24])

        return {
            "forecast_period": "Next 30-60 Minutes",
            "predicted_incoming_patients": round(pred_arrivals, 1),
            "expected_surge_risk": "HIGH" if pred_arrivals > 15 else ("MODERATE" if pred_arrivals > 9 else "LOW"),
            "hourly_trend": "Increasing" if pred_arrivals > rolling_3hr_avg else "Stable/Decreasing"
        }

    def predict_department_demand(
        self,
        hour_of_day: int,
        day_of_week: int,
        departments: List[str]
    ) -> Dict[str, Any]:
        """
        Multi-department forecast for next 1-2 hours.
        """
        is_weekend = 1 if day_of_week in [5, 6] else 0
        sin_hr = float(np.sin(2 * np.pi * hour_of_day / 24))
        cos_hr = float(np.cos(2 * np.pi * hour_of_day / 24))

        dept_list = ["DEP-EMG", "DEP-GEN", "DEP-CRD", "DEP-ORT", "DEP-PED"]
        results = {}
        total_demand = 0.0

        for d_id in departments:
            idx = dept_list.index(d_id) if d_id in dept_list else 0
            features = [hour_of_day, day_of_week, is_weekend, sin_hr, cos_hr, idx, 6.0, 6.0]

            if self.demand_model_data and "model" in self.demand_model_data:
                model = self.demand_model_data["model"]
                feat_names = self.demand_model_data.get("features", [])
                X_df = pd.DataFrame([features], columns=feat_names if feat_names else None)
                pred = float(model.predict(X_df)[0])
            else:
                base = {"DEP-EMG": 8.0, "DEP-GEN": 12.0, "DEP-CRD": 5.0, "DEP-ORT": 6.0, "DEP-PED": 7.0}.get(d_id, 6.0)
                pred = base

            val = max(1.0, round(pred, 1))
            results[d_id] = {
                "expected_hourly_inflow": val,
                "next_30m_inflow": round(val * 0.5, 1),
                "next_60m_inflow": val,
                "next_120m_inflow": round(val * 2.1, 1),
                "load_status": "CRITICAL" if val > 12 else ("HIGH" if val > 8 else "NORMAL")
            }
            total_demand += val

        return {
            "departments": results,
            "total_hospital_predicted_demand": round(total_demand, 1),
            "peak_department": max(results.items(), key=lambda x: x[1]["expected_hourly_inflow"])[0] if results else None
        }

    def predict_abandonment_risk(
        self,
        acuity: int,
        wait_time_minutes: float,
        queue_length: int,
        hour: int = 14,
        age: int = 45
    ) -> Dict[str, Any]:
        """
        Estimates the probability of a patient leaving the queue without being seen (LWBS).
        """
        wait_to_acuity = float(wait_time_minutes) / max(acuity, 1)
        features = [acuity, float(wait_time_minutes), queue_length, hour, age, wait_to_acuity]

        if self.abandonment_model_data and "model" in self.abandonment_model_data:
            model = self.abandonment_model_data["model"]
            feat_names = self.abandonment_model_data.get("features", [])
            X_df = pd.DataFrame([features], columns=feat_names if feat_names else None)
            prob = float(model.predict_proba(X_df)[0][1])
        else:
            # Mathematical sigmoid fallback
            base_p = 0.05 + (wait_time_minutes / 120.0) * 0.4 + ((5 - acuity) / 5.0) * 0.3
            prob = min(max(base_p, 0.02), 0.95)

        risk_tier = "CRITICAL" if prob >= 0.45 else ("HIGH" if prob >= 0.25 else ("MODERATE" if prob >= 0.12 else "LOW"))

        return {
            "abandonment_probability": round(prob, 3),
            "percentage": round(prob * 100, 1),
            "risk_tier": risk_tier,
            "warning": prob >= 0.30,
            "recommended_action": "Expedite triage or notify patient of anticipated queue progression" if prob >= 0.30 else "Normal queue progression"
        }

    def detect_anomalies(self, active_queue_count: int, avg_wait_time: float, doctor_busy_pct: float) -> List[Dict[str, Any]]:
        """
        Identifies hospital operational bottlenecks and surge anomalies.
        """
        anomalies = []
        if active_queue_count >= 15 and avg_wait_time >= 35.0:
            anomalies.append({
                "type": "CONGESTION_SPIKE",
                "severity": "CRITICAL",
                "message": f"High queue density ({active_queue_count} patients) with extended waiting time ({avg_wait_time} min).",
                "impact": "Elevated LWBS walkout risk and patient dissatisfaction."
            })
        if doctor_busy_pct >= 85.0 and active_queue_count >= 10:
            anomalies.append({
                "type": "CAPACITY_SATURATION",
                "severity": "HIGH",
                "message": f"Doctor utilization is {doctor_busy_pct:.1f}%, near saturation limit.",
                "impact": "Inability to absorb new incoming high-acuity arrivals without delays."
            })
        return anomalies

ml_service = MLService()
