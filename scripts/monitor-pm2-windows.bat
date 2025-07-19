@echo off
REM =============================================================================
REM MechaMap Realtime Server - Windows Monitor Script
REM =============================================================================
REM This script opens PM2 monitoring interface for MechaMap Realtime Server

echo Opening PM2 Monitor for MechaMap Realtime Server...

REM Change to the realtime-server directory
cd /d "D:\xampp\htdocs\laravel\mechamap_backend\realtime-server"

REM Check if PM2 is installed
pm2 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PM2 is not installed or not in PATH
    pause
    exit /b 1
)

REM Show current status first
echo Current PM2 Status:
pm2 status

echo.
echo Opening PM2 Monitor...
echo Press Ctrl+C to exit monitor mode
echo.

REM Open PM2 monitor
pm2 monit
