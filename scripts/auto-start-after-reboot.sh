#!/bin/bash

# =============================================================================
# MechaMap Realtime Server - Auto Start After Reboot Script
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

echo -e "${BLUE}🔄 MechaMap Realtime Server - Auto Start After Reboot${NC}"
echo "============================================================"

# Change to app directory
cd "$APP_DIR"

# Check if PM2 is running
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 is not installed or not in PATH${NC}"
    exit 1
fi

# Check if processes are already running
if pm2 list | grep -q "$APP_NAME"; then
    echo -e "${GREEN}✅ MechaMap Realtime Server is already running${NC}"
    pm2 status
    exit 0
fi

echo -e "${YELLOW}⚠️  MechaMap Realtime Server is not running. Starting...${NC}"

# Create logs directory
mkdir -p logs

# Start with PM2
echo -e "${BLUE}🚀 Starting PM2 processes...${NC}"
NODE_ENV=production pm2 start ecosystem.config.js --env production

# Save PM2 configuration
echo -e "${BLUE}💾 Saving PM2 configuration...${NC}"
pm2 save

# Wait a moment for processes to stabilize
sleep 5

# Check status
echo -e "${BLUE}📊 Checking server status...${NC}"
pm2 status

# Health check
echo -e "${BLUE}🏥 Performing health check...${NC}"
if curl -f -s https://realtime.mechamap.com/api/health > /dev/null; then
    echo -e "${GREEN}✅ Health check passed - Server is responding${NC}"
else
    echo -e "${RED}❌ Health check failed - Server may not be ready yet${NC}"
fi

echo -e "${GREEN}✅ MechaMap Realtime Server auto-start completed!${NC}"
echo "============================================================"
