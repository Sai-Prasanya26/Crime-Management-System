# Final Project Handover Dossier

**Project:** Data-Driven Crime Management System with AI-Based Resource Optimization  
**Repository:** [https://github.com/Sai-Prasanya26/Crime-Management-System](https://github.com/Sai-Prasanya26/Crime-Management-System)  
**Project Root:** `C:\Users\saipr.SAIPRASANYA.000\Desktop\Puppyyy\Major Project`  
**Handover Date:** October 25, 2026  
**Final Handover Milestone:** Phase 14 — Deployment Preparation, Final Verification, and Project Handover  
**System Status:** COMPLETED, AUDITED & READY FOR OPERATIONAL DEMONSTRATION

---

## 1. Project Overview & Strategic Objectives

The **Data-Driven Crime Management System with AI-Based Resource Optimization** is an enterprise-grade administrative and strategic decision-support platform designed for law enforcement agencies and governmental policy planning.

The platform bridges empirical crime pattern discovery with mathematical resource optimization and financial modeling:
$$\text{Incident Ingestion (191,679)} \longrightarrow \text{Analytics} \longrightarrow \text{Forecasting (11,520)} \longrightarrow \text{Risk Scoring (3,200)} \longrightarrow \text{MILP Optimization} \longrightarrow \text{Budget Modeling}$$

### Core Operational Principles
1. **Aggregate-Level Analysis Only:** The system analyzes district-level, anonymized incident volumes, demographic data, and resource stocks. It explicitly prohibits individual-level profiling, criminal tracking, or personalized recidivism scoring.
2. **Empirical Data Preservation:** Preserves 191,679 historical crime incidents across 640 Census 2011 districts without synthetic fabrication or backfill.
3. **Operational Data Integrity Safeguard:** Refuses to disaggregate state-level police headcounts into fabricated district baselines. In operational mode, missing verified district data strictly triggers `INSUFFICIENT_DATA`.
4. **Hypothetical Planning Isolation:** Interactive simulations operate under explicit disclaimers (`is_simulation=True`), isolated from approved operational rosters.

---

## 2. System Architecture & Technology Stack

The platform is built on an enterprise three-tier architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   React 19 Frontend Client (SPA)                       │
│    Vite 8 + TypeScript + Tailwind CSS v4 + Recharts + Lucide Icons     │
│    Modular Code-Splitting: Vendor (297kB), Charts (430kB), Index (435kB)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST / JSON (JWT Bearer)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   FastAPI Backend Application                          │
│    Python 3.12 + Pydantic v2 + SQLAlchemy 2.0 ORM + Uvicorn ASGI       │
│    Connection Pool: pool_size=10, max_overflow=20, pool_pre_ping=True   │
├───────────────────────────────────┬────────────────────────────────────┤
│  Layer Responsibilities:          │  Intelligence Engines:             │
│  - API Controllers (v1 routers)   │  - HGBR Multi-Step Forecaster      │
│  - Domain Service Layer           │  - Explainable Risk Engine v2.0    │
│  - SQLAlchemy Repositories        │  - Constrained MILP Solver (SciPy) │
│  - Argon2id / PyJWT Auth Engine   │  - Fiscal Benchmark Cost Engine    │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │ SQL (PyMySQL + Parameterized text)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      MySQL 8.0 Server                                  │
│    Database: crime_management_db (utf8mb4_unicode_ci)                  │
│    Verified Ground Truth: 191,679 Incidents, 640 Census 2011 Districts │
└────────────────────────────────────────────────────────────────────────┘
```

### Full Technology Stack
- **Frontend:** React 19.2.8, TypeScript 6.0, Vite 8.3.1, Tailwind CSS 4.3.3, Recharts 3.10.1, Axios 1.20, Lucide-React.
- **Backend Framework:** FastAPI 0.115, Uvicorn 0.30, Pydantic 2.8, Pydantic-Settings 2.4.
- **Database Layer:** MySQL 8.0.41, SQLAlchemy 2.0.30, PyMySQL 1.1.1, Cryptography 43.0.
- **Machine Learning & Analytics:** Scikit-learn 1.5, NumPy 1.26, Pandas 2.2, PyArrow 15.0, Joblib 1.4, SciPy 1.14 (MILP).
- **Security & Cryptography:** Argon2id (`argon2-cffi 23.1`), PyJWT 2.8 (`HS256`).

---

## 3. Module Descriptions & Core API Specifications

| Module | Core Functionality | Primary API Routes | Access Tier |
| :--- | :--- | :--- | :---: |
| **Authentication & RBAC** | Argon2id verification, JWT issuance, user provisioning, audit logging | `POST /api/v1/auth/login`<br>`GET /api/v1/auth/me`<br>`GET /api/v1/admin/users` | PUBLIC / AUTH / ADMIN |
| **Crime Analytics** | Multi-dimensional incident trends, clearance rates, categories, hourly distribution | `GET /api/v1/analytics/overview`<br>`GET /api/v1/analytics/trends`<br>`GET /api/v1/analytics/by-category` | ALL AUTH |
| **Geographic Intelligence** | Census 2011 district geography, state hierarchies, demographic correlations | `GET /api/v1/geography/states`<br>`GET /api/v1/geography/districts`<br>`GET /api/v1/geography/districts/{id}` | ALL AUTH |
| **Crime Forecasting** | Multi-horizon panel projections, confidence bounds, out-of-sample evaluations | `GET /api/v1/predictions/overview`<br>`GET /api/v1/predictions/models`<br>`POST /api/v1/predictions/generate` | ANALYST / ADMIN |
| **Explainable Risk Scoring** | Multi-factor percentile scoring, strongest drivers, natural-language explanation | `GET /api/v1/risk/overview`<br>`GET /api/v1/risk/districts/{id}`<br>`POST /api/v1/risk/calculate` | ANALYST / ADMIN |
| **Resource Optimization** | State/district inventory audit, constrained MILP redeployment, simulation runs | `GET /api/v1/optimization/resources`<br>`GET /api/v1/optimization/overview`<br>`POST /api/v1/optimization/run` | ANALYST / ADMIN |
| **Budget & Cost Analysis** | Benchmark rates, recurring O&M schedules, capital outlay, scenario comparison | `GET /api/v1/budget/overview`<br>`POST /api/v1/budget/estimate`<br>`POST /api/v1/budget/scenarios/compare` | ANALYST / ADMIN |
| **Reports Center** | Audit-ready administrative summaries, JSON/PDF generation metadata | `GET /api/v1/resources/summary`<br>`GET /api/v1/resources/comparison` | ALL AUTH |

---

## 4. Database Setup & Schema Overview

The database `crime_management_db` contains normalized, relational tables:

```
[states (37)] ──1:N──< [districts (640 Census 2011)] ──1:1── [district_demographics]
                             │
                             ├──1:N──< [crime_incidents (191,679)]
                             ├──1:N──< [crime_predictions (11,520)]
                             ├──1:N──< [crime_risk_scores (3,200)]
                             ├──1:N──< [district_resources (4,510)]
                             └──1:N──< [optimization_allocations]
```

### Essential Table Counts
- `crime_incidents`: Exactly **191,679** rows spanning 2020 through 2025.
- `districts`: **640** Census 2011 districts (`is_census_2011 = 1`), 803 total geographic entities.
- `states`: **37** jurisdictional state and union territory entities.
- `crime_predictions`: Exactly **11,520** forecast records across 18 monthly periods.
- `crime_risk_scores`: Exactly **3,200** monthly district-level risk assessments.
- `state_resources`: **288** verified BPR&D state-level resource rows across 8 resource categories.
- `district_resources`: **4,510** total rows (114 official recorded, 4,396 unrecorded `NULL`).
- `cost_benchmark_rates`: **13** active government and institutional cost benchmark rates.

---

## 5. Dataset Provenance & Data Limitations

### Empirical Incident Provenance
- Incident data covers 2020–2025 across all 36 States/UTs.
- Includes 93,490 closed cases (48.77%) and 98,189 open cases (51.23%).
- Structured across 4 primary categories: `VIOLENT`, `PROPERTY`, `ECONOMIC`, and `CYBER`.
- **Limitation:** Historical incidents reflect officially recorded FIR counts and reported incidents; crime patterns may reflect jurisdictional reporting variations rather than actual baseline incidence differences.

### Police Resource Provenance (BPR&D)
- Official resource totals are sourced from Bureau of Police Research & Development (BPR&D) *Data on Police Organizations* (2022/2023).
- **Core Limitation:** BPR&D publishes comprehensive police personnel and mobility statistics aggregated at the state/UT level. Official district-level allocations are published for only 114 districts nationwide. The remaining 4,396 district entries are unrecorded (`NULL`).
- **Defensibility Safeguard:** The system strictly rejects state-average disaggregation in operational mode to prevent fictional allocations.

---

## 6. Crime Forecasting Methodology & Evaluation

- **Active Model:** HistGradientBoostingRegressor (HGBR) production model (`v1.0.0`).
- **Horizon Scope:** 18 monthly steps per district:
  - 12 historical months (7,680 records tagged `HISTORICAL_RECORDED`).
  - 3 out-of-sample backtest months (1,920 records tagged `PAST_FORECAST_BACKTEST`).
  - 3 forward forecasting months (1,920 records tagged `CURRENT_FUTURE_FORECAST` spanning Nov 2026 to Jan 2027).
- **Evaluation Metrics (Out-of-Sample):**
  - Root Mean Squared Error (RMSE): **12.43**
  - Mean Absolute Error (MAE): **8.12**
  - Outperformed Seasonal Naïve (RMSE 18.9), MA-3 (RMSE 16.4), and Poisson Regression (RMSE 14.8).
- **Uncertainty Quantification:** 90% and 95% confidence intervals derived from empirical residual error variances.
- **Limitation:** Projections assume structural stationarity and cannot forecast unprecedented external shocks (e.g. natural disasters, major policy overhauls).

---

## 7. Explainable Crime Risk Scoring Engine (v2.0)

Calculates monthly composite risk scores $\in [0, 100]$ using multi-factor normalized percentile scoring:
$$\text{Risk Score} = 0.30 \cdot P(\text{Rate}_{100k}) + 0.30 \cdot P(\text{Volume}_{\text{forecast}}) + 0.20 \cdot P(\text{Trend}_{\text{ratio}}) + 0.20 \cdot P(\text{Severity}_{\text{index}})$$

### Project-Defined Risk Thresholds
- **CRITICAL:** Composite Score $\ge 75.0$ (top risk quartile nationwide)
- **HIGH:** $60.0 \le \text{Score} < 75.0$
- **MODERATE:** $40.0 \le \text{Score} < 60.0$
- **LOW:** $\text{Score} < 40.0$

> [!WARNING]
> Risk bands are internal operational planning indicators and do **NOT** represent statutory or official government threat classifications.

---

## 8. Resource Optimization & Operational Safeguards

### Mixed-Integer Linear Program (MILP)
The resource engine solves a constrained allocation problem using `scipy.optimize.linprog` (HiGHS solver):
$$\min_{x} \sum_{i=1}^{N} w_i \cdot (\text{Demand}_i - x_i)^2 \quad \text{subject to} \quad \sum x_i \le C, \quad x_i \ge R_i$$
- **Transferable Pool ($C$):** User-defined pool capacity or verified surplus.
- **Reserve Floor ($R_i$):** $R_i = \max(1, \lfloor \rho \cdot \text{Baseline}_i \rfloor)$, guaranteeing no district is stripped below minimum operational capacity.
- **Eligibility:** `PERSONNEL` and `MOBILITY` are eligible for inter-district redeployment. `INFRASTRUCTURE` is strictly **INELIGIBLE**.

### Operational Integrity Guard
Operational allocation checks district data completeness:
- If unrecorded districts $> 0$ in target state: **Execution halts immediately** with `solver_status: "INSUFFICIENT_DATA"` and 0 allocations.
- To explore planning scenarios on unrecorded states, users must explicitly select simulation mode (`is_simulation=True`), generating disclaimed hypothetical distributions.

---

## 9. Budget & Cost Benchmark Modeling

Estimates financial implications connecting resource allocations to official cost benchmarks:
- **Benchmark Repository:** 13 verified rates across personnel, vehicles, fuel, and equipment.
- **Standing Redeployment Cost:** Standing personnel redeployments incur **₹0 capital procurement cost**. Annual recurring cost reflects standardized salary rates (₹55,000/month = ₹660,000/year per officer).
- **Guard Propagation:** Operational runs returning `INSUFFICIENT_DATA` propagate to budget estimation, returning ₹0 total cost and `status: "INSUFFICIENT_DATA"`.
- **Limitation:** Estimates use national and state-level averages. Actual local police expenditures vary based on local allowances, pension liabilities, and municipal variations.

---

## 10. Authentication, Authorization & Security Controls

1. **Password Security:** Argon2id hashing with cryptographic salt. Passwords and hashes are never exposed in user responses.
2. **Token Security:** PyJWT access tokens with 60-minute expiration. Expired or forged tokens return HTTP 401.
3. **Role Enforcement:** Server-side dependencies enforce role boundaries:
   - `ADMIN`: User provisioning, security audit logs, full access.
   - `ANALYST`: Forecasting generation, risk calculation, simulation runs, budget modeling.
   - `OFFICER`: Read-only operational intelligence. Solver runs blocked with HTTP 403.
4. **Injection Prevention:** All SQL queries use SQLAlchemy ORM or parameterized bind queries (`:param`).
5. **CORS:** Restricted to designated local development ports (`5174`, `5173`, `3000`). No wildcard origins.
6. **Repository Hygiene:** `.env`, raw datasets (`data_import/raw/*.csv`), and binary model weights (`*.joblib`) are excluded via `.gitignore`.

---

## 11. Complete Setup & Execution Instructions

### Prerequisites
- Python 3.11+ with venv
- Node.js 18+ with npm
- MySQL Server 8.0+

### Recommended Startup (Windows)
Double-click or execute from project root:
```cmd
start_project.bat
```

### Manual Execution
```bash
# 1. Activate backend environment
backend\.venv\Scripts\Activate.ps1
# 2. Run backend
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

# 3. Start frontend (separate shell)
cd frontend
npm run dev
```

### Verified Development Accounts
- `admin` / `Admin@12345` (ADMIN)
- `analyst` / `Analyst@12345` (ANALYST)
- `officer` / `Officer@12345` (OFFICER)

---

## 12. Automated Verification Results

| Verification Category | Command Executed | Result Observed | Status |
| :--- | :--- | :---: | :---: |
| **Backend Full Regression** | `python -m unittest discover -s backend/tests -p "test_*.py"` | **173 / 173 passed** in 50.6s | **PASS** |
| **E2E Integration Suite** | `python -m unittest backend/tests/test_end_to_end_integration.py` | **12 / 12 passed** in 3.98s | **PASS** |
| **Frontend Production Build** | `npm --prefix frontend run build` (`tsc -b && vite build`) | Built in **2.69s**, 0 chunk warnings | **PASS** |
| **Frontend Static Linter** | `npm --prefix frontend run lint` (`oxlint`) | **0 errors**, 20 effect-sync warnings | **PASS** |
| **Database Integrity Audit** | Direct SQL verification across 10 tables | **Exact match** across all baselines | **PASS** |
| **Service Health Check** | `python -m backend.scripts.launcher_service verify-db 10` | Database & schema verified | **PASS** |

---

## 13. Deployment Prerequisites & Recommended Enhancements

### Production Deployment Prerequisites
1. **Database Infrastructure:** MySQL 8.0+ with `innodb_buffer_pool_size >= 512MB` and SSL encryption enabled (`require_secure_transport=ON`).
2. **Secrets Provisioning:** Generate a 64-character cryptographically random `JWT_SECRET_KEY` and set `APP_ENV=production`.
3. **Web Server / Reverse Proxy:** Nginx or Caddy reverse proxy terminating TLS (HTTPS) on port 443, forwarding `/api` to Uvicorn (port 8000) and serving `frontend/dist` statically with gzip/brotli.
4. **Process Supervisor:** Run Uvicorn via Gunicorn with 4 Uvicorn workers (`gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.app.main:app`).

### Recommended Future Enhancements
1. **Dynamic Disaggregation with Local Evidence:** If state police departments release localized district staffing rosters, ingest verified district baselines to unlock operational allocations for more states.
2. **GIS Vector Map Integration:** Integrate district GeoJSON boundaries to provide interactive spatial choropleth heatmaps.
3. **Automated Scheduled Ingestion:** Create automated scrapers to ingest annual NCRB crime publications as they are released.

---

## 14. Repository Handover Metadata

- **Repository:** `https://github.com/Sai-Prasanya26/Crime-Management-System`
- **Primary Branch:** `main` (synced with `origin/main`)
- **Final Handover Milestone:** Phase 14 Complete
- **Handover Assessment:** The system is completely verified, mathematically sound, defensively guarded, and fully prepared for local demonstration and server deployment.
