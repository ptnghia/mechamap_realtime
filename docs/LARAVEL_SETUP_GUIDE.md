# Hướng dẫn cấu hình Laravel cho MechaMap Realtime Server

Tài liệu này hướng dẫn chi tiết cách cấu hình Laravel để tích hợp với MechaMap Realtime Server sử dụng Laravel Sanctum tokens.

## 🎯 Mục tiêu

- Cấu hình Laravel để gửi Sanctum tokens đúng format
- Tạo API endpoints để verify user cho WebSocket
- Thiết lập service để gửi real-time notifications
- Tích hợp với frontend để kết nối WebSocket

## 📋 Yêu cầu

- Laravel >= 8.0
- Laravel Sanctum đã được cài đặt
- PHP >= 8.0
- MySQL database

## 🚀 Bước 1: Cài đặt và cấu hình cơ bản

### 1.1 Cài đặt Laravel Sanctum (nếu chưa có)

```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

### 1.2 Cấu hình Environment Variables

Thêm vào file `.env`:

```env
# MechaMap Realtime Server Configuration
REALTIME_SERVER_URL=https://realtime.mechamap.com
REALTIME_WEBSOCKET_URL=wss://realtime.mechamap.com
REALTIME_API_KEY=mechamap_ws_kCTy45s4obktB6IJJH6DpKHzoveEJLgrnmbST8fxwufexn0u80RnqMSO51ubWVQ3
REALTIME_TIMEOUT=10
REALTIME_ENABLED=true

# CORS Configuration for development
SANCTUM_STATEFUL_DOMAINS=mechamap.test,localhost,127.0.0.1
SESSION_DOMAIN=.mechamap.test
```

### 1.3 Cấu hình Services

Thêm vào `config/services.php`:

```php
'realtime' => [
    'url' => env('REALTIME_SERVER_URL', 'https://realtime.mechamap.com'),
    'websocket_url' => env('REALTIME_WEBSOCKET_URL', 'wss://realtime.mechamap.com'),
    'api_key' => env('REALTIME_API_KEY'),
    'timeout' => env('REALTIME_TIMEOUT', 10),
    'enabled' => env('REALTIME_ENABLED', true),
],
```

## 🔧 Bước 2: Tạo Controller và Routes

### 2.1 Tạo WebSocket Controller

Sao chép file mẫu từ `docs/laravel-examples/WebSocketController.php` vào `app/Http/Controllers/`:

```bash
cp docs/laravel-examples/WebSocketController.php app/Http/Controllers/
```

### 2.2 Cấu hình Routes

Thêm vào `routes/api.php`:

```php
use App\Http\Controllers\WebSocketController;

// WebSocket API routes (protected by Sanctum)
Route::middleware(['auth:sanctum'])->group(function () {
    // Get WebSocket token for frontend
    Route::get('/user/websocket-token', [WebSocketController::class, 'getWebSocketToken']);
});

// WebSocket verification endpoint (called by Realtime Server)
Route::middleware(['auth:sanctum'])->prefix('websocket-api')->group(function () {
    Route::post('/verify-user', [WebSocketController::class, 'verifyUser']);
});
```

## 📡 Bước 3: Tạo Service để gửi notifications

### 3.1 Tạo RealtimeNotificationService

Sao chép file mẫu:

```bash
cp docs/laravel-examples/RealtimeNotificationService.php app/Services/
```

### 3.2 Đăng ký Service Provider

Thêm vào `app/Providers/AppServiceProvider.php`:

```php
use App\Services\RealtimeNotificationService;

public function register()
{
    $this->app->singleton(RealtimeNotificationService::class, function ($app) {
        return new RealtimeNotificationService();
    });
}
```

## 🔐 Bước 4: Cấu hình CORS và Sanctum

### 4.1 Cấu hình CORS

Cập nhật `config/cors.php`:

```php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'websocket-api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'https://mechamap.com',
        'https://www.mechamap.com',
        'https://mechamap.test',
        'http://mechamap.test',
        'http://localhost:3000',
    ],
    'allowed_headers' => ['*'],
    'supports_credentials' => true,
];
```

### 4.2 Cấu hình Sanctum

Cập nhật `config/sanctum.php`:

```php
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 
    'localhost,localhost:3000,127.0.0.1,mechamap.test'
)),
```

## 🎯 Bước 5: Tạo Event Listeners

### 5.1 Tạo Event Listener

Sao chép file mẫu:

```bash
cp docs/laravel-examples/SendRealtimeNotification.php app/Listeners/
```

### 5.2 Đăng ký Event Listener

Thêm vào `app/Providers/EventServiceProvider.php`:

```php
protected $listen = [
    MessageSent::class => [
        SendRealtimeNotification::class,
    ],
];
```

## 🧪 Bước 6: Tạo Artisan Commands để test

### 6.1 Tạo Test Command

```bash
php artisan make:command TestRealtimeConnection
```

Sau đó sao chép nội dung từ `docs/laravel-examples/TestRealtimeConnection.php`

## 🌐 Bước 7: Frontend Integration

### 7.1 Lấy WebSocket Token

```javascript
// Lấy token từ Laravel API
const response = await fetch('/api/user/websocket-token', {
    headers: {
        'Authorization': `Bearer ${laravelToken}`,
        'Accept': 'application/json'
    }
});

