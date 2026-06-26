@echo off
setlocal enabledelayedexpansion
title SyncFrame Studio - Windows Installer
chcp 65001 >nul 2>&1

:: ==============================================================================
::  install_windows.bat - SyncFrame Studio by Automist Labs
::  First-time setup for Windows / RDP / Windows Server
::  Right-click this file → "Run as administrator"
:: ==============================================================================

echo.
echo ==============================================================
echo   SyncFrame Studio - Windows Installer
echo ==============================================================
echo.

:: --- Ensure we are running from the project root ---
cd /d "%~dp0"

:: --- Require Administrator ---
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Administrator rights required.
    echo.
    echo  Please right-click install_windows.bat and choose
    echo  "Run as administrator", then try again.
    echo.
    pause
    exit /b 1
)
echo  [OK] Running as Administrator

:: --- Create logs folder ---
if not exist "logs" mkdir logs
set LOGFILE=%~dp0logs\windows_setup.log
echo SyncFrame Studio - Windows Setup Log > "%LOGFILE%"
echo Started: %date% %time% >> "%LOGFILE%"
echo. >> "%LOGFILE%"

echo.
echo ==============================================================
echo   STEP 1 - Checking Required Tools
echo ==============================================================
echo.

set MISSING_TOOLS=0

:: Check Git
git --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('git --version 2^>^&1') do echo  [OK] Git already installed: %%v
    echo  [OK] Git >> "%LOGFILE%"
) else (
    echo  [--] Git not found - will install with Chocolatey
    set GIT_MISSING=1
)

:: Check Python
python --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo  [OK] Python already installed: %%v
    echo  [OK] Python >> "%LOGFILE%"
) else (
    echo  [--] Python not found - will install Python 3.12 with Chocolatey
    set PYTHON_MISSING=1
)

:: Check Node
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('node --version 2^>^&1') do echo  [OK] Node.js already installed: %%v
    echo  [OK] Node.js >> "%LOGFILE%"
) else (
    echo  [--] Node.js not found - will install with Chocolatey
    set NODE_MISSING=1
)

:: Check npm
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('npm --version 2^>^&1') do echo  [OK] npm already installed: v%%v
) else (
    echo  [--] npm not found (will be installed with Node.js)
    set NODE_MISSING=1
)

:: Check FFmpeg
ffmpeg -version >nul 2>&1
if %errorlevel% equ 0 (
    echo  [OK] FFmpeg already installed
    echo  [OK] FFmpeg >> "%LOGFILE%"
) else (
    echo  [--] FFmpeg not found - will install with Chocolatey
    set FFMPEG_MISSING=1
)

echo.
echo ==============================================================
echo   STEP 2 - Installing Chocolatey (if missing)
echo ==============================================================
echo.

choco -v >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('choco -v 2^>^&1') do echo  [OK] Chocolatey already installed: %%v
    echo  [OK] Chocolatey >> "%LOGFILE%"
) else (
    echo  [..] Installing Chocolatey package manager...
    echo  Installing Chocolatey >> "%LOGFILE%"

    powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"

    if %errorlevel% neq 0 (
        echo.
        echo  [ERROR] Chocolatey installation failed.
        echo  Please install Chocolatey manually from: https://chocolatey.org/install
        echo  Then rerun this installer.
        echo  Chocolatey install FAILED >> "%LOGFILE%"
        pause
        exit /b 1
    )

    :: Refresh PATH for current session
    call refreshenv >nul 2>&1
    set "PATH=%PATH%;%ALLUSERSPROFILE%\chocolatey\bin"
    echo  [OK] Chocolatey installed successfully
    echo  [OK] Chocolatey installed >> "%LOGFILE%"
)

echo.
echo ==============================================================
echo   STEP 3 - Installing Missing Tools via Chocolatey
echo ==============================================================
echo.

if defined GIT_MISSING (
    echo  [..] Installing Git...
    choco install git -y >> "%LOGFILE%" 2>&1
    if %errorlevel% neq 0 (
        echo  [WARN] Git installation may have had issues. Check logs\windows_setup.log
    ) else (
        echo  [OK] Git installed
    )
)

