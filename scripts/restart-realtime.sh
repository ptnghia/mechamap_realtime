#!/bin/bash

# MechaMap Realtime Server Restart Script
# Usage: ./scripts/restart-realtime.sh

echo "🔄 Restarting MechaMap Realtime Server..."

# Graceful reload
pm2 reload mechamap-realtime

echo "✅ Restart completed!"
echo ""

# Show status
pm2 status mechamap-realtime

echo ""
echo "🌐 Testing health endpoint..."
sleep 3
curl -s https://realtime.mechamap.com/api/health | head -200
