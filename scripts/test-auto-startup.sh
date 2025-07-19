#!/bin/bash

echo "🔄 Testing PM2 Auto-Startup Configuration"
echo "=========================================="

echo "📋 Current PM2 Status:"
pm2 status

echo ""
echo "🔧 Systemd Service Status:"
systemctl status pm2-root --no-pager

echo ""
echo "✅ Service Enabled Check:"
if systemctl is-enabled pm2-root >/dev/null 2>&1; then
    echo "✅ pm2-root service is ENABLED for auto-start"
else
    echo "❌ pm2-root service is NOT enabled"
fi

echo ""
echo "📁 PM2 Dump File Check:"
if [ -f "/root/.pm2/dump.pm2" ]; then
    echo "✅ PM2 dump file exists: /root/.pm2/dump.pm2"
    echo "   Size: $(du -h /root/.pm2/dump.pm2 | cut -f1)"
    echo "   Modified: $(stat -c %y /root/.pm2/dump.pm2)"
else
    echo "❌ PM2 dump file missing!"
fi

echo ""
echo "🔍 PM2 Startup Script Check:"
if [ -f "/etc/systemd/system/pm2-root.service" ]; then
    echo "✅ Systemd service file exists"
    echo "   Service: $(systemctl is-active pm2-root)"
    echo "   Enabled: $(systemctl is-enabled pm2-root)"
else
    echo "❌ Systemd service file missing!"
fi

echo ""
echo "🎯 Auto-Startup Test Summary:"
echo "=============================="

# Check all conditions
ALL_OK=true

if ! systemctl is-enabled pm2-root >/dev/null 2>&1; then
    echo "❌ Service not enabled"
    ALL_OK=false
fi

if ! systemctl is-active pm2-root >/dev/null 2>&1; then
    echo "❌ Service not active"
    ALL_OK=false
fi

if [ ! -f "/root/.pm2/dump.pm2" ]; then
    echo "❌ Dump file missing"
    ALL_OK=false
fi

if [ "$ALL_OK" = true ]; then
    echo "🎉 ALL CHECKS PASSED - PM2 will auto-start on reboot!"
    echo ""
    echo "📝 What happens on reboot:"
    echo "   1. Systemd starts pm2-root.service"
    echo "   2. PM2 resurrects processes from dump.pm2"
    echo "   3. MechaMap Realtime Server starts automatically"
else
    echo "⚠️ SOME CHECKS FAILED - Auto-startup may not work!"
fi

echo ""
echo "🔧 Manual Commands:"
echo "   Start service: sudo systemctl start pm2-root"
echo "   Stop service:  sudo systemctl stop pm2-root"
echo "   Restart:       sudo systemctl restart pm2-root"
echo "   Status:        sudo systemctl status pm2-root"
echo "   Logs:          sudo journalctl -u pm2-root -f"
