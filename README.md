# Data-Driven Crime Management System with AI-Based Resource Optimization

## 1. Project Objective

The **Data-Driven Crime Management System with AI-Based Resource Optimization** is a crime intelligence and administrative decision-support platform designed to assist law enforcement agencies in strategic planning. 

By analyzing aggregate, district-level historical crime data, demographic metrics, and infrastructural resources, the platform aims to:
- Provide high-level crime pattern analytics and trend identification.
- Predict aggregate crime risks at the district level using machine learning.
- Optimize police resource allocation (patrol personnel, vehicles, station coverage) without bias.
- Assist department administrators in operational budget estimation.
- Generate automated, audit-ready analytical PDF reports.

> [!IMPORTANT]
> The system operates strictly on **aggregate and district-level statistics**. It does **NOT** profile, track, or predict whether a specific individual will commit a crime.

---

## 2. Technology Stack

### Frontend
- **Framework:** React (v19) with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (v4)
- **Routing:** React Router (v7)
- **API Client:** Axios
- **Visualization:** Recharts *(ready for Phase 8)*
- **Icons:** Lucide React

### Backend
- **Language / Runtime:** Python 3.12+
- **Web Framework:** FastAPI
- **Data Validation:** Pydantic v2 & Pydantic-Settings
- **ORM / Database Toolkit:** SQLAlchemy 2.0
- **ASGI Server:** Uvicorn

### Database
- **Database Engine:** MySQL
- **Connector:** PyMySQL with Cryptography authentication

### Machine Learning *(Planned for Phase 9 onwards)*
- Pandas
- NumPy
- Scikit-learn
- Joblib
- Statsmodels *(if required for time-series forecasting)*
- SHAP *(if required for model explainability)*

### Reporting *(Planned for Phase 16)*
- ReportLab (Automated PDF Generation)

---

## 3. High-Level Architecture

The system enforces strict layer decoupling, separating the presentation layer, business services, database operations, and machine learning components.

