# MechaMap Realtime Server - Monitoring System

Hệ thống monitoring toàn diện cho MechaMap Realtime Server với real-time metrics, health checks, và alerting system.

## 🎯 Tổng quan

Monitoring system cung cấp:
- **Real-time Metrics**: Connection, authentication, performance tracking
- **Health Monitoring**: Automated health checks với configurable thresholds
- **Alert System**: Real-time alerts khi có issues
- **Prometheus Integration**: Export metrics cho external monitoring tools
- **Admin Interface**: Secure admin endpoints cho management

## 📊 Metrics được theo dõi

### Connection Metrics
- **Total Connections**: Tổng số connections từ khi server start
- **Active Connections**: Số connections hiện tại đang active
- **Peak Connections**: Số connections cao nhất đã đạt được
- **Connections by Role**: Phân loại theo user role (admin, member, guest, etc.)
- **Failed Connections**: Số connections thất bại

### Authentication Metrics
- **Successful Authentications**: Số lần authentication thành công
- **Failed Authentications**: Số lần authentication thất bại
- **Authentication by Method**: Phân loại theo method (Sanctum, JWT)
- **Authentication Rate**: Tỷ lệ thành công/thất bại

### Performance Metrics
- **Average Response Time**: Thời gian response trung bình
- **Total Requests**: Tổng số HTTP requests
- **Slow Requests**: Số requests có response time > threshold
- **Error Rate**: Tỷ lệ lỗi requests
- **Uptime**: Thời gian server đã chạy

### Message & Channel Metrics
- **Messages Sent**: Số messages đã gửi
- **Messages Received**: Số messages đã nhận
- **Failed Messages**: Số messages gửi thất bại
- **Channel Subscriptions**: Số subscriptions hiện tại
- **Channels by Type**: Phân loại channels (private, public)

### Notification Metrics
- **Notifications Sent**: Số notifications đã gửi
- **Notifications Delivered**: Số notifications đã deliver thành công
- **Failed Notifications**: Số notifications gửi thất bại
- **Notification Types**: Phân loại theo type

### Server Metrics
- **Memory Usage**: RAM usage (RSS, heap, external)
- **CPU Usage**: CPU utilization
- **Node.js Version**: Version information
- **Platform Info**: OS platform và architecture

## 🔍 Health Checks

### Automated Health Checks
System tự động kiểm tra:

1. **Connection Health**
   - Threshold: > 1000 active connections = Warning
   - Threshold: > 5000 active connections = Critical

2. **Response Time Health**
   - Threshold: > 500ms average = Warning
   - Threshold: > 1000ms average = Critical

3. **Error Rate Health**
   - Threshold: > 5% error rate = Warning
   - Threshold: > 10% error rate = Critical

4. **Memory Health**
   - Threshold: > 80% heap usage = Warning
   - Threshold: > 90% heap usage = Critical

5. **Uptime Health**
   - Threshold: < 1 hour = Warning (recent restart)

### Health Status Levels
- **Healthy**: Tất cả checks pass
- **Warning**: Một hoặc nhiều checks ở warning level
- **Critical**: Một hoặc nhiều checks ở critical level
- **Unknown**: Không thể determine health status

## 🚨 Alert System

### Alert Types
1. **Connection Alerts**
   - High connection count
   - Connection failure spike
   - Unusual disconnection patterns

2. **Performance Alerts**
   - High response time
   - High error rate
   - Memory usage spikes

3. **Authentication Alerts**
   - Authentication failure spike
   - Suspicious authentication patterns

4. **System Alerts**
   - Server restart
   - Configuration changes
   - Critical errors

### Alert Severity Levels
- **Info**: Informational messages
- **Warning**: Issues cần attention
- **Error**: Serious issues cần immediate action
- **Critical**: System-threatening issues

