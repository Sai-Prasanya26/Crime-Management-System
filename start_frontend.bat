@echo off
title CMS - React Vite Frontend (Port 5174)

:: 1. Resolve Project Root and Frontend Directory
set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
set "FRONTEND_DIR=%PROJECT_ROOT%\frontend"

echo ======================================================================
echo  CRIME MANAGEMENT SYSTEM - REACT + VITE FRONTEND
echo ======================================================================
echo.
echo [*] Project Root: %PROJECT_ROOT%
echo [*] Frontend Dir: %FRONTEND_DIR%
echo.

:: 2. Verify Directory and package.json
if not exist "%FRONTEND_DIR%\package.json" (
    echo [ERROR] package.json not found at: %FRONTEND_DIR%\package.json
    echo Please make sure the frontend directory exists and contains package.json.
    echo.
    pause
    exit /b 1
)

:: 3. Verify Node.js and npm
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm was not found in PATH.
    echo Please install Node.js to run the frontend application.
    echo.
    pause
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] node was not found in PATH.
    echo Please install Node.js to run the frontend application.
    echo.
    pause
    exit /b 1
)

:: 4. Verify node_modules
cd /d "%FRONTEND_DIR%"
if not exist "node_modules\" (
    echo [*] node_modules not detected in %FRONTEND_DIR%.
    echo [*] Installing dependencies with npm install...
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

:: 5. Check if Port 5174 is already active
node -e "const s = require('net').connect({port: 5174, host: '127.0.0.1'}, () => { s.destroy(); process.exit(0); }); s.on('error', () => process.exit(1));" >nul 2>&1
if not errorlevel 1 (
    echo.
    echo [OK] Frontend application is already running on http://localhost:5174
    echo Frontend process is already active. Keeping this monitor open.
    echo ======================================================================
    cmd /k
    exit /b 0
)

:: 6. Display Startup Information
echo.
echo [*] Starting Vite development server on port 5174...
echo [*] Host Binding:        localhost
echo [*] Port:                5174
echo [*] Target API Base URL: http://127.0.0.1:8000/api/v1
echo.
echo Press Ctrl+C in this window to stop the frontend server.
echo ======================================================================
echo.

:: 7. Ensure IPv4 resolution precedence so both localhost and 127.0.0.1 connect
set "NODE_OPTIONS=--dns-result-order=ipv4first"

:: 8. Launch Vite server with explicit --host localhost and --port 5174
call npm run dev -- --host localhost --port 5174

if errorlevel 1 (
    echo.
    echo [ERROR] Frontend dev server stopped or failed to launch.
    echo Common reasons:
    echo  1. Port 5174 is already in use by another process.
    echo  2. Missing Node dependencies.
    echo.
    pause
)
