# Database Migration & PostgreSQL Integration Blueprint

## Current Zero-Database Architecture (Milestone 80%)

The system currently runs completely independently of external databases using a strict **Data Access Layer (DAL)** pattern.

```
┌───────────────────────────┐
│     React Frontend UI     │
└─────────────┬─────────────┘
              │ REST JSON
┌─────────────▼─────────────┐
│    FastAPI Backend API    │
└─────────────┬─────────────┘
              │
┌─────────────▼─────────────┐
│  Data Access Layer (DAL)  │
│    (BaseRepository<T>)    │
└─────────────┬─────────────┘
              │ Thread-Safe In-Memory & JSON Storage
┌─────────────▼─────────────┐
│   /data/demo/*.json files │
│    In-Memory Active State │
└───────────────────────────┘
```

### Active Repositories in DAL

| Repository | Current Implementation | Target PostgreSQL Table |
|---|---|---|
| `PatientRepository` | `JsonRepository("data/demo/patients.json")` | `patients` table (UUID PK, JSONB vitals) |
| `DoctorRepository` | `JsonRepository("data/demo/doctors.json")` | `doctors` table (status, specialty, capacity) |
| `QueueRepository` | `JsonRepository("data/demo/queue.json")` | `queue_entries` table (token, priority, joined_at) |
| `DepartmentRepository` | `JsonRepository("data/demo/departments.json")` | `departments` table (code, name, base_time) |
| `ConsultationRepository` | `JsonRepository("data/demo/consultations.json")` | `consultation_logs` table (duration, outcome) |
| `PredictionRepository` | `JsonRepository("data/demo/predictions.json")` | `prediction_audits` table (features, prediction) |
| `UserRepository` | `JsonRepository("data/demo/users.json")` | `users` table (password_hash, role) |

---

## Future PostgreSQL Integration Architecture (Milestone 100%)

When PostgreSQL is connected, **zero changes** will be required in:
1. React Frontend UI components
2. FastAPI REST Route signatures and Pydantic schemas
3. Python ML Inference pipeline (`ml_service.py`)
4. Queue logic and Load Balancing algorithms

```
┌───────────────────────────┐
│     React Frontend UI     │
└─────────────┬─────────────┘
              │ REST JSON (UNCHANGED)
┌─────────────▼─────────────┐
│    FastAPI Backend API    │
└─────────────┬─────────────┘
              │ Calls repository methods (UNCHANGED)
┌─────────────▼─────────────┐
│  Data Access Layer (DAL)  │
│    (BaseRepository<T>)    │
└─────────────┬─────────────┘
              │ Swapped repository driver (SQLAlchemy / Prisma)
┌─────────────▼─────────────┐
│   PostgreSQL Database     │
└───────────────────────────┘
```

---

## Migration Steps to PostgreSQL

1. **Install ORM Driver**:
   ```bash
   pip install psycopg2-binary sqlalchemy
   ```

2. **Define SQL Schema (PostgreSQL)**:
   ```sql
   CREATE TABLE departments (
       id VARCHAR(32) PRIMARY KEY,
       code VARCHAR(10) UNIQUE NOT NULL,
       name VARCHAR(100) NOT NULL,
       description TEXT,
       color VARCHAR(20),
       base_consultation_time INT DEFAULT 18,
       max_queue_target INT DEFAULT 15
   );

   CREATE TABLE doctors (
       id VARCHAR(32) PRIMARY KEY,
       name VARCHAR(100) NOT NULL,
       department_id VARCHAR(32) REFERENCES departments(id),
       specialty VARCHAR(100),
       room_number VARCHAR(30),
       status VARCHAR(20) DEFAULT 'AVAILABLE',
       avg_consultation_time INT DEFAULT 18,
       max_capacity INT DEFAULT 15,
       experience_years INT DEFAULT 5,
       current_patient_token VARCHAR(20)
   );

   CREATE TABLE patients (
       id VARCHAR(32) PRIMARY KEY,
       token VARCHAR(20) UNIQUE NOT NULL,
       name VARCHAR(100) NOT NULL,
       age INT NOT NULL,
       gender VARCHAR(10) NOT NULL,
       department_id VARCHAR(32) REFERENCES departments(id),
       chief_complaint TEXT,
       vitals JSONB NOT NULL,
       arrival_type VARCHAR(20) DEFAULT 'WALK_IN',
       predicted_acuity INT,
       priority VARCHAR(20),
       confidence FLOAT,
       assigned_doctor_id VARCHAR(32) REFERENCES doctors(id),
       status VARCHAR(20) DEFAULT 'WAITING',
       registration_time TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE queue_entries (
       id VARCHAR(32) PRIMARY KEY,
       token VARCHAR(20) NOT NULL,
       patient_id VARCHAR(32) REFERENCES patients(id),
       patient_name VARCHAR(100) NOT NULL,
       department_id VARCHAR(32) REFERENCES departments(id),
       doctor_id VARCHAR(32) REFERENCES doctors(id),
       priority VARCHAR(20) NOT NULL,
       acuity INT NOT NULL,
       position INT NOT NULL,
       patients_ahead INT NOT NULL,
       status VARCHAR(20) DEFAULT 'WAITING',
       joined_at TIMESTAMPTZ DEFAULT NOW(),
       estimated_wait_minutes FLOAT NOT NULL,
       estimated_duration_minutes INT NOT NULL
   );
   ```

3. **Implement `PostgresRepository`**:
   Subclass `BaseRepository[T]` in `backend/app/repositories/base.py` and implement standard SQLAlchemy session queries.

4. **Toggle in `data_store.py`**:
   Set `DATABASE_URL` in environment variables. If present, initialize SQLAlchemy repositories; if omitted, automatically fallback to `JsonRepository`.
