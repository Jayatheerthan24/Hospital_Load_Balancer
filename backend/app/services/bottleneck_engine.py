"""
Predictive Bottleneck Prevention Engine
Calculates explicit capacity vs. demand bottlenecks across all departments.
Answers:
1. Which department is likely to experience a backlog?
2. What is driving the predicted workload?
3. Is expected demand approaching or exceeding estimated service capacity?
4. Which eligible operational change could improve the situation?
5. How would the alternative compare with the current policy?
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from ..repositories.data_store import db
from .ml_service import ml_service
from .workload_service import workload_service

class BottleneckEngine:
    # Explicit operational configuration and assumptions
    SERVICE_RATES = {
        "DEP-EMG": 3.0,  # ~20 min avg consult = 3.0 patients / doctor / hr
        "DEP-GEN": 3.5,  # ~17 min avg consult = 3.5 patients / doctor / hr
        "DEP-CRD": 2.5,  # ~24 min avg consult = 2.5 patients / doctor / hr
        "DEP-ORT": 3.0,  # ~20 min avg consult = 3.0 patients / doctor / hr
        "DEP-PED": 3.5   # ~17 min avg consult = 3.5 patients / doctor / hr
    }
    
    # Thresholds: ratio of total demand (current queue + 60m forecast) to hourly capacity
    THRESHOLD_APPROACHING = 0.90
    THRESHOLD_OVERLOADED = 1.25

    def analyze_bottlenecks(self) -> Dict[str, Any]:
        departments = db.departments.get_all()
        active_queue = db.queue.get_active_queue()
        doctors = db.doctors.get_all()
        
        # Get forecasted arrivals in the next hour
        now = datetime.now()
        demand_forecast = ml_service.predict_department_demand(
            hour_of_day=now.hour,
            day_of_week=now.weekday(),
            departments=[d["id"] for d in departments]
        )
        dept_forecasts = demand_forecast.get("departments", {})

        department_statuses = []
        critical_alerts = []
        actionable_recommendations = []

        for dept in departments:
            d_id = dept["id"]
            d_name = dept["name"]
            
            # 1. Current Queue Length
            dept_queue = [q for q in active_queue if q.get("department_id") == d_id]
            queue_len = len(dept_queue)
            
            # Acuity breakdown
            acuity_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            for q in dept_queue:
                ac = int(q.get("acuity", 3))
                acuity_counts[ac] = acuity_counts.get(ac, 0) + 1

            # 2. Staffing & Capacity
            dept_docs = [doc for doc in doctors if doc.get("department_id") == d_id and doc.get("status") != "OFF_DUTY"]
            active_doctor_count = max(1, len(dept_docs))
            rate_per_doc = self.SERVICE_RATES.get(d_id, 3.0)
            hourly_service_capacity = round(active_doctor_count * rate_per_doc, 1)
            
            # 3. Forecasted Incoming Demand
            forecast_info = dept_forecasts.get(d_id, {})
            forecasted_inflow_60m = float(forecast_info.get("predicted_hourly_inflow", 3.0))
            
            # 4. Total Expected Demand over Next 60 Minutes
            total_expected_demand_60m = round(queue_len + forecasted_inflow_60m, 1)
            
            # 5. Capacity Utilization Ratio
            utilization_ratio = round(total_expected_demand_60m / max(hourly_service_capacity, 1.0), 2)
            
            # Determine Status
            if utilization_ratio >= self.THRESHOLD_OVERLOADED or queue_len >= 8:
                status = "OVERLOADED"
                status_color = "red"
            elif utilization_ratio >= self.THRESHOLD_APPROACHING or queue_len >= 5:
                status = "APPROACHING_CAPACITY"
                status_color = "amber"
            else:
                status = "NORMAL"
                status_color = "green"

            # Primary driver
            if queue_len > forecasted_inflow_60m * 1.5:
                driver = f"Accumulated Queue Backlog ({queue_len} active waiting)"
            elif forecasted_inflow_60m > queue_len * 1.5:
                driver = f"Projected Arrival Surge ({forecasted_inflow_60m} pts/hr inflow)"
            else:
                driver = f"Combined Queue ({queue_len} pts) + Inflow ({forecasted_inflow_60m} pts/hr)"

            # Estimate wait time
            workload_summary = workload_service.get_department_workload_summary(d_id)
            total_workload_mins = workload_summary.get("total_workload_minutes", queue_len * 18.0)
            est_wait_minutes = round(total_workload_mins / max(active_doctor_count, 1), 1)

            dept_status = {
                "department_id": d_id,
                "department_name": d_name,
                "current_queue_length": queue_len,
                "acuity_breakdown": acuity_counts,
                "active_doctors": active_doctor_count,
                "hourly_capacity": hourly_service_capacity,
                "forecasted_inflow_60m": forecasted_inflow_60m,
                "total_expected_demand_60m": total_expected_demand_60m,
                "utilization_ratio": utilization_ratio,
                "capacity_status": status,
                "status_color": status_color,
                "primary_driver": driver,
                "estimated_avg_wait_minutes": est_wait_minutes
            }
            department_statuses.append(dept_status)

            # Trigger structured alert if not NORMAL
            if status in ["OVERLOADED", "APPROACHING_CAPACITY"]:
                alert = {
                    "department_id": d_id,
                    "department_name": d_name,
                    "severity": "CRITICAL" if status == "OVERLOADED" else "WARNING",
                    "status": status,
                    "trigger_reason": (
                        f"{d_name} demand ({total_expected_demand_60m} pts in next 60m) "
                        f"{'exceeds' if status == 'OVERLOADED' else 'is nearing'} "
                        f"service capacity ({hourly_service_capacity} pts/hr) with {active_doctor_count} physician(s)."
                    ),
                    "metrics": {
                        "queue_length": queue_len,
                        "hourly_capacity": hourly_service_capacity,
                        "forecasted_arrivals": forecasted_inflow_60m,
                        "utilization_ratio": utilization_ratio,
                        "time_horizon": "Next 60 minutes"
                    },
                    "potential_operational_response": (
                        f"Reallocate 1 float physician to {d_name} or activate fast-track low-acuity routing."
                        if acuity_counts[4] + acuity_counts[5] >= 2 else
                        f"Temporarily assign cross-coverage support to {d_name}."
                    ),
                    "requires_staff_review": True,
                    "clinical_safety_notice": "Operational alert for capacity optimization. Staff clinical triage priority is authoritative."
                }
                critical_alerts.append(alert)

        # Generate Cross-Department Balancing Recommendations
        # Find donor department (NORMAL with low utilization < 0.70 and > 1 doctor)
        donors = [d for d in department_statuses if d["capacity_status"] == "NORMAL" and d["active_doctors"] > 1 and d["utilization_ratio"] < 0.70]
        recipients = [d for d in department_statuses if d["capacity_status"] == "OVERLOADED"]
        
        if recipients and donors:
            donor = donors[0]
            recipient = recipients[0]
            actionable_recommendations.append({
                "id": f"REC-STAFF-SHIFT-{recipient['department_id']}",
                "type": "STAFF_CROSS_COVERAGE",
                "priority": "HIGH",
                "target_department": recipient["department_name"],
                "source_department": donor["department_name"],
                "title": f"Shift 1 Physician: {donor['department_name']} → {recipient['department_name']}",
                "reason": (
                    f"{recipient['department_name']} utilization is at {int(recipient['utilization_ratio']*100)}% "
                    f"with {recipient['current_queue_length']} patients waiting, while {donor['department_name']} "
                    f"has surplus capacity (utilization {int(donor['utilization_ratio']*100)}%)."
                ),
                "expected_impact": {
                    "recipient_capacity_increase": f"+{self.SERVICE_RATES.get(recipient['department_id'], 3.0)} pts/hr",
                    "expected_wait_reduction": f"~{round(recipient['estimated_avg_wait_minutes'] * 0.35, 1)} minutes",
                    "new_utilization_ratio": round(recipient["total_expected_demand_60m"] / (recipient["hourly_capacity"] + self.SERVICE_RATES.get(recipient['department_id'], 3.0)), 2)
                },
                "assumptions": "Assumes float/general clinical cross-coverage eligibility and non-critical patient mix.",
                "requires_staff_review": True
            })

        # Check for Fast-Track feasibility
        total_low_acuity = sum(d["acuity_breakdown"][4] + d["acuity_breakdown"][5] for d in department_statuses)
        if total_low_acuity >= 3:
            actionable_recommendations.append({
                "id": "REC-FAST-TRACK-INTAKE",
                "type": "FAST_TRACK_STREAM",
                "priority": "MEDIUM",
                "title": "Activate Rapid Treatment Lane for Low-Acuity Intake",
                "reason": f"{total_low_acuity} standard/non-urgent patients (ESI 4 & 5) are currently queuing across departments.",
                "expected_impact": {
                    "low_acuity_queue_clearance": f"{total_low_acuity} patients diverted to rapid turnaround stream",
                    "main_queue_decongestion": "Prevents minor complaints from delaying urgent physician intake"
                },
                "assumptions": "Valid only for ambulatory ESI 4 & 5 patients without red-flag vitals.",
                "requires_staff_review": True
            })

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "departments": department_statuses,
            "alerts": critical_alerts,
            "recommendations": actionable_recommendations,
            "summary": {
                "total_waiting": len(active_queue),
                "departments_overloaded": len([d for d in department_statuses if d["capacity_status"] == "OVERLOADED"]),
                "departments_approaching": len([d for d in department_statuses if d["capacity_status"] == "APPROACHING_CAPACITY"]),
                "departments_normal": len([d for d in department_statuses if d["capacity_status"] == "NORMAL"]),
            }
        }

bottleneck_engine = BottleneckEngine()
