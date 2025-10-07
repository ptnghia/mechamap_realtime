#!/bin/bash

# =============================================================================
# MechaMap Realtime Server - System Test Suite
# Comprehensive testing using cURL for production environment
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="https://realtime.mechamap.com"
TIMEOUT=10
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test results array
declare -a TEST_RESULTS=()

echo -e "${BLUE}🧪 MechaMap Realtime Server - System Test Suite${NC}"
echo "=================================================================="
echo -e "${BLUE}🎯 Target: $DOMAIN${NC}"
echo -e "${BLUE}⏱️  Timeout: ${TIMEOUT}s per test${NC}"
echo -e "${BLUE}📅 Started: $(date)${NC}"
echo ""

# Helper function to run test
run_test() {
    local test_name="$1"
    local url="$2"
    local expected_status="$3"
    local method="${4:-GET}"
    local data="$5"
    local headers="$6"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${CYAN}📡 Test $TOTAL_TESTS: $test_name${NC}"
    echo "   URL: $url"
    echo "   Method: $method"
    
    # Build curl command
    local curl_cmd="curl -s -w '%{http_code}|%{time_total}|%{size_download}' --max-time $TIMEOUT"
    
    if [ "$method" != "GET" ]; then
        curl_cmd="$curl_cmd -X $method"
    fi
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data' -H 'Content-Type: application/json'"
    fi
    
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    
    curl_cmd="$curl_cmd '$url'"
    
    # Execute test
    local start_time=$(date +%s.%N)
    local response=$(eval $curl_cmd 2>/dev/null || echo "ERROR|0|0")
    local end_time=$(date +%s.%N)
    
    # Parse response
    local body=$(echo "$response" | sed 's/|[^|]*|[^|]*$//')
    local status_info=$(echo "$response" | grep -o '[^|]*|[^|]*|[^|]*$' || echo "000|0|0")
    local status_code=$(echo "$status_info" | cut -d'|' -f1)
    local response_time=$(echo "$status_info" | cut -d'|' -f2)
    local response_size=$(echo "$status_info" | cut -d'|' -f3)
    
    # Calculate total time
    local total_time=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
    
    # Check result
    if [[ "$status_code" == "$expected_status" ]] || [[ "$expected_status" == "2xx" && "$status_code" =~ ^2[0-9][0-9]$ ]]; then
        echo -e "   ${GREEN}✅ PASS${NC} - Status: $status_code, Time: ${response_time}s, Size: ${response_size}B"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        TEST_RESULTS+=("PASS|$test_name|$status_code|$response_time")
        
        # Show response preview for successful JSON responses
        if [[ "$body" =~ ^\{.*\}$ ]] && [ ${#body} -gt 10 ]; then
            echo "   📄 Response: $(echo "$body" | cut -c1-100)..."
        fi
    else
        echo -e "   ${RED}❌ FAIL${NC} - Expected: $expected_status, Got: $status_code"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TEST_RESULTS+=("FAIL|$test_name|$status_code|$response_time")
        
        if [ "$status_code" == "000" ]; then
            echo "   💥 Connection failed or timeout"
        elif [ ${#body} -gt 0 ] && [ ${#body} -lt 500 ]; then
            echo "   📄 Response: $body"
        fi
    fi
    
    echo ""
}

# Test DNS Resolution
echo -e "${PURPLE}🌐 DNS & Connectivity Tests${NC}"
echo "----------------------------------------"

# Extract hostname from domain
HOSTNAME=$(echo "$DOMAIN" | sed 's|https\?://||' | sed 's|/.*||')

# DNS Resolution Test
echo -e "${CYAN}📡 Test: DNS Resolution${NC}"
if nslookup "$HOSTNAME" >/dev/null 2>&1; then
    IP=$(nslookup "$HOSTNAME" | grep -A1 "Name:" | tail -1 | awk '{print $2}' || echo "Unknown")
    echo -e "   ${GREEN}✅ PASS${NC} - $HOSTNAME → $IP"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "   ${RED}❌ FAIL${NC} - DNS resolution failed"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# SSL Certificate Test
echo -e "${CYAN}📡 Test: SSL Certificate${NC}"
if echo | openssl s_client -servername "$HOSTNAME" -connect "$HOSTNAME:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
    CERT_INFO=$(echo | openssl s_client -servername "$HOSTNAME" -connect "$HOSTNAME:443" 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null)
    echo -e "   ${GREEN}✅ PASS${NC} - SSL certificate is valid"
    echo "   📜 $CERT_INFO"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "   ${RED}❌ FAIL${NC} - SSL certificate check failed"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# API Endpoint Tests
echo -e "${PURPLE}🔌 API Endpoint Tests${NC}"
echo "----------------------------------------"

# Main endpoint
run_test "Main Endpoint" "$DOMAIN/" "200"

# Health check
run_test "Health Check" "$DOMAIN/api/health" "200"

# Status endpoint
run_test "Status Endpoint" "$DOMAIN/api/status" "200"

# Basic metrics
run_test "Basic Metrics" "$DOMAIN/api/metrics" "200"

# Monitoring endpoints
echo -e "${PURPLE}📊 Monitoring Endpoint Tests${NC}"
echo "----------------------------------------"

run_test "Monitoring Health" "$DOMAIN/api/monitoring/health" "200"
run_test "Monitoring Metrics" "$DOMAIN/api/monitoring/metrics" "200"
run_test "Monitoring Performance" "$DOMAIN/api/monitoring/performance" "200"
run_test "Monitoring Connections" "$DOMAIN/api/monitoring/connections" "200"
run_test "Monitoring Info" "$DOMAIN/api/monitoring/info" "200"

# CORS Tests
echo -e "${PURPLE}🌐 CORS Tests${NC}"
echo "----------------------------------------"

run_test "CORS Preflight" "$DOMAIN/api/health" "200" "OPTIONS" "" "-H 'Origin: https://mechamap.com' -H 'Access-Control-Request-Method: GET'"
run_test "CORS GET Request" "$DOMAIN/api/health" "200" "GET" "" "-H 'Origin: https://mechamap.com'"

# Security Tests
echo -e "${PURPLE}🛡️ Security Tests${NC}"
echo "----------------------------------------"

run_test "Admin Endpoint (No Auth)" "$DOMAIN/api/monitoring/reset" "401" "POST"
run_test "Broadcast Endpoint (No Auth)" "$DOMAIN/api/broadcast" "401" "POST" '{"channel":"test","event":"test","data":{}}'

# Error Handling Tests
echo -e "${PURPLE}❌ Error Handling Tests${NC}"
echo "----------------------------------------"

run_test "404 Not Found" "$DOMAIN/nonexistent" "404"
run_test "Invalid JSON" "$DOMAIN/api/broadcast" "400" "POST" 'invalid-json' "-H 'Content-Type: application/json'"

# Performance Tests
echo -e "${PURPLE}⚡ Performance Tests${NC}"
echo "----------------------------------------"

echo -e "${CYAN}📡 Test: Response Time Analysis${NC}"
TOTAL_TIME=0
FAST_RESPONSES=0
SLOW_RESPONSES=0

for i in {1..5}; do
    start_time=$(date +%s.%N)
    status_code=$(curl -s -w '%{http_code}' --max-time 5 -o /dev/null "$DOMAIN/api/health")
    end_time=$(date +%s.%N)
    response_time=$(echo "$end_time - $start_time" | bc -l)
    
    TOTAL_TIME=$(echo "$TOTAL_TIME + $response_time" | bc -l)
    
    if (( $(echo "$response_time < 1.0" | bc -l) )); then
        FAST_RESPONSES=$((FAST_RESPONSES + 1))
    else
        SLOW_RESPONSES=$((SLOW_RESPONSES + 1))
    fi
    
    echo "   Request $i: ${response_time}s (Status: $status_code)"
done

AVG_TIME=$(echo "scale=3; $TOTAL_TIME / 5" | bc -l)
echo -e "   ${GREEN}📊 Average Response Time: ${AVG_TIME}s${NC}"
echo -e "   ${GREEN}⚡ Fast responses (<1s): $FAST_RESPONSES/5${NC}"
echo -e "   ${YELLOW}🐌 Slow responses (≥1s): $SLOW_RESPONSES/5${NC}"

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if (( $(echo "$AVG_TIME < 2.0" | bc -l) )); then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "   ${GREEN}✅ PASS${NC} - Performance is acceptable"
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo -e "   ${RED}❌ FAIL${NC} - Performance is too slow"
fi
echo ""

# Final Results
echo "=================================================================="
echo -e "${BLUE}📊 Test Results Summary${NC}"
echo "=================================================================="
echo -e "${GREEN}✅ Passed: $PASSED_TESTS${NC}"
echo -e "${RED}❌ Failed: $FAILED_TESTS${NC}"
echo -e "${BLUE}📊 Total:  $TOTAL_TESTS${NC}"

SUCCESS_RATE=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l)
echo -e "${CYAN}📈 Success Rate: ${SUCCESS_RATE}%${NC}"

echo ""
echo -e "${BLUE}📋 Detailed Results:${NC}"
echo "----------------------------------------"
for result in "${TEST_RESULTS[@]}"; do
    IFS='|' read -r status test_name status_code response_time <<< "$result"
    if [ "$status" == "PASS" ]; then
        echo -e "${GREEN}✅${NC} $test_name (${status_code}, ${response_time}s)"
    else
        echo -e "${RED}❌${NC} $test_name (${status_code}, ${response_time}s)"
    fi
done

echo ""
echo -e "${BLUE}🏁 Test completed at: $(date)${NC}"

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! System is healthy.${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please review the results.${NC}"
    exit 1
fi
