# 🪟 SyncFrame Studio — Windows Setup Guide

> Complete beginner-friendly guide for running SyncFrame Studio on Windows or Windows Server / RDP.

---

## 📋 What You Need

Before starting, make sure you have:
- A Windows machine (Windows 10, Windows 11, or Windows Server 2019/2022)
- Internet connection (for the first-time install only)
- The project folder downloaded from GitHub

The installer will automatically handle everything else (Python, Node.js, FFmpeg, etc.).

---

## 🚀 First-Time Setup

Only do this once.

**Step 1:** Right-click `install_windows.bat` in the project folder.

**Step 2:** Choose **"Run as administrator"**.

> ⚠️ Administrator rights are required to install system tools (Chocolatey, Python, Node, FFmpeg).

**Step 3:** Wait for the installer to finish. It will:
1. Check if Git, Python, Node.js, FFmpeg are already installed
2. Install Chocolatey if missing
3. Install any missing tools automatically
4. Create the Python virtual environment (`backend\.venv`)
5. Install all Python packages
6. Install all Node.js packages

**Step 4:** When it says `INSTALLATION COMPLETE`, you're ready.

> ⚠️ **IMPORTANT:** If new tools were installed (Python, Node, FFmpeg), **close and reopen PowerShell/Command Prompt** before running `start_windows.bat`. This is needed to refresh the system PATH.

---

## ▶️ Starting the App (Daily Use)

After the one-time setup, use this every day:

**Option 1 — Double-click:**
Double-click `start_windows.bat` in the project folder.

**Option 2 — PowerShell:**
```powershell
cd C:\Projects\Audio-to-Video-Synchronizer
.\start_windows.bat
```

The script will:
1. Check all required tools
2. Free ports 8000 and 5173 if busy
3. Start the backend (FastAPI/uvicorn) as a background process
4. Start the frontend (Vite) as a background process
5. Wait up to 60 seconds for both to be ready
6. Automatically open your browser at `http://localhost:5173`

---

## 🌐 Opening the App

Once started, open your browser and go to:

```
http://localhost:5173
```

To verify the backend is working:

```
http://127.0.0.1:8000/api/health
```

You should see `{"status":"ok"}`.

---

## ⏹️ Stopping the App

Run `stop_windows.bat` to cleanly stop both servers:

**Option 1 — Double-click:**
Double-click `stop_windows.bat`.

**Option 2 — PowerShell:**
```powershell
cd C:\Projects\Audio-to-Video-Synchronizer
.\stop_windows.bat
```

The script will:
1. Find and stop the backend process on port 8000
2. Find and stop the frontend process on port 5173
3. Confirm both ports are free

---

## 📁 Where Are Output Videos Saved?

All generated videos are saved to:
```
backend\outputs\
```

---

## 📋 Log Files

All log files are in the `logs\` folder:

| File | What it contains |
|------|-----------------|
| `logs\windows_setup.log` | Installation log |
| `logs\windows_start.log` | Startup log |
| `logs\backend.log` | Backend server output |
| `logs\frontend.log` | Frontend server output |

---

## 🔄 Updating from GitHub

To get the latest version:

```powershell
cd C:\Projects\Audio-to-Video-Synchronizer
git pull
```

If the update includes new Python or npm packages (check `backend\requirements.txt` or `frontend\package.json`), rerun the installer:
```
install_windows.bat
```

Otherwise for daily use just:
```
start_windows.bat
```

---

## 🛠️ Common Errors and Fixes

### ❌ "Python not found"
**Cause:** Python is not installed or not on PATH.
**Fix:** Run `install_windows.bat` as Administrator. After install, close and reopen PowerShell.

---

### ❌ "Node.js not found"
**Cause:** Node.js is not installed or not on PATH.
**Fix:** Run `install_windows.bat` as Administrator. After install, close and reopen PowerShell.

---

### ❌ "FFmpeg not found" / "No FFmpeg encoder"
**Cause:** FFmpeg is not installed.
**Fix:** Run `install_windows.bat` as Administrator. After install, run:
```
ffmpeg -version
```
If it still fails, reopen PowerShell to refresh PATH.

---

### ❌ "Backend failed to start" / "Backend is OFFLINE"
**Cause:** The Python backend crashed on startup.
**Fix:**
1. Open `logs\backend.log`
2. Look for the error message near the bottom
3. Common causes:
   - FFmpeg not on PATH → run `install_windows.bat`
   - Missing Python package → rerun `install_windows.bat`
   - Port 8000 already in use → run `stop_windows.bat` first, then `start_windows.bat`

---

### ❌ Port 8000 already in use
**Cause:** A previous backend is still running.
**Fix:** Run `stop_windows.bat`, then `start_windows.bat`.

Or manually free the port:
```powershell
netstat -ano | findstr :8000
# Note the PID in the last column
taskkill /PID <PID> /F
```

---

### ❌ Port 5173 already in use
**Cause:** A previous frontend is still running.
**Fix:** Run `stop_windows.bat`, then `start_windows.bat`.

Or manually:
```powershell
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

---

### ❌ "install_windows.bat is blocked by antivirus"
**Cause:** Some antivirus flags `.bat` files from unknown sources.
**Fix:**
1. Right-click `install_windows.bat` → Properties
2. At the bottom, check "Unblock" → Apply
3. Then right-click → "Run as administrator"

---

### ❌ "Please right-click install_windows.bat and choose Run as administrator"
**Cause:** The script was run without admin rights.
**Fix:** Right-click → "Run as administrator"

---

### ❌ Chocolatey install fails
**Cause:** Sometimes corporate firewalls or Windows policies block it.
**Fix:** Install tools manually:
- Python 3.11 or 3.12 (Highly recommended for local AI transcription): https://www.python.org/downloads/
- Node.js LTS: https://nodejs.org/
- FFmpeg: https://www.gyan.dev/ffmpeg/builds/ (download the full build, add `bin\` to PATH)
- Git: https://git-scm.com/download/win

After manual install, reopen PowerShell and run `start_windows.bat`.

---

## 🧪 Windows Manual Test Plan

After setup, verify everything works:

**Step 1:** Open PowerShell as Administrator
```powershell
cd C:\Projects\Audio-to-Video-Synchronizer
```

**Step 2:** Run the installer (first time only):
```
.\install_windows.bat
```

**Step 3:** Close and reopen PowerShell (if tools were newly installed).

**Step 4:** Start the app:
```
.\start_windows.bat
```

**Step 5:** Verify in browser:
- App: http://localhost:5173
- API: http://127.0.0.1:8000/api/health → should show `{"status":"ok"}`

**Step 6:** Stop the app when done:
```
.\stop_windows.bat
```

---

## 📞 Still Having Issues?

1. Check `logs\backend.log` for Python/FFmpeg errors
2. Check `logs\frontend.log` for Node/npm errors
3. Check `logs\windows_setup.log` for install errors
4. Try running `install_windows.bat` again as Administrator

---

*SyncFrame Studio by Automist Labs*
