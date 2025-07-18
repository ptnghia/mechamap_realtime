# Tài liệu API - MechaMap Realtime Server

Tài liệu này cung cấp thông tin toàn diện về các API endpoints và WebSocket events của MechaMap Realtime Server.

## 🌐 Base URLs

- **Development**: `http://localhost:3000`
- **Production**: `https://realtime.mechamap.com`

## 🔌 REST API Endpoints

### 📊 Health & Status Endpoints

#### GET `/`
Thông tin cơ bản về server.

**Response:**
```json
{
  "service": "MechaMap Realtime Server",
  "message": "WebSocket server is running",
  "version": "1.0.0",
  "timestamp": "2025-07-18T02:45:42.640Z",
  "endpoints": {
    "health": "/api/health",
    "status": "/api/status",
    "metrics": "/api/metrics",
    "broadcast": "POST /api/broadcast"
  },
  "websocket": {
    "url": "ws://localhost:3000",
    "transports": ["websocket", "polling"]
  }
}
```

#### GET `/api/health`
Health check endpoint cơ bản.

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

#### GET `/api/status`
Thông tin trạng thái server chi tiết.

**Response:**
```json
{
  "status": "online",
  "environment": "production",
  "version": "1.0.0",
  "uptime": 2272,
  "connections": 0,
  "memory_usage": "79.2 MB",
  "cpu_usage": "0.5%"
}
```

#### GET `/api/metrics`
Metrics cơ bản của server.

**Response:**
```json
{
  "connections": {
    "active": 0,
    "total": 0,
    "peak": 0
  },
  "requests": {
    "total": 5,
    "success": 5,
    "errors": 0
  },
  "performance": {
    "avg_response_time": 0.2,
    "uptime": 2272
  }
}
```

### 📈 Monitoring Endpoints

#### GET `/api/monitoring/health`
Health check chi tiết với monitoring data.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-18T02:45:42.640Z",
  "uptime": 2272,
  "system": {
    "memory": {
      "used": 79.2,
      "total": 2048,
      "percentage": 3.87
    },
    "cpu": {
      "usage": 0.5
    }
  },
  "connections": {
    "active": 0,
    "total": 0,
    "peak": 0
  },
  "database": {
    "status": "connected",
    "connections": 1
  }
}
```

#### GET `/api/monitoring/metrics`
Performance metrics chi tiết.

**Response:**
```json
{
  "connections": {
    "active": 0,
    "total": 0,
    "peak": 0,
    "by_user": {}
  },
  "requests": {
    "total": 5,
    "success": 5,
    "errors": 0,
    "rate": 0.002
  },
  "performance": {
    "avg_response_time": 0.2,
    "min_response_time": 0.1,
    "max_response_time": 0.5,
    "requests_per_second": 0.002
  },
  "memory": {
    "used": 79.2,
    "total": 2048,
    "percentage": 3.87
  },
  "uptime": 2272
}
```

#### GET `/api/monitoring/performance`
Thống kê hiệu suất.

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

#### GET `/api/monitoring/connections`
Thông tin kết nối WebSocket.

**Response:**
```json
{
  "active_connections": 0,
  "total_connections": 0,
  "peak_connections": 0,
  "connections_by_user": {},
  "channels": {
    "total": 0,
    "active": []
  }
}
```

#### GET `/api/monitoring/info`
Thông tin hệ thống.

**Response:**
```json
{
  "server": {
    "name": "MechaMap Realtime Server",
    "version": "1.0.0",
    "environment": "production",
    "node_version": "v18.17.0",
    "uptime": 2272
  },
  "system": {
    "platform": "linux",
    "arch": "x64",
    "memory": {
      "total": 2048,
      "used": 79.2
    }
  },
  "configuration": {
    "port": 3000,
    "ssl_enabled": false,
    "cluster_mode": true,
    "instances": 2
  }
}
```

### 📡 Broadcasting Endpoints

#### POST `/api/broadcast`
Gửi tin nhắn đến channels cụ thể.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <laravel-sanctum-token>
```

**Request Body:**
```json
{
  "channel": "private-user.123",
  "event": "notification.sent",
  "data": {
    "id": 456,
    "title": "Thông báo mới",
    "message": "Bạn có một tin nhắn mới",
    "type": "message",
    "created_at": "2025-07-18T02:45:42.640Z"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Message broadcasted successfully",
  "channel": "private-user.123",
  "event": "notification.sent",
  "recipients": 1,
  "timestamp": "2025-07-18T02:45:42.640Z"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Authentication required",
  "code": 401
}
```

