"""
DataStore Singleton
Provides a unified Data Access Layer for services.
"""

from typing import Dict, Any, List, Optional
from .repos import (
    PatientRepository,
    DoctorRepository,
    QueueRepository,
    DepartmentRepository,
    ConsultationRepository,
    PredictionRepository,
    UserRepository,
    ResourceRepository,
    FeedbackRepository
)

class DataStore:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DataStore, cls).__new__(cls)
            cls._instance._init_repositories()
        return cls._instance

    def _init_repositories(self):
        self.patients = PatientRepository()
        self.doctors = DoctorRepository()
        self.queue = QueueRepository()
        self.departments = DepartmentRepository()
        self.consultations = ConsultationRepository()
        self.predictions = PredictionRepository()
        self.users = UserRepository()
        self.resources = ResourceRepository()
        self.feedback = FeedbackRepository()

    def reset_to_initial_demo(self):
        """Reloads all JSON demo stores from disk or resets in-memory cache."""
        self._init_repositories()

# Global singleton
db = DataStore()
