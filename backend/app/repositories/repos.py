"""
Domain Repositories for Hospital Entities
"""

from typing import List, Optional, Dict, Any
from .base import JsonRepository

class PatientRepository(JsonRepository):
    def __init__(self, file_path: str = "data/demo/patients.json"):
        super().__init__(file_path=file_path, id_field="id")

    def find_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        matches = self.filter(lambda p: p.get("token") == token)
        return matches[0] if matches else None

    def find_by_status(self, status: str) -> List[Dict[str, Any]]:
        return self.filter(lambda p: p.get("status") == status)


class DoctorRepository(JsonRepository):
    def __init__(self, file_path: str = "data/demo/doctors.json"):
        super().__init__(file_path=file_path, id_field="id")

    def find_by_department(self, department_id: str) -> List[Dict[str, Any]]:
        return self.filter(lambda d: d.get("department_id") == department_id)

    def find_available_doctors(self, department_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if department_id:
            return self.filter(lambda d: d.get("department_id") == department_id and d.get("status") in ["AVAILABLE", "BUSY"])
        return self.filter(lambda d: d.get("status") in ["AVAILABLE", "BUSY"])


class QueueRepository(JsonRepository):
    def __init__(self, file_path: str = "data/demo/queue.json"):
        super().__init__(file_path=file_path, id_field="id")

    def get_doctor_queue(self, doctor_id: str) -> List[Dict[str, Any]]:
        q = self.filter(lambda item: item.get("doctor_id") == doctor_id and item.get("status") == "WAITING")
        # Sort by acuity (1 is highest), then joined_at FIFO
        return sorted(q, key=lambda x: (x.get("acuity", 3), x.get("joined_at", "")))

    def get_active_queue(self) -> List[Dict[str, Any]]:
        return self.filter(lambda item: item.get("status") in ["WAITING", "IN_CONSULTATION"])

    def find_by_patient_id(self, patient_id: str) -> Optional[Dict[str, Any]]:
        matches = self.filter(lambda item: item.get("patient_id") == patient_id and item.get("status") in ["WAITING", "IN_CONSULTATION"])
        return matches[0] if matches else None

    def find_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        matches = self.filter(lambda item: item.get("token") == token and item.get("status") in ["WAITING", "IN_CONSULTATION"])
        return matches[0] if matches else None


class DepartmentRepository(JsonRepository):
    def __init__(self, file_path: str = "data/demo/departments.json"):
        super().__init__(file_path=file_path, id_field="id")


class ConsultationRepository(JsonRepository):
    def __init__(self, file_path: str = "data/demo/consultations.json"):
        super().__init__(file_path=file_path, id_field="id")

    def get_doctor_history(self, doctor_id: str) -> List[Dict[str, Any]]:
        return self.filter(lambda c: c.get("doctor_id") == doctor_id)


class PredictionRepository(JsonRepository):
    def __init__(self, file_path: str = "data/demo/predictions.json"):
        super().__init__(file_path=file_path, id_field="id")


class UserRepository(JsonRepository):
    def __init__(self, file_path: str = "data/demo/users.json"):
        super().__init__(file_path=file_path, id_field="id")

    def find_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        matches = self.filter(lambda u: u.get("username") == username)
        return matches[0] if matches else None


class ResourceRepository(JsonRepository):
    def __init__(self, file_path: str = "data/demo/resources.json"):
        super().__init__(file_path=file_path, id_field="id")

    def find_by_category(self, category: str) -> List[Dict[str, Any]]:
        return self.filter(lambda r: r.get("category") == category)


class FeedbackRepository(JsonRepository):
    def __init__(self, file_path: str = "data/demo/predictions_feedback.json"):
        super().__init__(file_path=file_path, id_field="id")

    def get_recent(self, limit: int = 50) -> List[Dict[str, Any]]:
        items = self.get_all()
        return items[-limit:]

