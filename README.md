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

The project follows a strict 18-phase incremental development roadmap:

- [x] **PHASE 1 — Project Foundation** *(Current Status)*
- [ ] **PHASE 2** — Database Design
- [ ] **PHASE 3** — Data Cleaning & Import Pipeline
- [ ] **PHASE 4** — MySQL Integration
- [ ] **PHASE 5** — FastAPI Backend Foundation
- [ ] **PHASE 6** — Authentication & Authorization
- [ ] **PHASE 7** — React Frontend Foundation
- [ ] **PHASE 8** — Crime Analytics
- [ ] **PHASE 9** — Machine Learning Pipeline
- [ ] **PHASE 10** — Crime Prediction
- [ ] **PHASE 11** — Crime Risk Analysis
- [ ] **PHASE 12** — Resource Optimization
- [ ] **PHASE 13** — Budget Estimation
- [ ] **PHASE 14** — AI-Based Insights
- [ ] **PHASE 15** — Interactive Risk Map
- [ ] **PHASE 16** — PDF Reports
- [ ] **PHASE 17** — Admin Panel
- [ ] **PHASE 18** — Testing, Security & Final Optimization

> [!NOTE]
> **Current Project Status: Phase 1 — Project Foundation**
> In this phase, the modular architecture, directory structure, environment templates, minimal backend health check, and minimal landing page have been created. Final tables, ML models, import scripts, authentication, and dashboards will be built in their respective upcoming phases.

---

## 6. Getting Started & Verification

### Prerequisites
- Node.js (v18+) & npm
- Python (v3.10+)
- MySQL Server (for Phase 4+)

### Backend Setup & Execution
1. Open a terminal and navigate to the project root:
   ```bash
   # Create and activate virtual environment (if not already created)
   python -m venv backend/.venv
   # Windows PowerShell:
   backend\.venv\Scripts\Activate.ps1
   # Linux/macOS:
   source backend/.venv/bin/activate
   ```
2. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Run the FastAPI application:
   ```bash
   python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
4. Verify the health check endpoint:
   - URL: `http://127.0.0.1:8000/health`
   - Response: `{"status": "ok"}`
   - API Docs: `http://127.0.0.1:8000/api/v1/docs`

### Frontend Setup & Execution
1. Open a separate terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install dependencies (already initialized):
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Access the frontend in your browser:
   - `http://localhost:5173`
