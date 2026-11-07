# PROJECT STATUS & ARCHITECTURAL AUDIT REPORT

**Project:** Data-Driven Crime Management System with AI-Based Resource Optimization  
**Project Root:** `C:\Users\saipr.SAIPRASANYA.000\Desktop\Puppyyy\Major Project`  
**Database:** `crime_management_db` (MySQL 8.0.46)  
**Audit Timestamp:** 2026-11-06  
**Audit Scope:** Comprehensive Full-Stack Codebase & Database Verification (Read-Only)

---

## 1. Existing Project Architecture

The Crime Management System (CMS) is a multi-tier, data-driven web application integrating historical crime analytics, statistical machine learning forecasting, risk profiling, operational resource allocation, and budget estimation.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT TIER (SPA)                             │
│ React 19.2.8 | Vite 8.3.0 | TypeScript 6.0.2 | Tailwind CSS 4.3.3       │
│ Recharts 3.10.1 | Lucide React | Axios | React Router DOM 7.18.4        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Reverse Proxy (/api -> :8000)
┌────────────────────────────────────▼────────────────────────────────────┐
│                         APPLICATION API TIER                            │
│ Python 3.12 | FastAPI 0.115 | Pydantic v2 | Uvicorn 0.30                │
│ SQLAlchemy 2.0 ORM | PyJWT 2.8 | Argon2-cffi / Cryptography             │
│ Role-Based Access Control (ADMIN, ANALYST, OFFICER, INVESTIGATOR, etc.)  │
└──────────────────┬─────────────────────────────────┬────────────────────┘
                   │                                 │
┌──────────────────▼───────────────┐ ┌───────────────▼────────────────────┐
│    MACHINE LEARNING ENGINE       │ │        PERSISTENCE TIER            │
│ HistGradientBoostingRegressor    │ │ MySQL 8.0 (crime_management_db)    │
│ Two-Level Hierarchical Forecasts │ │ 25 Relational Tables               │
│ Conformal Prediction Bounds      │ │ 247,360 Total Verified Records     │
│ Scikit-learn | NumPy | Pandas    │ │ Foreign Key Constraints & Triggers │
└──────────────────────────────────┘ └────────────────────────────────────┘
```

### Component Details
- **Frontend SPA (Port 5174):** Modern responsive dashboard utilizing a crisp light theme (`#0B1F3A` primary dark, `#1769AA` interactive blue, `#F4F7FA` surface slate). Features client-side routing, JWT session persistence (`localStorage`), Axios request/response interceptors with automatic 401 handling, and dynamic SVG charts.
- **FastAPI Backend (Port 8000):** Modular RESTful architecture split into route handlers (`api/v1`), domain services (`services`), data repositories (`repositories`), Pydantic schemas (`schemas`), and SQLAlchemy models (`models`).
- **Authentication & RBAC:** Dual authentication via Bearer tokens in headers or secure cookies. Enforces role hierarchies (`ADMIN`, `ANALYST`, `OFFICER`, `INVESTIGATOR`, `SUPERVISOR`) and logs all actions into `audit_logs`.
- **Machine Learning Layer (`ml/`):** Production HGBR model (`production_hgbr_v1.joblib`) predicting crime counts, complemented by backtesting matrices, walk-forward cross-validation, and empirical Bayes compositional breakdown across 4 crime categories and 21 statutory crime types.

---

## 2. Folder and File Structure

