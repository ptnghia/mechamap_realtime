# Quick Start Guide - MechaMap Realtime Server

Hướng dẫn nhanh để bắt đầu sử dụng MechaMap Realtime Server cho team Laravel và Frontend.

## 🚀 Thông tin cơ bản

### Production URLs
- **Realtime Server**: `https://realtime.mechamap.com`
- **WebSocket**: `wss://realtime.mechamap.com`
- **Health Check**: `https://realtime.mechamap.com/api/health`

### Authentication
- **API Key**: `mechamap_ws_kCTy45s4obktB6IJJH6DpKHzoveEJLgrnmbST8fxwufexn0u80RnqMSO51ubWVQ3`
- **Method**: Laravel Sanctum tokens

## 📱 Cho Team Laravel

### 1. Cài đặt Service (5 phút)

Tạo file `app/Services/RealtimeNotificationService.php`:

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class RealtimeNotificationService
{
    private $baseUrl = 'https://realtime.mechamap.com';
    private $apiKey = 'mechamap_ws_kCTy45s4obktB6IJJH6DpKHzoveEJLgrnmbST8fxwufexn0u80RnqMSO51ubWVQ3';

    public function sendToUser($userId, $event, $data)
    {
        return Http::timeout(10)
            ->withHeaders(['X-API-Key' => $this->apiKey])
            ->post("{$this->baseUrl}/api/broadcast", [
                'channel' => "private-user.{$userId}",
                'event' => $event,
                'data' => $data,
            ]);
    }
}
```

### 2. Gửi thông báo (1 phút)

```php
// Trong Controller
use App\Services\RealtimeNotificationService;

public function sendMessage(Request $request, RealtimeNotificationService $realtime)
{
    // Lưu message vào DB
    $message = Message::create($request->all());
    
    // Gửi thông báo real-time
    $realtime->sendToUser($request->receiver_id, 'notification.sent', [
        'id' => $message->id,
        'title' => 'Tin nhắn mới',
        'message' => 'Bạn có tin nhắn mới từ ' . auth()->user()->name,
        'type' => 'message',
        'data' => ['message_id' => $message->id]
    ]);
    
    return response()->json($message);
}
```

### 3. Test ngay

```bash
php artisan tinker
```

```php
$service = new App\Services\RealtimeNotificationService();
$result = $service->sendToUser(1, 'test.notification', [
    'title' => 'Test',
    'message' => 'Hello from Laravel!'
]);
echo $result->body();
```

## 🌐 Cho Team Frontend

### 1. Cài đặt Socket.IO (1 phút)

```bash
npm install socket.io-client
```

### 2. Tạo Service (5 phút)

Tạo file `services/RealtimeService.js`:

```javascript
import { io } from 'socket.io-client';

class RealtimeService {
    constructor() {
        this.socket = null;
    }

    async connect(userId) {
        // Lấy token từ Laravel API
        const response = await fetch('/api/user/websocket-token', {
            headers: {
                'Authorization': `Bearer ${laravelToken}`,
                'Accept': 'application/json'
            }
        });
        const { token } = await response.json();

        // Kết nối WebSocket
        this.socket = io('wss://realtime.mechamap.com', {
            query: { token }
        });

        // Lắng nghe events
        this.socket.on('connect', () => {
            console.log('✅ Connected to realtime server');
            this.socket.emit('subscribe', { channel: `private-user.${userId}` });
        });

        this.socket.on('notification.sent', (notification) => {
            this.showNotification(notification);
        });
    }

    showNotification(notification) {
        // Hiển thị notification trong UI
        console.log('📢 New notification:', notification);
        
        // Browser notification
        if (Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico'
            });
        }
    }
}

export const realtimeService = new RealtimeService();
```

### 3. Sử dụng trong App (2 phút)

```javascript
// Trong main app hoặc sau khi login
import { realtimeService } from './services/RealtimeService';

// Khi user login thành công
async function onUserLogin(user) {
    await realtimeService.connect(user.id);
}

