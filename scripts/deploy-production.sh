#!/bin/bash

# =============================================================================
# MechaMap Realtime Server - Production Deployment Script
# =============================================================================

set -e  # Exit on any error

echo "🚀 MechaMap Realtime Server - Production Deployment"
echo "=================================================="

# Configuration
PROJECT_DIR="/home/mechamap/mechamap_realtime"
BACKUP_DIR="/home/mechamap/backups"
LOG_FILE="/var/log/mechamap/realtime-deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a $LOG_FILE
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a $LOG_FILE
}

# Check if running as correct user
if [ "$(whoami)" != "mechamap" ]; then
    error "This script should be run as 'mechamap' user"
    exit 1
fi

# Create necessary directories
mkdir -p $BACKUP_DIR
sudo mkdir -p $(dirname $LOG_FILE)
sudo chown mechamap:mechamap $(dirname $LOG_FILE)

log "Starting deployment process..."

# 1. Backup current application
log "📦 Creating backup..."
BACKUP_NAME="realtime-backup-$(date +%Y%m%d_%H%M%S)"
tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C $(dirname $PROJECT_DIR) $(basename $PROJECT_DIR) --exclude=node_modules --exclude=logs

# 2. Pull latest code
log "📥 Pulling latest code..."
cd $PROJECT_DIR
git fetch origin
git reset --hard origin/main

# 3. Check environment configuration
log "🔍 Validating environment configuration..."
if [ ! -f ".env.production" ]; then
    error ".env.production file not found!"
    error "Please copy .env.production.template to .env.production and configure it"
    exit 1
fi

# 4. Install/Update dependencies
log "📦 Installing dependencies..."
npm ci --production

# 5. Validate environment configuration
log "🔍 Validating Node.js environment..."
NODE_ENV=production node scripts/load-env.js

# 6. Stop existing PM2 processes
log "🛑 Stopping existing processes..."
pm2 delete mechamap-realtime || true

# 7. Start application with PM2
log "🚀 Starting application..."
npm run pm2:start:production

# 8. Wait for application to start
log "⏳ Waiting for application to start..."
sleep 5

# 9. Check PM2 status
log "📊 Checking PM2 status..."
pm2 status

# 10. Test application health
log "🧪 Testing application health..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ "$HEALTH_CHECK" = "200" ]; then
    log "✅ Application health check passed"
else
    error "❌ Application health check failed (HTTP $HEALTH_CHECK)"
    pm2 logs mechamap-realtime --lines 20
    exit 1
fi

# 11. Test external health (through Nginx)
log "🧪 Testing external health..."
EXTERNAL_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://realtime.mechamap.com/api/health)
if [ "$EXTERNAL_HEALTH" = "200" ]; then
    log "✅ External health check passed"
else
    warning "⚠️  External health check failed (HTTP $EXTERNAL_HEALTH)"
    warning "   This might be due to Nginx configuration or SSL issues"
fi

# 12. Test Laravel API connection
log "🧪 Testing Laravel API connection..."
LARAVEL_API_KEY=$(grep LARAVEL_API_KEY .env.production | cut -d '=' -f2)
LARAVEL_TEST=$(curl -s -o /dev/null -w "%{http_code}" https://mechamap.com/api/websocket-api/health -H "X-WebSocket-API-Key: $LARAVEL_API_KEY")
if [ "$LARAVEL_TEST" = "200" ]; then
    log "✅ Laravel API connection test passed"
else
    warning "⚠️  Laravel API connection test failed (HTTP $LARAVEL_TEST)"
fi

# 13. Save PM2 configuration
log "💾 Saving PM2 configuration..."
pm2 save

# 14. Setup PM2 startup (if not already done)
log "🔄 Setting up PM2 startup..."
pm2 startup systemd -u mechamap --hp /home/mechamap || true

# 15. Clean up old backups (keep last 7 days)
log "🧹 Cleaning up old backups..."
find $BACKUP_DIR -name "realtime-backup-*.tar.gz" -mtime +7 -delete

# 16. Clean up old logs
log "🧹 Cleaning up old logs..."
find /var/log/mechamap -name "*.log" -mtime +30 -delete || true

log "✅ Deployment completed successfully!"
log "📊 Deployment Summary:"
log "   - Backup created: $BACKUP_NAME.tar.gz"
log "   - Application URL: https://realtime.mechamap.com"
log "   - PM2 Process: mechamap-realtime"
log "   - Log file: $LOG_FILE"

echo ""
echo "🎉 MechaMap Realtime Server deployed successfully!"
echo "   Monitor PM2: pm2 monit"
echo "   View logs: pm2 logs mechamap-realtime"
echo "   Check status: pm2 status"

# Display current status
echo ""
echo "📊 Current Status:"
pm2 status mechamap-realtime
