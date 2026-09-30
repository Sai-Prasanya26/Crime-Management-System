# Crime Management System — Local Startup & Operation Guide

**Project**: Data-Driven Crime Management System with AI-Based Resource Optimization  
**Phase Baseline**: Phase 7C.2 Complete (Unified Startup Launcher Fixed)  
**Database**: MySQL 8.0 (`crime_management_db`)  

---

## 1. Quick Start Workflow (When VS Code / Project is Closed)

When resuming development or starting the system from a closed state:

1. **Make sure MySQL80 is running**:
   ```powershell
   Get-Service MYSQL80
   ```
   If stopped, start it:
   ```cmd
   net start MYSQL80
   ```

2. **Open the project root directory**:
   ```cmd
   cd "C:\Users\saipr.SAIPRASANYA.000\Desktop\Puppyyy\Major Project"
   ```

3. **Run the unified project launcher**:
   ```cmd
   cmd /c start_project.bat
   ```
   or double-click `start_project.bat`.

4. **Wait until both ports are verified**:
   The launcher polls ports 8000 and 5174 and only confirms success when both services are actively listening:
   ```text
   ======================================================================
                         SERVICE STATUS REPORT
   ======================================================================
    Backend:  RUNNING [http://127.0.0.1:8000]
    Frontend: RUNNING [http://localhost:5174]
   ======================================================================
   ```

5. **Open the web application**:
   The launcher automatically opens your browser to:
   ```text
   http://localhost:5174
   ```

---

## 2. Manual Fallback Commands

If you prefer starting backend and frontend services in dedicated manual terminal windows:

### Terminal 1: MySQL Service Check
```cmd
net start MYSQL80
```

### Terminal 2: FastAPI Backend Server
```cmd
cd /d "C:\Users\saipr.SAIPRASANYA.000\Desktop\Puppyyy\Major Project"
start_backend.bat
```
or directly via Python:
```cmd
.\backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
- API Base: `http://127.0.0.1:8000/api/v1`
- Swagger UI: `http://127.0.0.1:8000/api/v1/docs`
- Health Check: `http://127.0.0.1:8000/api/v1/health`

### Terminal 3: React + Vite Frontend Application
```cmd
cd /d "C:\Users\saipr.SAIPRASANYA.000\Desktop\Puppyyy\Major Project"
start_frontend.bat
```
or directly via npm:
```cmd
cd /d "C:\Users\saipr.SAIPRASANYA.000\Desktop\Puppyyy\Major Project\frontend"
npm run dev -- --host localhost --port 5174
```
- Application: `http://localhost:5174`

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

### A. Port Verification
```powershell
Test-NetConnection 127.0.0.1 -Port 8000
Test-NetConnection 127.0.0.1 -Port 5174
Test-NetConnection localhost -Port 5174
```
All tests return `TcpTestSucceeded: True`.

### B. Verify Database Health
Open `http://127.0.0.1:8000/api/v1/health` in your browser. Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "tables_verified": true,
  "database_name": "crime_management_db",
  "error": null
}
```

### C. Verify Backend Test Suite
Run the automated test suites from project root:
```cmd
.\backend\.venv\Scripts\python.exe backend\tests\test_auth.py
.\backend\.venv\Scripts\python.exe backend\tests\test_api_endpoints.py
```
Both test suites pass 100% against the live MySQL database.

### D. Verify Admin Authentication in Browser
1. Open `http://localhost:5174/login`.
2. Enter username `admin` and password `Admin@12345`.
3. Click **Sign In**.
4. You are redirected to `http://localhost:5174/dashboard`.
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
