# Hướng dẫn Monitoring - MechaMap Realtime Server

Tài liệu này cung cấp hướng dẫn chi tiết về cách giám sát và maintain MechaMap Realtime Server trong môi trường production.

## 📊 Tổng quan Monitoring

MechaMap Realtime Server cung cấp hệ thống monitoring toàn diện bao gồm:
- **Health Checks**: Kiểm tra sức khỏe hệ thống tự động
- **Performance Metrics**: Theo dõi hiệu suất real-time
- **Connection Monitoring**: Giám sát WebSocket connections
- **Error Tracking**: Theo dõi và báo cáo lỗi
- **Resource Usage**: Giám sát CPU, memory, disk

## 🏥 Health Checks

### Basic Health Check

**Endpoint:** `GET /api/health`

```bash
curl -s https://realtime.mechamap.com/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-18T02:45:42.640Z",
  "uptime": 2272,
  "memory": {
    "used": 79.2,
    "total": 2048,
    "percentage": 3.87
  },
  "connections": {
    "active": 0,
    "total": 0
  }
}
```

### Detailed Health Check

**Endpoint:** `GET /api/monitoring/health`

```bash
curl -s https://realtime.mechamap.com/api/monitoring/health
```

**Response bao gồm:**
- System resources (CPU, Memory)
- Database connection status
- Redis connection status (nếu có)
- WebSocket connection statistics
- Error rates

### Automated Health Monitoring

Server tự động kiểm tra health mỗi 30 giây và ghi log khi phát hiện vấn đề:

```javascript
// Cấu hình trong .env.production
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000
```

## 📈 Performance Metrics

### Basic Metrics

**Endpoint:** `GET /api/metrics`

```bash
curl -s https://realtime.mechamap.com/api/metrics
```

### Detailed Performance Metrics

**Endpoint:** `GET /api/monitoring/metrics`

```bash
curl -s https://realtime.mechamap.com/api/monitoring/metrics
```

**Metrics bao gồm:**
- **Connection Metrics**: Active, total, peak connections
- **Request Metrics**: Total requests, success rate, error rate
- **Performance Metrics**: Response times, throughput
- **Resource Metrics**: Memory usage, CPU usage

### Performance Summary

**Endpoint:** `GET /api/monitoring/performance`

```bash
curl -s https://realtime.mechamap.com/api/monitoring/performance
```

**Response:**
```json
{
  "summary": {
    "total_requests": 6,
    "success_rate": 100,
    "avg_response_time": 0.2,
    "uptime": 2272
  },
  "requests": {
    "total": 6,
    "successful": 6,
    "failed": 0,
    "slow": 0
  },
  "response_times": {
    "average": 0.2,
    "min": 0.1,
    "max": 0.5,
    "p95": 0.4
  }
}
```

## 🔌 Connection Monitoring

### WebSocket Connections

**Endpoint:** `GET /api/monitoring/connections`

```bash
curl -s https://realtime.mechamap.com/api/monitoring/connections
```

**Thông tin bao gồm:**
- Số lượng connections active
- Peak connections
- Connections theo user
- Channel subscriptions
- Connection duration statistics

### Connection Limits

Server có các giới hạn để bảo vệ hiệu suất:

```env
# Trong .env.production
MAX_CONNECTIONS=5000
MAX_CONNECTIONS_PER_USER=5
CONNECTION_TIMEOUT=30000
```

### Connection Health

Server tự động:
- Ping/pong heartbeat mỗi 25 giây
- Cleanup connections timeout
- Track connection quality metrics

## 🖥️ System Information

### System Info

**Endpoint:** `GET /api/monitoring/info`

```bash
curl -s https://realtime.mechamap.com/api/monitoring/info
```

**Response bao gồm:**
- Server information (version, environment)
- System information (platform, architecture)
- Configuration details
- Runtime statistics

## 📊 PM2 Monitoring

### PM2 Status

```bash
# Xem trạng thái tất cả processes
pm2 status

# Xem chi tiết một process
pm2 show mechamap-realtime

# Monitor real-time
pm2 monit
```

