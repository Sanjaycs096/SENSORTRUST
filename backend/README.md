# SensorTrust FastAPI Backend

**Event:** IEEE ClimateChain Global Hackathon 2026  
**Track:** Track D — Climate Data & Environmental Monitoring  
**Stage:** Phase 3 — Backend Implementation & Full-Stack Integration  
**Tagline:** Trust the Data. Verify the History.  

---

## 1. Overview

The SensorTrust Backend is a high-integrity REST API engineered using FastAPI, SQLAlchemy 2.x, Pydantic v2, and SQLite. It provides deterministic physical validation, multi-tier explainable anomaly screening, immutable RFC 8785 JSON canonical hashing (SHA-256), accountable review decision recording, and database-derived KPI metrics for atmospheric monitoring networks.

---

## 2. Architecture & Modules

```text
backend/
├── app/
│   ├── main.py              # FastAPI application, CORS, lifespan, and standardized error handlers
│   ├── config.py            # Pydantic Settings configuration (env-driven)
│   ├── database.py          # SQLAlchemy 2.x engine, SQLite sessionmaker, foreign key pragma
│   ├── models/
│   │   ├── observation.py   # ObservationModel (persists telemetry, digests, validation, anomaly evidence)
│   │   └── review.py        # ReviewRecordModel (append-only historical review decisions)
│   ├── schemas/
│   │   ├── observation.py   # ObservationPayload, ValidationResult, AnomalyAssessment
│   │   ├── review.py        # ReviewRecord, ReviewDecisionRequest, ReviewDecisionResponse
│   │   ├── provenance.py    # VerificationRequest, VerificationResponse
│   │   ├── metrics.py       # MetricsSummaryResponse
│   │   └── health.py        # HealthResponse, BlockchainHealth
│   ├── core/
│   │   ├── canonicalize.py  # RFC 8785 JSON Canonicalization Scheme (JCS) & SHA-256 hasher
│   │   ├── validation.py    # Deterministic physical range, clock freshness, deduplication
│   │   └── anomaly.py       # Heuristic spike, stuck flatline, spatial cluster divergence
│   ├── api/
│   │   └── v1/
│   │       ├── health.py       # GET /api/v1/health
│   │       ├── observations.py # POST, GET /api/v1/observations, GET /api/v1/observations/{id}
│   │       ├── reviews.py      # GET /api/v1/reviews/queue, POST /api/v1/reviews/{id}/decision
│   │       ├── provenance.py   # POST /api/v1/provenance/verify
│   │       ├── metrics.py      # GET /api/v1/metrics/summary
│   │       └── seed.py         # POST /api/v1/seed/reset (idempotent baseline reset)
│   └── services/
│       ├── observation_service.py # Core observation lifecycle and DB persistence
│       ├── review_service.py      # Accountable review audit trail management
│       ├── metrics_service.py     # Live SQL-aggregated dashboard KPIs
│       ├── provenance_service.py  # Cryptographic recomputation and tamper detection
│       └── seed_service.py        # Idempotent baseline seed fixtures loader
├── tests/
│   ├── conftest.py                # Isolated in-memory SQLite fixtures and TestClient
│   ├── test_canonicalize.py       # RFC 8785 determinism, ECMAScript numbers, Unicode, cross-language parity
│   ├── test_validation.py         # Physical bounds (0–1000 ug/m3), drift, duplicates
│   ├── test_anomaly.py            # Spike, stuck sensor, peer comparison, missing context
│   └── test_api_endpoints.py      # Complete REST API lifecycle, persistence across reconnect
├── requirements.txt               # Backend dependencies
├── .env.example                   # Environment configuration template
└── README.md                      # Backend documentation
```

---

## 3. Local Setup & Execution

### Prerequisites
- Python 3.10+ (Python 3.10 / 3.11 / 3.12 compatible)
- pip

### 1. Create and Activate Virtual Environment (Optional / Recommended)

**Windows PowerShell:**
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**Linux / macOS:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment
Copy the example environment configuration:
```bash
cp .env.example .env
```
Default configuration values:
- `HOST=127.0.0.1`
- `PORT=8000`
- `DATABASE_URL=sqlite:///./sensortrust.db`
- `CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000","http://localhost:5173"]`
- `SEED_ON_STARTUP=true`

### 4. Start FastAPI Server
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The API will be accessible at:
- **API Base:** `http://127.0.0.1:8000/api/v1`
- **Swagger Interactive Docs:** `http://127.0.0.1:8000/docs`
- **ReDoc Technical Reference:** `http://127.0.0.1:8000/redoc`

---

## 4. REST API Endpoint Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Structured system health, DB status, and blockchain integration mode. |
| `POST` | `/api/v1/observations` | Ingests PM2.5 observation, runs validation & screening, computes digest, and persists. |
| `GET` | `/api/v1/observations` | Paginated observation stream with status, sensor, zone, and search filters. |
| `GET` | `/api/v1/observations/{observation_id}` | Retrieves detailed observation record with validation gates and anomaly evidence. |
| `GET` | `/api/v1/reviews/queue` | Retrieves triage queue of flagged observations sorted by anomaly severity. |
| `POST` | `/api/v1/reviews/{observation_id}/decision` | Submits human review verdict (Approve, Reject, Recalibrate) with mandatory $\ge 10$ char reason. |
| `POST` | `/api/v1/provenance/verify` | Recomputes canonical SHA-256 digest on candidate payload and checks against immutable record. |
| `GET` | `/api/v1/metrics/summary` | Computes live aggregated network KPIs directly from the SQLite database. |
| `POST` | `/api/v1/seed/reset` | Idempotently resets persistent database back to the 5 baseline demo observations. |

---

## 5. Automated Pytest Suite

Run the full backend test suite with verbose reporting:

```bash
cd backend
python -m pytest tests -v
```

The test suite contains **24 comprehensive tests** verifying:
- In-memory database isolation (`conftest.py`)
- RFC 8785 JCS canonical serialization and exact cross-language SHA-256 parity with TypeScript (`test_canonicalize.py`)
- Physical range bounds ($0.0 \le \text{PM2.5} \le 1000.0\ \mu\text{g/m}^3$), clock freshness window, duplicate detection (`test_validation.py`)
- Rapid spikes, stuck sensor flatline, spatial cluster divergence, and missing peer context handling (`test_anomaly.py`)
- Full REST API workflows, error contracts (400, 404, 409, 422), and persistence across database reconnect / restart (`test_api_endpoints.py`).

---

## 6. Security & Data Integrity Notes

1. **RFC 8785 Deterministic Canonicalization:** Both Python (`app/core/canonicalize.py`) and TypeScript (`src/core/canonicalize.ts`) implement the RFC 8785 JCS specification, ensuring identical SHA-256 digests across languages down to the exact hex character.
2. **Privacy by Design:** Precise GPS coordinates are quantized off-chain into grid cells ($0.01^\circ \approx 1.1\text{ km}$ resolution) before canonicalization and persistence. No raw PII or precise location is stored or anchored.
3. **Accountable Review History:** Human triage decisions are stored as append-only historical events with cryptographic decision digests. Previous decisions are never overwritten; each decision references its predecessor via `supersedesDecisionId`.
4. **Prototype Authentication Boundary:** The current prototype uses pseudonymous officer identifiers (`reviewer:officer-auth0|certified`). Production deployment requires integrating real JWT / OAuth2 authentication before exposing reviewer endpoints.
