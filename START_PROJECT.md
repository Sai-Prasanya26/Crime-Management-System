# Crime Management System — Local Startup & Operation Guide

**Project**: Data-Driven Crime Management System with AI-Based Resource Optimization  
**Phase Baseline**: Phase 7C.1 Complete  
**Database**: MySQL 8.0 (`crime_management_db`)  

---

## 1. Quick Start (One-Click Launch)

To start the entire project after closing VS Code or restarting your computer:

Double-click or run:
```cmd
start_project.bat
```

This launches:
1. **FastAPI Backend Server** in a dedicated window on `http://127.0.0.1:8000`.
2. **React + Vite Frontend** in a dedicated window on `http://localhost:5174`.
3. Opens `http://localhost:5174` in your browser.

---

## 2. Manual Startup (Step-by-Step)

If you prefer starting services manually from PowerShell or Command Prompt:

### Step 1: Ensure MySQL is Running
The database `crime_management_db` is hosted on MySQL 8.0 on default port **3306**.

- Verify the Windows service status:
  ```powershell
  Get-Service MYSQL80
  ```
- If stopped, start it (Run PowerShell as Administrator):
  ```powershell
  Start-Service MYSQL80
  ```
  or:
  ```cmd
  net start MYSQL80
  ```

### Step 2: Start the Backend Server
Open a terminal in the project root:
```cmd
start_backend.bat
```
or manually:
```cmd
.\backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
- API Base URL: `http://127.0.0.1:8000/api/v1`
- Swagger Documentation: `http://127.0.0.1:8000/api/v1/docs`
- Database Health Check: `http://127.0.0.1:8000/api/v1/health`

### Step 3: Start the Frontend Application
Open another terminal:
```cmd
start_frontend.bat
```
or manually:
```cmd
cd frontend
npm run dev -- --port 5174
```
- Frontend Application URL: `http://localhost:5174`

---

## 3. Verified System Endpoints & URLs

| Service / Interface | URL | Description | Clearance Required |
|---|---|---|---|
| **Vite Frontend Dashboard** | `http://localhost:5174` | Intelligence Overview & Spatial Visualizations | Authenticated |
| **Admin Console** | `http://localhost:5174/admin` | Security, Database Health & RBAC Audit | `ADMIN` Role |
| **Backend Health Check** | `http://127.0.0.1:8000/api/v1/health` | MySQL Connectivity & Table Verification | Public |
| **FastAPI Swagger Docs** | `http://127.0.0.1:8000/api/v1/docs` | Interactive REST API Documentation | Public |
| **ReDoc Schema** | `http://127.0.0.1:8000/api/v1/redoc` | OpenAPI Specification Documentation | Public |

---

## 4. User Accounts & Credentials

The database contains pre-configured test users with distinct RBAC clearance levels:

| Role | Username | Email | Password | Access Capabilities |
|---|---|---|---|---|
| **ADMIN** | `admin` | `admin@crimeops.gov.in` | `Admin@12345` | Full administrative control, `/admin` console, raw data, schema overview |
| **ANALYST** | `analyst_user` | `analyst@crimeops.gov.in` | `Analyst@12345` | Intelligence overview, longitudinal trends, jurisdiction rankings |
| **OFFICER** | `officer_user` | `officer@crimeops.gov.in` | `Officer@12345` | Operational dashboards, read-only incident summaries |

---

## 5. Verification & Testing Instructions

### A. Verify Database Health
Open `http://127.0.0.1:8000/api/v1/health` in your browser. You should receive:
```json
{
  "status": "ok",
  "database": "connected",
  "tables_verified": true,
  "database_name": "crime_management_db",
  "error": null
}
```

### B. Verify Backend Test Suite
Run the automated test suites from project root:
```cmd
.\backend\.venv\Scripts\python.exe backend\tests\test_auth.py
.\backend\.venv\Scripts\python.exe backend\tests\test_api_endpoints.py
```
Both test suites will pass 100% against the live MySQL database.

### C. Verify Admin Authentication in Browser
1. Open `http://localhost:5174/login`.
2. Enter username `admin` and password `Admin@12345`.
3. Click **Sign In**.
4. You will be redirected to `http://localhost:5174/dashboard`.
5. In the top navigation bar, notice the badge **Chief System Administrator** with role `ADMIN`.
6. In the left sidebar under **Administration**, click **Admin Console** (or navigate to `http://localhost:5174/admin`).
7. Verify the green **VERIFIED ADMIN** indicator confirming `GET /api/v1/auth/admin-check` returned HTTP 200.
8. Click **Sign Out** to verify clean session termination.

---

## 6. Troubleshooting Common Issues

### Issue 1: MySQL Service Not Running
- **Symptom**: `health` endpoint returns HTTP 503 (`"database": "disconnected"`), or login fails with `"Server or database is unavailable."`
- **Solution**: Start the MySQL Windows service:
  ```powershell
  Start-Service MYSQL80
  ```

### Issue 2: Port 8000 Already in Use
- **Symptom**: `start_backend.bat` fails with `[WinError 10048] Only one usage of each socket address is normally permitted`.
- **Solution**: Terminate the previous Python process using port 8000:
  ```powershell
  Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force
  ```

### Issue 3: Port 5174 Already in Use
- **Symptom**: Vite starts on port 5175 instead of 5174, triggering a CORS warning.
- **Solution**: Terminate the lingering Vite node process:
  ```powershell
  Get-NetTCPConnection -LocalPort 5174 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force
  ```
  Then run `start_frontend.bat`.

### Issue 4: CORS Policy Error
- **Symptom**: Browser console shows `Access-Control-Allow-Origin` error when attempting to login.
- **Solution**: The backend CORS policy permits `http://localhost:5174`, `http://127.0.0.1:5174`, `http://localhost:5173`, and `http://127.0.0.1:5173`. Ensure your frontend is running on port 5174.

---

## 7. Important Constraints & Policies

- **Database Preservation**: Never run scripts that drop or recreate the database. The database contains 191,679 historical incident records and 789 modern administrative districts.
- **Password Security**: Passwords are saved using Argon2 / Bcrypt cryptographic hashes. Never write or store plaintext passwords in database migrations or git commits.
- **No Mock Data**: All frontend pages retrieve 100% of their operational data from the live backend API and MySQL database.