### PM2 Logs

```bash
# Xem logs real-time
pm2 logs mechamap-realtime

# Xem logs với số dòng cụ thể
pm2 logs mechamap-realtime --lines 100

# Xem chỉ error logs
pm2 logs mechamap-realtime --err

# Xem logs của tất cả instances
pm2 logs
```

### PM2 Metrics

```bash
# Xem memory usage
pm2 show mechamap-realtime | grep memory

# Xem CPU usage
pm2 show mechamap-realtime | grep cpu

# Xem uptime
pm2 show mechamap-realtime | grep uptime
```

## 📝 Log Management

### Log Files

Logs được lưu trong thư mục `logs/`:

```
logs/
├── combined.log      # Tất cả logs
├── out.log          # Standard output
├── error.log        # Error logs
├── exceptions.log   # Uncaught exceptions
└── rejections.log   # Unhandled promise rejections
```

### Log Levels

```javascript
// Log levels theo thứ tự ưu tiên
{
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
}
```

### Log Rotation

Cấu hình logrotate trong `/etc/logrotate.d/mechamap-realtime`:

```
/var/www/realtime_mec_usr/data/www/realtime.mechamap.com/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        pm2 reload mechamap-realtime
    endscript
}
```

### Log Analysis

```bash
# Xem error logs gần nhất
tail -f logs/error.log

# Tìm kiếm errors cụ thể
grep -i "error" logs/combined.log

# Đếm số lượng requests
grep -c "GET\|POST" logs/combined.log

# Xem top IP addresses
awk '{print $1}' logs/combined.log | sort | uniq -c | sort -nr | head -10
```

## 🚨 Alerting & Notifications

### Alert Thresholds

Server có các ngưỡng cảnh báo mặc định:

```javascript
// Trong monitoring service
const DEFAULT_THRESHOLDS = {
  memory: { max: 85 },           // 85% memory usage
  cpu: { max: 80 },              // 80% CPU usage
  connections: { max: 4500 },    // 4500 active connections
  responseTime: { max: 1000 },   // 1000ms response time
  errorRate: { max: 5 }          // 5% error rate
};
```

### Custom Alert Configuration

Cập nhật thresholds qua API (yêu cầu admin key):

```bash
curl -X PUT https://realtime.mechamap.com/api/monitoring/thresholds \
  -H "X-Admin-Key: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "memory": {"max": 90},
    "connections": {"max": 5000},
    "responseTime": {"max": 500}
  }'
```

### Alert Notifications

Khi vượt ngưỡng, server sẽ:
1. Ghi log cảnh báo
2. Cập nhật health status
3. Gửi notification (nếu được cấu hình)

## 🧪 Testing & Validation

### System Test Script

Chạy test tổng hợp:

```bash
./test-system.sh
```

Script này sẽ test:
- DNS resolution
- SSL certificate
- All API endpoints
- CORS configuration
- Response times
- Error handling

### Manual Health Checks

```bash
# Quick health check
curl -f https://realtime.mechamap.com/api/health || echo "Health check failed"

# Detailed check với timeout
timeout 10 curl -s https://realtime.mechamap.com/api/monitoring/health

# WebSocket connection test
wscat -c wss://realtime.mechamap.com/socket.io/?EIO=4&transport=websocket
```

### Load Testing

Sử dụng tools như Artillery hoặc wrk:

```bash
# Cài đặt Artillery
npm install -g artillery

# Tạo load test config
cat > load-test.yml << EOF
config:
  target: 'https://realtime.mechamap.com'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Health check load test"
    requests:
      - get:
          url: "/api/health"
EOF

# Chạy load test
artillery run load-test.yml
```

## 📊 Performance Optimization

### Memory Optimization

```bash
# Kiểm tra memory usage
pm2 show mechamap-realtime | grep memory

# Restart nếu memory cao
pm2 restart mechamap-realtime

# Cấu hình memory limit
pm2 start ecosystem.config.js --env production --max-memory-restart 2G
```

### Connection Optimization

