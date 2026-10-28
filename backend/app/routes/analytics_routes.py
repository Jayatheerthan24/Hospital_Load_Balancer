"""
Dashboard & Analytics Routes
"""

from fastapi import APIRouter
from ..services.analytics_service import analytics_service

router = APIRouter(tags=["Analytics & Dashboard"])

@router.get("/api/dashboard")
def get_dashboard_summary():
    return analytics_service.get_dashboard_summary()

@router.get("/api/analytics")
def get_analytics_charts():
    return analytics_service.get_analytics_charts_data()

@router.get("/api/analytics/insights")
def get_live_insights():
    summary = analytics_service.get_dashboard_summary()
    return {
        "insights": summary["ai_insights"],
        "surge_risk": summary["kpis"]["expected_surge_risk"]
    }
