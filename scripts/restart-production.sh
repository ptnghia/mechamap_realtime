#!/bin/bash

# Production Restart Script for MechaMap Realtime Server
# This script checks environment configuration and restarts the PM2 process

# Set script to exit on error
set -e

echo "🚀 MechaMap Realtime Server - Production Restart"
echo "================================================"

# Check if running as root
if [ "$(id -u)" -eq 0 ]; then
  echo "⚠️  Warning: Running as root. Consider using a dedicated user account."
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
  echo "❌ PM2 is not installed. Please install PM2 globally:"
  echo "   npm install -g pm2"
  exit 1
fi

# Check if ecosystem.config.js exists
if [ ! -f "ecosystem.config.js" ]; then
  echo "❌ ecosystem.config.js not found in current directory."
  echo "   Please run this script from the project root directory."
  exit 1
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
  echo "❌ .env.production file not found."
  echo "   Please create a .env.production file with production settings."
  exit 1
fi

# Check JWT_SECRET in .env.production
if grep -q "JWT_SECRET=your_super_secure_production_jwt_secret_key_here" .env.production; then
  echo "❌ Default JWT_SECRET detected in .env.production."
  echo "   Please update JWT_SECRET with a secure value."
  exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed."
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)

if [ "$NODE_MAJOR_VERSION" -lt 18 ]; then
  echo "❌ Node.js version $NODE_VERSION is too old."
  echo "   Please use Node.js v18.0.0 or higher."
  exit 1
fi

echo "✅ Node.js version: $NODE_VERSION"

# Check environment configuration
echo "🔍 Checking environment configuration..."
NODE_ENV=production node scripts/load-env.js

if [ $? -ne 0 ]; then
  echo "❌ Environment configuration check failed."
  exit 1
fi

# Check if PM2 process exists
PM2_PROCESS_EXISTS=$(pm2 list | grep -c "mechamap-realtime" || true)

if [ "$PM2_PROCESS_EXISTS" -gt 0 ]; then
  echo "🔄 Reloading existing PM2 process..."
  pm2 reload mechamap-realtime --env production
else
  echo "🚀 Starting new PM2 process..."
  pm2 start ecosystem.config.js --env production
fi

# Save PM2 process list
pm2 save

echo "✅ PM2 process started/reloaded successfully."

# Check if process is running
sleep 2
PM2_PROCESS_RUNNING=$(pm2 list | grep "mechamap-realtime" | grep -c "online" || true)

if [ "$PM2_PROCESS_RUNNING" -gt 0 ]; then
  echo "✅ Process is running."
else
  echo "❌ Process failed to start. Check logs:"
  echo "   pm2 logs mechamap-realtime"
  exit 1
fi

# Check health endpoint
echo "🔍 Checking health endpoint..."
sleep 3

if command -v curl &> /dev/null; then
  HEALTH_CHECK=$(curl -s http://localhost:3000/api/health)
  
  if [ $? -eq 0 ]; then
    echo "✅ Health check passed."
  else
    echo "❌ Health check failed."
    echo "   Check logs: pm2 logs mechamap-realtime"
    exit 1
  fi
else
  echo "⚠️  curl not found, skipping health check."
fi

echo "================================================"
echo "✅ MechaMap Realtime Server is running in production mode."
echo "   Monitor with: pm2 monit"
echo "   View logs with: pm2 logs mechamap-realtime"
echo "================================================"
