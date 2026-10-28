"""
Workload & Case-Mix Evaluation Service
Computes time-weighted operational workload units across doctors and departments.
Recognizes that patient volume != operational burden (Case-mix complexity).
"""

from typing import Dict, Any, List
from ..repositories.data_store import db
from .ml_service import ml_service

class WorkloadService:
    def calculate_patient_workload_units(self, patient: Dict[str, Any]) -> float:
        """
        Calculates time-weighted workload units (minutes of clinical effort required)
        based on staff priority, acuity, vitals, and chief complaint.
        """
        acuity = int(patient.get("acuity", 3))
        vitals = patient.get("vitals", {})
        chief_complaint = patient.get("chief_complaint", "")
        arrival_type = patient.get("arrival_type", "WALK_IN")
        
        # ML duration estimate
        duration_info = ml_service.predict_duration(
            acuity=acuity,
            vitals=vitals,
            chief_complaint=chief_complaint,
            arrival_type=arrival_type
        )
        return float(duration_info.get("estimated_duration_minutes", 20.0))

    def get_doctor_workload_summary(self, doctor_id: str) -> Dict[str, Any]:
        """
        Computes the doctor's current patient count, time-weighted workload units (minutes),
        and active case-mix breakdown.
        """
        queue_items = db.queue.get_doctor_queue(doctor_id)
        doctor = db.doctors.get_by_id(doctor_id) or {}
        
        total_workload_minutes = 0.0
        acuity_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        
        for item in queue_items:
            p_id = item.get("patient_id")
            patient = db.patients.get_by_id(p_id) or {}
            workload = self.calculate_patient_workload_units(patient)
            total_workload_minutes += workload
            ac = int(item.get("acuity", 3))
            acuity_counts[ac] = acuity_counts.get(ac, 0) + 1
            
        max_target_minutes = 120.0 # 2 hours buffer capacity
        utilization_pct = min(100.0, round((total_workload_minutes / max_target_minutes) * 100, 1))
        
        return {
            "doctor_id": doctor_id,
            "doctor_name": doctor.get("name", "Unknown"),
            "department_id": doctor.get("department_id"),
            "patient_count": len(queue_items),
            "total_workload_minutes": round(total_workload_minutes, 1),
            "workload_utilization_pct": utilization_pct,
            "case_mix_breakdown": acuity_counts,
            "status": "OVERLOADED" if utilization_pct > 85 else ("BALANCED" if utilization_pct > 30 else "UNDERUTILIZED")
        }

    def get_department_workload_summary(self, department_id: str) -> Dict[str, Any]:
        """
        Aggregates operational workload units across all physicians in a department.
        """
        doctors = db.doctors.find_by_department(department_id)
        dept = db.departments.get_by_id(department_id) or {}
        
        total_patients = 0
        total_workload_minutes = 0.0
        doc_summaries = []
        
        for doc in doctors:
            d_sum = self.get_doctor_workload_summary(doc["id"])
            total_patients += d_sum["patient_count"]
            total_workload_minutes += d_sum["total_workload_minutes"]
            doc_summaries.append(d_sum)
            
        total_capacity_minutes = len(doctors) * 120.0
        dept_utilization = round((total_workload_minutes / max(total_capacity_minutes, 1.0)) * 100, 1)
        
        return {
            "department_id": department_id,
            "department_name": dept.get("name", "Unknown"),
            "active_doctors_count": len(doctors),
            "total_waiting_patients": total_patients,
            "total_workload_minutes": round(total_workload_minutes, 1),
            "department_utilization_pct": min(100.0, dept_utilization),
            "doctors": doc_summaries,
            "congestion_level": "CRITICAL" if dept_utilization > 85 else ("ELEVATED" if dept_utilization > 60 else "NORMAL")
        }

workload_service = WorkloadService()
