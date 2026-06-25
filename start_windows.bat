@echo off
title SyncFrame Studio - Startup
echo ===================================================
echo SyncFrame Studio - Windows Startup Helper
echo ===================================================
echo.
echo This script will open two new command windows:
echo 1. Backend Server (Python)
echo 2. Frontend Server (Node/React)
echo.

echo Starting backend...
start "SyncFrame Backend" cmd /k "cd backend && if not exist .venv (python -m venv .venv) && call .venv\Scripts\activate.bat && pip install -r requirements.txt && uvicorn main:app --reload --host 127.0.0.1 --port 8000"

echo Starting frontend...
start "SyncFrame Frontend" cmd /k "cd frontend && npm install && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo Please wait a few seconds, then open http://localhost:5173 in your browser.
echo.
echo To stop the servers, just close those two new windows, or run stop_windows.bat.
pause