```javascript
// Trong .env.production
WS_PING_TIMEOUT=60000
WS_PING_INTERVAL=25000
CONNECTION_TIMEOUT=30000
HEARTBEAT_INTERVAL=25000
```

### Database Optimization

```javascript
// Connection pool settings
DB_CONNECTION_LIMIT=20
DB_TIMEOUT=60000
```

## 🔧 Maintenance Tasks

### Daily Tasks

```bash
#!/bin/bash
# daily-maintenance.sh

# Check disk space
df -h

# Check memory usage
free -h

# Check PM2 status
pm2 status

# Rotate logs if needed
sudo logrotate -f /etc/logrotate.d/mechamap-realtime

# Health check
curl -f https://realtime.mechamap.com/api/health
```

### Weekly Tasks

```bash
#!/bin/bash
# weekly-maintenance.sh

# Update system packages
sudo apt update && sudo apt upgrade -y

# Check for Node.js updates
npm outdated

# Analyze logs for patterns
grep -i "error" logs/combined.log | tail -100

# Check SSL certificate expiry
echo | openssl s_client -servername realtime.mechamap.com -connect realtime.mechamap.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Monthly Tasks

```bash
#!/bin/bash
# monthly-maintenance.sh

# Archive old logs
tar -czf logs/archive/logs-$(date +%Y-%m).tar.gz logs/*.log
rm logs/*.log.1 logs/*.log.2

# Database maintenance
mysql -e "OPTIMIZE TABLE notifications, users;"

# Performance review
curl -s https://realtime.mechamap.com/api/monitoring/performance | jq .
```

## 📈 Metrics Dashboard

### Key Metrics to Monitor

1. **Availability Metrics**
   - Uptime percentage
   - Health check success rate
   - Response time

2. **Performance Metrics**
   - Average response time
   - Requests per second
   - Error rate

3. **Resource Metrics**
   - CPU usage
   - Memory usage
   - Disk usage

4. **Business Metrics**
   - Active WebSocket connections
   - Messages delivered
   - User engagement

### Creating Custom Dashboard

Sử dụng tools như Grafana với Prometheus:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'mechamap-realtime'
    static_configs:
      - targets: ['realtime.mechamap.com:3000']
    metrics_path: '/api/monitoring/prometheus'
```

## 🚨 Incident Response

### Common Issues & Solutions

1. **High Memory Usage**
   ```bash
   # Restart PM2 process
   pm2 restart mechamap-realtime
   
   # Check for memory leaks
   pm2 show mechamap-realtime
   ```

2. **High CPU Usage**
   ```bash
   # Check process details
   top -p $(pgrep -f mechamap-realtime)
   
   # Scale up instances if needed
   pm2 scale mechamap-realtime +1
   ```

3. **Database Connection Issues**
   ```bash
   # Test database connection
   mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME
   
   # Restart if needed
   pm2 restart mechamap-realtime
   ```

4. **SSL Certificate Expiry**
   ```bash
   # Renew Let's Encrypt certificate
   sudo certbot renew
   
   # Reload Nginx
   sudo systemctl reload nginx
   ```

### Escalation Process

1. **Level 1**: Automated restart via PM2
2. **Level 2**: Manual intervention required
3. **Level 3**: Contact development team
4. **Level 4**: Emergency response

## 📞 Support Contacts

- **Development Team**: [team-email]
- **Infrastructure**: [infra-email]
- **Emergency**: [emergency-contact]

## 📋 Monitoring Checklist

### Daily Checks
- [ ] Server uptime > 99%
- [ ] Memory usage < 85%
- [ ] Error rate < 1%
- [ ] Response time < 500ms
- [ ] Active connections normal

### Weekly Checks
- [ ] Log analysis completed
- [ ] Performance trends reviewed
- [ ] Security updates applied
- [ ] Backup verification
- [ ] SSL certificate validity

### Monthly Checks
- [ ] Capacity planning review
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation updates
- [ ] Disaster recovery test

Monitoring là một phần quan trọng để đảm bảo MechaMap Realtime Server hoạt động ổn định và hiệu quả trong môi trường production.
