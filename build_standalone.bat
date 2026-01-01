@echo off
REM Build script for Windows
REM This script builds the Python backend and packages the Electron app

echo =========================================
echo Building Standalone App for Windows
echo =========================================

REM Step 1: Build Python backend
echo.
echo Step 1: Building Python backend with PyInstaller...
cd backend

if not exist "dist\backend.exe" (
    echo Building backend executable...
    pyinstaller backend.spec
) else (
    echo Backend already built. Remove backend\dist\backend.exe to rebuild.
)

REM Check if backend was built successfully
if not exist "dist\backend.exe" (
    echo Error: Backend executable not found at backend\dist\backend.exe
    exit /b 1
)

echo Backend built successfully
cd ..

REM Step 2: Build and package Electron app
echo.
echo Step 2: Building Electron app...
call npm run build:win

echo.
echo =========================================
echo Build Complete!
echo =========================================
echo.
echo Your app is ready at:
echo   dist\win-unpacked\*.exe
echo   dist\*.exe (installer)
echo.
