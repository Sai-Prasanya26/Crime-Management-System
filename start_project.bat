@echo off
title CMS - Unified Project Launcher
cd /d "%~dp0"

echo ======================================================================
echo       DATA-DRIVEN CRIME MANAGEMENT SYSTEM - UNIFIED LAUNCHER
echo ======================================================================
echo.
echo [*] Initializing services for local execution...
echo.

:: 1. Launch FastAPI Backend in a separate window
echo [*] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "CMS Backend (Port 8000)" cmd /k "start_backend.bat"

:: 2. Wait 2 seconds for backend initiation
timeout /t 2 /nobreak >nul

:: 3. Launch React Frontend in a separate window
echo [*] Launching React Vite Frontend on http://localhost:5174 ...
start "CMS Frontend (Port 5174)" cmd /k "start_frontend.bat"

:: 4. Provide Summary and Access Information
echo.
echo ======================================================================
echo  ALL SERVICES LAUNCHED SUCCESSFULLY
echo ======================================================================
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
echo  Notes:
echo   - Both the Backend and Frontend are running in their own windows.
echo   - To stop the services, simply close their respective windows.
echo.
echo ======================================================================
echo Press any key to open http://localhost:5174 in your default browser...
pause >nul
start http://localhost:5174