// Request notification permission
if ('Notification' in window) {
    Notification.requestPermission();
}
```

## 🧪 Test End-to-End (2 phút)

### 1. Test từ Laravel

```php
// Trong tinker hoặc controller
$service = new App\Services\RealtimeNotificationService();
$service->sendToUser(123, 'notification.sent', [
    'title' => 'Test từ Laravel',
    'message' => 'Nếu bạn thấy thông báo này, tích hợp đã thành công!',
    'type' => 'test'
]);
```

### 2. Kiểm tra Frontend

- Mở browser console
- Kết nối WebSocket với user ID 123
- Sẽ thấy notification xuất hiện

## 📋 Checklist 5 phút

### Laravel Team
- [ ] Tạo `RealtimeNotificationService`
- [ ] Test gửi notification với tinker
- [ ] Tích hợp vào 1 feature (message/order)

### Frontend Team  
- [ ] Cài đặt socket.io-client
- [ ] Tạo `RealtimeService`
- [ ] Test kết nối và nhận notification
- [ ] Request notification permission

### Test Integration
- [ ] Laravel gửi notification
- [ ] Frontend nhận được notification
- [ ] Browser notification hiển thị

## 🔗 API Endpoints quan trọng

### Health Check
```bash
curl https://realtime.mechamap.com/api/health
```

### Send Notification
```bash
curl -X POST https://realtime.mechamap.com/api/broadcast \
  -H "X-API-Key: mechamap_ws_kCTy45s4obktB6IJJH6DpKHzoveEJLgrnmbST8fxwufexn0u80RnqMSO51ubWVQ3" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "private-user.123",
    "event": "notification.sent",
    "data": {
      "title": "Test",
      "message": "Hello World"
    }
  }'
```

## 🎯 Các loại thông báo phổ biến

### 1. Tin nhắn mới
```php
$realtime->sendToUser($userId, 'notification.sent', [
    'type' => 'message',
    'title' => 'Tin nhắn mới',
    'message' => 'Bạn có tin nhắn mới từ ' . $senderName,
    'data' => ['message_id' => $messageId]
]);
```

### 2. Cập nhật đơn hàng
```php
$realtime->sendToUser($userId, 'notification.sent', [
    'type' => 'order_update',
    'title' => 'Cập nhật đơn hàng',
    'message' => "Đơn hàng #{$orderId} đã được {$status}",
    'data' => ['order_id' => $orderId, 'status' => $status]
]);
```

### 3. Thông báo hệ thống
```php
$realtime->sendToUser($userId, 'notification.sent', [
    'type' => 'system',
    'title' => 'Thông báo hệ thống',
    'message' => 'Hệ thống sẽ bảo trì vào 2h sáng',
    'data' => ['maintenance_time' => '2024-01-01 02:00:00']
]);
```

## 🚨 Troubleshooting nhanh

### Laravel không gửi được
```bash
# Test connection
curl https://realtime.mechamap.com/api/health

# Check API key
echo "mechamap_ws_kCTy45s4obktB6IJJH6DpKHzoveEJLgrnmbST8fxwufexn0u80RnqMSO51ubWVQ3"
```

### Frontend không kết nối được
```javascript
// Check WebSocket URL
console.log('wss://realtime.mechamap.com');

// Check token
console.log('Token:', token);

// Enable debug
localStorage.debug = 'socket.io-client:socket';
```

### CORS Issues
- Đảm bảo domain được whitelist trong server
- Check headers trong network tab
- Verify SSL certificate

## 📚 Tài liệu chi tiết

- [Laravel Integration Guide](LARAVEL_INTEGRATION.md) - Hướng dẫn chi tiết cho Laravel
- [Frontend Integration Guide](FRONTEND_INTEGRATION.md) - Hướng dẫn chi tiết cho Frontend  
- [API Documentation](API.md) - Chi tiết tất cả API endpoints
- [Deployment Guide](DEPLOYMENT.md) - Hướng dẫn deploy và maintenance

## 🆘 Hỗ trợ

### Liên hệ
- **Development Team**: [team-email]
- **Documentation**: GitHub Issues
- **Emergency**: [emergency-contact]

### Debug Commands
```bash
# Health check
curl https://realtime.mechamap.com/api/health

# Server info  
curl https://realtime.mechamap.com/api/monitoring/info

# Test notification
curl -X POST https://realtime.mechamap.com/api/broadcast \
  -H "X-API-Key: mechamap_ws_kCTy45s4obktB6IJJH6DpKHzoveEJLgrnmbST8fxwufexn0u80RnqMSO51ubWVQ3" \
  -H "Content-Type: application/json" \
  -d '{"channel":"private-user.1","event":"test","data":{"message":"test"}}'
```

**Chúc các bạn tích hợp thành công! 🎉**

Nếu gặp vấn đề gì, hãy check health endpoint trước, sau đó xem logs và liên hệ team để được hỗ trợ.
