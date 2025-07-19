@echo off
REM =============================================================================
REM MechaMap Realtime Server - Windows Startup Script
REM =============================================================================
REM This script starts the MechaMap Realtime Server using PM2 on Windows
REM Place this in Windows Startup folder for auto-start on boot

echo Starting MechaMap Realtime Server with PM2...

REM Change to the realtime-server directory
cd /d "D:\xampp\htdocs\laravel\mechamap_backend\realtime-server"

REM Check if PM2 is installed
pm2 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PM2 is not installed or not in PATH
    echo Please install PM2 globally: npm install -g pm2
    pause
    exit /b 1
)

REM Check if the process is already running
pm2 list | findstr "mechamap-realtime-dev" >nul 2>&1
if %errorlevel% equ 0 (
    echo MechaMap Realtime Server (Development) is already running
    pm2 status
) else (
    echo Starting MechaMap Realtime Server (Development)...
    pm2 start ecosystem.config.js --only mechamap-realtime-dev
    if %errorlevel% equ 0 (
        echo ✅ MechaMap Realtime Server started successfully!
        pm2 status
    ) else (
        echo ❌ Failed to start MechaMap Realtime Server
        pause
        exit /b 1
    )
)

echo.
echo 🌐 Server should be running on http://localhost:3000
echo 📊 Use 'pm2 monit' to monitor the server
echo 📋 Use 'pm2 logs mechamap-realtime-dev' to view logs
echo 🛑 Use 'pm2 stop mechamap-realtime-dev' to stop the server

REM Keep window open for 5 seconds
timeout /t 5 /nobreak >nul
