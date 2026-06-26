@echo off
setlocal enabledelayedexpansion
title SyncFrame Studio - Starting...
chcp 65001 >nul 2>&1

:: ==============================================================================
::  start_windows.bat - SyncFrame Studio by Automist Labs
::  Daily startup script. Run from the project root.
:: ==============================================================================

cd /d "%~dp0"

echo.
echo ==============================================================
echo   SyncFrame Studio - Windows Startup
echo ==============================================================
echo.

:: --- Create logs folder ---
if not exist "logs"  mkdir logs
if not exist ".pids" mkdir .pids

set LOGFILE=logs\windows_start.log
set BACKEND_LOG=logs\backend.log
set FRONTEND_LOG=logs\frontend.log
set BACKEND_PID_FILE=.pids\backend.pid
set FRONTEND_PID_FILE=.pids\frontend.pid
set BACKEND_URL=http://127.0.0.1:8000
set FRONTEND_URL=http://localhost:5173

echo SyncFrame Studio - Start Log > "%LOGFILE%"
echo Started: %date% %time% >> "%LOGFILE%"

:: ==============================================================================
:: STEP 1 - Check required tools
:: ==============================================================================
echo   STEP 1 - Checking required tools
echo.

set TOOLS_OK=1

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Python not found. Run install_windows.bat first.
    set TOOLS_OK=0
)

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found. Run install_windows.bat first.
    set TOOLS_OK=0
)

npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] npm not found. Run install_windows.bat first.
    set TOOLS_OK=0
)

ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [WARN] FFmpeg not found. Video generation may fail.
    echo  Run install_windows.bat to install FFmpeg automatically.
)

if %TOOLS_OK% equ 0 (
    echo.
    echo  One or more required tools are missing.
    echo  Please run install_windows.bat as Administrator first.
    echo.
    pause
    exit /b 1
)

echo  [OK] All required tools found

:: ==============================================================================
:: STEP 2 - Check virtual environment
:: ==============================================================================
echo.
echo   STEP 2 - Checking Python virtual environment
echo.

if not exist "backend\.venv" (
    echo  [ERROR] Python virtual environment not found at backend\.venv
    echo.
    echo  Please run install_windows.bat first to set up the project.
    echo.
    pause
    exit /b 1
)
echo  [OK] Virtual environment found

:: ==============================================================================
:: STEP 3 - Free ports 8000 and 5173
:: ==============================================================================
echo.
echo   STEP 3 - Freeing ports 8000 and 5173
echo.

:: Kill any process on port 8000
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    if not "%%a"=="0" (
        echo  [..] Stopping process on port 8000 (PID %%a)...
        taskkill /PID %%a /F >nul 2>&1
    )
)

:: Kill any process on port 5173
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    if not "%%a"=="0" (
        echo  [..] Stopping process on port 5173 (PID %%a)...
        taskkill /PID %%a /F >nul 2>&1
    )
)

timeout /t 1 /nobreak >nul
echo  [OK] Ports 8000 and 5173 are free

:: ==============================================================================
:: STEP 4 - Check and install frontend npm packages if missing
:: ==============================================================================
echo.
echo   STEP 4 - Checking frontend packages
echo.

if not exist "frontend\node_modules" (
    echo  [..] node_modules missing - running npm install...
    cd /d "%~dp0frontend"
    npm install >> "%~dp0%FRONTEND_LOG%" 2>&1
    if %errorlevel% neq 0 (
        echo  [ERROR] npm install failed. Check logs\frontend.log
    ) else (
        echo  [OK] npm packages installed
    )
    cd /d "%~dp0"
) else (
    echo  [OK] npm packages already installed
)

:: ==============================================================================
:: STEP 5 - Start Backend
:: ==============================================================================
echo.
echo   STEP 5 - Starting backend server (FastAPI / uvicorn)
echo.

echo. > "%BACKEND_LOG%"
echo Backend started: %date% %time% >> "%BACKEND_LOG%"

:: Start backend in a hidden PowerShell window so it survives as a background process
powershell -WindowStyle Hidden -NoProfile -Command ^
  "cd '%~dp0backend'; .\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 *>> '%~dp0logs\backend.log' 2>&1" &

:: Capture the powershell PID (approximate - we track by port instead)
echo  [OK] Backend process started - log: logs\backend.log

:: ==============================================================================
:: STEP 6 - Start Frontend
:: ==============================================================================
echo.
echo   STEP 6 - Starting frontend server (Vite)
echo.

echo. > "%FRONTEND_LOG%"
echo Frontend started: %date% %time% >> "%FRONTEND_LOG%"

