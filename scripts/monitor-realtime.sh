#!/bin/bash

# MechaMap Realtime Server Monitoring Script
# Usage: ./scripts/monitor-realtime.sh

echo "🔍 MechaMap Realtime Server Monitoring"
echo "======================================"

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status mechamap-realtime

echo ""
echo "🌐 Health Check:"
curl -s https://realtime.mechamap.com/api/health | head -200

echo ""
echo "📈 Metrics:"
curl -s https://realtime.mechamap.com/api/metrics | head -200

echo ""
echo "📝 Recent Logs (last 10 lines):"
pm2 logs mechamap-realtime --lines 10 --nostream

echo ""
echo "💾 Memory Usage:"
free -h

echo ""
echo "🔧 PM2 Configuration:"
echo "Max Memory Restart: $(pm2 show mechamap-realtime | grep 'max memory restart' || echo 'Not set')"
echo "Instances: $(pm2 list | grep mechamap-realtime | wc -l)"