```
C:\Users\saipr.SAIPRASANYA.000\Desktop\Puppyyy\Major Project
├── .env                              # Environment configuration (DB credentials, JWT secrets)
├── .env.example                      # Template configuration
├── .gitignore                        # Git exclusion rules
├── README.md                         # Project overview and instructions
├── start_project.bat                 # Unified zero-traceback launcher with health verification
├── start_backend.bat                 # Standalone backend launcher
├── start_frontend.bat                # Standalone frontend launcher
│
├── backend/                          # FastAPI Backend Application
│   ├── requirements.txt              # Python package dependencies (16 core packages)
│   ├── app/
│   │   ├── main.py                   # FastAPI entry point, CORS middleware, route mounting
│   │   ├── api/                      # Routing layer
│   │   │   ├── deps.py               # Dependency injection (DB session, auth checks)
│   │   │   └── v1/                   # API v1 routes
│   │   │       ├── admin.py          # User management, role modification, audit logs
│   │   │       ├── analytics.py      # Crime volume, trends, demographics, weapons
│   │   │       ├── auth.py           # Login, logout, token refresh, current profile
│   │   │       ├── budget.py         # Cost estimation, benchmark rates, scenario comparison
│   │   │       ├── geography.py      # States, districts, jurisdiction profiles, mappings
│   │   │       ├── health.py         # Healthcheck and table readiness probe
│   │   │       ├── official_crime.py # NCRB benchmark statistics and comparisons
│   │   │       ├── optimization.py   # SLSQP constrained resource allocation runs
│   │   │       ├── predictions.py    # Multi-step ML forecasting, AVP, category breakdown
│   │   │       ├── resources.py      # Police personnel, vehicles, surveillance, gaps
│   │   │       └── risk.py           # Crime risk scoring, threat levels, trends
│   │   ├── core/
│   │   │   ├── config.py             # Pydantic Settings management (.env loader)
│   │   │   └── security.py           # Password hashing (Argon2/bcrypt) & JWT issuance
│   │   ├── database/
│   │   │   └── session.py            # SQLAlchemy engine, DeclarativeBase, sessionmaker
│   │   ├── models/                   # SQLAlchemy ORM Models (25 models)
│   │   │   ├── auth.py               # User, AuditLog
│   │   │   ├── budget.py             # BudgetEstimationRun, BudgetEstimationItem, CostBenchmarkRate
│   │   │   ├── crime.py              # CrimeCategory, CrimeType, CrimeIncident
│   │   │   ├── demographics.py       # DistrictDemographics
│   │   │   ├── geography.py          # State, District, DistrictGeographyMapping
│   │   │   ├── intelligence.py       # CrimeRiskScore
│   │   │   ├── ml.py                 # MLModel, CrimePrediction
│   │   │   ├── official_crime.py     # OfficialCrimeStatistic
│   │   │   ├── optimization.py       # OptimizationRun, OptimizationAllocation
│   │   │   ├── reports.py            # GeneratedReport (Model exists, 0 DB records)
│   │   │   └── resources.py          # ResourceType, DistrictResource, StateResource, etc.
│   │   ├── repositories/             # Data access query layer (10 repositories)
│   │   ├── schemas/                  # Pydantic request/response schemas (13 schemas)
│   │   └── services/                 # Business logic services (11 services)
│   ├── scripts/
│   │   └── launcher_service.py       # CLI socket, port, database, and process health inspector
│   └── tests/                        # 23 Unit and Integration Test Suites (230 passed tests)
│
├── frontend/                         # React 19 Frontend Application
│   ├── package.json                  # Dependencies (Vite 8, React 19, Recharts 3, Tailwind 4)
│   ├── vite.config.ts                # Vite config with /api reverse proxy to port 8000
│   └── src/
│       ├── App.tsx                   # Route definitions and ProtectedRoute guards
│       ├── main.tsx                  # React root mount
│       ├── api/                      # Axios API clients (10 domain clients)
│       ├── components/               # Modular UI components
│       │   ├── analytics/            # Case outcome, classifications, tables
│       │   ├── auth/                 # ProtectedRoute wrapper
│       │   ├── budget/               # BudgetCostAnalysisView (1,098 lines)
│       │   ├── charts/               # Recharts components (Category, Trend, Type, etc.)
│       │   ├── common/               # StatCard, LoadingState, ErrorState, EmptyState
│       │   ├── filters/              # DashboardFilters, DateRangeFilter
│       │   ├── layout/               # Header, Sidebar, DashboardLayout, UserAccountMenu
│       │   ├── optimization/         # ConstrainedOptimizationView
│       │   └── search/               # GlobalIntelligenceSearch query interpreter
│       ├── context/
│       │   └── AuthContext.tsx       # Auth state, login/logout, role check provider
│       ├── pages/                    # 14 Application Page Views
│       │   ├── AdminDashboardPage.tsx# Staff management, role modification, audit logs
│       │   ├── BudgetIntelligencePage.tsx # Fiscal estimation & scenario comparisons
│       │   ├── CrimeAnalyticsPage.tsx# Offense classification & incident drilldown
│       │   ├── DashboardPage.tsx     # Executive command intelligence overview
│       │   ├── DistrictsPage.tsx     # Geographic profiles and jurisdiction rankings
│       │   ├── LandingPage.tsx       # Public showcase and portal landing
│       │   ├── LoginPage.tsx         # Secure user authentication form
│       │   ├── PredictionsPage.tsx   # ML forecasting, AVP charts, category breakdown
│       │   ├── ProfilePage.tsx       # User account details and password change
│       │   ├── ReportsPage.tsx       # Dossier exports (CURRENTLY CLIENT MOCK)
│       │   ├── ResourceOptimizationPage.tsx # Multi-tab resource intelligence (2,328 lines)
│       │   ├── RiskAssessmentPage.tsx# Threat assessment and risk band profiling
│       │   └── TrendsPage.tsx        # Longitudinal volume and momentum analysis
│       └── types/                    # TypeScript interfaces matching backend schemas
│
├── ml/                               # Machine Learning & Forecasting Engine
│   ├── saved_models/                 # Production joblib weights and metadata
│   │   ├── production_hgbr_v1.joblib # Production HistGradientBoostingRegressor
│   │   ├── training_metadata_v1.json # OOS test evaluation metrics (MAE, RMSE, WAPE)
│   │   └── backtest_and_conformal_metadata.json # Multi-step conformal calibrations
│   ├── feature_engineering/          # Panel lag, rolling mean, seasonal feature pipelines
│   ├── inference/                    # Forecast service, conformal calibrator, pipeline
│   └── training/                     # Baselines, forecaster, refit pipelines
│
├── data_import/                      # ETL & Data Ingestion Pipeline
│   ├── import_pipeline.py            # Primary ETL pipeline with destructive safeguards
│   ├── raw/                          # Verified source CSV datasets
│   │   ├── crime_dataset_nationwide.csv (37.6 MB)
│   │   ├── crime_dataset_india.csv (4.9 MB)
│   │   └── india-districts-census-2011.csv (448 KB)
│   └── source_data/police_resources/ # NCRB & BPRD standing police strength datasets
│
└── database/                         # Database Schemas & Migrations
    ├── schema/schema.sql             # Canonical MySQL DDL schema
    ├── migrations/                   # Repeatable migrations (Phase 7B, 7C, 10B, 12, Phase B)
    └── backups/                      # SQL backups before major expansions
```

