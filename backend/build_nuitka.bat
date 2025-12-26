@echo off
REM Build NOP portable executable using Nuitka for Windows
REM

echo ========================================
echo NOP Portable Build Script (Nuitka)
echo ========================================
echo.

REM Check if running from correct directory
if not exist "portable_main.py" (
    echo Error: Must run from backend\ directory
    exit /b 1
)

echo Checking prerequisites...

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python not found
    exit /b 1
)

REM Install Nuitka
echo Installing Nuitka...
pip install nuitka ordered-set

REM Check for frontend build
if not exist "..\frontend\build" (
    echo Frontend build not found. Building...
    cd ..\frontend
    
    if not exist "node_modules" (
        echo Installing npm dependencies...
        call npm install
    )
    
    echo Building React frontend...
    call npm run build
    cd ..\backend
)

echo.
echo Starting Nuitka compilation...
echo This may take 10-20 minutes on Windows.
echo.

REM Build with Nuitka
python -m nuitka ^
    --standalone ^
    --onefile ^
    --follow-imports ^
    --assume-yes-for-downloads ^
    --output-filename=nop-portable-windows.exe ^
    --output-dir=dist ^
    --include-data-dir=..\frontend\build=frontend_build ^
    --include-package=app ^
    --include-package=fastapi ^
    --include-package=uvicorn ^
    --include-package=sqlalchemy ^
    --include-package=pydantic ^
    --enable-plugin=anti-bloat ^
    --nofollow-import-to=pytest ^
    --nofollow-import-to=black ^
    --nofollow-import-to=IPython ^
    --windows-icon-from-ico=..\assets\icon.ico ^
    --windows-company-name="NOP" ^
    --windows-product-name="Network Observatory Platform" ^
    --windows-file-version="1.0.0.0" ^
    --windows-product-version="1.0.0" ^
    --windows-console-mode=attach ^
    --jobs=4 ^
    --lto=yes ^
    --remove-output ^
    portable_main.py

if exist "dist\nop-portable-windows.exe" (
    echo.
    echo ========================================
    echo Build Successful!
    echo ========================================
    echo.
    echo Output file: dist\nop-portable-windows.exe
    echo.
    echo Next steps:
    echo   1. Test: dist\nop-portable-windows.exe --version
    echo   2. Initialize: dist\nop-portable-windows.exe --init
    echo   3. Run: dist\nop-portable-windows.exe
    echo.
) else (
    echo Build failed!
    exit /b 1
)
