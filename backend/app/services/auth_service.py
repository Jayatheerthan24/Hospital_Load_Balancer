"""
Authentication Service
Abstract demo authentication supporting role-based access control (ADMIN, DOCTOR, STAFF, PATIENT).
Backed by clean repository abstraction to allow seamless DB replacement.
"""

from typing import Dict, Any, Optional
import uuid
from ..repositories.data_store import db

class AuthService:
    def authenticate(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        user = db.users.find_by_username(username)
        if not user:
            return None
            
        # Demo password check
        if user.get("password_hash") != password and password != "demo123":
            return None

        # Return session token
        token = f"demo-token-{uuid.uuid4().hex[:12]}"
        return {
            "token": token,
            "user": {
                "id": user.get("id"),
                "username": user.get("username"),
                "name": user.get("name"),
                "role": user.get("role"),
                "doctor_id": user.get("doctor_id"),
                "email": user.get("email")
            }
        }

    def get_demo_users(self):
        users = db.users.get_all()
        return [
            {
                "username": u["username"],
                "role": u["role"],
                "name": u["name"],
                "doctor_id": u.get("doctor_id")
            }
            for u in users
        ]

auth_service = AuthService()
