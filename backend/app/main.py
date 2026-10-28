"""
AI-Based Predictive Hospital Load Balancing & Capacity Optimization API
FastAPI Application Entrypoint
Zero-Database Architecture with Clean DAL + JSON/In-Memory Persistence
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes.auth_routes import router as auth_router
from .routes.patient_routes import router as patient_router
from .routes.queue_routes import router as queue_router
from .routes.doctor_routes import router as doctor_router
from .routes.ml_routes import router as ml_router
from .routes.simulation_routes import router as simulation_router
from .routes.analytics_routes import router as analytics_router
from .routes.predictive_routes import router as predictive_router
from .routes.optimization_routes import router as optimization_router
from .repositories.data_store import db
from .services.ml_service import ml_service

app = FastAPI(
    title="AI Predictive Hospital Load Balancing & Capacity Optimization API",
    description="Proactive hospital demand forecasting, bottleneck prediction, What-If simulation, and explainable capacity optimization.",
    version="2.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth_router)
app.include_router(patient_router)
app.include_router(queue_router)
app.include_router(doctor_router)
app.include_router(ml_router)
app.include_router(predictive_router)
app.include_router(optimization_router)
app.include_router(simulation_router)
app.include_router(analytics_router)

@app.get("/")
def root():
    return {
        "system": "AI-Based Predictive Hospital Load Balancing & Capacity Optimization System",
        "version": "2.0.0",
        "status": "OPERATIONAL",
        "database_mode": "ZERO_DB_IN_MEMORY_WITH_PERSISTENT_JSON_DAL",
        "ml_models_loaded": {
            "triage_priority": ml_service.priority_model_data is not None,
            "wait_time": ml_service.wait_time_model_data is not None,
            "arrival_forecast": ml_service.arrival_model_data is not None,
            "duration_estimation": ml_service.duration_model_data is not None,
            "demand_forecast": ml_service.demand_model_data is not None,
            "abandonment_risk": ml_service.abandonment_model_data is not None
        },
        "active_patients": len(db.queue.get_active_queue()),
        "disclaimer": "AI models predict operational capacity, demand, and workload. Clinical triage priority is authoritative and entered by authorized hospital staff."
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "ml_service": "online",
        "dal": "ready",
        "active_queue_count": len(db.queue.get_active_queue()),
        "total_resources": len(db.resources.get_all()) if hasattr(db, 'resources') else 0
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
