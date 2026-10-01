@echo off
title CMS - FastAPI Backend

:: 1. Resolve Project Root
set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
cd /d "%PROJECT_ROOT%"

echo ============================================================
echo  CRIME MANAGEMENT SYSTEM - FASTAPI BACKEND SERVER
echo ============================================================
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

:: 3. Check if Port 8000 is already active
"%PYTHON_EXE%" -c "import socket, sys; s = socket.socket(); s.settimeout(1); res = s.connect_ex(('127.0.0.1', 8000)); s.close(); sys.exit(res)" >nul 2>&1
if not errorlevel 1 (
    echo.
    echo [OK] Backend server is already running on http://127.0.0.1:8000
    echo [*] Interactive Swagger UI:  http://127.0.0.1:8000/api/v1/docs
    echo [*] Database Health Check:   http://127.0.0.1:8000/api/v1/health
    echo.
    echo Backend process is already active. Keeping this monitor open.
    echo ============================================================
    cmd /k
    exit /b 0
)

:: 4. Display Backend URL Endpoints
echo.
echo [*] Starting FastAPI backend on http://127.0.0.1:8000
echo [*] Interactive Swagger UI:  http://127.0.0.1:8000/api/v1/docs
echo [*] Database Health Check:   http://127.0.0.1:8000/api/v1/health
echo.
echo Press Ctrl+C in this window to stop the backend server.
echo ============================================================
echo.

:: 5. Start Uvicorn Server with live auto-reload
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
