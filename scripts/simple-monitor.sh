#!/bin/bash

# Simple WebSocket Server Monitor
# Checks server health and provides basic monitoring

HEALTH_URL="https://realtime.mechamap.com/api/health"
STATS_URL="https://realtime.mechamap.com/api/connections/stats"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

check_health() {
    echo -e "${BLUE}=== WebSocket Server Health Check ===${NC}"
    echo ""
    
    # Check PM2 Status
    echo -n "PM2 Status: "
    PM2_STATUS=$(pm2 list | grep mechamap-realtime | awk '{print $10}')
    if [ "$PM2_STATUS" = "online" ]; then
        echo -e "${GREEN}$PM2_STATUS${NC}"
    else
        echo -e "${RED}$PM2_STATUS${NC}"
    fi
    
    # Check Health Endpoint
    echo -n "Health API: "
    HEALTH_RESPONSE=$(curl -s --max-time 5 "$HEALTH_URL" 2>/dev/null)
    if [ $? -eq 0 ]; then
        STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status' 2>/dev/null)
        if [ "$STATUS" = "healthy" ]; then
            echo -e "${GREEN}$STATUS${NC}"
        else
            echo -e "${RED}$STATUS${NC}"
        fi
        
        # Memory info
        HEAP_USED=$(echo "$HEALTH_RESPONSE" | jq -r '.memory.heapUsed' 2>/dev/null)
        HEAP_TOTAL=$(echo "$HEALTH_RESPONSE" | jq -r '.memory.heapTotal' 2>/dev/null)
        if [ "$HEAP_USED" != "null" ] && [ "$HEAP_TOTAL" != "null" ]; then
            HEAP_USED_MB=$((HEAP_USED / 1024 / 1024))
            HEAP_TOTAL_MB=$((HEAP_TOTAL / 1024 / 1024))
            USAGE_PERCENT=$((HEAP_USED * 100 / HEAP_TOTAL))
            echo "Memory: ${HEAP_USED_MB}MB / ${HEAP_TOTAL_MB}MB (${USAGE_PERCENT}%)"
        fi
        
        # Uptime
        UPTIME=$(echo "$HEALTH_RESPONSE" | jq -r '.uptime' 2>/dev/null)
        if [ "$UPTIME" != "null" ]; then
            UPTIME_MIN=$((${UPTIME%.*} / 60))
            echo "Uptime: ${UPTIME_MIN} minutes"
        fi
    else
        echo -e "${RED}FAILED${NC}"
    fi
    
    # Check Connection Stats
    echo -n "Connections: "
    STATS_RESPONSE=$(curl -s --max-time 5 "$STATS_URL" 2>/dev/null)
    if [ $? -eq 0 ]; then
        ACTIVE=$(echo "$STATS_RESPONSE" | jq -r '.data.activeConnections' 2>/dev/null)
        DUPLICATES=$(echo "$STATS_RESPONSE" | jq -r '.data.duplicateConnections' 2>/dev/null)
        THROTTLED=$(echo "$STATS_RESPONSE" | jq -r '.data.throttledUsers' 2>/dev/null)
        
        echo "Active: $ACTIVE, Duplicates: $DUPLICATES, Throttled: $THROTTLED"
        
        if [ "$DUPLICATES" -gt 20 ]; then
            echo -e "${YELLOW}⚠️  High duplicate connections detected${NC}"
        fi
    else
        echo -e "${RED}FAILED${NC}"
    fi
    
    echo ""
}

check_logs() {
    echo -e "${BLUE}=== Recent Error Logs ===${NC}"
    echo ""
    
    if [ -f "logs/error.log" ]; then
        echo "Last 5 errors:"
        tail -10 logs/error.log | grep -i error | tail -5
    else
        echo "No error log found"
    fi
    
    echo ""
    echo -e "${BLUE}=== Recent Output Logs ===${NC}"
    echo ""
    
    if [ -f "logs/out.log" ]; then
        echo "Last 5 log entries:"
        tail -5 logs/out.log
    else
        echo "No output log found"
    fi
    
    echo ""
}

restart_server() {
    echo -e "${YELLOW}Restarting WebSocket server...${NC}"
    pm2 restart mechamap-realtime
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Server restarted successfully${NC}"
        sleep 5
        check_health
    else
        echo -e "${RED}❌ Failed to restart server${NC}"
    fi
}

monitor_loop() {
    echo -e "${BLUE}Starting continuous monitoring (Ctrl+C to stop)${NC}"
    echo ""
    
    while true; do
        clear
        echo "$(date '+%Y-%m-%d %H:%M:%S')"
        check_health
        
        # Check if server is unhealthy
        PM2_STATUS=$(pm2 list | grep mechamap-realtime | awk '{print $10}')
        if [ "$PM2_STATUS" != "online" ]; then
            echo -e "${RED}🚨 Server is not online! Status: $PM2_STATUS${NC}"
        fi
        
        sleep 30
    done
}

# Command line interface
case "${1:-check}" in
    "check"|"status")
        check_health
        ;;
    "logs")
        check_logs
        ;;
    "restart")
        restart_server
        ;;
    "monitor")
        monitor_loop
        ;;
    "full")
        check_health
        check_logs
        ;;
    *)
        echo "Usage: $0 {check|logs|restart|monitor|full}"
        echo ""
        echo "Commands:"
        echo "  check    - Check server health (default)"
        echo "  logs     - Show recent logs"
        echo "  restart  - Restart the server"
        echo "  monitor  - Continuous monitoring"
        echo "  full     - Full check (health + logs)"
        echo ""
        exit 1
        ;;
esac
