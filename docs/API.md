# MechaMap Realtime Server - API Documentation

Comprehensive API documentation cho MechaMap Realtime Server với WebSocket và REST endpoints.

## 🌐 Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://realtime.mechapap.com`

## 🔐 Authentication

### Laravel Sanctum (Recommended)
```javascript
// Client-side authentication
const token = 'your-sanctum-token';
const socket = io('http://localhost:3000', {
  auth: {
    token: token,
    type: 'sanctum'
  }
});
```

### JWT Token (Fallback)
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token',
    type: 'jwt'
  }
});
```

## 📡 WebSocket Events

### Connection Events

#### `connect`
Triggered khi client connect thành công.
```javascript
socket.on('connect', () => {
  console.log('Connected to server');
  console.log('Socket ID:', socket.id);
});
```

#### `disconnect`
Triggered khi client disconnect.
```javascript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

#### `connect_error`
Triggered khi có lỗi connection.
```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

### Authentication Events

#### `authenticated`
Triggered sau khi authentication thành công.
```javascript
socket.on('authenticated', (data) => {
  console.log('Authenticated as:', data.user);
  console.log('User role:', data.role);
});
```

#### `authentication_error`
Triggered khi authentication thất bại.
```javascript
socket.on('authentication_error', (error) => {
  console.error('Auth error:', error.message);
});
```

### Channel Events

#### `channel.subscribed`
Triggered khi subscribe channel thành công.
```javascript
socket.on('channel.subscribed', (data) => {
  console.log('Subscribed to channel:', data.channel);
});
```

#### `channel.subscription_error`
Triggered khi subscribe channel thất bại.
```javascript
socket.on('channel.subscription_error', (error) => {
  console.error('Subscription error:', error.message);
});
```

### Notification Events

#### `notification.sent`
Receive real-time notifications.
```javascript
socket.on('notification.sent', (notification) => {
  console.log('New notification:', notification);
  // notification structure:
  // {
  //   id: 'notification-id',
  //   title: 'Notification Title',
  //   message: 'Notification message',
  //   type: 'info|success|warning|error',
  //   data: { /* additional data */ },
  //   timestamp: '2025-07-17T07:02:37.761Z'
  // }
});
```

#### `message.received`
Receive real-time messages.
```javascript
socket.on('message.received', (message) => {
  console.log('New message:', message);
});
```

### Client-to-Server Events

#### `subscribe`
Subscribe to a private channel.
```javascript
socket.emit('subscribe', {
  channel: 'private-user.123',
  auth: {
    token: 'your-token'
  }
});
```

#### `unsubscribe`
Unsubscribe from a channel.
```javascript
socket.emit('unsubscribe', {
  channel: 'private-user.123'
});
```

#### `ping`
Send ping để test connection.
```javascript
socket.emit('ping', { timestamp: Date.now() });

socket.on('pong', (data) => {
  const latency = Date.now() - data.timestamp;
  console.log('Latency:', latency + 'ms');
});
```

## 🔄 REST API Endpoints

### Health & Status

#### GET /api/health
Basic health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-17T07:02:37.761Z",
  "uptime": 7892.123,
  "connections": 21,
  "users": 15,
  "memory": {
    "rss": 45678592,
    "heapTotal": 29360128,
    "heapUsed": 19234816,
    "external": 1234567
  },
  "version": "1.0.0"
}
```

#### GET /api/status
Server status information.

**Response:**
```json
{
  "server": {
    "name": "MechaMap Realtime Server",
    "version": "1.0.0",
    "environment": "development",
    "nodeVersion": "v22.16.0",
    "platform": "win32"
  },
  "uptime": {
    "seconds": 7892,
    "formatted": "2h 11m 32s"
  },
  "connections": {
    "total": 156,
    "active": 21,
    "peak": 45
  }
}
```

#### GET /api/metrics
Basic server metrics.

**Response:**
```json
{
  "timestamp": "2025-07-17T07:02:37.761Z",
  "uptime": 7892.123,
  "memory": {
    "rss": 45678592,
    "heapTotal": 29360128,
    "heapUsed": 19234816,
    "external": 1234567,
    "arrayBuffers": 123456
  },
  "cpu": {
    "user": 1234567,
    "system": 987654
  },
  "connections": 21,
  "users": 15
}
```