const data = await response.json();
if (data.success) {
    const { token, websocket_url } = data.data;
    
    // Kết nối WebSocket
    const socket = io(websocket_url, {
        auth: {
            token: token  // ✅ ĐÚNG: Gửi qua auth object
        }
    });
}
```

### 7.2 Xử lý WebSocket Events

```javascript
// Lắng nghe kết nối thành công
socket.on('connect', () => {
    console.log('✅ Connected to MechaMap Realtime Server');
});

// Lắng nghe thông báo
socket.on('notification.sent', (notification) => {
    console.log('📢 New notification:', notification);
    showNotification(notification);
});

// Xử lý lỗi
socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error);
});
```

## 🧪 Bước 8: Testing

### 8.1 Test cơ bản

```bash
# Test connection
php artisan realtime:test

# Test với user ID cụ thể
php artisan realtime:test 123
```

### 8.2 Test API endpoints

```bash
# Test WebSocket token endpoint
curl -H "Authorization: Bearer YOUR_SANCTUM_TOKEN" \
     -H "Accept: application/json" \
     http://mechamap.test/api/user/websocket-token

# Test verify user endpoint
curl -X POST \
     -H "Authorization: Bearer YOUR_SANCTUM_TOKEN" \
     -H "Accept: application/json" \
     http://mechamap.test/api/websocket-api/verify-user
```

### 8.3 Test gửi notification

```php
// Trong Controller hoặc Service
use App\Services\RealtimeNotificationService;

public function sendTestNotification(RealtimeNotificationService $realtime)
{
    $result = $realtime->sendToUser(123, 'notification.sent', [
        'title' => 'Test Notification',
        'message' => 'This is a test from Laravel',
        'type' => 'test'
    ]);
    
    return response()->json(['success' => !!$result]);
}
```

## 🔍 Troubleshooting

### Lỗi thường gặp

1. **Token format không đúng**
   - Đảm bảo gửi token qua `auth.token` chứ không phải query parameter
   - Kiểm tra token có format Sanctum đúng: `{id}|{hash}`

2. **CORS errors**
   - Kiểm tra domain đã được thêm vào CORS configuration
   - Verify Sanctum stateful domains

3. **Authentication failed**
   - Kiểm tra endpoint `/api/websocket-api/verify-user` hoạt động
   - Verify token còn hạn và hợp lệ

4. **Connection rejected**
   - Kiểm tra logs của Realtime Server
   - Verify user permissions

## 📋 Checklist hoàn thành

- [ ] Environment variables đã được cấu hình
- [ ] WebSocketController đã được tạo
- [ ] Routes đã được cấu hình
- [ ] RealtimeNotificationService đã được tạo
- [ ] CORS và Sanctum đã được cấu hình
- [ ] Event Listeners đã được tạo
- [ ] Test commands đã được tạo
- [ ] Frontend integration đã được test
- [ ] Tất cả tests đều pass

## 🆘 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra logs Laravel: `tail -f storage/logs/laravel.log`
2. Kiểm tra logs Realtime Server
3. Test từng bước một cách riêng biệt
4. Liên hệ team development để được hỗ trợ

## 📁 File Examples

Tất cả file PHP mẫu đã được tạo sẵn trong thư mục `docs/laravel-examples/`:

- `WebSocketController.php` - Controller xử lý WebSocket authentication
- `RealtimeNotificationService.php` - Service gửi real-time notifications
- `SendRealtimeNotification.php` - Event listener tự động gửi notifications
- `TestRealtimeConnection.php` - Artisan command để test connection

## 📚 Tài liệu tham khảo

- [Laravel Sanctum Documentation](https://laravel.com/docs/sanctum)
- [MechaMap Realtime Server API](API.md)
- [Frontend Integration Guide](FRONTEND_INTEGRATION.md)