if defined PYTHON_MISSING (
    echo  [..] Installing Python 3.12...
    choco install python312 -y >> "%LOGFILE%" 2>&1
    if %errorlevel% neq 0 (
        echo  [WARN] Python installation may have had issues. Check logs\windows_setup.log
    ) else (
        echo  [OK] Python 3.12 installed
    )
)

if defined NODE_MISSING (
    echo  [..] Installing Node.js LTS...
    choco install nodejs-lts -y >> "%LOGFILE%" 2>&1
    if %errorlevel% neq 0 (
        echo  [WARN] Node.js installation may have had issues. Check logs\windows_setup.log
    ) else (
        echo  [OK] Node.js LTS installed
    )
)

if defined FFMPEG_MISSING (
    echo  [..] Installing FFmpeg...
    choco install ffmpeg -y >> "%LOGFILE%" 2>&1
    if %errorlevel% neq 0 (
        echo  [WARN] FFmpeg installation may have had issues. Check logs\windows_setup.log
    ) else (
        echo  [OK] FFmpeg installed
    )
)

:: Refresh PATH after installs
echo  [..] Refreshing PATH...
call refreshenv >nul 2>&1

echo.
echo ==============================================================
echo   STEP 4 - Setting Up Python Backend
echo ==============================================================
echo.

cd /d "%~dp0backend"

:: Create virtual environment if missing
if not exist ".venv" (
    echo  [..] Creating Python virtual environment...
    python -m venv .venv >> "%~dp0%LOGFILE%" 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo  [ERROR] Failed to create Python virtual environment.
        echo  Make sure Python 3.11 or 3.12 is installed and on PATH.
        echo  Check: python --version
        echo  VENV creation FAILED >> "%~dp0%LOGFILE%"
        cd /d "%~dp0"
        pause
        exit /b 1
    )
    echo  [OK] Virtual environment created
) else (
    echo  [OK] Virtual environment already exists
)

:: Activate venv and install packages
echo  [..] Activating virtual environment...
call .venv\Scripts\activate.bat

echo  [..] Upgrading pip...
python -m pip install --upgrade pip --quiet >> "%~dp0%LOGFILE%" 2>&1

echo  [..] Installing Python packages (first time may take 2-5 minutes)...
pip install -r requirements.txt >> "%~dp0%LOGFILE%" 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Backend setup failed. pip install had errors.
    echo  Check logs\windows_setup.log for details.
    echo  pip install FAILED >> "%~dp0%LOGFILE%"
    cd /d "%~dp0"
    pause
    exit /b 1
)
echo  [OK] Python packages installed

:: Verify backend can be imported
echo  [..] Verifying backend import...
python -c "import main" >> "%~dp0%LOGFILE%" 2>&1
if %errorlevel% neq 0 (
    echo  [WARN] Backend import check failed. Check logs\windows_setup.log
    echo  Backend import FAILED >> "%~dp0%LOGFILE%"
) else (
    echo  [OK] Backend import verified
)

call deactivate >nul 2>&1

echo.
echo ==============================================================
echo   STEP 5 - Setting Up Frontend
echo ==============================================================
echo.

cd /d "%~dp0frontend"

echo  [..] Installing npm packages (first time may take 2-5 minutes)...
npm install >> "%~dp0%LOGFILE%" 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Frontend setup failed. npm install had errors.
    echo  Check logs\windows_setup.log for details.
    echo  npm install FAILED >> "%~dp0%LOGFILE%"
    cd /d "%~dp0"
    pause
    exit /b 1
)
echo  [OK] npm packages installed

cd /d "%~dp0"

echo.
echo ==============================================================
echo   INSTALLATION COMPLETE
echo ==============================================================
echo.
echo  SyncFrame Studio is ready to use!
echo.
echo  To start the app daily, run:
echo     start_windows.bat
echo.
echo  To stop the app, run:
echo     stop_windows.bat
echo.
echo  IMPORTANT: If new tools were just installed (Git, Python, Node,
echo  FFmpeg), close this window and open a NEW PowerShell or Command
echo  Prompt window before running start_windows.bat.
echo  This ensures the PATH is refreshed correctly.
echo.
echo  Setup log saved to: logs\windows_setup.log
echo.
echo Setup completed: %date% %time% >> "%LOGFILE%"
pause
