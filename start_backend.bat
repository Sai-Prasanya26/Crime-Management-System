@echo off
title CMS - FastAPI Backend
 
:: 1. Resolve Project Root
set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
cd /d "%PROJECT_ROOT%"

echo ======================================================================
echo  CRIME MANAGEMENT SYSTEM - FASTAPI BACKEND SERVER
echo ======================================================================
echo.
echo [*] Project Root: %PROJECT_ROOT%
echo.

:: 2. Verify Python Virtual Environment
set "PYTHON_EXE=%PROJECT_ROOT%\backend\.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
    echo [ERROR] Virtual environment Python not found at: %PYTHON_EXE%
    echo Please ensure the backend virtual environment is created.
    echo.
    pause
    exit /b 1
)

:: 3. Verify MySQL Service Connectivity and Database Readiness
echo [*] Checking MySQL service and database readiness...
"%PYTHON_EXE%" -m backend.scripts.launcher_service verify-db 3 >nul 2>&1
if errorlevel 1 (
    echo [ERROR] MySQL database is not reachable or not ready.
    echo Please make sure the MySQL service is started: net start MYSQL80
    echo Backend startup cannot continue without the database.
    echo.
    pause
    exit /b 1
)
echo [OK] MySQL database is active and verified.

:: 4. Check if Port 8000 is already active
"%PYTHON_EXE%" -c "import socket; s = socket.socket(); s.settimeout(1); res = s.connect_ex(('127.0.0.1', 8000)); s.close(); exit(res)" >nul 2>&1
if not errorlevel 1 (
    echo.
    echo [OK] Backend server is already running on http://127.0.0.1:8000
    echo [*] Interactive Swagger UI:  http://127.0.0.1:8000/api/v1/docs
    echo [*] Database Health Check:   http://127.0.0.1:8000/api/v1/health
    echo.
    echo Backend process is already active. Keeping this monitor open.
    echo ======================================================================
    cmd /k
    exit /b 0
)

:: 5. Display Backend URL Endpoints
echo.
echo [*] Starting FastAPI backend on http://127.0.0.1:8000
echo [*] Interactive Swagger UI:  http://127.0.0.1:8000/api/v1/docs
echo [*] Database Health Check:   http://127.0.0.1:8000/api/v1/health
echo.
echo Press Ctrl+C in this window to stop the backend server.
echo ======================================================================
echo.

:: 6. Start Uvicorn Server with live auto-reload
"%PYTHON_EXE%" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

if errorlevel 1 (
    echo.
    echo [ERROR] Backend server stopped unexpectedly or failed to start.
    echo Common reasons:
    echo  1. Port 8000 is already in use by another application.
    echo  2. MySQL database connection failed.
    echo.
    pause
)