```text
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                         │
│   (Vite + TypeScript + Tailwind CSS + Recharts + Lucide)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON REST APIs
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                        │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                 API / Route Controllers             │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              ▼                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                 Service Layer                       │   │
│   │           (Domain & Business Logic)                 │   │
│   └───────────────┬─────────────────────┬───────────────┘   │
│                   │                     │                   │
│                   ▼                     ▼                   │
│   ┌───────────────────────┐   ┌─────────────────────────┐   │
│   │   Repository Layer    │   │  ML Inference Engine    │   │
│   │  (Data Access Layer)  │   │  (Isolated Prediction)  │   │
│   └───────────────┬───────┘   └─────────────────────────┘   │
│                   │                                         │
│                   ▼                                         │
│   ┌───────────────────────┐                                 │
│   │    SQLAlchemy 2.0     │                                 │
│   └───────────────┬───────┘                                 │
└───────────────────┼─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                       MySQL Database                        │
│            (Standardized Aggregate Crime Data)              │
└─────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities
1. **API / Routes (`backend/app/api`):** Handles HTTP requests, parameter parsing, schema validation, and HTTP responses. Contains no business or SQL query logic.
2. **Services (`backend/app/services`):** Implements business workflows, resource allocation algorithms, and coordinates between repositories and ML engines.
3. **Repositories (`backend/app/repositories`):** Encapsulates SQLAlchemy database queries and persistence logic.
4. **SQLAlchemy & MySQL (`backend/app/database`, `models`):** Manages connection pooling, transactions, and entity mapping.
5. **Machine Learning Pipeline (`ml/`):** Completely separated from web routing, containing offline training, validation, and exported inference models.

---

## 4. Project Directory Layout

```text
Major Project/
├── .env.example              # Environment variables template
├── .gitignore                 # Git ignore rules
├── README.md                  # Project documentation
│
├── frontend/                  # React + Vite + TypeScript application
│   ├── src/
│   │   ├── assets/            # Static assets and icons
│   │   ├── components/        # Reusable UI components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── layouts/           # Page and dashboard layouts
│   │   ├── pages/             # Page views (e.g. LandingPage)
│   │   ├── services/          # Axios API integration
│   │   ├── types/             # TypeScript interfaces and types
│   │   ├── utils/             # Frontend utility functions
│   │   ├── App.tsx            # Main application root
│   │   └── main.tsx           # React entry point
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                   # FastAPI backend
│   ├── app/
│   │   ├── api/               # API route endpoints (v1)
│   │   ├── core/              # Configuration and security settings
│   │   ├── database/          # DB engine and session handling
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── schemas/           # Pydantic schemas (request/response)
│   │   ├── repositories/      # Data access layer
│   │   ├── services/          # Core business logic layer
│   │   ├── utils/             # Helper utilities
│   │   └── main.py            # FastAPI application entrypoint
│   └── requirements.txt
│
├── ml/                        # Machine learning pipelines
│   ├── data/                  # ML training data snapshots
│   ├── preprocessing/         # Feature cleaning and scaling
│   ├── feature_engineering/   # Feature derivation & encoding
│   ├── training/              # Model training scripts
│   ├── evaluation/            # Validation & explainability (SHAP)
│   ├── inference/             # Model loading & inference wrappers
│   └── saved_models/          # Exported serialized models (.joblib)
│
├── database/                  # Database management
│   ├── schema/                # SQL DDL schemas (Phase 2)
│   ├── migrations/            # Migration scripts
│   └── seed/                  # Seed datasets
│
├── data_import/               # ETL scripts for raw datasets (Phase 3)
├── reports/                   # PDF generation templates (Phase 16)
└── docs/                      # Architectural designs & specifications
```

---

## 5. Development Phases

The project follows a rigorous, data-driven incremental development roadmap:

- [x] **PHASE 1 — Project Foundation**
- [x] **PHASE 2 — Database Design & Schema**
- [x] **PHASE 3 — Data Cleaning & Ingestion Pipeline (191,679 Historical Records)**
- [x] **PHASE 4 — MySQL Integration & Constraints**
- [x] **PHASE 5 — FastAPI Backend Architecture & Repositories**
- [x] **PHASE 6 — Argon2id Authentication & Role-Based Access Control (RBAC)**
- [x] **PHASE 7 — Full-Stack Interactive Crime Intelligence Dashboard**
- [x] **PHASE 7A–7D — Census 2011 Modern Geography & Official BPR&D Resource Integration**
- [x] **PHASE 8A–8B — Production ML Crime Forecasting Pipeline (HGBR, 11,520 Predictions)**
- [x] **PHASE 9 — Explainable Crime Risk Scoring Engine (v2.0, 3,200 Assessments)**
- [x] **PHASE 10 & 10.1 — AI-Based Constrained Resource Optimization & Operational Integrity Barrier**
- [x] **PHASE 11 — Assumption-Based Budget Estimation, Benchmark Rates & Scenario Comparison**
- [x] **PHASE 12 — End-to-End Integration, Regression & Acceptance Validation**
- [x] **PHASE 13 — Final Quality Review, Security Audit & Performance Optimization** *(Current Status)*

> [!NOTE]
> **Current Project Status: Phase 13 Validated**
> All analytical, forecasting, risk scoring, optimization, and budget workflows are fully integrated and verified across 173 backend tests and clean frontend builds.

---

## 6. Getting Started & Verification

### Prerequisites
Before running the system, ensure the following software is installed on the host machine:
- **Operating System:** Windows 10/11, macOS, or Linux (Ubuntu 22.04 LTS+)
- **Python:** Python 3.11 or 3.12 (`python --version`)
- **Node.js:** Node.js v18+ or v20+ with npm (`node -v`, `npm -v`)
- **Database Engine:** MySQL Server 8.0+ (`mysql --version`)
- **Git:** Git 2.40+ (`git --version`)

---

### Option A: Unified Launcher (Windows — Recommended)
The repository includes a battle-tested one-click orchestrator that handles service dependencies, port discovery, MySQL health, schema validation, and concurrent launch:

```cmd
start_project.bat
```

What the launcher does automatically:
1. Detects and resolves the project root directory.
2. Checks for foreign port conflicts on **8000** (FastAPI) and **5174** (Vite).
3. Verifies MySQL server service (`MYSQL80`) and starts it if stopped.
4. Executes pre-flight database schema checks across all core tables via `backend.scripts.launcher_service`.
5. Boots the FastAPI backend daemon on `http://127.0.0.1:8000`.
6. Boots the Vite frontend development server on `http://localhost:5174`.
7. Launches the default web browser to the application portal.

---

### Option B: Manual Step-by-Step Setup

#### Step 1: Database Setup (MySQL 8.0)
1. Ensure your local MySQL server is running (default port `3306`).
2. Log into the MySQL console:
   ```bash
   mysql -u root -p
   ```
3. Create the database with UTF-8 character encoding:
   ```sql
   CREATE DATABASE IF NOT EXISTS crime_management_db 
     CHARACTER SET utf8mb4 
     COLLATE utf8mb4_unicode_ci;
   EXIT;
   ```

#### Step 2: Backend Environment Configuration
1. Copy the environment template in the project root:
   ```bash
   # Windows PowerShell:
   Copy-Item .env.example .env
   # Linux/macOS:
   cp .env.example .env
   ```
2. Open `.env` and verify your MySQL credentials:
   ```dotenv
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_DATABASE=crime_management_db
   MYSQL_USER=root
   MYSQL_PASSWORD=your_mysql_password
   DATABASE_URL=mysql+pymysql://root:your_mysql_password@localhost:3306/crime_management_db
   JWT_SECRET_KEY=change_me_to_a_secure_random_secret_in_production
   APP_ENV=development
   ```

#### Step 3: Backend Python Environment & Dependencies
1. Create and activate a dedicated Python virtual environment:
   ```bash
   # Windows PowerShell:
   python -m venv backend\.venv
   backend\.venv\Scripts\Activate.ps1

   # Linux/macOS:
   python3 -m venv backend/.venv
   source backend/.venv/bin/activate
   ```