powershell -WindowStyle Hidden -NoProfile -Command ^
  "cd '%~dp0frontend'; npm run dev -- --host 127.0.0.1 --port 5173 *>> '%~dp0logs\frontend.log' 2>&1" &

echo  [OK] Frontend process started - log: logs\frontend.log

:: ==============================================================================
:: STEP 7 - Wait for backend health check
:: ==============================================================================
echo.
echo   STEP 7 - Waiting for services to be ready...
echo.

echo  [..] Checking backend at %BACKEND_URL%/api/health ...

set BACKEND_OK=0
set /a WAITED=0
set /a MAX_WAIT=60

:BACKEND_WAIT_LOOP
if %WAITED% geq %MAX_WAIT% goto BACKEND_TIMEOUT

powershell -NoProfile -Command ^
  "try { $r = Invoke-WebRequest -Uri '%BACKEND_URL%/api/health' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop; exit 0 } catch { exit 1 }" >nul 2>&1

if %errorlevel% equ 0 (
    set BACKEND_OK=1
    echo  [OK] Backend is live at %BACKEND_URL%
    goto BACKEND_DONE
)

set /a WAITED+=1
<nul set /p ".=."
timeout /t 1 /nobreak >nul
goto BACKEND_WAIT_LOOP

:BACKEND_TIMEOUT
echo.
echo  [ERROR] Backend did not respond within %MAX_WAIT% seconds.
echo.
echo  Last 50 lines of logs\backend.log:
echo  --------------------------------------------------------------
powershell -NoProfile -Command "Get-Content '%~dp0logs\backend.log' -Tail 50 -ErrorAction SilentlyContinue"
echo  --------------------------------------------------------------
echo.
echo  Backend failed. Video generation will not work.
echo  Fix the error shown above, then rerun start_windows.bat.
echo.

:BACKEND_DONE
echo.

:: ==============================================================================
:: STEP 8 - Wait for frontend
:: ==============================================================================
echo  [..] Checking frontend at %FRONTEND_URL% ...

set FRONTEND_OK=0
set /a WAITED=0

:FRONTEND_WAIT_LOOP
if %WAITED% geq %MAX_WAIT% goto FRONTEND_TIMEOUT

powershell -NoProfile -Command ^
  "try { $r = Invoke-WebRequest -Uri '%FRONTEND_URL%' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop; exit 0 } catch { exit 1 }" >nul 2>&1

if %errorlevel% equ 0 (
    set FRONTEND_OK=1
    echo  [OK] Frontend is live at %FRONTEND_URL%
    goto FRONTEND_DONE
)

set /a WAITED+=1
<nul set /p ".=."
timeout /t 1 /nobreak >nul
goto FRONTEND_WAIT_LOOP

:FRONTEND_TIMEOUT
echo.
echo  [ERROR] Frontend did not respond within %MAX_WAIT% seconds.
echo.
echo  Last 50 lines of logs\frontend.log:
echo  --------------------------------------------------------------
powershell -NoProfile -Command "Get-Content '%~dp0logs\frontend.log' -Tail 50 -ErrorAction SilentlyContinue"
echo  --------------------------------------------------------------
echo.

:FRONTEND_DONE
echo.

:: ==============================================================================
:: STEP 9 - Summary
:: ==============================================================================
echo ==============================================================

if %BACKEND_OK% equ 1 if %FRONTEND_OK% equ 1 (
    echo.
    echo   SyncFrame Studio is running!
    echo.
    echo   App:           %FRONTEND_URL%
    echo   API Health:    %BACKEND_URL%/api/health
    echo   Backend log:   logs\backend.log
    echo   Frontend log:  logs\frontend.log
    echo   Output videos: backend\outputs\
    echo.
    echo   To stop the app, run: stop_windows.bat
    echo.
    echo ==============================================================
    echo.
    :: Open browser
    start "" "%FRONTEND_URL%"
    echo  Browser opened at %FRONTEND_URL%
) else (
    echo.
    if %BACKEND_OK% equ 0 (
        echo   [ERROR] Backend is OFFLINE. Video generation will NOT work.
    )
    if %FRONTEND_OK% equ 0 (
        echo   [ERROR] Frontend did not start.
    )
    echo.
    echo   Check the log files in the logs\ folder.
    echo   Fix the errors and rerun start_windows.bat.
    echo.
    echo ==============================================================
)

echo.
echo  NOTE: The backend and frontend run as background processes.
echo  To stop them, run stop_windows.bat
echo.
pause
