"""
Downstream Flow & Load Propagation Service
Projects downstream clinical orders (Labs, CT, Ultrasound, X-Ray, Specialty Consults)
generated from upstream patient intake across hospital departments.
"""

from typing import Dict, Any, List
from ..repositories.data_store import db

class DownstreamService:
    def calculate_downstream_propagation(self) -> Dict[str, Any]:
        """
        Projects downstream order volume based on active department queues and historical clinical branching rates.
        """
        departments = db.departments.get_all()
        projected_orders = {
            "CT": {"name": "CT Scans", "projected_orders_next_60m": 0.0, "sources": {}},
            "US": {"name": "Ultrasounds", "projected_orders_next_60m": 0.0, "sources": {}},
            "XR": {"name": "X-Ray Studies", "projected_orders_next_60m": 0.0, "sources": {}},
            "LAB": {"name": "Stat Lab Orders", "projected_orders_next_60m": 0.0, "sources": {}},
            "ECG": {"name": "12-Lead ECGs", "projected_orders_next_60m": 0.0, "sources": {}},
            "PROC": {"name": "Minor Procedures", "projected_orders_next_60m": 0.0, "sources": {}}
        }
        
        dept_breakdowns = []
        
        for dept in departments:
            d_id = dept["id"]
            d_name = dept["name"]
            probabilities = dept.get("downstream_probabilities", {})
            
            # Active waiting + in consult in this dept
            active_items = db.queue.filter(lambda q: q.get("department_id") == d_id and q.get("status") in ["WAITING", "IN_CONSULTATION"])
            patient_count = len(active_items)
            
            dept_orders = {}
            for code, prob in probabilities.items():
                if code in projected_orders:
                    exp_orders = round(patient_count * prob, 1)
                    dept_orders[code] = exp_orders
                    projected_orders[code]["projected_orders_next_60m"] += exp_orders
                    projected_orders[code]["sources"][d_name] = exp_orders
                    
            dept_breakdowns.append({
                "department_id": d_id,
                "department_name": d_name,
                "active_patients": patient_count,
                "projected_orders": dept_orders
            })
            
        # Round totals
        for code in projected_orders:
            projected_orders[code]["projected_orders_next_60m"] = round(projected_orders[code]["projected_orders_next_60m"], 1)
            
        return {
            "summary": projected_orders,
            "department_breakdowns": dept_breakdowns,
            "highest_downstream_pressure": max(projected_orders.items(), key=lambda x: x[1]["projected_orders_next_60m"])[0] if projected_orders else None
        }

downstream_service = DownstreamService()
