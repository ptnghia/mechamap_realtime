#!/bin/bash

# PM2 Health Check Script
# Usage: ./scripts/pm2-health-check.sh

LOG_FILE="/var/log/pm2-health-check.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] PM2 Health Check Started" >> $LOG_FILE

# Check if PM2 daemon is running
if ! pgrep -f "PM2.*God Daemon" > /dev/null; then
    echo "[$TIMESTAMP] ERROR: PM2 daemon not running!" >> $LOG_FILE
    systemctl restart pm2-root
    echo "[$TIMESTAMP] ACTION: Restarted pm2-root service" >> $LOG_FILE
    exit 1
fi

# Check if systemd service is active
if ! systemctl is-active pm2-root >/dev/null 2>&1; then
    echo "[$TIMESTAMP] ERROR: pm2-root service not active!" >> $LOG_FILE
    systemctl start pm2-root
    echo "[$TIMESTAMP] ACTION: Started pm2-root service" >> $LOG_FILE
    exit 1
fi

# Check if MechaMap processes are running
MECHAMAP_COUNT=$(pm2 list | grep mechamap-realtime | grep online | wc -l)
if [ "$MECHAMAP_COUNT" -lt 2 ]; then
    echo "[$TIMESTAMP] ERROR: Only $MECHAMAP_COUNT MechaMap instances running (expected 2)" >> $LOG_FILE
    pm2 restart mechamap-realtime
    echo "[$TIMESTAMP] ACTION: Restarted mechamap-realtime processes" >> $LOG_FILE
    exit 1
fi

# Check if health endpoint responds
if ! curl -s --max-time 10 https://realtime.mechamap.com/api/health >/dev/null; then
    echo "[$TIMESTAMP] ERROR: Health endpoint not responding!" >> $LOG_FILE
    pm2 reload mechamap-realtime
    echo "[$TIMESTAMP] ACTION: Reloaded mechamap-realtime processes" >> $LOG_FILE
    exit 1
fi

echo "[$TIMESTAMP] SUCCESS: All PM2 health checks passed" >> $LOG_FILE
exit 0
