"""
Authentication Routes
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from ..services.auth_service import auth_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(req: LoginRequest):
    result = auth_service.authenticate(req.username, req.password)
    if not result:
        raise HTTPException(status_code=401, detail="Invalid credentials. Use demo accounts.")
    return result

@router.get("/demo-users")
def get_demo_users():
    return auth_service.get_demo_users()
