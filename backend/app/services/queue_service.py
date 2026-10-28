"""
Queue Engine Service
Handles full patient lifecycle:
- Intake & Registration (Staff-entered priority is authoritative; ML triage is advisory decision-support)
- Multi-factor load-balanced doctor assignment
- Token generation and queue position management
- ML consultation duration and waiting-time estimation
- Consultation state transitions and continuous feedback telemetry
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import uuid
from ..repositories.data_store import db
from .ml_service import ml_service
from .load_balancer import load_balancer
from .feedback_service import feedback_service

class QueueService:
    _token_counters: Dict[str, int] = {}

    def _generate_token(self, department_id: str) -> str:
        dept = db.departments.get_by_id(department_id)
        code = dept.get("code", "MED") if dept else "MED"
        
        current_count = self._token_counters.get(code, 100) + 1
        self._token_counters[code] = current_count
        return f"{code}-{current_count}"

    def register_and_enqueue_patient(
        self,
        name: str,
        age: int,
        gender: str,
        department_id: str,
        chief_complaint: str,
        vitals: Dict[str, Any],
        arrival_type: str = "WALK_IN",
        staff_priority: Optional[str] = None,
        staff_acuity: Optional[int] = None,
        forced_doctor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Complete Patient Intake Workflow:
        Registration -> Authoritative Staff Priority / Advisory ML Triage -> Multi-Factor Load Balancing -> Token Generation -> Queue Insertion
        """
        now_str = datetime.now(timezone.utc).isoformat()
        patient_id = f"PAT-{uuid.uuid4().hex[:6].upper()}"

        # 1. Run ML Advisory Triage Prediction
        ml_triage = ml_service.predict_priority(
            vitals=vitals,
            age=age,
            gender=gender,
            chief_complaint=chief_complaint,
            arrival_type=arrival_type
        )

        # 2. Determine Authoritative Urgency: Staff selection is primary
        acuity_from_priority = {
            "RESUSCITATION": 1,
            "HIGH": 2,
            "MEDIUM": 3,
            "LOW": 4,
            "NON_URGENT": 5
        }
        
        if staff_priority and staff_priority.upper() in acuity_from_priority:
            final_priority = staff_priority.upper()
            final_acuity = staff_acuity if staff_acuity else acuity_from_priority[final_priority]
            priority_source = "STAFF_TRIAGE_AUTHORITATIVE"
        else:
            final_priority = ml_triage["priority"]
            final_acuity = ml_triage["predicted_acuity"]
            priority_source = "AI_DECISION_SUPPORT_DEFAULT"

        # 3. Predict Consultation Duration using ML
        duration_info = ml_service.predict_duration(
            acuity=final_acuity,
            vitals=vitals,
            chief_complaint=chief_complaint,
            arrival_type=arrival_type,
            gender=gender
        )
        est_duration = duration_info["estimated_duration_minutes"]

        # 4. Run Multi-Factor Load Balancer to select optimal doctor
        shock_index = ml_triage["clinical_indicators"]["shock_index"]
        if forced_doctor_id:
            assigned_doc = db.doctors.get_by_id(forced_doctor_id)
            assigned_doc_id = forced_doctor_id
            rec_reason = f"Manual direct assignment to {assigned_doc.get('name') if assigned_doc else 'doctor'}."
            all_scored = []
        else:
            lb_res = load_balancer.recommend_doctor(
                department_id=department_id,
                priority=final_priority,
                shock_index=shock_index
            )
            assigned_doc_id = lb_res["selected_doctor_id"]
            rec_reason = lb_res["recommendation_reason"]
            all_scored = lb_res.get("all_scored_candidates", [])

        # 5. Generate Token
        token = self._generate_token(department_id)

        # 6. Save Patient Record
        patient_record = {
            "id": patient_id,
            "token": token,
            "name": name,
            "age": age,
            "gender": gender.upper(),
            "department_id": department_id,
            "chief_complaint": chief_complaint,
            "vitals": vitals,
            "arrival_type": arrival_type,
            "arrival_time": now_str,
            "priority": final_priority,
            "acuity": final_acuity,
            "priority_source": priority_source,
            "ml_advisory_triage": ml_triage,
            "estimated_duration_minutes": est_duration,
            "assigned_doctor_id": assigned_doc_id,
            "status": "WAITING",
            "registration_time": now_str
        }
        db.patients.add(patient_record)

        # 7. Calculate queue position and ML waiting time
        existing_doc_queue = db.queue.get_doctor_queue(assigned_doc_id)
        doctor = db.doctors.get_by_id(assigned_doc_id) or {}
        
        patients_ahead = len(existing_doc_queue)
        position = patients_ahead + 1

        wait_res = ml_service.predict_waiting_time(
            queue_length=len(existing_doc_queue) + 1,
            patients_ahead=patients_ahead,
            doctor_available=(doctor.get("status") == "AVAILABLE"),
            priority=final_priority,
            base_consult_time=int(est_duration),
            doctor_workload_pct=min((len(existing_doc_queue) / max(doctor.get("max_capacity", 15), 1)) * 100, 100.0),
            shock_index=shock_index
        )
        est_wait = wait_res["estimated_waiting_time_minutes"]

        # 8. Insert Queue Entry
        queue_id = f"QUE-{uuid.uuid4().hex[:6].upper()}"
        queue_entry = {
            "id": queue_id,
            "token": token,
            "patient_id": patient_id,
            "patient_name": name,
            "department_id": department_id,
            "doctor_id": assigned_doc_id,
            "priority": final_priority,
            "acuity": final_acuity,
            "position": position,
            "patients_ahead": patients_ahead,
            "status": "WAITING",
            "joined_at": now_str,
            "estimated_wait_minutes": est_wait,
            "estimated_duration_minutes": est_duration
        }
        db.queue.add(queue_entry)

        # 9. Record prediction audit
        pred_id = f"PRED-{uuid.uuid4().hex[:6].upper()}"
        db.predictions.add({
            "id": pred_id,
            "timestamp": now_str,
            "patient_id": patient_id,
            "token": token,
            "model_type": "OPERATIONAL_INTAKE",
            "model_version": "v1.0.0",
            "input_features": vitals,
            "prediction": {
                "staff_authoritative_priority": final_priority,
                "advisory_acuity": ml_triage["predicted_acuity"],
                "estimated_duration_minutes": est_duration,
                "estimated_wait_minutes": est_wait
            }
        })

        # Recalculate downstream wait times for doctor queue
        self._recalculate_doctor_queue(assigned_doc_id)

        return {
            "patient": patient_record,
            "queue_entry": queue_entry,
            "ml_triage": ml_triage,
            "duration_info": duration_info,
            "load_balancing": {
                "assigned_doctor_id": assigned_doc_id,
                "assigned_doctor_name": doctor.get("name", "Assigned Doctor"),
                "recommendation_reason": rec_reason,
                "candidate_scores": all_scored
            }
        }

    def _recalculate_doctor_queue(self, doctor_id: str):
        """Updates positions and waiting time estimates for all waiting patients of a doctor."""
        queue_items = db.queue.get_doctor_queue(doctor_id)
        doctor = db.doctors.get_by_id(doctor_id) or {}
        is_avail = (doctor.get("status") == "AVAILABLE")
        base_consult = doctor.get("avg_consultation_time", 18)

        for idx, item in enumerate(queue_items):
            patients_ahead = idx
            pos = idx + 1
            wait_res = ml_service.predict_waiting_time(
                queue_length=len(queue_items),
                patients_ahead=patients_ahead,
                doctor_available=is_avail,
                priority=item.get("priority", "MEDIUM"),
                base_consult_time=base_consult,
                doctor_workload_pct=min((len(queue_items) / max(doctor.get("max_capacity", 15), 1)) * 100, 100.0)
            )
            db.queue.update(item["id"], {
                "position": pos,
                "patients_ahead": patients_ahead,
                "estimated_wait_minutes": wait_res["estimated_waiting_time_minutes"]
            })

    def start_consultation(self, doctor_id: str, queue_id: Optional[str] = None) -> Dict[str, Any]:
        """Marks a patient as IN_CONSULTATION and changes doctor status to BUSY."""
        now_str = datetime.now(timezone.utc).isoformat()
        
        if not queue_id:
            doc_queue = db.queue.get_doctor_queue(doctor_id)
            if not doc_queue:
                raise ValueError("No patients waiting in queue for this doctor.")
            target_entry = doc_queue[0]
        else:
            target_entry = db.queue.get_by_id(queue_id)
            if not target_entry:
                raise ValueError(f"Queue item {queue_id} not found.")

        # Update doctor
        db.doctors.update(doctor_id, {
            "status": "BUSY",
            "current_patient_token": target_entry["token"]
        })

        # Update queue entry
        updated_entry = db.queue.update(target_entry["id"], {
            "status": "IN_CONSULTATION",
            "consultation_started_at": now_str
        })

        # Update patient status
        db.patients.update(target_entry["patient_id"], {
            "status": "IN_CONSULTATION"
        })

        # Recalculate remaining queue
        self._recalculate_doctor_queue(doctor_id)

        return {
            "message": f"Consultation started for {target_entry['patient_name']} (Token: {target_entry['token']}).",
            "queue_entry": updated_entry
        }

    def complete_consultation(
        self,
        doctor_id: str,
        token: Optional[str] = None,
        outcome: str = "Discharged with treatment plan"
    ) -> Dict[str, Any]:
        """Completes active consultation, logs consultation record, logs continuous feedback, frees doctor, and advances queue."""
        now_str = datetime.now(timezone.utc).isoformat()
        doctor = db.doctors.get_by_id(doctor_id)
        if not doctor:
            raise ValueError(f"Doctor {doctor_id} not found.")

        current_token = token or doctor.get("current_patient_token")
        
        active_entries = db.queue.filter(
            lambda q: q.get("doctor_id") == doctor_id and (q.get("status") == "IN_CONSULTATION" or (current_token and q.get("token") == current_token))
        )
        
        if not active_entries:
            waiting_entries = db.queue.get_doctor_queue(doctor_id)
            if waiting_entries:
                active_entries = [waiting_entries[0]]

        entry = active_entries[0] if active_entries else None
        
        patient_id = entry.get("patient_id") if entry else "UNKNOWN"
        patient_name = entry.get("patient_name") if entry else "Patient"
        token_str = entry.get("token") if entry else (current_token or "MED-000")
        started_at = entry.get("consultation_started_at", now_str) if entry else now_str
        pred_duration = entry.get("estimated_duration_minutes", 18.0) if entry else 18.0

        # Compute actual duration
        try:
            start_dt = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
            now_dt = datetime.fromisoformat(now_str.replace("Z", "+00:00"))
            duration_mins = max(int((now_dt - start_dt).total_seconds() / 60), 14)
        except:
            duration_mins = doctor.get("avg_consultation_time", 18)

        # Log consultation record
        con_id = f"CON-{uuid.uuid4().hex[:6].upper()}"
        consultation_record = {
            "id": con_id,
            "token": token_str,
            "patient_id": patient_id,
            "patient_name": patient_name,
            "doctor_id": doctor_id,
            "doctor_name": doctor.get("name"),
            "department_id": doctor.get("department_id"),
            "started_at": started_at,
            "completed_at": now_str,
            "duration_minutes": duration_mins,
            "outcome": outcome,
            "status": "COMPLETED"
        }
        db.consultations.add(consultation_record)

        # Record continuous feedback telemetry
        feedback_service.record_feedback(
            metric_type="CONSULTATION_DURATION",
            token=token_str,
            predicted_value=pred_duration,
            actual_value=duration_mins,
            unit="minutes",
            department_id=doctor.get("department_id", "DEP-EMG"),
            doctor_id=doctor_id,
            context=f"Outcome: {outcome}"
        )

        # Update queue entry to COMPLETED
        if entry:
            db.queue.update(entry["id"], {
                "status": "COMPLETED",
                "completed_at": now_str
            })
            db.patients.update(entry["patient_id"], {
                "status": "COMPLETED"
            })

        # Set doctor to AVAILABLE
        db.doctors.update(doctor_id, {
            "status": "AVAILABLE",
            "current_patient_token": None
        })

        # Recalculate remaining queue
        self._recalculate_doctor_queue(doctor_id)

        return {
            "message": f"Consultation completed for Token {token_str}.",
            "consultation": consultation_record,
            "doctor_status": "AVAILABLE",
            "remaining_in_queue": len(db.queue.get_doctor_queue(doctor_id))
        }

    def set_doctor_status(self, doctor_id: str, status: str) -> Dict[str, Any]:
        """Toggles doctor availability (AVAILABLE, BUSY, ON_BREAK, OFFLINE)."""
        valid_statuses = ["AVAILABLE", "BUSY", "ON_BREAK", "OFFLINE"]
        if status not in valid_statuses:
            raise ValueError(f"Invalid doctor status: {status}")
        
        updated = db.doctors.update(doctor_id, {"status": status})
        self._recalculate_doctor_queue(doctor_id)
        return {"doctor": updated}

    def get_patient_tracker(self, query: str) -> Optional[Dict[str, Any]]:
        """Finds patient status, queue position, patients ahead, and wait time by Token or Patient ID."""
        patient = db.patients.find_by_token(query)
        if not patient:
            patient = db.patients.get_by_id(query)
        if not patient:
            return None

        doctor = db.doctors.get_by_id(patient.get("assigned_doctor_id", ""))
        dept = db.departments.get_by_id(patient.get("department_id", ""))
        
        queue_item = db.queue.find_by_token(patient.get("token", ""))
        
        position = queue_item.get("position", 1) if queue_item else 0
        patients_ahead = queue_item.get("patients_ahead", 0) if queue_item else 0
        est_wait = queue_item.get("estimated_wait_minutes", 0) if queue_item else 0

        return {
            "token": patient.get("token"),
            "patient_id": patient.get("id"),
            "patient_name": patient.get("name"),
            "department": dept.get("name") if dept else "General",
            "department_color": dept.get("color") if dept else "#3b82f6",
            "assigned_doctor": doctor.get("name") if doctor else "Pending",
            "doctor_room": doctor.get("room_number") if doctor else "TBD",
            "doctor_status": doctor.get("status") if doctor else "AVAILABLE",
            "priority": patient.get("priority", "MEDIUM"),
            "acuity": patient.get("acuity", 3),
            "priority_source": patient.get("priority_source", "STAFF_TRIAGE_AUTHORITATIVE"),
            "status": patient.get("status", "WAITING"),
            "position": position,
            "patients_ahead": patients_ahead,
            "estimated_wait_minutes": est_wait,
            "estimated_duration_minutes": patient.get("estimated_duration_minutes", 18.0),
            "registration_time": patient.get("registration_time"),
            "arrival_type": patient.get("arrival_type", "WALK_IN")
        }

queue_service = QueueService()