### Alert Configuration
```javascript
const alertThresholds = {
  connections: {
    max: 1000,        // Warning threshold
    critical: 5000    // Critical threshold
  },
  responseTime: {
    max: 500,         // Warning threshold (ms)
    critical: 1000    // Critical threshold (ms)
  },
  errorRate: {
    max: 0.05,        // Warning threshold (5%)
    critical: 0.10    // Critical threshold (10%)
  },
  memory: {
    max: 0.80,        // Warning threshold (80%)
    critical: 0.90    // Critical threshold (90%)
  }
};
```

## 🔧 API Endpoints

### Public Endpoints

#### GET /api/monitoring/health
Comprehensive health check với detailed status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "checks": {
      "connections": {
        "status": true,
        "message": "21 active connections"
      },
      "responseTime": {
        "status": true,
        "message": "125ms avg response time"
      },
      "errorRate": {
        "status": true,
        "message": "0.00% error rate"
      },
      "uptime": {
        "status": true,
        "message": "2h 15m uptime"
      },
      "memory": {
        "status": true,
        "message": "19MB heap used"
      }
    },
    "metrics": { /* detailed metrics */ },
    "alerts": []
  },
  "timestamp": "2025-07-17T07:02:37.761Z"
}
```

#### GET /api/monitoring/metrics
Detailed metrics data.

#### GET /api/monitoring/performance
Performance summary với formatted data.

#### GET /api/monitoring/connections
Connection statistics và user information.

#### GET /api/monitoring/alerts
Active alerts và alert history.

#### GET /api/monitoring/prometheus
Prometheus-compatible metrics format.

#### GET /api/monitoring/info
Server information và configuration.

### Admin Endpoints (Require X-Admin-Key header)

#### POST /api/monitoring/reset
Reset tất cả metrics về 0.

**Headers:**
```
X-Admin-Key: your-admin-key
```

#### PUT /api/monitoring/thresholds
Update alert thresholds.

**Headers:**
```
X-Admin-Key: your-admin-key
Content-Type: application/json
```

**Body:**
```json
{
  "connections": {
    "max": 1500,
    "critical": 6000
  },
  "responseTime": {
    "max": 600,
    "critical": 1200
  }
}
```

## 🔐 Security

### Admin Authentication
Admin endpoints require `X-Admin-Key` header:
```bash
curl -H "X-Admin-Key: your-secret-admin-key" \
  http://localhost:3000/api/monitoring/reset
```

### Rate Limiting
Monitoring endpoints có rate limiting:
- Public endpoints: 100 requests/minute
- Admin endpoints: 20 requests/minute

### Data Privacy
- Không log sensitive user data
- Metrics chỉ chứa aggregated data
- User IDs được anonymized trong logs

## 📈 Prometheus Integration

### Metrics Export
Server export metrics ở Prometheus format tại `/api/monitoring/prometheus`:

```
# HELP websocket_connections_total Total number of WebSocket connections
# TYPE websocket_connections_total counter
websocket_connections_total 21

# HELP websocket_connections_active Current active WebSocket connections
# TYPE websocket_connections_active gauge
websocket_connections_active 21

# HELP http_request_duration_ms Average HTTP request duration in milliseconds
# TYPE http_request_duration_ms gauge
http_request_duration_ms 124.76

# HELP auth_attempts_total Total authentication attempts
# TYPE auth_attempts_total counter
auth_attempts_total{result="success"} 21
auth_attempts_total{result="failure"} 0
```

### Grafana Dashboard
Có thể tạo Grafana dashboard với các metrics này để visualize:
- Connection trends
- Performance graphs
- Error rate charts
- Alert notifications

## 🛠️ Configuration

### Environment Variables
```bash
# Admin key cho monitoring endpoints
ADMIN_KEY=your-secret-admin-key

