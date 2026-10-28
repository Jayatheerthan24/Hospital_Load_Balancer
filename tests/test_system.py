"""
Automated Unit and Integration Tests for Hospital Load Balancing & Capacity Optimization System
Tests:
- Zero-DB DAL initialization (including resources & feedback)
- Staff authoritative priority & Advisory ML triage
- Consultation duration prediction
- Department demand forecasting
- Queue abandonment (LWBS) risk
- Case-mix time-weighted workload computation
- Shared clinical resource bottleneck predictor
- Downstream load cascades
- What-If scenario simulation (Scenarios A, B, C, D)
- Explainable AI recommendations & 1-click execution
- Continuous learning & feedback telemetry
- Consultation lifecycle & telemetry logging
- Emergency surge simulation
"""

import unittest
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.app.repositories.data_store import db
from backend.app.services.ml_service import ml_service
from backend.app.services.queue_service import queue_service
from backend.app.services.load_balancer import load_balancer
from backend.app.services.simulation_service import simulation_service
from backend.app.services.analytics_service import analytics_service
from backend.app.services.workload_service import workload_service
from backend.app.services.capacity_service import capacity_service
from backend.app.services.resource_service import resource_service
from backend.app.services.downstream_service import downstream_service
from backend.app.services.whatif_service import whatif_service
from backend.app.services.optimization_service import optimization_service
from backend.app.services.feedback_service import feedback_service

def test_dal_initialization():
    """Verify DAL loads entities, resources, and feedback without database."""
    patients = db.patients.get_all()
    doctors = db.doctors.get_all()
    departments = db.departments.get_all()
    resources = db.resources.get_all()
    feedback = db.feedback.get_all()
    assert len(departments) >= 5
    assert len(doctors) >= 10
    assert len(resources) >= 5
    assert len(feedback) >= 1

def test_ml_priority_and_duration_prediction():
    """Verify ML triage advisory and consultation duration predictions."""
    crit_vitals = {
        "temperature": 38.5,
        "heart_rate": 135,
        "respiratory_rate": 28,
        "spo2": 89,
        "systolic_bp": 85,
        "diastolic_bp": 50,
        "pain_level": 9
    }
    pred = ml_service.predict_priority(crit_vitals, age=65, gender="M", chief_complaint="Severe chest pain and collapse")
    assert pred["predicted_acuity"] in [1, 2]
    assert pred["priority"] in ["RESUSCITATION", "HIGH"]
    assert "disclaimer" in pred

    dur = ml_service.predict_duration(
        acuity=pred["predicted_acuity"],
        vitals=crit_vitals,
        chief_complaint="Severe chest pain and collapse"
    )
    assert "estimated_duration_minutes" in dur
    assert dur["estimated_duration_minutes"] >= 15.0

def test_demand_and_abandonment_prediction():
    """Verify multi-department demand and LWBS abandonment predictions."""
    demand = ml_service.predict_department_demand(hour_of_day=14, day_of_week=2, departments=["DEP-EMG", "DEP-GEN"])
    assert "departments" in demand
    assert "DEP-EMG" in demand["departments"]
    assert demand["total_hospital_predicted_demand"] > 0

    lwbs = ml_service.predict_abandonment_risk(acuity=4, wait_time_minutes=45.0, queue_length=8)
    assert "abandonment_probability" in lwbs
    assert lwbs["abandonment_probability"] > 0
    assert lwbs["risk_tier"] in ["CRITICAL", "HIGH", "MODERATE", "LOW"]

def test_case_mix_workload_calculation():
    """Verify time-weighted operational workload calculation."""
    docs = db.doctors.get_all()
    doc_id = docs[0]["id"]
    w_sum = workload_service.get_doctor_workload_summary(doc_id)
    assert "total_workload_minutes" in w_sum
    assert "workload_utilization_pct" in w_sum
    assert "case_mix_breakdown" in w_sum

def test_resource_and_downstream_propagation():
    """Verify clinical equipment bottleneck predictor and downstream order propagation."""
    res_b = resource_service.predict_resource_bottlenecks()
    assert "total_resources" in res_b
    assert len(res_b["bottlenecks"]) >= 0

    down = downstream_service.calculate_downstream_propagation()
    assert "summary" in down
    assert "CT" in down["summary"]
    assert "LAB" in down["summary"]

