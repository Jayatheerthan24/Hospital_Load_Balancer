"""
Predictive AI & Future Operational State Routes
Endpoints for:
- Consultation Duration Estimation
- Multi-Department Inflow & Demand Forecasting
- Clinical Shared Resource Demand & Bottleneck Prediction
- Downstream Load & Order Cascades
- Queue Abandonment (LWBS) Walkout Risk
- Doctor Capacity Projections
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from ..services.ml_service import ml_service
from ..services.workload_service import workload_service
from ..services.capacity_service import capacity_service
from ..services.resource_service import resource_service
from ..services.downstream_service import downstream_service
from ..services.bottleneck_engine import bottleneck_engine

router = APIRouter(prefix="/api/predictive", tags=["Predictive Operations & Bottleneck Forecasting"])

class DurationPredictionRequest(BaseModel):
    acuity: int = Field(default=3, ge=1, le=5)
    vitals: Dict[str, Any] = Field(default_factory=dict)
    chief_complaint: str = "General examination"
    arrival_type: str = "WALK_IN"
    gender: str = "M"

class AbandonmentRiskRequest(BaseModel):
    acuity: int = Field(default=3, ge=1, le=5)
    wait_time_minutes: float = 25.0
    queue_length: int = 5
    hour: int = 14
    age: int = 45

@router.post("/duration")
def predict_consultation_duration(req: DurationPredictionRequest):
    """Estimates physician consultation duration in minutes based on clinical features."""
    return ml_service.predict_duration(
        acuity=req.acuity,
        vitals=req.vitals,
        chief_complaint=req.chief_complaint,
        arrival_type=req.arrival_type,
        gender=req.gender
    )

@router.get("/demand-forecast")
def get_department_demand_forecast(hour: int = 14, day_of_week: int = 2):
    """Forecasts multi-department incoming patient demand across next 30-120 minutes."""
    depts = ["DEP-EMG", "DEP-GEN", "DEP-CRD", "DEP-ORT", "DEP-PED"]
    return ml_service.predict_department_demand(
        hour_of_day=hour,
        day_of_week=day_of_week,
        departments=depts
    )

@router.post("/abandonment-risk")
def calculate_abandonment_risk(req: AbandonmentRiskRequest):
    """Calculates Left-Without-Being-Seen (LWBS) walkout probability for a waiting patient."""
    return ml_service.predict_abandonment_risk(
        acuity=req.acuity,
        wait_time_minutes=req.wait_time_minutes,
        queue_length=req.queue_length,
        hour=req.hour,
        age=req.age
    )

@router.get("/resources")
def get_resource_bottlenecks():
    """Returns clinical shared equipment status, utilization percentages, and bottleneck alerts."""
    return resource_service.predict_resource_bottlenecks()

@router.get("/downstream-propagation")
def get_downstream_propagation():
    """Projects downstream diagnostic, lab, imaging, and specialty consult demand cascading from active queues."""
    return downstream_service.calculate_downstream_propagation()

@router.get("/capacity-projections")
def get_capacity_projections():
    """Projects doctor available slots and remaining backlogs over next 30, 60, and 90 minutes."""
    return capacity_service.project_hospital_capacity()

@router.get("/workload-summary")
def get_hospital_workload_summary():
    """Aggregates time-weighted case-mix workload units across all hospital departments."""
    depts = ["DEP-EMG", "DEP-GEN", "DEP-CRD", "DEP-ORT", "DEP-PED"]
    summaries = [workload_service.get_department_workload_summary(d) for d in depts]
    return {
        "departments": summaries,
        "total_hospital_workload_minutes": round(sum(s["total_workload_minutes"] for s in summaries), 1)
    }

@router.get("/bottlenecks")
def get_predictive_bottlenecks():
    """Predictive Bottleneck Prevention Engine: Analyzes capacity vs forecasted demand and generates structured alerts and recommendations."""
    return bottleneck_engine.analyze_bottlenecks()

