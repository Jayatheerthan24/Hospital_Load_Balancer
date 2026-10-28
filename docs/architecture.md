# System Architecture

## Overview
AegisPulse AI is a real-time hospital triage, queue load balancing, and waiting-time forecasting platform designed to relieve clinical bottlenecks in high-volume emergency departments.

## High-Level Architecture

```
┌────────────────────────────────────────────────────────┐
│               Frontend: Vite + React                   │
│  - Operations Dashboard       - Patient Intake & Vitals│
│  - Live Queue & Balancer      - Doctor Workstation     │
│  - Patient Tracker Kiosk      - Emergency Surge Demo   │
│  - Flow Analytics             - ML Model Evaluation    │
└───────────────────────────┬────────────────────────────┘
                            │ REST API (HTTP/JSON)
┌───────────────────────────▼────────────────────────────┐
│              Backend: FastAPI (Python)                 │
│  - Patient Intake Service     - Queue Engine (FIFO/Pre)│
│  - Load Balancer Engine       - Simulation Suite       │
│  - Analytics Aggregator       - RBAC Auth Provider     │
└──────────────┬───────────────────────────┬─────────────┘
               │                           │
┌──────────────▼────────────┐ ┌────────────▼─────────────┐
│    Python ML Service      │ │  Data Access Layer (DAL) │
│ - Random Forest Triage    │ │ - JsonRepository         │
│ - Wait-Time Regressor     │ │ - Thread-Safe Memory     │
│ - Arrival Forecaster      │ │ - /data/demo/*.json      │
│ - PhysioNet MIMIC-IV-ED   │ └──────────────────────────┘
└───────────────────────────┘
```

## Component Breakdown

1. **Frontend (`/frontend`)**:
   - Modern React application utilizing Vanilla CSS tokens, glassmorphism UI, glowing indicators, responsive swimlanes.
   - Communicates with backend entirely through REST API abstraction.

2. **Backend API (`/backend/app`)**:
   - FastAPI framework exposing clean endpoints for triage, queuing, consultations, simulation, and analytics.
   - Strictly decoupled from persistence through repository interfaces.

3. **ML Prediction Engine (`/backend/app/services/ml_service.py` & `/ml`)**:
   - Ingests PhysioNet MIMIC-IV-ED Demo clinical records.
   - Computes engineered vital parameters (Shock Index, MAP, Pulse Pressure, NEWS2 risk).
   - Generates multi-class ESI triage predictions, waiting time estimates, and hourly arrival forecasts.

4. **Queue Engine & Load Balancer (`/backend/app/services/`)**:
   - Priority preemption queuing with automated token issuance.
   - Multi-factor algorithmic scoring that balances physician capacity, queue depth, predicted delays, and clinical urgency.
