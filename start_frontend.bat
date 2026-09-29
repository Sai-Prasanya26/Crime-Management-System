@echo off
title CMS - React Vite Frontend (Port 5174)
cd /d "%~dp0frontend"

echo ======================================================================
echo  CRIME MANAGEMENT SYSTEM - REACT + VITE FRONTEND
echo ======================================================================
echo.

:: 1. Verify Node.js and npm
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not found in PATH.
    echo Please install Node.js (v18+) to run the frontend application.
    echo.
    pause
    exit /b 1
)

:: 2. Verify node_modules
if not exist "node_modules\" (
    echo [*] node_modules not detected. Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

:: 3. Display Frontend Information
echo.
echo [*] Starting Vite development server on port 5174...
echo [*] Application Dashboard:  http://localhost:5174
echo [*] Target API Base URL:    http://127.0.0.1:8000/api/v1
echo.
echo Press Ctrl+C in this window to stop the frontend server.
echo ======================================================================
echo.

:: 4. Run Vite Dev Server
call npm run dev -- --port 5174

if errorlevel 1 (
    echo.
    echo [ERROR] Frontend dev server stopped or failed to launch.
    echo Common reasons:
    echo  1. Port 5174 is already in use.
    echo  2. Missing Node dependencies.
    echo.
    pause
)
