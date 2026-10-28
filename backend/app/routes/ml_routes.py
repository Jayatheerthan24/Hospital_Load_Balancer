"""
ML Prediction Routes
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from ..services.ml_service import ml_service

router = APIRouter(prefix="/api/predict", tags=["ML Predictions"])

class VitalsInput(BaseModel):
    temperature: float = Field(37.0, description="Body temperature in Celsius or Fahrenheit")
    heart_rate: float = Field(80.0, description="Heart rate (BPM)")
    respiratory_rate: float = Field(18.0, description="Breathing rate (breaths/min)")
    spo2: float = Field(98.0, description="Oxygen Saturation (%)")
    systolic_bp: float = Field(120.0, description="Systolic Blood Pressure (mmHg)")
    diastolic_bp: float = Field(80.0, description="Diastolic Blood Pressure (mmHg)")
    pain_level: float = Field(0.0, description="Pain level (0 to 10)")

class PriorityPredictRequest(BaseModel):
    vitals: VitalsInput
    age: int = 45
    gender: str = "M"
    chief_complaint: str = ""
    arrival_type: str = "WALK_IN"

class WaitTimePredictRequest(BaseModel):
    queue_length: int = 5
    patients_ahead: int = 4
    doctor_available: bool = True
    priority: str = "MEDIUM"
    base_consult_time: int = 18
    doctor_workload_pct: float = 50.0
    arrival_hour: int = 14
    shock_index: float = 0.7

class ArrivalForecastRequest(BaseModel):
    hour_of_day: int = 14
    day_of_week: int = 2
    prev_hour_arrivals: float = 12.0
    rolling_3hr_avg: float = 11.0
    current_active_queue: int = 8

@router.post("/priority")
def predict_triage_priority(req: PriorityPredictRequest):
    return ml_service.predict_priority(
        vitals=req.vitals.model_dump(),
        age=req.age,
        gender=req.gender,
        chief_complaint=req.chief_complaint,
        arrival_type=req.arrival_type
    )

@router.post("/wait-time")
def predict_wait_time(req: WaitTimePredictRequest):
    return ml_service.predict_waiting_time(
        queue_length=req.queue_length,
        patients_ahead=req.patients_ahead,
        doctor_available=req.doctor_available,
        priority=req.priority,
        base_consult_time=req.base_consult_time,
        doctor_workload_pct=req.doctor_workload_pct,
        arrival_hour=req.arrival_hour,
        shock_index=req.shock_index
    )

@router.post("/arrivals")
def predict_arrivals(req: ArrivalForecastRequest):
    return ml_service.predict_arrivals(
        hour_of_day=req.hour_of_day,
        day_of_week=req.day_of_week,
        prev_hour_arrivals=req.prev_hour_arrivals,
        rolling_3hr_avg=req.rolling_3hr_avg,
        current_active_queue=req.current_active_queue
    )

@router.get("/metrics")
def get_ml_metrics():
    return ml_service.get_metadata()
