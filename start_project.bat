@echo off
setlocal enabledelayedexpansion
title CMS - Unified Project Launcher

:: 1. Resolve Project Root
set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
cd /d "%PROJECT_ROOT%"

echo ======================================================================
echo       DATA-DRIVEN CRIME MANAGEMENT SYSTEM - UNIFIED LAUNCHER
echo ======================================================================
echo.
echo [*] Project Root: %PROJECT_ROOT%
echo [*] Initializing services for local execution...
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

:: 3. Launch FastAPI Backend in a separate window
echo [*] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "CMS Backend (Port 8000)" /D "%PROJECT_ROOT%" cmd /k "start_backend.bat"

:: 4. Launch React Frontend in a separate window
echo [*] Launching React Vite Frontend on http://localhost:5174 ...
start "CMS Frontend (Port 5174)" /D "%PROJECT_ROOT%" cmd /k "start_frontend.bat"

:: 5. Wait and Verify Services on Ports 8000 and 5174
echo.
echo [*] Verifying services on ports 8000 and 5174...
set BACKEND_OK=0
set FRONTEND_OK=0

:: Check Backend Port 8000 (poll up to 15 seconds)
for /L %%i in (1,1,15) do (
    if "!BACKEND_OK!"=="0" (
        "%PYTHON_EXE%" -c "import socket, sys; s = socket.socket(); s.settimeout(1); res = s.connect_ex(('127.0.0.1', 8000)); s.close(); sys.exit(0 if res == 0 else 1)" >nul 2>&1 && set "BACKEND_OK=1"
    )
    if "!BACKEND_OK!"=="0" (
        ping -n 2 127.0.0.1 >nul
    )
)

:: Check Frontend Port 5174 (poll up to 15 seconds)
for /L %%i in (1,1,15) do (
    if "!FRONTEND_OK!"=="0" (
        "%PYTHON_EXE%" -c "import socket, sys; s = socket.socket(); s.settimeout(1); res = s.connect_ex(('127.0.0.1', 5174)); s.close(); sys.exit(0 if res == 0 else 1)" >nul 2>&1 && set "FRONTEND_OK=1"
    )
    if "!FRONTEND_OK!"=="0" (
        ping -n 2 127.0.0.1 >nul
    )
)

echo.
echo ======================================================================
echo                       SERVICE STATUS REPORT
echo ======================================================================

if "!BACKEND_OK!"=="1" (
    echo  Backend:  RUNNING [http://127.0.0.1:8000]
) else (
    echo  Backend:  FAILED / NOT REACHABLE on port 8000
)

if "!FRONTEND_OK!"=="1" (
    echo  Frontend: RUNNING [http://localhost:5174]
) else (
    echo  Frontend: FAILED / NOT REACHABLE on port 5174
)

echo ======================================================================
echo.

:: 6. Handle Outcomes
if "!BACKEND_OK!"=="1" (
    if "!FRONTEND_OK!"=="1" (
        echo [OK] All services verified and actively listening!
        echo.
        echo  Access Points:
        echo   - Frontend Application:  http://localhost:5174
        echo   - Backend Swagger Docs:  http://127.0.0.1:8000/api/v1/docs
        echo   - Backend Health Check:  http://127.0.0.1:8000/api/v1/health
        echo.
        echo  Default Login Credentials:
        echo   - Administrator:  admin / Admin@12345
        echo   - Crime Analyst:  analyst_user / Analyst@12345
        echo   - Police Officer: officer_user / Officer@12345
        echo.
        echo Opening http://localhost:5174 in your default browser...
        start http://localhost:5174
        goto :end
    )
)

echo [ERROR] One or more services failed to start or did not open their ports in time.
echo Please inspect the backend and frontend terminal windows for error logs.
echo.
pause

:end
