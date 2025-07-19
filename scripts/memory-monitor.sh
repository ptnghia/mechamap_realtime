#!/bin/bash

# MechaMap Realtime Server Memory Monitor
# Usage: ./scripts/memory-monitor.sh

echo "🧠 Memory Monitoring Dashboard"
echo "=============================="

# System memory
echo "💻 System Memory:"
free -h

echo ""
echo "📊 PM2 Process Memory:"
pm2 status mechamap-realtime

echo ""
echo "🔍 Detailed Memory Analysis:"
curl -s https://realtime.mechamap.com/api/memory | head -500

echo ""
echo "⚠️ Memory Alerts:"

# Check heap usage
HEAP_USAGE=$(curl -s https://realtime.mechamap.com/api/memory | grep -o '"heapUsagePercent":[0-9.]*' | cut -d':' -f2)

if (( $(echo "$HEAP_USAGE > 85" | bc -l) )); then
    echo "🔴 CRITICAL: Heap usage ${HEAP_USAGE}% > 85%"
    echo "   Action: Restarting PM2 instances..."
    pm2 reload mechamap-realtime
elif (( $(echo "$HEAP_USAGE > 75" | bc -l) )); then
    echo "🟡 WARNING: Heap usage ${HEAP_USAGE}% > 75%"
    echo "   Action: Monitoring closely..."
else
    echo "🟢 HEALTHY: Heap usage ${HEAP_USAGE}% is normal"
fi

echo ""
echo "📈 Memory Trend (last 5 minutes):"
tail -20 logs/app.log | grep -i "memory\|heap\|gc" | tail -5
