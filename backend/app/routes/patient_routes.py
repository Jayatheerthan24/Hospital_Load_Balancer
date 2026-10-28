"""
Patient Routes
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from ..repositories.data_store import db
from ..services.queue_service import queue_service

router = APIRouter(prefix="/api/patients", tags=["Patients"])

class VitalsModel(BaseModel):
    temperature: float = 37.0
    heart_rate: float = 80.0
    respiratory_rate: float = 18.0
    spo2: float = 98.0
    systolic_bp: float = 120.0
    diastolic_bp: float = 80.0
    pain_level: float = 0.0

class PatientRegisterRequest(BaseModel):
    name: str
    age: int
    gender: str
    department_id: str
    chief_complaint: str
    vitals: VitalsModel
    arrival_type: str = "WALK_IN"
    staff_priority: Optional[str] = None  # Authoritative staff triage
    staff_acuity: Optional[int] = None
    forced_doctor_id: Optional[str] = None

@router.get("")
def list_patients(status: Optional[str] = None):
    if status:
        return db.patients.find_by_status(status)
    return db.patients.get_all()

@router.get("/{patient_id}")
def get_patient(patient_id: str):
    p = db.patients.get_by_id(patient_id)
    if not p:
        # Check by token
        p = db.patients.find_by_token(patient_id)
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found.")
    return p

@router.post("")
def register_patient(req: PatientRegisterRequest):
    return queue_service.register_and_enqueue_patient(
        name=req.name,
        age=req.age,
        gender=req.gender,
        department_id=req.department_id,
        chief_complaint=req.chief_complaint,
        vitals=req.vitals.model_dump(),
        arrival_type=req.arrival_type,
        staff_priority=req.staff_priority,
        staff_acuity=req.staff_acuity,
        forced_doctor_id=req.forced_doctor_id
    )

@router.get("/track/{query}")
def track_patient(query: str):
    tracker = queue_service.get_patient_tracker(query)
    if not tracker:
        raise HTTPException(status_code=404, detail="Patient or token not found.")
    return tracker
