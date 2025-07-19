#!/bin/bash

echo "🔧 Setting up PM2 monitoring cron jobs..."

# Add health check every 5 minutes
HEALTH_CHECK_PATH="/var/www/realtime_mec_usr/data/www/realtime.mechamap.com/scripts/pm2-health-check.sh"

# Remove existing cron jobs for PM2 health check
crontab -l 2>/dev/null | grep -v "pm2-health-check" | crontab -

# Add new cron job
(crontab -l 2>/dev/null; echo "*/5 * * * * $HEALTH_CHECK_PATH") | crontab -

echo "✅ PM2 health check cron job added (every 5 minutes)"

# Show current crontab
echo ""
echo "📋 Current cron jobs:"
crontab -l

echo ""
echo "📝 Monitoring setup complete!"
echo "   - Health check: Every 5 minutes"
echo "   - Log file: /var/log/pm2-health-check.log"
echo "   - Auto-restart: If PM2 or processes fail"
