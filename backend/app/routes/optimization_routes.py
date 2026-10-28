"""
Optimization & What-If Simulation Routes
Endpoints for:
- What-If Scenario Simulations (Scenarios A, B, C, D)
- Proactive Explainable AI Recommendations
- 1-Click Optimization Enactment Handler
- Prediction vs Reality Continuous Learning Feedback
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from ..services.whatif_service import whatif_service
from ..services.optimization_service import optimization_service
from ..services.feedback_service import feedback_service

router = APIRouter(prefix="/api/optimization", tags=["What-If Simulation & Capacity Optimization"])

class FeedbackSubmission(BaseModel):
    metric_type: str
    token: str
    predicted_value: float
    actual_value: float
    unit: str = "minutes"
    department_id: str = "DEP-EMG"
    doctor_id: str = "DOC-101"
    context: str = ""

@router.get("/what-if")
def simulate_what_if_scenarios():
    """Simulates and compares Scenarios A (Status Quo), B (Doctor Shift), C (Fast-Track), and D (AI Dynamic Rebalance)."""
    return whatif_service.simulate_scenarios()

@router.get("/recommendations")
def get_proactive_recommendations():
    """Generates explainable capacity optimization actions with expected impact on wait time and workload balance."""
    return optimization_service.get_proactive_recommendations()

@router.post("/apply/{recommendation_id}")
def apply_optimization_recommendation(recommendation_id: str):
    """Executes a recommended load-balancing or resource action in the active system."""
    return optimization_service.apply_recommendation(recommendation_id)

@router.get("/feedback")
def get_continuous_learning_feedback():
    """Returns live prediction vs actual telemetry, live MAE error metrics, and feedback audit logs."""
    return feedback_service.get_feedback_metrics()

@router.post("/feedback")
def submit_feedback_record(feedback: FeedbackSubmission):
    """Logs an operational feedback record for telemetry evaluation."""
    return feedback_service.record_feedback(
        metric_type=feedback.metric_type,
        token=feedback.token,
        predicted_value=feedback.predicted_value,
        actual_value=feedback.actual_value,
        unit=feedback.unit,
        department_id=feedback.department_id,
        doctor_id=feedback.doctor_id,
        context=feedback.context
    )