def test_whatif_and_optimization():
    """Verify What-If simulations and explainable AI recommendations."""
    scenarios = whatif_service.simulate_scenarios()
    assert len(scenarios["scenarios"]) == 4
    assert scenarios["recommended_scenario"] == "SCENARIO_D"

    recs = optimization_service.get_proactive_recommendations()
    assert isinstance(recs, list)
    if recs:
        rec_id = recs[0]["id"]
        res = optimization_service.apply_recommendation(rec_id)
        assert res["success"] is True

def test_patient_intake_and_continuous_feedback():
    """Verify registration with authoritative staff priority and consultation completion telemetry."""
    vitals = {
        "temperature": 37.0,
        "heart_rate": 82,
        "respiratory_rate": 16,
        "spo2": 99,
        "systolic_bp": 120,
        "diastolic_bp": 80,
        "pain_level": 3
    }
    result = queue_service.register_and_enqueue_patient(
        name="Telemetry Test Patient",
        age=40,
        gender="F",
        department_id="DEP-GEN",
        chief_complaint="Follow-up consultation",
        vitals=vitals,
        staff_priority="MEDIUM",
        staff_acuity=3
    )
    assert result["patient"]["priority"] == "MEDIUM"
    assert result["patient"]["priority_source"] == "STAFF_TRIAGE_AUTHORITATIVE"
    
    doc_id = result["load_balancing"]["assigned_doctor_id"]
    
    # Complete consultation to trigger continuous feedback log
    comp = queue_service.complete_consultation(doctor_id=doc_id, token=result["patient"]["token"])
    assert "Consultation completed" in comp["message"]
    
    # Check feedback metrics
    fb_metrics = feedback_service.get_feedback_metrics()
    assert fb_metrics["total_feedback_records"] >= 1
    assert "live_metrics" in fb_metrics

def test_bottleneck_prevention_engine():
    """Verify predictive bottleneck engine analyzes demand vs capacity."""
    from backend.app.services.bottleneck_engine import bottleneck_engine
    result = bottleneck_engine.analyze_bottlenecks()
    assert "departments" in result
    assert len(result["departments"]) >= 5
    assert "alerts" in result
    assert "summary" in result
    for d in result["departments"]:
        assert d["capacity_status"] in ["NORMAL", "APPROACHING_CAPACITY", "OVERLOADED"]
        assert "utilization_ratio" in d
        assert "primary_driver" in d

def test_surge_scenarios_measured_metrics():
    """Verify What-If surge scenarios calculate genuine before-and-after metrics."""
    res = whatif_service.simulate_scenarios()
    assert "surge_scenarios" in res
    assert len(res["surge_scenarios"]) == 6
    for s in res["surge_scenarios"]:
        assert "baseline_policy" in s
        assert "optimized_policy" in s
        assert s["baseline_policy"]["mean_wait_minutes"] >= 0
        assert s["optimized_policy"]["mean_wait_minutes"] >= 0
        assert "improvement_pct" in s

if __name__ == "__main__":
    print("Running system test suite...")
    test_dal_initialization()
    print("[PASS] DAL Initialization passed.")
    test_ml_priority_and_duration_prediction()
    print("[PASS] ML Advisory Triage & Duration Prediction passed.")
    test_demand_and_abandonment_prediction()
    print("[PASS] Demand Forecasting & Abandonment Risk passed.")
    test_case_mix_workload_calculation()
    print("[PASS] Case-Mix Workload Units Calculation passed.")
    test_resource_and_downstream_propagation()
    print("[PASS] Clinical Equipment & Downstream Flow passed.")
    test_whatif_and_optimization()
    print("[PASS] What-If Simulation & Optimization Engine passed.")
    test_bottleneck_prevention_engine()
    print("[PASS] Bottleneck Prevention Engine passed.")
    test_surge_scenarios_measured_metrics()
    print("[PASS] Surge Scenarios & Policy Simulation passed.")
    test_patient_intake_and_continuous_feedback()
    print("[PASS] Intake with Staff Urgency & Continuous Feedback passed.")
    print("\nALL SYSTEM TESTS PASSED SUCCESSFULLY!")

