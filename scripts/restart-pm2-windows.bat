@echo off
REM =============================================================================
REM MechaMap Realtime Server - Windows Restart Script
REM =============================================================================
REM This script restarts the MechaMap Realtime Server running with PM2

echo Restarting MechaMap Realtime Server...

REM Change to the realtime-server directory
cd /d "D:\xampp\htdocs\laravel\mechamap_backend\realtime-server"

REM Check if PM2 is installed
pm2 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PM2 is not installed or not in PATH
    pause
    exit /b 1
)

REM Restart the server
pm2 restart mechamap-realtime-dev
if %errorlevel% equ 0 (
    echo ✅ MechaMap Realtime Server restarted successfully!
) else (
    echo ❌ Failed to restart MechaMap Realtime Server
    echo Trying to start it instead...
    pm2 start ecosystem.config.js --only mechamap-realtime-dev
)

REM Show current status
pm2 status

echo.
echo 🔄 Server has been restarted
echo 🌐 Server should be running on http://localhost:3000
echo 📊 Use 'pm2 monit' to monitor the server

pause
