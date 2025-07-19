#!/bin/bash

# Setup cron job for memory monitoring
SCRIPT_PATH="/var/www/realtime_mec_usr/data/www/realtime.mechamap.com/scripts/memory-monitor.sh"

echo "🕐 Setting up memory monitoring cron job..."

# Add cron job to run every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * $SCRIPT_PATH >> /var/log/mechamap-memory.log 2>&1") | crontab -

echo "✅ Cron job added: Memory monitoring every 5 minutes"
echo "📝 Logs will be saved to: /var/log/mechamap-memory.log"

# Show current crontab
echo ""
echo "📋 Current cron jobs:"
crontab -l
