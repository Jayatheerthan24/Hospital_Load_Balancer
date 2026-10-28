"""
Simulation Routes
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from ..services.simulation_service import simulation_service
from ..repositories.data_store import db

router = APIRouter(prefix="/api/simulation", tags=["Simulation"])

class BatchSimRequest(BaseModel):
    count: int = 10

@router.post("/batch")
def generate_batch(req: BatchSimRequest):
    return simulation_service.generate_batch_patients(count=min(max(req.count, 1), 100))

@router.post("/peak-hour")
def simulate_peak_hour():
    return simulation_service.simulate_peak_hour()

@router.post("/surge")
def simulate_surge():
    return simulation_service.simulate_emergency_surge()

@router.post("/reset")
def reset_simulation():
    db.reset_to_initial_demo()
    return {"message": "Hospital state and demo queues successfully reset."}
