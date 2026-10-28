"""
Doctor & Department Routes
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..repositories.data_store import db
from ..services.queue_service import queue_service

router = APIRouter(tags=["Doctors & Departments"])

class DoctorStatusUpdate(BaseModel):
    status: str

@router.get("/api/doctors")
def list_doctors(department_id: Optional[str] = None):
    if department_id:
        return db.doctors.find_by_department(department_id)
    return db.doctors.get_all()

@router.get("/api/doctors/{doctor_id}")
def get_doctor(doctor_id: str):
    doc = db.doctors.get_by_id(doctor_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found.")
    
    # Attach active queue
    doc_copy = doc.copy()
    doc_copy["queue"] = db.queue.get_doctor_queue(doctor_id)
    return doc_copy

@router.post("/api/doctors/{doctor_id}/status")
def update_doctor_status(doctor_id: str, req: DoctorStatusUpdate):
    try:
        return queue_service.set_doctor_status(doctor_id=doctor_id, status=req.status)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/api/departments")
def list_departments():
    return db.departments.get_all()

@router.get("/api/departments/{department_id}")
def get_department(department_id: str):
    d = db.departments.get_by_id(department_id)
    if not d:
        raise HTTPException(status_code=404, detail="Department not found.")
    return d