# Monitoring configuration
MONITORING_ENABLED=true
METRICS_RETENTION_HOURS=24
ALERT_WEBHOOK_URL=https://your-webhook-url.com
```

### Monitoring Configuration
```javascript
// src/config/monitoring.js
module.exports = {
  enabled: process.env.MONITORING_ENABLED === 'true',
  retentionHours: parseInt(process.env.METRICS_RETENTION_HOURS) || 24,
  alertWebhook: process.env.ALERT_WEBHOOK_URL,
  thresholds: {
    connections: {
      max: 1000,
      critical: 5000
    },
    responseTime: {
      max: 500,
      critical: 1000
    },
    errorRate: {
      max: 0.05,
      critical: 0.10
    },
    memory: {
      max: 0.80,
      critical: 0.90
    }
  }
};
```

## 🔄 Real-time Updates

### WebSocket Events
Monitoring system có thể emit real-time events:

```javascript
// Server emit monitoring events
io.emit('monitoring.alert', {
  type: 'warning',
  message: 'High response time detected',
  threshold: 500,
  current: 750,
  timestamp: new Date()
});

io.emit('monitoring.metrics', {
  connections: { active: 150, total: 1250 },
  performance: { avgResponseTime: 245 },
  timestamp: new Date()
});
```

### Client Integration
Frontend có thể subscribe để nhận real-time monitoring updates:

```javascript
socket.on('monitoring.alert', (alert) => {
  console.warn('Monitoring Alert:', alert);
  // Show notification to admin users
});

socket.on('monitoring.metrics', (metrics) => {
  // Update dashboard in real-time
  updateDashboard(metrics);
});
```

## 📝 Logging

### Monitoring Logs
Tất cả monitoring activities được log với structured format:

```json
{
  "timestamp": "2025-07-17T07:02:37.761Z",
  "level": "info",
  "message": "Connection tracked",
  "service": "mechamap-realtime",
  "category": "monitoring",
  "data": {
    "socketId": "abc123",
    "userId": 22,
    "userRole": "member",
    "totalConnections": 21,
    "activeConnections": 21,
    "peakConnections": 21
  }
}
```

### Log Categories
- `monitoring`: General monitoring events
- `auth`: Authentication tracking
- `performance`: Performance metrics
- `alerts`: Alert generation
- `health`: Health check results

## 🚀 Best Practices

### Production Deployment
1. **Set proper admin key**: Use strong, random admin key
2. **Configure thresholds**: Adjust thresholds theo production load
3. **Setup external monitoring**: Integrate với Prometheus/Grafana
4. **Monitor logs**: Setup log aggregation và alerting
5. **Regular health checks**: Setup automated health monitoring

### Performance Optimization
1. **Metrics retention**: Limit retention time để avoid memory issues
2. **Sampling**: Consider sampling cho high-traffic scenarios
3. **Async processing**: Process metrics asynchronously
4. **Caching**: Cache frequently accessed metrics

### Security Considerations
1. **Secure admin endpoints**: Use strong authentication
2. **Rate limiting**: Prevent abuse of monitoring endpoints
3. **Data privacy**: Avoid logging sensitive information
4. **Access control**: Restrict monitoring access to authorized users

## 🆘 Troubleshooting

### Common Issues

#### High Memory Usage
```bash
# Check memory metrics
curl http://localhost:3000/api/monitoring/metrics | jq '.server.memory'

# Reset metrics if needed
curl -X POST -H "X-Admin-Key: your-key" \
  http://localhost:3000/api/monitoring/reset
```

#### Missing Metrics
```bash
# Verify monitoring is enabled
curl http://localhost:3000/api/monitoring/info

# Check server logs
tail -f logs/app.log | grep monitoring
```

#### Alert Not Working
```bash
# Check alert configuration
curl http://localhost:3000/api/monitoring/alerts

# Update thresholds
curl -X PUT -H "X-Admin-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"connections":{"max":2000}}' \
  http://localhost:3000/api/monitoring/thresholds
```

## 📚 Related Documentation

- [API Documentation](./API.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Security Guide](./SECURITY.md)
- [Performance Tuning](./PERFORMANCE.md)
