# API Documentation - MechaMap Realtime Server

🔌 **Complete API reference for MechaMap Realtime Server**

## 🌐 **Base URLs**

- **Development**: `http://localhost:3000`
- **Production**: `https://realtime.mechamap.com`

## 🔐 **Authentication**

### **API Key Authentication**
All Laravel API calls require API key in header:
```http
X-WebSocket-API-Key: your_api_key_here
```

### **User Authentication**
WebSocket connections require Sanctum token:
```javascript
socket.emit('authenticate', {
    token: 'sanctum_token_here'
});
```

## 🌐 **REST API Endpoints**

### **📊 Health & Status**

#### `GET /`
Server information and available endpoints.

**Response:**
```json
{
  "service": "MechaMap Realtime Server",
  "message": "WebSocket server is running",
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2025-07-19T10:30:00.000Z",
  "endpoints": {
    "health": "/health",
    "status": "/status", 
    "metrics": "/metrics"
  },
  "websocket": {
    "url": "wss://realtime.mechamap.com",
    "transports": ["websocket", "polling"]
  }
}
```

#### `GET /health`
Basic health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-19T10:30:00.000Z",
  "uptime": 86400,
  "memory": {
    "used": 256.5,
    "total": 2048,
    "percentage": 12.5
  },
  "connections": {
    "active": 150,
    "total": 1250
  }
}
```

#### `GET /status`
Detailed server status and metrics.

**Response:**
```json
{
  "status": "operational",
  "timestamp": "2025-07-19T10:30:00.000Z",
  "server": {
    "uptime": 86400,
    "environment": "production",
    "node_version": "18.17.0",
    "memory_usage": {
      "rss": 256.5,
      "heapTotal": 180.2,
      "heapUsed": 120.8,
      "external": 15.3
    }
  },
  "database": {
    "status": "connected",
    "connections": 5,
    "response_time": 12
  },
  "websocket": {
    "active_connections": 150,
    "total_connections": 1250,
    "rooms": 45,
    "events_per_minute": 320
  }
}
```

#### `GET /metrics`
Prometheus-compatible metrics endpoint.

**Response:**
```
# HELP websocket_connections_total Total WebSocket connections
# TYPE websocket_connections_total counter
websocket_connections_total 1250

# HELP websocket_connections_active Active WebSocket connections
# TYPE websocket_connections_active gauge
websocket_connections_active 150

# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 5420
```

## 🔌 **WebSocket Events**

### **Connection Events**

#### `connect`
Triggered when client connects to WebSocket.

**Client → Server:**
```javascript
// Automatic on socket.io connection
```

**Server → Client:**
```javascript
{
  "event": "connected",
  "data": {
    "socketId": "abc123def456",
    "timestamp": "2025-07-19T10:30:00.000Z"
  }
}
```

#### `authenticate`
Authenticate user with Sanctum token.

**Client → Server:**
```javascript
socket.emit('authenticate', {
  token: 'sanctum_token_here'
});
```

**Server → Client (Success):**
```javascript
{
  "event": "authenticated",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin"
    },
    "permissions": ["receive_notifications", "send_messages"],
    "socketId": "abc123def456"
  }
}
```

**Server → Client (Error):**
```javascript
{
  "event": "authentication_error",
  "data": {
    "error": "Invalid token",
    "code": "AUTH_FAILED"
  }
}
```

#### `disconnect`
Triggered when client disconnects.

**Server → Client:**
```javascript
{
  "event": "disconnected",
  "data": {
    "reason": "client_disconnect",
    "timestamp": "2025-07-19T10:30:00.000Z"
  }
}
```

### **Notification Events**

#### `notification`
Real-time notification delivery.

**Server → Client:**
```javascript
{
  "event": "notification",
  "data": {
    "id": "notif_123",
    "type": "thread_reply",
    "title": "New reply to your thread",
    "message": "Someone replied to your thread 'PLC Programming Tips'",
    "data": {
      "thread_id": 456,
      "reply_id": 789,
      "user": {
        "id": 2,
        "name": "Jane Smith",
        "avatar": "/images/users/avatars/jane.jpg"
      }
    },
    "timestamp": "2025-07-19T10:30:00.000Z",
    "read": false
  }
}
```

#### `notification_read`
Mark notification as read.

**Client → Server:**
```javascript
socket.emit('notification_read', {
  notification_id: 'notif_123'
});
```

**Server → Client:**
```javascript
{
  "event": "notification_updated",
  "data": {
    "notification_id": "notif_123",
    "read": true,
    "read_at": "2025-07-19T10:30:00.000Z"
  }
}
```

### **User Status Events**

#### `user_online`
User comes online.

**Server → Client:**
```javascript
{
  "event": "user_online",
  "data": {
    "user_id": 2,
    "name": "Jane Smith",
    "avatar": "/images/users/avatars/jane.jpg",
    "last_seen": "2025-07-19T10:30:00.000Z"
  }
}
```

#### `user_offline`
User goes offline.

**Server → Client:**
```javascript
{
  "event": "user_offline",
  "data": {
    "user_id": 2,
    "last_seen": "2025-07-19T10:30:00.000Z"
  }
}
```

#### `typing_start`
User starts typing.

**Client → Server:**
```javascript
socket.emit('typing_start', {
  thread_id: 456
});
```

**Server → Client:**
```javascript
{
  "event": "user_typing",
  "data": {
    "user_id": 1,
    "name": "John Doe",
    "thread_id": 456,
    "typing": true
  }
}
```

#### `typing_stop`
User stops typing.

**Client → Server:**
```javascript
socket.emit('typing_stop', {
  thread_id: 456
});
```

### **Thread Events**

#### `thread_updated`
Thread content updated.

**Server → Client:**
```javascript
{
  "event": "thread_updated",
  "data": {
    "thread_id": 456,
    "title": "Updated PLC Programming Tips",
    "updated_by": {
      "id": 1,
      "name": "John Doe"
    },
    "updated_at": "2025-07-19T10:30:00.000Z"
  }
}
```

#### `new_reply`
New reply added to thread.

**Server → Client:**
```javascript
{
  "event": "new_reply",
  "data": {
    "reply_id": 789,
    "thread_id": 456,
    "content": "Great tips! Thanks for sharing.",
    "author": {
      "id": 2,
      "name": "Jane Smith",
      "avatar": "/images/users/avatars/jane.jpg",
      "role": "member"
    },
    "created_at": "2025-07-19T10:30:00.000Z"
  }
}
```

## 🔧 **Error Handling**

### **Error Response Format**
```javascript
{
  "event": "error",
  "data": {
    "error": "Error message",
    "code": "ERROR_CODE",
    "details": {
      "field": "validation error details"
    },
    "timestamp": "2025-07-19T10:30:00.000Z"
  }
}
```

### **Common Error Codes**
- `AUTH_FAILED`: Authentication failed
- `INVALID_TOKEN`: Invalid or expired token
- `PERMISSION_DENIED`: Insufficient permissions
- `RATE_LIMITED`: Too many requests
- `VALIDATION_ERROR`: Invalid request data
- `SERVER_ERROR`: Internal server error

## 📊 **Rate Limiting**

### **Connection Limits**
- **Max connections per IP**: 10
- **Max connections per user**: 5
- **Connection rate**: 5 per minute

### **Event Limits**
- **Messages per minute**: 60
- **Notifications per minute**: 30
- **Typing events per minute**: 120

## 🔍 **Monitoring & Debugging**

### **Debug Events**
Enable debug mode to receive additional events:

```javascript
socket.emit('debug_mode', { enabled: true });
```

**Debug Events:**
- `connection_stats`: Connection statistics
- `memory_usage`: Server memory usage
- `event_metrics`: Event processing metrics

### **Health Check Integration**
Monitor server health via HTTP endpoints:

```bash
# Basic health check
curl https://realtime.mechamap.com/health

# Detailed status
curl https://realtime.mechamap.com/status

# Metrics for monitoring
curl https://realtime.mechamap.com/metrics
```

## 📚 **Client Libraries**

### **JavaScript/Browser**
```javascript
import io from 'socket.io-client';

const socket = io('https://realtime.mechamap.com', {
  transports: ['websocket', 'polling'],
  secure: true
});

socket.on('connect', () => {
  socket.emit('authenticate', { token: 'sanctum_token' });
});

socket.on('notification', (data) => {
  console.log('New notification:', data);
});
```

### **Node.js**
```javascript
const io = require('socket.io-client');

const socket = io('https://realtime.mechamap.com');
socket.emit('authenticate', { token: 'sanctum_token' });
```

## 🔗 **Related Documentation**

- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment
- **[Laravel Integration](LARAVEL_INTEGRATION.md)** - Backend integration
- **[Monitoring Guide](MONITORING.md)** - Production monitoring

---

**API Documentation v1.0 - Updated for Production** 🚀
