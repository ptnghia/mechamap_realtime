#!/bin/bash

# =============================================================================
# WebSocket Server Stability Monitor
# Monitors server health, connection stability, and auto-recovery
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/logs/stability-monitor.log"
ERROR_LOG="$PROJECT_DIR/logs/error.log"
HEALTH_URL="https://realtime.mechamap.com/api/health"
STATS_URL="https://realtime.mechamap.com/api/connections/stats"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CHECK_INTERVAL=30  # seconds
MAX_RESTARTS=5
RESTART_WINDOW=300 # 5 minutes
MEMORY_THRESHOLD=90 # percentage
ERROR_THRESHOLD=5   # errors per minute

# Counters
restart_count=0
last_restart_time=0

log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

check_server_health() {
    local response=$(curl -s --max-time 10 "$HEALTH_URL" 2>/dev/null)
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        echo "UNHEALTHY"
        return 1
    fi
    
    local status=$(echo "$response" | jq -r '.status' 2>/dev/null)
    if [ "$status" = "healthy" ]; then
        echo "HEALTHY"
        return 0
    else
        echo "UNHEALTHY"
        return 1
    fi
}

check_pm2_status() {
    local pm2_status=$(pm2 jlist | jq -r '.[0].pm2_env.status' 2>/dev/null)
    echo "$pm2_status"
}

get_memory_usage() {
    local response=$(curl -s --max-time 5 "$HEALTH_URL" 2>/dev/null)
    if [ $? -eq 0 ]; then
        local heap_used=$(echo "$response" | jq -r '.memory.heapUsed' 2>/dev/null)
        local heap_total=$(echo "$response" | jq -r '.memory.heapTotal' 2>/dev/null)
        
        if [ "$heap_used" != "null" ] && [ "$heap_total" != "null" ]; then
            local usage=$(echo "scale=2; $heap_used * 100 / $heap_total" | bc 2>/dev/null)
            echo "$usage"
        else
            echo "0"
        fi
    else
        echo "0"
    fi
}

count_recent_errors() {
    local current_time=$(date +%s)
    local one_minute_ago=$((current_time - 60))
    local error_count=0
    
    if [ -f "$ERROR_LOG" ]; then
        # Count errors in the last minute
        while IFS= read -r line; do
            if [[ $line == *"error"* ]] || [[ $line == *"Error"* ]] || [[ $line == *"ERROR"* ]]; then
                error_count=$((error_count + 1))
            fi
        done < <(tail -50 "$ERROR_LOG")
    fi
    
    echo "$error_count"
}

restart_server() {
    local reason=$1
    local current_time=$(date +%s)
    
    # Check restart limits
    if [ $((current_time - last_restart_time)) -gt $RESTART_WINDOW ]; then
        restart_count=0
    fi
    
    if [ $restart_count -ge $MAX_RESTARTS ]; then
        log_message "ERROR" "Max restart limit reached ($MAX_RESTARTS). Manual intervention required."
        return 1
    fi
    
    log_message "WARN" "Restarting server due to: $reason"
    
    cd "$PROJECT_DIR"
    pm2 restart mechamap-realtime
    
    if [ $? -eq 0 ]; then
        restart_count=$((restart_count + 1))
        last_restart_time=$current_time
        log_message "INFO" "Server restarted successfully (attempt $restart_count/$MAX_RESTARTS)"
        
        # Wait for server to stabilize
        sleep 10
        return 0
    else
        log_message "ERROR" "Failed to restart server"
        return 1
    fi
}

check_connection_stability() {
    local response=$(curl -s --max-time 5 "$STATS_URL" 2>/dev/null)
    if [ $? -eq 0 ]; then
        local duplicates=$(echo "$response" | jq -r '.data.duplicateConnections' 2>/dev/null)
        local throttled=$(echo "$response" | jq -r '.data.throttledUsers' 2>/dev/null)
        
        if [ "$duplicates" != "null" ] && [ "$duplicates" -gt 50 ]; then
            log_message "WARN" "High duplicate connections detected: $duplicates"
            return 1
        fi
        
        if [ "$throttled" != "null" ] && [ "$throttled" -gt 10 ]; then
            log_message "WARN" "High throttled users: $throttled"
            return 1
        fi
    fi
    
    return 0
}

main_monitor_loop() {
    log_message "INFO" "Starting WebSocket stability monitor (interval: ${CHECK_INTERVAL}s)"
    
    while true; do
        # Check PM2 status first
        pm2_status=$(check_pm2_status)
        
        if [ "$pm2_status" = "errored" ] || [ "$pm2_status" = "stopped" ]; then
            log_message "ERROR" "PM2 status: $pm2_status"
            restart_server "PM2 status: $pm2_status"
        else
            # Check server health
            health_status=$(check_server_health)
            
            if [ "$health_status" = "UNHEALTHY" ]; then
                log_message "ERROR" "Health check failed"
                restart_server "Health check failed"
            else
                # Check memory usage
                memory_usage=$(get_memory_usage)
                if [ $(echo "$memory_usage > $MEMORY_THRESHOLD" | bc 2>/dev/null) -eq 1 ]; then
                    log_message "WARN" "High memory usage: ${memory_usage}%"
                fi
                
                # Check error rate
                error_count=$(count_recent_errors)
                if [ "$error_count" -gt $ERROR_THRESHOLD ]; then
                    log_message "WARN" "High error rate: $error_count errors/minute"
                fi
                
                # Check connection stability
                check_connection_stability
                
                # Log status
                log_message "INFO" "Status: OK | Memory: ${memory_usage}% | Errors: ${error_count}/min"
            fi
        fi
        
        sleep $CHECK_INTERVAL
    done
}

# Command line interface
case "${1:-monitor}" in
    "monitor")
        main_monitor_loop
        ;;
    "check")
        echo -e "${BLUE}=== WebSocket Server Status ===${NC}"
        
        # PM2 Status
        pm2_status=$(check_pm2_status)
        if [ "$pm2_status" = "online" ]; then
            echo -e "PM2 Status: ${GREEN}$pm2_status${NC}"
        else
            echo -e "PM2 Status: ${RED}$pm2_status${NC}"
        fi
        
        # Health Check
        health_status=$(check_server_health)
        if [ "$health_status" = "HEALTHY" ]; then
            echo -e "Health: ${GREEN}$health_status${NC}"
        else
            echo -e "Health: ${RED}$health_status${NC}"
        fi
        
        # Memory Usage
        memory_usage=$(get_memory_usage)
        if [ $(echo "$memory_usage > $MEMORY_THRESHOLD" | bc 2>/dev/null) -eq 1 ]; then
            echo -e "Memory: ${RED}${memory_usage}%${NC}"
        else
            echo -e "Memory: ${GREEN}${memory_usage}%${NC}"
        fi
        
        # Error Count
        error_count=$(count_recent_errors)
        if [ "$error_count" -gt $ERROR_THRESHOLD ]; then
            echo -e "Errors: ${RED}${error_count}/min${NC}"
        else
            echo -e "Errors: ${GREEN}${error_count}/min${NC}"
        fi
        ;;
    "restart")
        restart_server "Manual restart"
        ;;
    "logs")
        tail -f "$LOG_FILE"
        ;;
    *)
        echo "Usage: $0 {monitor|check|restart|logs}"
        echo "  monitor  - Start continuous monitoring"
        echo "  check    - One-time status check"
        echo "  restart  - Manual server restart"
        echo "  logs     - View monitor logs"
        exit 1
        ;;
esac
