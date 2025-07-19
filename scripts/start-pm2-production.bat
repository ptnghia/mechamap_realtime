@echo off
REM =============================================================================
REM MechaMap Realtime Server - Production Startup Script
REM =============================================================================
REM This script starts the MechaMap Realtime Server in PRODUCTION mode using PM2

echo Starting MechaMap Realtime Server in PRODUCTION mode...

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

REM Check if production environment file exists
if not exist ".env.production" (
    echo ERROR: .env.production file not found
    echo Please create .env.production file for production environment
    pause
    exit /b 1
)

REM Stop development server if running
pm2 list | findstr "mechamap-realtime-dev" >nul 2>&1
if %errorlevel% equ 0 (
    echo Stopping development server first...
    pm2 stop mechamap-realtime-dev
)

REM Check if the production process is already running
pm2 list | findstr "mechamap-realtime-prod" >nul 2>&1
if %errorlevel% equ 0 (
    echo MechaMap Realtime Server (Production) is already running
    pm2 status
) else (
    echo Starting MechaMap Realtime Server (Production - Cluster Mode)...
    pm2 start ecosystem.config.js --only mechamap-realtime-prod
    if %errorlevel% equ 0 (
        echo ✅ MechaMap Realtime Server started successfully in PRODUCTION mode!
        pm2 status
    ) else (
        echo ❌ Failed to start MechaMap Realtime Server in production mode
        pause
        exit /b 1
    )
)

echo.
echo 🌐 Server should be running on http://localhost:3000 (Production Mode)
echo 📊 Use 'pm2 monit' to monitor the server
echo 📋 Use 'pm2 logs mechamap-realtime-prod' to view logs
echo 🛑 Use 'pm2 stop mechamap-realtime-prod' to stop the server
echo ⚠️  Production mode uses cluster with 2 instances

REM Keep window open for 5 seconds
timeout /t 5 /nobreak >nul
