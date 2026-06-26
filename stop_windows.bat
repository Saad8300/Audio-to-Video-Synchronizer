@echo off
setlocal enabledelayedexpansion
title SyncFrame Studio - Stopping...
chcp 65001 >nul 2>&1

:: ==============================================================================
::  stop_windows.bat - SyncFrame Studio by Automist Labs
::  Cleanly stop backend and frontend servers.
:: ==============================================================================

cd /d "%~dp0"

echo.
echo ==============================================================
echo   SyncFrame Studio - Stopping App
echo ==============================================================
echo.

set STOPPED_ANY=0

:: --- Stop processes on port 8000 (backend) ---
echo  [..] Stopping backend on port 8000...
set BACKEND_FOUND=0
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    if not "%%a"=="0" (
        echo  [..] Killing process PID %%a (port 8000)
        taskkill /PID %%a /F >nul 2>&1
        if !errorlevel! equ 0 (
            echo  [OK] Backend stopped (PID %%a)
            set BACKEND_FOUND=1
            set STOPPED_ANY=1
        ) else (
            echo  [WARN] Could not stop PID %%a - it may have already exited
        )
    )
)
if %BACKEND_FOUND% equ 0 (
    echo  [OK] Port 8000 is already free (backend was not running)
)

echo.

:: --- Stop processes on port 5173 (frontend) ---
echo  [..] Stopping frontend on port 5173...
set FRONTEND_FOUND=0
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    if not "%%a"=="0" (
        echo  [..] Killing process PID %%a (port 5173)
        taskkill /PID %%a /F >nul 2>&1
        if !errorlevel! equ 0 (
            echo  [OK] Frontend stopped (PID %%a)
            set FRONTEND_FOUND=1
            set STOPPED_ANY=1
        ) else (
            echo  [WARN] Could not stop PID %%a - it may have already exited
        )
    )
)
if %FRONTEND_FOUND% equ 0 (
    echo  [OK] Port 5173 is already free (frontend was not running)
)

echo.

:: --- Also kill any leftover uvicorn / node / vite by name (safety net) ---
echo  [..] Checking for any leftover uvicorn processes...
taskkill /F /IM "uvicorn.exe" >nul 2>&1
if %errorlevel% equ 0 (
    echo  [OK] Stopped leftover uvicorn process
    set STOPPED_ANY=1
)

:: Clean up PID files if they exist
if exist ".pids\backend.pid"  del /f /q ".pids\backend.pid"  >nul 2>&1
if exist ".pids\frontend.pid" del /f /q ".pids\frontend.pid" >nul 2>&1

echo.
echo ==============================================================
if %STOPPED_ANY% equ 1 (
    echo   App stopped successfully.
) else (
    echo   No running app processes were found.
    echo   The app may have already been stopped.
)
echo.
echo   Ports 8000 and 5173 are now free.
echo   To start the app again, run: start_windows.bat
echo ==============================================================
echo.
pause
