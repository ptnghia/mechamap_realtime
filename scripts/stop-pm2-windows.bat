@echo off
REM =============================================================================
REM MechaMap Realtime Server - Windows Stop Script
REM =============================================================================
REM This script stops the MechaMap Realtime Server running with PM2

echo Stopping MechaMap Realtime Server...

REM Change to the realtime-server directory
cd /d "D:\xampp\htdocs\laravel\mechamap_backend\realtime-server"

REM Check if PM2 is installed
pm2 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PM2 is not installed or not in PATH
    pause
    exit /b 1
)

REM Stop the server
pm2 stop mechamap-realtime-dev
if %errorlevel% equ 0 (
    echo ✅ MechaMap Realtime Server stopped successfully!
) else (
    echo ❌ Failed to stop MechaMap Realtime Server or it was not running
)

REM Show current status
pm2 status

echo.
echo 🛑 Server has been stopped
echo 🚀 Use 'start-pm2-windows.bat' to start the server again

pause
