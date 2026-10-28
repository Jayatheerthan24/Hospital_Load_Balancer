"""
Queue & Consultation Routes
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from ..repositories.data_store import db
from ..services.queue_service import queue_service
from ..services.load_balancer import load_balancer

router = APIRouter(tags=["Queue Operations"])

class StartConsultationRequest(BaseModel):
    doctor_id: str
    queue_id: Optional[str] = None

class CompleteConsultationRequest(BaseModel):
    doctor_id: str
    token: Optional[str] = None
    outcome: str = "Discharged with treatment plan"

class UpdateDoctorStatusRequest(BaseModel):
    doctor_id: str
    status: str

@router.get("/api/queue")
def get_full_queue():
    return db.queue.get_all()

@router.get("/api/queue/status")
def get_active_queue_status():
    return db.queue.get_active_queue()

@router.get("/api/queue/doctor/{doctor_id}")
def get_doctor_queue(doctor_id: str):
    return db.queue.get_doctor_queue(doctor_id)

@router.post("/api/queue/rebalance")
def rebalance_queue():
    return load_balancer.simulate_rebalance()

@router.post("/api/consultations/start")
def start_consultation(req: StartConsultationRequest):
    try:
        return queue_service.start_consultation(doctor_id=req.doctor_id, queue_id=req.queue_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/api/consultations/complete")
def complete_consultation(req: CompleteConsultationRequest):
    try:
        return queue_service.complete_consultation(
            doctor_id=req.doctor_id,
            token=req.token,
            outcome=req.outcome
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/api/consultations")
def list_consultations():
    return db.consultations.get_all()
