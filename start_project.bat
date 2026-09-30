@echo off
setlocal enabledelayedexpansion
title CMS - Unified Project Launcher

:: 1. Resolve Project Root
set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
cd /d "%PROJECT_ROOT%"

:: 2. Verify Python Virtual Environment
set "PYTHON_EXE=%PROJECT_ROOT%\backend\.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
    echo [ERROR] Virtual environment Python not found at: %PYTHON_EXE%
    echo Please ensure the backend virtual environment is created.
    echo.
    pause
    exit /b 1
)

:: 3. Fast-Path: Check if project is already running and healthy
"%PYTHON_EXE%" -m backend.scripts.launcher_service is-project-running >nul 2>&1
if not errorlevel 1 (
    echo ======================================================================
    echo         CRIME INTELLIGENCE ^& MANAGEMENT PORTAL
    echo                  LOCAL DEVELOPMENT LAUNCHER
    echo ======================================================================
    echo.
    echo Project Root:
    echo %PROJECT_ROOT%
    echo.
    echo [OK] Project is already running and fully operational.
    echo.
    echo Frontend:
    echo http://localhost:5174
    echo.
    echo Backend:
    echo http://127.0.0.1:8000
    echo.
    echo Opening existing application in default browser...
    start http://localhost:5174
    exit /b 0
)

echo ======================================================================
echo         CRIME INTELLIGENCE ^& MANAGEMENT PORTAL
echo                  LOCAL DEVELOPMENT LAUNCHER
echo ======================================================================
echo.
echo Project Root:
echo %PROJECT_ROOT%
echo.

:: 4. Pre-Flight: Check Port Conflicts (8000, 5174)
"%PYTHON_EXE%" -m backend.scripts.launcher_service check-ports
if errorlevel 1 (
    echo.
    echo [ERROR] Port conflict detected. Startup cannot continue.
    pause
    exit /b 1
)

:: 5. Step 1: Check MySQL service status and start if stopped
echo [1/4] Checking MySQL service...
sc query MYSQL80 | findstr /i "STATE" | findstr /i "RUNNING" >nul 2>&1
if not errorlevel 1 (
    echo [OK] MYSQL80 service is running
    goto :step2_db
)

echo [*] MYSQL80 service is stopped. Starting MySQL service...
net start MYSQL80 >nul 2>&1
if not errorlevel 1 (
    sc config MYSQL80 start= auto >nul 2>&1
    goto :verify_mysql_running
)

:: If standard user, attempt elevated start (and configure start= auto for future boots)
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c net start MYSQL80 && sc config MYSQL80 start= auto' -Verb RunAs -Wait" >nul 2>&1

:verify_mysql_running
sc query MYSQL80 | findstr /i "STATE" | findstr /i "RUNNING" >nul 2>&1
if errorlevel 1 (
    echo.
    echo ==================================================
    echo MYSQL STARTUP FAILED
    echo ==================================================
    echo The MySQL80 service could not be started.
    echo Please check the MySQL installation/service configuration.
    echo Project startup has been stopped because the database is required.
    echo ==================================================
    echo.
    pause
    exit /b 1
)
echo [OK] MYSQL80 service is running

:: 6. Step 2: Verify Database Connectivity & Schema
:step2_db
echo.
echo [2/4] Verifying database connection...
"%PYTHON_EXE%" -m backend.scripts.launcher_service verify-db 15
if errorlevel 1 (
    echo.
    echo [ERROR] Database is unavailable or schema verification failed.
    echo [ERROR] Backend startup cannot continue safely.
    echo [STOP] Project launch aborted.
    echo.
    pause
    exit /b 1
)

:: 7. Step 3: Start FastAPI Backend
echo.
echo [3/4] Starting FastAPI backend...
"%PYTHON_EXE%" -m backend.scripts.launcher_service is-backend-running >nul 2>&1
if not errorlevel 1 (
    echo [OK] Backend ready
    echo [OK] Database health check passed
    echo       http://127.0.0.1:8000
    goto :step4_fe
)

"%PYTHON_EXE%" -m backend.scripts.launcher_service is-backend-process-up >nul 2>&1
if not errorlevel 1 (
    echo [*] Backend process detected. Waiting for health confirmation...
) else (
    start "CMS - FastAPI Backend" /D "%PROJECT_ROOT%" cmd /k "start_backend.bat"
)

"%PYTHON_EXE%" -m backend.scripts.launcher_service wait-backend 60
if errorlevel 1 (
    echo.
    echo [ERROR] Backend health check failed.
    echo [ERROR] Could not confirm FastAPI and database health.
    echo [STOP] Project launch aborted.
    echo.
    pause
    exit /b 1
)

:: 8. Step 4: Start Vite Frontend
:step4_fe
echo.
echo [4/4] Starting Vite frontend...
"%PYTHON_EXE%" -m backend.scripts.launcher_service is-frontend-running >nul 2>&1
if not errorlevel 1 (
    echo [OK] Frontend ready
    echo       http://localhost:5174
    goto :launch_browser
)

start "CMS - Vite Frontend" /D "%PROJECT_ROOT%" cmd /k "start_frontend.bat"

"%PYTHON_EXE%" -m backend.scripts.launcher_service wait-frontend 60
if errorlevel 1 (
    echo.
    echo [ERROR] Frontend failed to respond within timeout.
    echo [STOP] Project launch aborted.
    echo.
    pause
    exit /b 1
)

:: 9. Project Ready & Open Application
:launch_browser
echo.
echo ======================================================================
echo                     PROJECT READY
echo ======================================================================
echo.
echo Frontend:
echo http://localhost:5174
echo.
echo Backend:
echo http://127.0.0.1:8000
echo.
echo Swagger:
echo http://127.0.0.1:8000/api/v1/docs
echo.
echo Database:
echo crime_management_db
echo.
echo ======================================================================
echo.
echo Opening application...
start http://localhost:5174
