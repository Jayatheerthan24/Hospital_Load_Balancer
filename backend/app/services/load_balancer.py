"""
Load Balancing Engine
Multi-factor intelligent doctor assignment and queue redistribution.
Balances patient urgency, doctor capacity, waiting time, and department specialty.
"""

from typing import Dict, Any, List, Optional
from ..repositories.data_store import db
from .ml_service import ml_service

class LoadBalancer:
    def __init__(self):
        self.weights = {
            "queue_penalty": 2.5,
            "wait_time_penalty": 1.5,
            "workload_penalty": 3.0,
            "availability_bonus": 50.0,
            "specialty_match_bonus": 40.0,
            "experience_bonus": 0.5
        }

    def score_doctor_for_patient(
        self,
        doctor: Dict[str, Any],
        patient_department_id: str,
        patient_priority: str,
        shock_index: float = 0.7
    ) -> Dict[str, Any]:
        """
        Calculates a multi-factor score for assigning a patient to a doctor.
        Higher score = Better recommendation.
        """
        doc_id = doctor["id"]
        doc_dept = doctor.get("department_id")
        doc_status = doctor.get("status", "AVAILABLE")
        max_cap = doctor.get("max_capacity", 15)
        base_consult = doctor.get("avg_consultation_time", 18)
        exp = doctor.get("experience_years", 5)

        # Department compatibility
        is_exact_dept = (doc_dept == patient_department_id)
        # Emergency physicians can accept General Medicine patients if General is saturated
        is_cross_compatible = (doc_dept == "DEP-EMG" and patient_department_id == "DEP-GEN") or \
                              (doc_dept == "DEP-GEN" and patient_department_id == "DEP-EMG" and patient_priority in ["MEDIUM", "LOW"])

        if not (is_exact_dept or is_cross_compatible):
            return {
                "doctor_id": doc_id,
                "doctor_name": doctor["name"],
                "department_name": doctor.get("department_name", ""),
                "specialty": doctor.get("specialty", ""),
                "status": doc_status,
                "is_compatible": False,
                "queue_length": 0,
                "workload_pct": 0.0,
                "predicted_wait_minutes": 999.0,
                "score": -999.0,
                "reason": "Incompatible department specialty."
            }

        # Offline or on-break doctors
        if doc_status in ["OFFLINE", "ON_BREAK"]:
            return {
                "doctor_id": doc_id,
                "doctor_name": doctor["name"],
                "department_name": doctor.get("department_name", ""),
                "specialty": doctor.get("specialty", ""),
                "status": doc_status,
                "is_compatible": True,
                "queue_length": len(db.queue.get_doctor_queue(doc_id)),
                "workload_pct": 0.0,
                "predicted_wait_minutes": 999.0,
                "score": -500.0,
                "reason": f"Doctor currently {doc_status.lower().replace('_', ' ')}."
            }

        # Current active queue for this doctor
        doc_queue = db.queue.get_doctor_queue(doc_id)
        queue_len = len(doc_queue)
        workload_pct = min(round((queue_len / max(max_cap, 1)) * 100, 1), 100.0)

        # ML Wait Time prediction
        wait_res = ml_service.predict_waiting_time(
            queue_length=queue_len,
            patients_ahead=queue_len,
            doctor_available=(doc_status == "AVAILABLE"),
            priority=patient_priority,
            base_consult_time=base_consult,
            doctor_workload_pct=workload_pct,
            shock_index=shock_index
        )
        predicted_wait = wait_res["estimated_waiting_time_minutes"]

        # Calculate Score
        score = 100.0
        
        # Availability bonus
        if doc_status == "AVAILABLE":
            score += self.weights["availability_bonus"]
        elif doc_status == "BUSY":
            score += 15.0

        # Specialty match bonus
        if is_exact_dept:
            score += self.weights["specialty_match_bonus"]
        else:
            score += 10.0  # Cross-compatible fallback

        # Penalties
        score -= (queue_len * self.weights["queue_penalty"])
        score -= (predicted_wait * self.weights["wait_time_penalty"])
        score -= ((workload_pct / 100.0) * self.weights["workload_penalty"] * 10)
        score += (exp * self.weights["experience_bonus"])

        # Construct human-readable reasoning
        reason_parts = []
        if is_exact_dept:
            reason_parts.append("Direct department match")
        else:
            reason_parts.append("Cross-department load-balance candidate")
            
        if queue_len == 0:
            reason_parts.append("zero queue delay")
        elif queue_len <= 3:
            reason_parts.append(f"low queue load ({queue_len} waiting)")
        else:
            reason_parts.append(f"moderate queue ({queue_len} waiting)")

        reason_parts.append(f"predicted wait ~{predicted_wait} min (load: {workload_pct}%)")
        reason_str = ", ".join(reason_parts) + "."

        return {
            "doctor_id": doc_id,
            "doctor_name": doctor["name"],
            "department_name": doctor.get("department_name", ""),
            "specialty": doctor.get("specialty", ""),
            "status": doc_status,
            "is_compatible": True,
            "queue_length": queue_len,
            "workload_pct": workload_pct,
            "predicted_wait_minutes": predicted_wait,
            "score": round(score, 2),
            "reason": reason_str
        }

    def recommend_doctor(
        self,
        department_id: str,
        priority: str,
        shock_index: float = 0.7
    ) -> Dict[str, Any]:
        """
        Evaluates all doctors and selects the optimal doctor with transparent rankings.
        """
        all_doctors = db.doctors.get_all()
        scored_candidates = []

        for doc in all_doctors:
            scored = self.score_doctor_for_patient(
                doctor=doc,
                patient_department_id=department_id,
                patient_priority=priority,
                shock_index=shock_index
            )
            if scored["score"] > -400:  # Exclude offline/incompatible
                scored_candidates.append(scored)

        # Sort by score descending
        scored_candidates.sort(key=lambda x: x["score"], reverse=True)

        if not scored_candidates:
            # Fallback to any doctor in department even if busy
            dept_docs = db.doctors.find_by_department(department_id)
            selected = dept_docs[0] if dept_docs else all_doctors[0]
            return {
                "selected_doctor_id": selected["id"],
                "selected_doctor_name": selected["name"],
                "department_id": selected.get("department_id"),
                "recommendation_reason": "Default department doctor assigned (no high-score candidates).",
                "all_scored_candidates": []
            }

        best = scored_candidates[0]
        
        # Highlight recommendation reason
        rec_reason = f"Optimal choice: {best['doctor_name']} ({best['department_name']}) with {best['queue_length']} in queue, {best['predicted_wait_minutes']} min predicted wait, and {best['workload_pct']}% capacity."

        return {
            "selected_doctor_id": best["doctor_id"],
            "selected_doctor_name": best["doctor_name"],
            "department_id": department_id,
            "predicted_wait_minutes": best["predicted_wait_minutes"],
            "recommendation_reason": rec_reason,
            "all_scored_candidates": scored_candidates
        }

    def simulate_rebalance(self) -> Dict[str, Any]:
        """
        Analyzes full hospital queue and rebalances patients from overloaded doctors to available doctors.
        Returns BEFORE vs AFTER snapshot for demonstration and emergency surge analysis.
        """
        doctors = db.doctors.get_all()
        all_waiting = db.queue.filter(lambda q: q.get("status") == "WAITING")

        before_state = []
        for d in doctors:
            d_q = [q for q in all_waiting if q.get("doctor_id") == d["id"]]
            wait_times = [q.get("estimated_wait_minutes", 10) for q in d_q]
            avg_wait = round(sum(wait_times) / max(len(wait_times), 1), 1) if wait_times else 0.0
            before_state.append({
                "doctor_id": d["id"],
                "doctor_name": d["name"],
                "department_id": d["department_id"],
                "queue_length": len(d_q),
                "workload_pct": min(round((len(d_q) / max(d["max_capacity"], 1)) * 100, 1), 100.0),
                "avg_wait_minutes": avg_wait,
                "status": d["status"]
            })

        # Identify congested doctors (queue > 5 and workload > 70%)
        reassigned_count = 0
        reassignments = []

        for d_info in before_state:
            if d_info["queue_length"] >= 4:
                # Find available peer doctors in same or cross-compatible department with lower queues
                peers = [
                    d for d in before_state 
                    if d["doctor_id"] != d_info["doctor_id"]
                    and (d["department_id"] == d_info["department_id"] or d["department_id"] in ["DEP-EMG", "DEP-GEN"])
                    and d["queue_length"] < (d_info["queue_length"] - 1)
                    and d["status"] in ["AVAILABLE", "BUSY"]
                ]
                
                if peers:
                    target_peer = min(peers, key=lambda x: x["queue_length"])
                    # Rebalance excess patients from queue
                    doc_patients = [q for q in all_waiting if q.get("doctor_id") == d_info["doctor_id"]]
                    excess = doc_patients[3:]
                    for p_entry in excess:
                        db.queue.update(p_entry["id"], {
                            "doctor_id": target_peer["doctor_id"],
                            "estimated_wait_minutes": max(target_peer["queue_length"] * 10, 4)
                        })
                        db.patients.update(p_entry["patient_id"], {
                            "assigned_doctor_id": target_peer["doctor_id"]
                        })
                        reassignments.append({
                            "token": p_entry["token"],
                            "patient_name": p_entry["patient_name"],
                            "from_doctor": d_info["doctor_name"],
                            "to_doctor": target_peer["doctor_name"],
                            "reason": "Queue load mitigation"
                        })
                        reassigned_count += 1
                        target_peer["queue_length"] += 1
                        d_info["queue_length"] -= 1

        # Calculate AFTER state
        after_waiting = db.queue.filter(lambda q: q.get("status") == "WAITING")
        after_state = []
        for d in doctors:
            d_q = [q for q in after_waiting if q.get("doctor_id") == d["id"]]
            wait_times = [q.get("estimated_wait_minutes", 10) for q in d_q]
            avg_wait = round(sum(wait_times) / max(len(wait_times), 1), 1) if wait_times else 0.0
            after_state.append({
                "doctor_id": d["id"],
                "doctor_name": d["name"],
                "department_id": d["department_id"],
                "queue_length": len(d_q),
                "workload_pct": min(round((len(d_q) / max(d["max_capacity"], 1)) * 100, 1), 100.0),
                "avg_wait_minutes": avg_wait,
                "status": d["status"]
            })

        return {
            "reassigned_count": reassigned_count,
            "reassignments": reassignments,
            "before_load_balancing": before_state,
            "after_load_balancing": after_state,
            "summary": f"Successfully rebalanced {reassigned_count} patients across active clinical teams."
        }

load_balancer = LoadBalancer()
