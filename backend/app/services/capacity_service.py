"""
Doctor Capacity Projection Service
Projects doctor available consultation capacity and slot readiness over next 30, 60, and 90 minutes.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List
from ..repositories.data_store import db
from .workload_service import workload_service

class CapacityService:
    def project_doctor_capacity(self, doctor_id: str) -> Dict[str, Any]:
        """
        Projects doctor throughput and slot availability over next 30, 60, 90 mins.
        """
        doctor = db.doctors.get_by_id(doctor_id) or {}
        queue_items = db.queue.get_doctor_queue(doctor_id)
        doc_workload = workload_service.get_doctor_workload_summary(doctor_id)
        
        # Currently in consultation check
        active_consult = db.consultations.filter(lambda c: c.get("doctor_id") == doctor_id and c.get("status") == "IN_PROGRESS")
        current_consult_remaining = 10.0 if active_consult else 0.0
        
        workload_minutes = doc_workload["total_workload_minutes"] + current_consult_remaining
        
        # In 30 mins, how much workload is processed?
        workload_30m = max(0.0, workload_minutes - 30.0)
        free_capacity_30m = max(0.0, 30.0 - workload_minutes)
        slots_30m = int(free_capacity_30m // 15.0)
        
        # In 60 mins
        workload_60m = max(0.0, workload_minutes - 60.0)
        free_capacity_60m = max(0.0, 60.0 - workload_minutes)
        slots_60m = int(free_capacity_60m // 15.0)
        
        # In 90 mins
        free_capacity_90m = max(0.0, 90.0 - workload_minutes)
        slots_90m = int(free_capacity_90m // 15.0)
        
        return {
            "doctor_id": doctor_id,
            "doctor_name": doctor.get("name", "Unknown"),
            "department_id": doctor.get("department_id"),
            "current_status": doctor.get("status", "AVAILABLE"),
            "current_queue_length": len(queue_items),
            "current_backlog_minutes": round(workload_minutes, 1),
            "projections": {
                "in_30_mins": {
                    "remaining_backlog_minutes": round(workload_30m, 1),
                    "free_capacity_minutes": round(free_capacity_30m, 1),
                    "available_slots": slots_30m,
                    "status": "CONGESTED" if workload_30m > 15 else "READY"
                },
                "in_60_mins": {
                    "remaining_backlog_minutes": round(workload_60m, 1),
                    "free_capacity_minutes": round(free_capacity_60m, 1),
                    "available_slots": slots_60m,
                    "status": "CONGESTED" if workload_60m > 15 else "READY"
                },
                "in_90_mins": {
                    "free_capacity_minutes": round(free_capacity_90m, 1),
                    "available_slots": slots_90m
                }
            }
        }

    def project_hospital_capacity(self) -> Dict[str, Any]:
        """
        Aggregates capacity projections across all hospital departments.
        """
        all_doctors = db.doctors.get_all()
        dept_projections = {}
        
        for doc in all_doctors:
            d_id = doc.get("department_id")
            if d_id not in dept_projections:
                dept_projections[d_id] = {
                    "department_id": d_id,
                    "active_doctors": 0,
                    "total_current_backlog_minutes": 0.0,
                    "free_slots_30m": 0,
                    "free_slots_60m": 0,
                    "doctors": []
                }
            
            proj = self.project_doctor_capacity(doc["id"])
            dept_projections[d_id]["active_doctors"] += 1
            dept_projections[d_id]["total_current_backlog_minutes"] += proj["current_backlog_minutes"]
            dept_projections[d_id]["free_slots_30m"] += proj["projections"]["in_30_mins"]["available_slots"]
            dept_projections[d_id]["free_slots_60m"] += proj["projections"]["in_60_mins"]["available_slots"]
            dept_projections[d_id]["doctors"].append(proj)
            
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "department_projections": dept_projections,
            "overall_readiness": "HEALTHY" if sum(d["free_slots_60m"] for d in dept_projections.values()) > 5 else "CONSTRAINED"
        }

capacity_service = CapacityService()
