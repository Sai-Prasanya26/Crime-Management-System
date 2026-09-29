@echo off
title CMS - FastAPI Backend (Port 8000)
cd /d "%~dp0"

echo ======================================================================
echo  CRIME MANAGEMENT SYSTEM - FASTAPI BACKEND SERVER
echo ======================================================================
echo.

:: 1. Verify Python Virtual Environment
set PYTHON_EXE=backend\.venv\Scripts\python.exe
if not exist "%PYTHON_EXE%" (
    echo [ERROR] Virtual environment Python not found at: %PYTHON_EXE%
    echo Please ensure the backend virtual environment is created.
    echo.
    pause
    exit /b 1
)

:: 2. Verify MySQL Service Connectivity
echo [*] Checking MySQL service on port 3306...
"%PYTHON_EXE%" -c "import socket; s = socket.socket(); s.settimeout(2); res = s.connect_ex(('127.0.0.1', 3306)); s.close(); exit(res)" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] MySQL does not appear to be listening on port 3306.
    echo Please make sure the MySQL service is started (e.g. net start MYSQL80).
    echo Attempting to proceed anyway...
    echo.
) else (
    echo [OK] MySQL is active and listening on port 3306.
)

:: 3. Display Backend URL Endpoints
echo.
echo [*] Starting FastAPI backend on http://127.0.0.1:8000
echo [*] Interactive Swagger UI:  http://127.0.0.1:8000/api/v1/docs
echo [*] Database Health Check:   http://127.0.0.1:8000/api/v1/health
echo.
echo Press Ctrl+C in this window to stop the backend server.
echo ======================================================================
echo.

:: 4. Start Uvicorn Server
"%PYTHON_EXE%" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000

if errorlevel 1 (
    echo.
    echo [ERROR] Backend server stopped unexpectedly or failed to start.
    echo Common reasons:
    echo  1. Port 8000 is already in use by another application.
    echo  2. MySQL database connection failed.
    echo.
    pause
)
