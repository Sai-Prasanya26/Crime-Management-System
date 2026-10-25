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

### Unified Quick Start (Recommended)
Double-click `start_project.bat` in the project root or run:
```cmd
start_project.bat
```
This launcher checks prerequisites, verifies MySQL schema readiness, starts the FastAPI backend daemon on port 8000, and opens the Vite frontend on port 5174.

### Manual Backend Setup
1. Open a terminal and navigate to the project root:
   ```bash
   # Activate virtual environment
   backend\.venv\Scripts\Activate.ps1
   ```
2. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Run the FastAPI application:
   ```bash
   python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
4. Verify endpoints:
   - Root Health: `http://127.0.0.1:8000/health`
   - Detailed Health: `http://127.0.0.1:8000/api/v1/health`
   - API Docs: `http://127.0.0.1:8000/api/v1/docs`

### Manual Frontend Setup
1. Open a terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install dependencies and start development server:
   ```bash
   npm install
   npm run dev
   ```
3. Access the portal in your browser: `http://localhost:5174` (or `http://localhost:5173`)