## 🌐 WebSocket API

### Connection URL
```
ws://localhost:3000/socket.io/          # Development
wss://realtime.mechamap.com/socket.io/  # Production
```

### Authentication
WebSocket connections yêu cầu authentication thông qua:
- **Laravel Sanctum Token**: Gửi trong query parameter `token`
- **JWT Token**: Gửi trong query parameter `jwt`

**Example:**
```javascript
const socket = io('wss://realtime.mechamap.com', {
  query: {
    token: 'laravel-sanctum-token'
  }
});
```

### Client Events (Client → Server)

#### `subscribe`
Subscribe vào một channel.

**Payload:**
```json
{
  "channel": "private-user.123"
}
```

**Response:**
```json
{
  "success": true,
  "channel": "private-user.123",
  "message": "Subscribed successfully"
}
```

#### `unsubscribe`
Unsubscribe khỏi một channel.

**Payload:**
```json
{
  "channel": "private-user.123"
}
```

#### `ping`
Heartbeat để duy trì kết nối.

**Response:** `pong`

### Server Events (Server → Client)

#### `subscribed`
Xác nhận subscription thành công.

**Payload:**
```json
{
  "channel": "private-user.123",
  "timestamp": "2025-07-18T02:45:42.640Z"
}
```

#### `notification.sent`
Thông báo mới được gửi đến.

**Payload:**
```json
{
  "id": 456,
  "title": "Thông báo mới",
  "message": "Bạn có một tin nhắn mới",
  "type": "message",
  "data": {
    "sender_id": 789,
    "sender_name": "Nguyễn Văn A"
  },
  "created_at": "2025-07-18T02:45:42.640Z"
}
```

#### `notification.read`
Thông báo đã được đọc trên thiết bị khác.

**Payload:**
```json
{
  "notification_id": 456,
  "read_at": "2025-07-18T02:45:42.640Z"
}
```

#### `user.status`
Cập nhật trạng thái người dùng.

**Payload:**
```json
{
  "user_id": 123,
  "status": "online",
  "last_seen": "2025-07-18T02:45:42.640Z"
}
```

#### `error`
Thông báo lỗi.

**Payload:**
```json
{
  "error": "Authentication failed",
  "code": 401,
  "timestamp": "2025-07-18T02:45:42.640Z"
}
```

## 🔒 Authentication

### Laravel Sanctum Integration
Server tích hợp với Laravel backend sử dụng Sanctum tokens:

1. Client lấy token từ Laravel API
2. Gửi token trong WebSocket connection hoặc API request
3. Server validate token với Laravel backend
4. Nếu hợp lệ, cho phép kết nối/request

### JWT Fallback
Hỗ trợ JWT tokens như phương án dự phòng:

```javascript
const socket = io('wss://realtime.mechamap.com', {
  query: {
    jwt: 'jwt-token-here'
  }
});
```

## 📊 Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 200 | OK | Request thành công |
| 400 | Bad Request | Request không hợp lệ |
| 401 | Unauthorized | Thiếu hoặc sai authentication |
| 403 | Forbidden | Không có quyền truy cập |
| 404 | Not Found | Endpoint không tồn tại |
| 429 | Too Many Requests | Vượt quá rate limit |
| 500 | Internal Server Error | Lỗi server nội bộ |

## 🧪 Testing Examples

### cURL Examples

```bash
# Health check
curl -s https://realtime.mechamap.com/api/health

# Broadcast message
curl -X POST https://realtime.mechamap.com/api/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "channel": "private-user.123",
    "event": "notification.sent",
    "data": {
      "title": "Test notification",
      "message": "This is a test"
    }
  }'
```

### JavaScript Client Example

```javascript
// Kết nối WebSocket
const socket = io('wss://realtime.mechamap.com', {
  query: {
    token: 'your-sanctum-token'
  }
});

// Subscribe vào channel
socket.emit('subscribe', {
  channel: 'private-user.123'
});

// Lắng nghe thông báo
socket.on('notification.sent', (data) => {
  console.log('New notification:', data);
});

// Xử lý lỗi
socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

## 📝 Rate Limiting

- **Default**: 100 requests per minute per IP
- **WebSocket**: 5 connections per user
- **Broadcasting**: 10 messages per minute per user

## 🔗 CORS Configuration

Server được cấu hình CORS cho:
- `https://mechamap.com`
- `https://www.mechamap.com`
- `https://realtime.mechamap.com`

Credentials được cho phép cho cross-origin requests.