2. Upgrade pip and install all backend requirements:
   ```bash
   pip install --upgrade pip
   pip install -r backend/requirements.txt
   ```
3. Run the database pre-flight verification script:
   ```bash
   python -m backend.scripts.launcher_service verify-db 10
   ```

#### Step 4: Start the FastAPI Backend
Start the Uvicorn ASGI server:
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Verify backend connectivity in your browser or with curl:
- **Root Health Check:** `http://127.0.0.1:8000/health` $\to$ `{"status": "ok"}`
- **Detailed System Health:** `http://127.0.0.1:8000/api/v1/health` $\to$ `{"status": "ok", "database": "connected", "tables_verified": true}`
- **Interactive OpenAPI Documentation:** `http://127.0.0.1:8000/api/v1/docs`

#### Step 5: Frontend Environment & Dependencies
1. Open a new terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Configure frontend environment variables:
   ```bash
   # Windows PowerShell:
   Copy-Item .env.example .env
   # Linux/macOS:
   cp .env.example .env
   ```
3. Install frontend dependencies:
   ```bash
   npm install
   ```

#### Step 6: Start the Frontend Application
Start the Vite development server:
```bash
npm run dev
```
Open your browser at `http://localhost:5174` (or `http://localhost:5173`).

---

### Step 7: Staff Authentication & Demonstration Accounts

The system enforces server-side Role-Based Access Control (RBAC). In development, seed accounts are provisioned for role validation:

| Role | Username | Email | Development Password | System Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | `admin` | `admin@crimeops.gov.in` | `Admin@12345` | Full system access, staff management, audit log access, scenario optimization, budget estimation. |
| **ANALYST** | `analyst` | `analyst@crimeops.gov.in` | `Analyst@12345` | Predictive intelligence, explainable risk scoring, simulation optimization, budget analysis. |
| **OFFICER** | `officer` | `officer@crimeops.gov.in` | `Officer@12345` | Read-only operational intelligence, incident analytics, district demographics. Blocked from admin & solver runs. |

*In production, passwords must be securely reset via the Administrative Console, and unique cryptographically random JWT secrets must be set in `.env`.*

---

### Step 8: Running Automated Test Suites

#### Complete Backend Regression Suite (173 tests)
```bash
backend\.venv\Scripts\python.exe -m unittest discover -s backend/tests -p "test_*.py"
```

#### Dedicated E2E Integration Suite (12 scenarios)
```bash
backend\.venv\Scripts\python.exe -m unittest backend/tests/test_end_to_end_integration.py
```

#### Frontend TypeScript Build & Linter
```bash
npm --prefix frontend run build
npm --prefix frontend run lint
```

---

### Step 9: Troubleshooting Guide

| Issue / Error | Root Cause | Solution |
| :--- | :--- | :--- |
| **MySQL Service Not Running** (`OperationalError: 2003: Can't connect`) | Windows MySQL80 service is stopped or disabled. | Run `net start MYSQL80` in an administrative shell, or start via Windows Services (`services.msc`). |
| **Port Conflict on 8000 or 5174** | An existing background process is holding the socket. | Identify and kill the process: `netstat -ano \| findstr :8000` followed by `taskkill /PID <PID> /F`. Or let `start_project.bat` detect it. |
| **Database Access Denied** (`1045: Access denied for user 'root'@'localhost'`) | Password in `.env` doesn't match local MySQL root password. | Update `MYSQL_PASSWORD` and `DATABASE_URL` in `.env` to match your local password. |
| **CORS Network Error** (`Access-Control-Allow-Origin blocked`) | Frontend running on unexpected port not listed in `CORS_ORIGINS`. | Ensure frontend is running on `http://localhost:5174` or `5173`. Additional domains can be added to `CORS_ORIGINS` in `.env` or `backend/app/core/config.py`. |
| **Token Expired / 401 Unauthorized** | JWT access token expired (60-minute lifetime). | Navigate to `/login` and re-authenticate to obtain a fresh signed token. |
| **Operational Allocation Halted (`INSUFFICIENT_DATA`)** | District baselines are unrecorded in official BPR&D data. | This is an intentional data-integrity safeguard. Switch `allocation_mode` to `"SIMULATION"` to run a hypothetical planning simulation. |

---

## 7. Handover Documentation Reference

For comprehensive technical documentation, refer to:
- **Final Project Handover Dossier:** [`docs/final_project_handover.md`](docs/final_project_handover.md)
- **Phase 14 Completion Report:** [`docs/phase_14_completion_report.md`](docs/phase_14_completion_report.md)
- **Phase 13 Quality & Security Review:** [`docs/final_quality_review.md`](docs/final_quality_review.md)
- **Phase 12 End-to-End Validation:** [`docs/end_to_end_validation.md`](docs/end_to_end_validation.md)
- **Backend API Specifications:** [`docs/backend_api_specification.md`](docs/backend_api_specification.md)
- **Database Schema & Data Dictionary:** [`docs/data_dictionary.md`](docs/data_dictionary.md)
