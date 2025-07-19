# Laravel Examples for MechaMap Realtime Server

Thư mục này chứa các file PHP mẫu để tích hợp Laravel với MechaMap Realtime Server.

## 📁 Danh sách Files

### 🎯 Core Files

1. **WebSocketController.php**
   - Controller xử lý WebSocket authentication
   - Endpoints: verify-user, get-token, revoke-token
   - User permissions management

2. **RealtimeNotificationService.php**
   - Service chính để gửi real-time notifications
   - Hỗ trợ retry logic và error handling
   - Multiple notification types

3. **SendRealtimeNotification.php**
   - Event listener tự động gửi notifications
   - Hỗ trợ queue processing
   - Multiple event types

4. **TestRealtimeConnection.php**
   - Artisan command để test connection
   - Comprehensive testing suite
   - Performance testing

### ⚙️ Configuration Files

5. **routes-api-example.php**
   - API routes configuration
   - Test endpoints
   - Usage examples

6. **services-config-example.php**
   - Services configuration
   - Environment variables
   - All configuration options

## 🚀 Cách sử dụng

### Bước 1: Copy Files

```bash
# Copy Controller
cp docs/laravel-examples/WebSocketController.php app/Http/Controllers/

# Copy Service
mkdir -p app/Services
cp docs/laravel-examples/RealtimeNotificationService.php app/Services/

# Copy Event Listener
cp docs/laravel-examples/SendRealtimeNotification.php app/Listeners/

# Copy Artisan Command
cp docs/laravel-examples/TestRealtimeConnection.php app/Console/Commands/
```

### Bước 2: Cấu hình Routes

Thêm nội dung từ `routes-api-example.php` vào `routes/api.php`:

```php
use App\Http\Controllers\WebSocketController;

// WebSocket API routes
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/user/websocket-token', [WebSocketController::class, 'getWebSocketToken']);
});

Route::middleware(['auth:sanctum'])->prefix('websocket-api')->group(function () {
    Route::post('/verify-user', [WebSocketController::class, 'verifyUser']);
});
```

### Bước 3: Cấu hình Services

Thêm cấu hình từ `services-config-example.php` vào `config/services.php`:

```php
'realtime' => [
    'url' => env('REALTIME_SERVER_URL', 'https://realtime.mechamap.com'),
    'websocket_url' => env('REALTIME_WEBSOCKET_URL', 'wss://realtime.mechamap.com'),
    'api_key' => env('REALTIME_API_KEY'),
    // ... other config
],
```

### Bước 4: Environment Variables

Thêm vào `.env`:

```env
REALTIME_SERVER_URL=https://realtime.mechamap.com
REALTIME_WEBSOCKET_URL=wss://realtime.mechamap.com
REALTIME_API_KEY=mechamap_ws_kCTy45s4obktB6IJJH6DpKHzoveEJLgrnmbST8fxwufexn0u80RnqMSO51ubWVQ3
REALTIME_ENABLED=true
```

### Bước 5: Đăng ký Service Provider

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

### Bước 6: Đăng ký Event Listeners

Thêm vào `app/Providers/EventServiceProvider.php`:

```php
use App\Events\MessageSent;
use App\Listeners\SendRealtimeNotification;

protected $listen = [
    MessageSent::class => [
        SendRealtimeNotification::class,
    ],
];
```

## 🧪 Testing

### Test cơ bản

```bash
# Test connection
php artisan realtime:test

# Test với user cụ thể
php artisan realtime:test 123

# Chỉ test health
php artisan realtime:test --health-only

# Test toàn diện
php artisan realtime:test --full-test
```

### Test API endpoints

```bash
# Test WebSocket token
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://mechamap.com/api/user/websocket-token

# Test notification
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"user_id":123,"title":"Test","message":"Hello"}' \
     http://mechamap.com/api/realtime-test/send-notification
```

## 📝 Customization

### Thêm notification type mới

1. **Trong RealtimeNotificationService.php:**

```php
public function sendCustomNotification($userId, $customData)
{
    return $this->sendToUser($userId, 'notification.sent', [
        'id' => uniqid('custom_'),
        'type' => 'custom',
        'title' => $customData['title'],
        'message' => $customData['message'],
        'data' => $customData
    ]);
}
```

2. **Trong SendRealtimeNotification.php:**

```php
// Thêm event handler mới
case CustomEvent::class:
    $this->handleCustomEvent($event);
    break;

private function handleCustomEvent(CustomEvent $event)
{
    // Custom logic here
}
```

### Thêm permissions mới

Trong `WebSocketController.php`, method `getUserPermissions()`:

```php
case 'custom_role':
    $permissions = array_merge($permissions, [
        'custom_permission_1',
        'custom_permission_2'
    ]);
    break;
```

## 🔍 Troubleshooting

### Lỗi thường gặp

1. **Class not found**
   - Chạy `composer dump-autoload`
   - Kiểm tra namespace

2. **Service not registered**
   - Kiểm tra AppServiceProvider
   - Chạy `php artisan config:cache`

3. **Routes not working**
   - Chạy `php artisan route:cache`
   - Kiểm tra middleware

4. **Events not firing**
   - Kiểm tra EventServiceProvider
   - Chạy `php artisan event:cache`

### Debug commands

```bash
# Clear all caches
php artisan optimize:clear

# Check routes
php artisan route:list | grep websocket

# Check events
php artisan event:list

# Test service
php artisan tinker
>>> app(\App\Services\RealtimeNotificationService::class)->checkHealth()
```

## 📚 Tài liệu liên quan

- [Laravel Setup Guide](../LARAVEL_SETUP_GUIDE.md)
- [API Documentation](../API.md)
- [Frontend Integration](../FRONTEND_INTEGRATION.md)

## 🆘 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra logs: `tail -f storage/logs/laravel.log`
2. Test từng bước riêng biệt
3. Liên hệ team development