---

## 3. Completed Modules

| Module | Verification Status | Functional Scope & Evidence |
| :--- | :---: | :--- |
| **Authentication & RBAC** | **Fully Implemented** | JWT token generation and verification; Argon2/bcrypt password hashing; 5 active seeded users with distinct roles (`ADMIN`, `ANALYST`, `OFFICER`); permission middleware (`require_role`); automated audit logging into `audit_logs` (1,930 events recorded). |
| **Crime Analytics & Overview** | **Fully Implemented** | Real-time aggregation of 191,679 confirmed crime incidents; category breakdown (4 statutory categories); offense type rankings (21 types); hourly crime distribution; victim demographics; weapon type correlations; temporal date filtering (`YYYY-MM-DD`). |
| **ML Crime Prediction** | **Fully Implemented** | Trained `HistGradientBoostingRegressor` model in production; 21,760 forward and retrospective forecasts generated across 640 Census baseline districts; conformal prediction uncertainty bands; two-level hierarchical compositional crime category/type breakdown; strict `null` historical actuals and parent-derived baseline preservation for 171 carved districts. |
| **Crime Risk Assessment** | **Fully Implemented** | 3,840 risk score records evaluated across historical and forecast horizons; composite crime risk score indexing; standardized risk classification bands (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`); auto-resolution of active assessment periods in `RiskAssessmentPage.tsx`; state/district filtering and pagination. |
| **Police Resource Optimization** | **Fully Implemented** | 4,510 district resource asset records; 288 state baseline resources; 120 standardized resource types; 2,560 AI-driven recommendations; 960 optimization runs; 12,040 allocations; SLSQP and linear programming mathematical constrained optimization solver; multi-tab resource intelligence UI (`ResourceOptimizationPage.tsx`, 2,328 lines). |
| **Budget Intelligence** | **Fully Implemented** | 13 cost benchmark rate items; 175 budget estimation runs; 2,553 budget items; 2,560 district estimations; scenario cost comparison and fiscal variance analysis; Indian Rupee (`₹ Cr` / `₹ L`) currency formatting; interactive scenario modeling in `BudgetCostAnalysisView.tsx`. |
| **ETL Safety Guardrails** | **Fully Implemented** | Destructive truncation prevention in `data_import/import_pipeline.py` (requires `--force-truncate`); safeguards protecting carved districts (171), geography mappings (797), predictions (21,760), and risk scores (3,840). |

---

## 4. Incomplete Modules

| Module | Status | Identified Gaps & Remaining Work |
| :--- | :---: | :--- |
| **1. Geographical Intelligence** | **Partially Implemented** | **Backend:** APIs for states, districts, demographics, profiles, and coverage exist and work cleanly.<br>**Frontend:** State/district dropdowns, profile metrics, and top districts table function properly. However, the page lacks an interactive spatial map (displays a static photograph `/images/geographic-intelligence.jpg` with a stale "789 Monitored Jurisdictions" overlay). In addition, data-coverage endpoints are not wired into the frontend client. |
| **6. Report Generation** | **Partially Implemented (Mock Only)** | **Backend:** Table `generated_reports` exists in MySQL but contains **0 records**. The SQLAlchemy model `GeneratedReport` exists in `backend/app/models/reports.py`, but there is **no repository, no schema, no service, and no API router**.<br>**Frontend:** `ReportsPage.tsx` relies entirely on a hardcoded in-memory array (`useState`) and exports client-generated mock JSON blobs with zero backend interaction. |
| **7. Final Integration & Testing** | **Partially Implemented** | **Backend:** Comprehensive test coverage with 230 passing unit and integration tests across 23 test suites.<br>**Frontend:** Clean production build (`tsc -b && vite build` succeeds in 3.73s).<br>**Gaps:** End-to-end automated browser tests (Cypress/Playwright) are not configured; reports module and spatial GIS map require full integration. |

---

## 5. Existing API Endpoints

All endpoints are prefixed with `/api/v1` (except the root `/health` probe).

### 5.1 Health & Administration
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/health` | Root-level health check probe | None |
| `GET` | `/api/v1/health` | Deep health probe verifying DB connectivity and tables | None |
| `GET` | `/api/v1/admin/users` | List all staff user accounts | `ADMIN` |
| `POST`| `/api/v1/admin/users` | Create a new staff account | `ADMIN` |
| `PATCH`| `/api/v1/admin/users/{user_id}/status` | Activate/deactivate user account | `ADMIN` |
| `PATCH`| `/api/v1/admin/users/{user_id}/role` | Modify staff role assignment | `ADMIN` |
| `GET` | `/api/v1/admin/audit-logs` | Retrieve security and authorization audit trail | `ADMIN` |
| `GET` | `/api/v1/admin/me` | Verify administrator authorization profile | `ADMIN` |

### 5.2 Authentication
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST`| `/api/v1/auth/login` | Authenticate with username/email and password, issuing JWT | None |
| `POST`| `/api/v1/auth/logout` | Revoke session and clear authentication cookies | Authenticated |
| `GET` | `/api/v1/auth/me` | Retrieve profile of the currently logged-in user | Authenticated |
| `PUT` | `/api/v1/auth/profile` | Update profile information (name, email) | Authenticated |
| `POST`| `/api/v1/auth/change-password` | Update current account password | Authenticated |

### 5.3 Geography
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/geography/states` | List Indian States & UTs (`current` 36 or `historical` 35) | None / Optional |
| `GET` | `/api/v1/geography/districts` | List administrative districts (797 `current` or 640 `historical`) | None / Optional |
| `GET` | `/api/v1/geography/districts/{district_id}` | District details with Census 2011 demographics profile | None / Optional |
| `GET` | `/api/v1/geography/jurisdiction-profile`| Aggregated metrics (crime rate per 100k, population, risk) | None / Optional |
| `GET` | `/api/v1/geography/mappings` | Verified historical-to-current district lineage mappings | None / Optional |
| `GET` | `/api/v1/geography/data-coverage/summary`| Nationwide data coverage and provenance summary tier | None / Optional |
| `GET` | `/api/v1/geography/data-coverage/{id}` | District-specific domain data coverage classification | None / Optional |

### 5.4 Crime Analytics
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/analytics/overview` | Overall crime incident counts, resolved cases, rate | None / Optional |
| `GET` | `/api/v1/analytics/trends` | Time-series incident trends (`year`, `month`, `day` interval) | None / Optional |
| `GET` | `/api/v1/analytics/by-category` | Crime volume broken down by statutory category | None / Optional |
| `GET` | `/api/v1/analytics/by-type` | Crime volume broken down by specific statutory crime type | None / Optional |
| `GET` | `/api/v1/analytics/hourly` | Incident distribution across 24-hour diurnal cycle | None / Optional |
| `GET` | `/api/v1/analytics/demographics` | Victim demographics (age groups, gender distribution) | None / Optional |
| `GET` | `/api/v1/analytics/weapons` | Weapon involvement and distribution analysis | None / Optional |
| `GET` | `/api/v1/analytics/top-districts` | Jurisdictions ranked by crime volume or crime rate | None / Optional |
| `GET` | `/api/v1/analytics/incidents` | Paginated incident record drill-down | None / Optional |

### 5.5 Official NCRB Statistics
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/official-crime/summary` | Official NCRB state-level benchmark summary | None / Optional |
| `GET` | `/api/v1/official-crime/comparison` | Dual-layer comparison (Historical Incidents vs NCRB) | None / Optional |
| `GET` | `/api/v1/official-crime/states/{state_id}`| State-specific official crime statistics records | None / Optional |

### 5.6 Machine Learning Predictions
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/predictions/overview` | ML pipeline status, active model version, periods covered | None / Optional |
| `GET` | `/api/v1/predictions` | Paginated prediction records filtered by state/district/date | None / Optional |
| `GET` | `/api/v1/predictions/district/{id}`| Longitudinal prediction series for target district | None / Optional |
| `GET` | `/api/v1/predictions/models` | Registry of machine learning models and metrics | None / Optional |
| `GET` | `/api/v1/predictions/evaluation` | Model comparison report (HGBR vs Naive vs Poisson) | None / Optional |
| `GET` | `/api/v1/predictions/actual-vs-predicted` | Paired actuals vs predicted points with conformal bands | None / Optional |
| `GET` | `/api/v1/predictions/district-month`| Single district-month forecast with comparative baseline | None / Optional |
| `GET` | `/api/v1/predictions/breakdown` | Two-level compositional breakdown (Categories & Types) | None / Optional |
| `POST`| `/api/v1/predictions/train` | Trigger local model refitting pipeline | `ADMIN` |
| `POST`| `/api/v1/predictions/generate` | Trigger forward prediction generation | `ADMIN` |

### 5.7 Crime Risk Assessment
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/risk/overview` | Risk tier summary (counts of CRITICAL, HIGH, MEDIUM, LOW) | None / Optional |
| `GET` | `/api/v1/risk/model` | Risk calculation methodology metadata | None / Optional |
| `GET` | `/api/v1/risk` | Filtered list of district risk scores across assessment periods | None / Optional |
| `GET` | `/api/v1/risk/{district_id}` | Detailed risk profile for target district | None / Optional |
| `POST`| `/api/v1/risk/recalculate` | Recalculate risk indices from fresh predictions/actuals | `ADMIN` |

### 5.8 Resource Optimization & Allocation
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/resources/overview` | Police resource deployment overview across India | None / Optional |
| `GET` | `/api/v1/resources/model` | Resource calculation model metadata | None / Optional |
| `GET` | `/api/v1/resources/categories` | Standardized resource types (Personnel, Vehicles, etc.) | None / Optional |
| `GET` | `/api/v1/resources/districts` | District-level standing resource asset inventories | None / Optional |
| `GET` | `/api/v1/resources/personnel` | Standing police personnel strength | None / Optional |
| `GET` | `/api/v1/resources/vehicles` | Patrol vehicle and pursuit cruiser inventory | None / Optional |
| `GET` | `/api/v1/resources/investigation`| Specialized investigation units & cyber units | None / Optional |
| `GET` | `/api/v1/resources/surveillance` | Surveillance units and CCTV infrastructure | None / Optional |
| `GET` | `/api/v1/resources/infrastructure` | Police station and outpost counts | None / Optional |
| `GET` | `/api/v1/resources/gaps` | Deficit and gap analysis against risk demands | None / Optional |
| `GET` | `/api/v1/resources/recommendations` | AI-recommended resource asset allocations | None / Optional |
| `GET` | `/api/v1/resources/states` | State-level aggregate resource baselines | None / Optional |
| `GET` | `/api/v1/resources/coverage` | Nationwide resource data coverage breakdown | None / Optional |
| `POST`| `/api/v1/resources/allocate` | Execute rule-based resource allocation adjustment | `ADMIN` / `ANALYST` |
| `GET` | `/api/v1/optimization/overview` | Constrained optimization engine overview | None / Optional |
| `GET` | `/api/v1/optimization/runs` | Historical SLSQP optimization solver runs | None / Optional |
| `GET` | `/api/v1/optimization/runs/{run_id}` | Detailed allocation results of target optimization run | None / Optional |
| `POST`| `/api/v1/optimization/run` | Execute mathematical constrained optimization run | `ADMIN` / `ANALYST` |
| `GET` | `/api/v1/optimization/jurisdiction-summary` | Optimized allocation summary by jurisdiction | None / Optional |

### 5.9 Budget Intelligence & Cost Estimation
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/budget/overview` | High-level fiscal expenditure and allocation overview | None / Optional |
| `GET` | `/api/v1/budget/runs` | List of historical budget estimation runs | None / Optional |
| `GET` | `/api/v1/budget/runs/{run_id}` | Detailed itemized cost items for target budget run | None / Optional |
| `POST`| `/api/v1/budget/estimate` | Generate budget estimation from optimization run | `ADMIN` / `ANALYST` |
| `GET` | `/api/v1/budget/benchmarks` | Official cost benchmark rates by resource type | None / Optional |
| `GET` | `/api/v1/budget/benchmarks/{id}` | Specific cost benchmark rate details | None / Optional |
| `POST`| `/api/v1/budget/benchmarks` | Update or create cost benchmark rate | `ADMIN` |
| `POST`| `/api/v1/budget/scenarios/compare`| Comparative fiscal analysis between two scenarios | None / Optional |

---

## 6. Database Tables and Relationships

The database `crime_management_db` contains **25 verified tables** hosting **247,360 total records**.

| # | Table Name | Verified Records | Primary Key | Foreign Key Dependencies | Description |
| :---: | :--- | :---: | :--- | :--- | :--- |
| 1 | `users` | **5** | `id` | None | System staff and administrative accounts |
| 2 | `audit_logs` | **1,930** | `id` | `user_id -> users.id` | Security, login, and authorization event logs |
| 3 | `states` | **37** | `id` | None | 28 States + 8 UTs active (36), plus 1 historical entity |
| 4 | `districts` | **811** | `id` | `state_id -> states.id`, `parent_district_id -> districts.id` | 797 active administrative + 14 historical baseline |
| 5 | `district_geography_mapping` | **797** | `id` | `historical_district_id -> districts.id`, `current_district_id -> districts.id` | Lineage between Census 2011 and modern districts |
| 6 | `district_demographics` | **640** | `id` | `district_id -> districts.id` | Census 2011 population, literacy, and worker metrics |
| 7 | `crime_categories` | **4** | `id` | None | Statutory categories (Violent, Fire, Traffic, Other) |
| 8 | `crime_types` | **21** | `id` | `category_id -> crime_categories.id` | Specific crime types with statutory severity levels |
| 9 | `crime_incidents` | **191,679** | `id` | `district_id -> districts.id`, `crime_type_id -> crime_types.id` | Granular historical incident observations (2020–2025) |
| 10 | `official_crime_statistics` | **52** | `id` | `state_id -> states.id`, `district_id -> districts.id` | Official NCRB published annual statistics |
| 11 | `ml_models` | **1** | `id` | None | Registered active production model metadata |
| 12 | `crime_predictions` | **21,760** | `id` | `district_id -> districts.id`, `model_id -> ml_models.id`, `crime_type_id -> crime_types.id` | Forecasts for 640 baseline districts across 34 periods |
| 13 | `crime_risk_scores` | **3,840** | `id` | `district_id -> districts.id`, `model_id -> ml_models.id` | Risk indices, risk levels, and threat bands |
| 14 | `resource_types` | **120** | `id` | None | Catalog of personnel, vehicle, and tech assets |
| 15 | `district_resources` | **4,510** | `id` | `district_id -> districts.id`, `resource_type_id -> resource_types.id` | Standing district asset inventories |
| 16 | `state_resources` | **288** | `id` | `state_id -> states.id`, `resource_type_id -> resource_types.id` | State-level aggregate resource allocations |
| 17 | `resource_recommendations` | **2,560** | `id` | `district_id -> districts.id`, `resource_type_id -> resource_types.id`, `model_id -> ml_models.id` | Algorithmic deployment recommendations |
| 18 | `resource_costs` | **4** | `id` | `resource_type_id -> resource_types.id` | Base unit cost rates for standard categories |
| 19 | `optimization_runs` | **960** | `id` | `state_id -> states.id`, `district_id -> districts.id`, `model_id -> ml_models.id`, `created_by_user_id -> users.id` | Mathematical optimization run parameters and status |
| 20 | `optimization_allocations` | **12,040** | `id` | `optimization_run_id -> optimization_runs.id` | Itemized district asset allocations per run |
| 21 | `cost_benchmark_rates` | **13** | `id` | `resource_type_id -> resource_types.id` | Tiered benchmark cost rates |
| 22 | `budget_estimation_runs` | **175** | `id` | `optimization_run_id -> optimization_runs.id`, `state_id -> states.id`, `created_by_user_id -> users.id` | Fiscal scenario estimation headers |
| 23 | `budget_estimation_items` | **2,553** | `id` | `budget_estimation_run_id -> budget_estimation_runs.id`, `district_id -> districts.id` | Detailed district fiscal expenditure lines |
| 24 | `budget_estimations` | **2,560** | `id` | `district_id -> districts.id`, `resource_type_id -> resource_types.id`, `optimization_run_id -> optimization_runs.id` | Pre-calculated district cost projections |
| 25 | `generated_reports` | **0** | `id` | `generated_by_user_id -> users.id`, `district_id -> districts.id` | Output registry for generated dossiers (**EMPTY**) |

---

## 7. Existing Datasets and Record Counts

1. **Source Raw Datasets (`data_import/raw/`):**
   - `crime_dataset_nationwide.csv`: 37.6 MB — Primary source for 191,679 confirmed incidents.
   - `crime_dataset_india.csv`: 4.9 MB — Historical reference baseline.
   - `india-districts-census-2011.csv`: 448 KB — Authoritative Census 2011 demographic data for 640 districts.
2. **Police Strength Datasets (`data_import/source_data/police_resources/`):**
   - BPRD & NCRB standing infrastructure reports for police stations, women police stations, actual personnel strength, and cyber units across 36 States/UTs.
3. **ML Feature Panels (`ml/data/`):**
   - `district_month_panel.parquet`: 640 districts × 72 months panel dataset.
   - `panel_features_2020_2025.parquet`: Engineered temporal lags, rolling averages, seasonality indicators.

---

## 8. Bugs and Technical Issues

### P0 — Critical Architectural Issues
1. **State-Level Prediction Filter Anomaly for Reorganized States (`PredictionRepository.list_predictions`):**
   - In `backend/app/repositories/prediction_repository.py:195-200`, filtering by `state_id` performs a direct join on `District.state_id == state_id`.
   - Because `crime_predictions` contains records strictly for the 640 Census 2011 baseline districts (where historical Telangana districts are under State ID 2 and Ladakh under State ID 14), querying `state_id = 36` (Telangana) or `state_id = 37` (Ladakh) returns **`0`** records, while querying State ID 2 (Andhra Pradesh) returns 782 records.
   - **Remediation:** Resolve historical district IDs via `district_geography_mapping` before querying, matching the proven approach in `official_crime_repository.py:80-88`.

### P1 — High Priority Data Quality & Completeness Issues
2. **100% of Districts Have NULL `lgd_code`:**
   - All 811 district records currently have `lgd_code = NULL`, and the column lacks a `UNIQUE` index constraint.
   - **Remediation:** Populate authoritative LGD codes from the Ministry of Panchayati Raj portal for the 797 active administrative districts, and add a unique index.
3. **107 Residual Parent Districts Misclassified as `SAME`:**
   - 107 historical parent districts in `district_geography_mapping` experienced territory reductions when child districts were carved out, but their self-mapping rows remain marked as `SAME` with stale notes ("Administrative boundaries unchanged since 2011"). Only East Godavari (#7) and Prakasam (#18) were corrected in Phase B.
   - **Remediation:** Execute a repeatable migration updating their `mapping_type` to `REORGANIZED`.
4. **Disconnected Report Generation Module:**
   - Table `generated_reports` has 0 rows. Backend has no repository, service, schema, or API route for report generation.
   - Frontend `ReportsPage.tsx` relies on hardcoded in-memory state and client-side JSON exports.
   - **Remediation:** Implement backend report generation service (PDF/JSON/CSV export for Executive Dossier, Risk Matrix, Resource Allocation) and wire it to `ReportsPage.tsx`.

### P2 — Medium Priority Gaps
5. **Missing Cross-District Transfer Lineage in Andhra Pradesh:**
   - Seven secondary territorial transfers under AP Gazette G.O.Ms.No. 47–86 (e.g., Rampachodavaram to ASR, Kovvur to East Godavari, Chirala to Bapatla, Kandukur to Nellore) are absent from `district_geography_mapping`.
   - **Remediation:** Insert secondary transfer mapping rows with `mapping_type = 'TRANSFERRED'` and `mapping_percentage = NULL`.
6. **Missing Interactive Spatial GIS Map in Geographical Intelligence:**
   - `DistrictsPage.tsx` displays a static image banner (`/images/geographic-intelligence.jpg`) rather than an interactive GeoJSON / SVG choropleth map.
   - **Remediation:** Implement an interactive choropleth map component for state and district visualization.

### P3 — Minor Polish & Maintenance Issues
7. **Stale Documentation Figures:**
   - `frontend/src/api/geographyApi.ts:25` mentions "787 administrative districts" (should be 797).
   - `frontend/src/pages/DistrictsPage.tsx:463` and `ReportsPage.tsx:35` display "789 Monitored Jurisdictions" (should be 797).
8. **Frontend Linter Warnings:**
   - `oxlint` reports 26 React compiler warnings regarding synchronous `setState` calls inside `useEffect` (in `TrendsPage.tsx`, `BudgetIntelligencePage.tsx`, `ProfilePage.tsx`, `ResourceOptimizationPage.tsx`).

---

## 9. Pending Implementation Roadmap

```
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: GEOGRAPHIC & PREDICTION CONSISTENCY FIXES                      │
│ - Fix state-level prediction filtering for Telangana & Ladakh           │
│ - Update 107 residual parent districts to REORGANIZED                   │
│ - Correct stale docstring and badge labels (787/789 -> 797)             │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ PHASE 2: REPORT GENERATION BACKEND & FRONTEND INTEGRATION               │
│ - Create ReportRepository, ReportService, and Pydantic Schemas          │
│ - Add /api/v1/reports router (PDF/CSV/JSON generation & download)       │
│ - Replace mock state in ReportsPage.tsx with live API integration       │
│ - Persist report records into generated_reports table                   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ PHASE 3: INTERACTIVE GEOGRAPHICAL INTELLIGENCE MAP                      │
│ - Implement interactive GeoJSON/SVG choropleth map on DistrictsPage     │
│ - Color-code spatial crime density, risk levels, and resource gaps      │
│ - Integrate /api/v1/geography/data-coverage endpoints into frontend     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ PHASE 4: LGD CODE IMPORT & AP TRANSFER LINEAGE EXPANSION                │
│ - Seed authoritative LGD codes for all 797 active administrative dists  │
│ - Add UNIQUE index constraint on districts.lgd_code                     │
│ - Add secondary AP transfer rows to district_geography_mapping          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ PHASE 5: FINAL INTEGRATION, E2E TESTS & PRODUCTION HARDENING            │
│ - Add Playwright/Cypress end-to-end user journey tests                  │
│ - Resolve 26 useEffect React Compiler warnings                          │
│ - Final regression verification across all 25 database tables           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Recommended Next Development Phase

**Recommendation:** Proceed with **Phase 1: Geographic & Prediction Consistency Fixes**, followed immediately by **Phase 2: Report Generation Backend & Frontend Integration**.

### Justification:
1. **Fixing P0 Bug 1 (State-Level Prediction Filtering):** Telangana (`state_id = 36`) and Ladakh (`state_id = 37`) currently display empty prediction dashboards. Resolving this via `district_geography_mapping` immediately restores complete nationwide prediction functionality with minimal code changes and zero schema risk.
2. **Completing Report Generation:** The Reports module is the only user-facing module that remains backed by client-side mock data. Implementing the backend endpoints (`/api/v1/reports`) and connecting `ReportsPage.tsx` will eliminate all mock data from the system, bringing all major project modules to 100% real database connectivity.

