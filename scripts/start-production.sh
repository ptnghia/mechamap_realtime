#!/bin/bash

# =============================================================================
# MechaMap Realtime Server - Production Startup Script
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="mechamap-realtime"
APP_DIR="/var/www/realtime_mec_usr/data/www/realtime.mechamap.com"
LOG_DIR="$APP_DIR/logs"
ENV_FILE="$APP_DIR/.env.production"

echo -e "${BLUE}🚀 Starting MechaMap Realtime Server in Production Mode${NC}"
echo "============================================================"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should not be run as root${NC}"
   exit 1
fi

# Change to app directory
cd "$APP_DIR"
echo -e "${BLUE}📁 Working directory: $(pwd)${NC}"

# Check if .env.production exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Production environment file not found: $ENV_FILE${NC}"
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"
echo -e "${GREEN}✅ Logs directory ready: $LOG_DIR${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 not found. Installing PM2...${NC}"
    npm install -g pm2
fi

# Stop existing PM2 processes
echo -e "${YELLOW}🛑 Stopping existing PM2 processes...${NC}"
pm2 stop "$APP_NAME" 2>/dev/null || echo "No existing process to stop"
pm2 delete "$APP_NAME" 2>/dev/null || echo "No existing process to delete"

# Check Node.js version
NODE_VERSION=$(node --version)
echo -e "${BLUE}📋 Node.js version: $NODE_VERSION${NC}"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm ci --production
fi

# Validate environment configuration
echo -e "${BLUE}🔍 Validating environment configuration...${NC}"
node scripts/load-env.js --env=production

# Start with PM2
echo -e "${GREEN}🚀 Starting server with PM2...${NC}"
NODE_ENV=production pm2 start ecosystem.config.js --env production

# Show PM2 status
echo -e "${GREEN}📊 PM2 Status:${NC}"
pm2 status

# Show logs
echo -e "${BLUE}📝 Recent logs:${NC}"
pm2 logs "$APP_NAME" --lines 10

# Setup PM2 startup script
echo -e "${YELLOW}⚙️  Setting up PM2 startup script...${NC}"
pm2 save
pm2 startup

echo ""
echo -e "${GREEN}✅ MechaMap Realtime Server started successfully!${NC}"
echo -e "${BLUE}🌐 Server should be running on: http://localhost:3000${NC}"
echo -e "${BLUE}📊 Monitor with: pm2 monit${NC}"
echo -e "${BLUE}📝 View logs with: pm2 logs $APP_NAME${NC}"
echo -e "${BLUE}🔄 Restart with: pm2 restart $APP_NAME${NC}"
echo ""