### Broadcasting

#### POST /api/broadcast
Broadcast message to specific channel.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer your-laravel-sanctum-token
```

**Request Body:**
```json
{
  "channel": "private-user.123",
  "event": "notification.sent",
  "data": {
    "id": "notif-123",
    "title": "New Message",
    "message": "You have received a new message",
    "type": "info",
    "data": {
      "thread_id": 456,
      "sender": "John Doe"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message broadcasted successfully",
  "data": {
    "channel": "private-user.123",
    "event": "notification.sent",
    "recipients": 3,
    "timestamp": "2025-07-17T07:02:37.761Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Channel not found or unauthorized",
  "code": "CHANNEL_ERROR",
  "timestamp": "2025-07-17T07:02:37.761Z"
}
```

## 📊 Monitoring API

### Health Monitoring

#### GET /api/monitoring/health
Comprehensive health check với detailed monitoring data.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "checks": {
      "connections": {
        "status": true,
        "message": "21 active connections",
        "threshold": 1000,
        "current": 21
      },
      "responseTime": {
        "status": true,
        "message": "125ms avg response time",
        "threshold": 500,
        "current": 125
      },
      "errorRate": {
        "status": true,
        "message": "0.00% error rate",
        "threshold": 0.05,
        "current": 0.00
      },
      "uptime": {
        "status": true,
        "message": "2h 15m uptime"
      },
      "memory": {
        "status": true,
        "message": "19MB heap used",
        "threshold": 0.80,
        "current": 0.65
      }
    },
    "metrics": {
      "connections": {
        "total": 156,
        "active": 21,
        "peak": 45,
        "failed": 2,
        "byRole": {
          "admin": 1,
          "member": 18,
          "guest": 2
        }
      },
      "authentication": {
        "successful": 154,
        "failed": 2,
        "successRate": 98.72,
        "byMethod": {
          "sanctum": {
            "successful": 150,
            "failed": 1
          },
          "jwt": {
            "successful": 4,
            "failed": 1
          }
        }
      },
      "performance": {
        "avgResponseTime": 125.45,
        "totalRequests": 1250,
        "slowRequests": 12,
        "errorRate": 0.008
      },
      "server": {
        "uptime": 8123,
        "uptimeFormatted": "2h 15m 23s",
        "memory": {
          "heapUsed": 19234816,
          "heapTotal": 29360128,
          "rss": 45678592,
          "external": 1234567
        },
        "nodeVersion": "v22.16.0",
        "platform": "win32"
      }
    },
    "alerts": []
  },
  "timestamp": "2025-07-17T07:02:37.761Z"
}
```

#### GET /api/monitoring/metrics
Detailed monitoring metrics.

#### GET /api/monitoring/performance
Performance summary với formatted data.

#### GET /api/monitoring/connections
Connection statistics và user information.

#### GET /api/monitoring/alerts
Active alerts và alert history.

#### GET /api/monitoring/prometheus
Prometheus-compatible metrics format.

**Response (text/plain):**
```
# HELP websocket_connections_total Total number of WebSocket connections
# TYPE websocket_connections_total counter
websocket_connections_total 156

# HELP websocket_connections_active Current active WebSocket connections
# TYPE websocket_connections_active gauge
websocket_connections_active 21

# HELP websocket_connections_peak Peak WebSocket connections
# TYPE websocket_connections_peak gauge
websocket_connections_peak 45

# HELP http_request_duration_ms Average HTTP request duration in milliseconds
# TYPE http_request_duration_ms gauge
http_request_duration_ms 125.45

# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total 1250

# HELP auth_attempts_total Total authentication attempts
# TYPE auth_attempts_total counter
auth_attempts_total{result="success"} 154
auth_attempts_total{result="failure"} 2

# HELP notifications_total Total notifications sent
# TYPE notifications_total counter
notifications_total 89
```

#### GET /api/monitoring/info
Server information và configuration.

### Admin Endpoints

#### POST /api/monitoring/reset
Reset tất cả metrics về initial state.

**Headers:**
```
X-Admin-Key: your-secret-admin-key
```

**Response:**
```json
{
  "success": true,
  "message": "Metrics reset successfully",
  "timestamp": "2025-07-17T07:02:37.761Z"
}
```

#### PUT /api/monitoring/thresholds
Update alert thresholds.

**Headers:**
```
X-Admin-Key: your-secret-admin-key
Content-Type: application/json
```

**Request Body:**
```json
{
  "connections": {
    "max": 1500,
    "critical": 6000
  },
  "responseTime": {
    "max": 600,
    "critical": 1200
  },
  "errorRate": {
    "max": 0.08,
    "critical": 0.15
  },
  "memory": {
    "max": 0.85,
    "critical": 0.95
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Alert thresholds updated successfully",
  "data": {
    "thresholds": {
      "connections": {
        "max": 1500,
        "critical": 6000
      },
      "responseTime": {
        "max": 600,
        "critical": 1200
      },
      "errorRate": {
        "max": 0.08,
        "critical": 0.15
      },
      "memory": {
        "max": 0.85,
        "critical": 0.95
      }
    }
  },
  "timestamp": "2025-07-17T07:02:37.761Z"
}
```

## 🚫 Error Handling

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (endpoint/resource not found)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable (health check failed)

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error details"
  },
  "timestamp": "2025-07-17T07:02:37.761Z"
}
```

### Common Error Codes
- `AUTH_REQUIRED` - Authentication required
- `AUTH_INVALID` - Invalid authentication token
- `AUTH_EXPIRED` - Authentication token expired
- `CHANNEL_ERROR` - Channel access error
- `RATE_LIMIT` - Rate limit exceeded
- `VALIDATION_ERROR` - Request validation failed
- `SERVER_ERROR` - Internal server error

## 🔒 Rate Limiting

### Limits
- **Public endpoints**: 100 requests/minute per IP
- **Monitoring endpoints**: 60 requests/minute per IP
- **Admin endpoints**: 20 requests/minute per IP
- **Broadcasting**: 30 requests/minute per authenticated user

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642435200
```

## 📝 Request/Response Examples

### Client Connection Example
```javascript
// Frontend JavaScript
const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('sanctum_token'),
    type: 'sanctum'
  }
});

socket.on('connect', () => {
  console.log('Connected!');
  
  // Subscribe to user's private channel
  socket.emit('subscribe', {
    channel: `private-user.${userId}`
  });
});

socket.on('notification.sent', (notification) => {
  // Show notification to user
  showNotification(notification.title, notification.message);
});

socket.on('message.received', (message) => {
  // Handle new message
  handleNewMessage(message);
});
```

### Laravel Broadcasting Example
```php
// Laravel Controller
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class NotificationController extends Controller
{
    public function sendNotification(Request $request)
    {
        $response = Http::withToken($request->user()->currentAccessToken()->plainTextToken)
            ->post('http://localhost:3000/api/broadcast', [
                'channel' => "private-user.{$request->user()->id}",
                'event' => 'notification.sent',
                'data' => [
                    'id' => uniqid(),
                    'title' => 'New Message',
                    'message' => 'You have a new message from ' . auth()->user()->name,
                    'type' => 'info',
                    'data' => [
                        'thread_id' => $request->thread_id,
                        'sender_id' => auth()->id()
                    ]
                ]
            ]);

        return response()->json([
            'success' => $response->successful(),
            'data' => $response->json()
        ]);
    }
}
```

## 🔧 Configuration

### Environment Variables
```bash
# Server Configuration
PORT=3000
NODE_ENV=development
SSL_ENABLED=false

# Authentication
JWT_SECRET=your-jwt-secret
LARAVEL_API_URL=http://localhost:8000

# Monitoring
ADMIN_KEY=your-secret-admin-key
MONITORING_ENABLED=true
METRICS_RETENTION_HOURS=24

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:8000,https://mechapap.com
CORS_CREDENTIALS=true
```

### Client Configuration
```javascript
// Recommended client configuration
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-sanctum-token',
    type: 'sanctum'
  },
  transports: ['websocket', 'polling'],
  timeout: 20000,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  maxReconnectionAttempts: 10
});
```

## 📚 Related Documentation

- [Monitoring System](./MONITORING.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Security Guide](./SECURITY.md)
- [WebSocket Events](./WEBSOCKET.md)
