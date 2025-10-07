#!/bin/bash

# MechaMap Realtime Server - Optimized Startup Script
# This script starts the server with memory optimization settings

echo "🚀 Starting MechaMap Realtime Server with Memory Optimization..."

# Set Node.js memory optimization flags
export NODE_OPTIONS="--max-old-space-size=400 --optimize-for-size --expose-gc --gc-interval=100"

# Set environment
export NODE_ENV=production

# Memory monitoring
echo "📊 Current system memory:"
free -h

echo "🔧 Node.js optimization flags:"
echo "  - Max old space size: 400MB"
echo "  - Optimize for size: enabled"
echo "  - Garbage collection: exposed"
echo "  - GC interval: 100ms"

# Check if PM2 is running
if pgrep -f "pm2" > /dev/null; then
    echo "🔄 Restarting with PM2..."
    pm2 restart ecosystem.config.js --env production
else
    echo "🆕 Starting with PM2..."
    pm2 start ecosystem.config.js --env production
fi

# Show PM2 status
echo "📋 PM2 Status:"
pm2 status

# Show memory usage
echo "💾 Memory usage after startup:"
pm2 monit --no-daemon &
sleep 2
pkill -f "pm2 monit"

echo "✅ Server started successfully!"
echo "🌐 Access: https://realtime.mechamap.com"
echo "📊 Memory monitoring: https://realtime.mechamap.com/api/memory"
echo "🔧 Manual optimization: curl -X POST https://realtime.mechamap.com/api/memory/optimize"
