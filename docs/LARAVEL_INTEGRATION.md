# Tích hợp Laravel với MechaMap Realtime Server

Tài liệu này hướng dẫn team Laravel cách tích hợp với MechaMap Realtime Server để gửi thông báo real-time.

## 🔗 Thông tin kết nối

### Production URLs
- **Realtime Server**: `https://realtime.mechamap.com`
- **Broadcasting Endpoint**: `https://realtime.mechamap.com/api/broadcast`
- **Health Check**: `https://realtime.mechamap.com/api/health`

### Authentication
- **API Key**: `mechamap_ws_kCTy45s4obktB6IJJH6DpKHzoveEJLgrnmbST8fxwufexn0u80RnqMSO51ubWVQ3`
- **Method**: Laravel Sanctum tokens hoặc API Key

## 🚀 Cách gửi thông báo từ Laravel

### 1. Sử dụng HTTP Client (Khuyến nghị)

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RealtimeNotificationService
{
    private $baseUrl;
    private $apiKey;

    public function __construct()
    {
        $this->baseUrl = config('services.realtime.url', 'https://realtime.mechamap.com');
        $this->apiKey = config('services.realtime.api_key');
    }

    /**
     * Gửi thông báo đến user cụ thể
     */
    public function sendToUser($userId, $event, $data)
    {
        return $this->broadcast("private-user.{$userId}", $event, $data);
    }

    /**
     * Gửi thông báo đến channel cụ thể
     */
    public function broadcast($channel, $event, $data)
    {
        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'X-API-Key' => $this->apiKey,
                ])
                ->post("{$this->baseUrl}/api/broadcast", [
                    'channel' => $channel,
                    'event' => $event,
                    'data' => $data,
                    'timestamp' => now()->toISOString(),
                ]);

            if ($response->successful()) {
                Log::info('Realtime notification sent', [
                    'channel' => $channel,
                    'event' => $event,
                    'response' => $response->json()
                ]);
                return $response->json();
            }

            Log::error('Failed to send realtime notification', [
                'channel' => $channel,
                'event' => $event,
                'status' => $response->status(),
                'response' => $response->body()
            ]);

            return false;

        } catch (\Exception $e) {
            Log::error('Realtime notification exception', [
                'channel' => $channel,
                'event' => $event,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Kiểm tra health của Realtime Server
     */
    public function checkHealth()
    {
        try {
            $response = Http::timeout(5)->get("{$this->baseUrl}/api/health");
            return $response->successful() ? $response->json() : false;
        } catch (\Exception $e) {
            Log::error('Realtime server health check failed', ['error' => $e->getMessage()]);
            return false;
        }
    }
}
```

### 2. Cấu hình trong config/services.php

```php
<?php

return [
    // ... other services

    'realtime' => [
        'url' => env('REALTIME_SERVER_URL', 'https://realtime.mechamap.com'),
        'api_key' => env('REALTIME_API_KEY', 'mechamap_ws_kCTy45s4obktB6IJJH6DpKHzoveEJLgrnmbST8fxwufexn0u80RnqMSO51ubWVQ3'),
        'timeout' => env('REALTIME_TIMEOUT', 10),
        'enabled' => env('REALTIME_ENABLED', true),
    ],
];
```

### 3. Environment Variables (.env)

```env
# MechaMap Realtime Server
REALTIME_SERVER_URL=https://realtime.mechamap.com
REALTIME_API_KEY=mechamap_ws_kCTy45s4obktB6IJJH6DpKHzoveEJLgrnmbST8fxwufexn0u80RnqMSO51ubWVQ3
REALTIME_TIMEOUT=10
REALTIME_ENABLED=true
```

## 📡 Các loại thông báo

### 1. Thông báo tin nhắn mới

```php
<?php

use App\Services\RealtimeNotificationService;

class MessageController extends Controller
{
    private $realtimeService;

    public function __construct(RealtimeNotificationService $realtimeService)
    {
        $this->realtimeService = $realtimeService;
    }

    public function sendMessage(Request $request)
    {
        // Lưu tin nhắn vào database
        $message = Message::create([
            'sender_id' => auth()->id(),
            'receiver_id' => $request->receiver_id,
            'content' => $request->content,
        ]);

        // Gửi thông báo real-time
        $this->realtimeService->sendToUser($request->receiver_id, 'notification.sent', [
            'id' => $message->id,
            'type' => 'message',
            'title' => 'Tin nhắn mới',
            'message' => 'Bạn có tin nhắn mới từ ' . auth()->user()->name,
            'data' => [
                'message_id' => $message->id,
                'sender_id' => auth()->id(),
                'sender_name' => auth()->user()->name,
                'sender_avatar' => auth()->user()->avatar,
                'content' => $message->content,
            ],
            'created_at' => $message->created_at->toISOString(),
        ]);

        return response()->json(['success' => true, 'message' => $message]);
    }
}
```

### 2. Thông báo cập nhật trạng thái

```php
<?php

public function updateOrderStatus($orderId, $status)
{
    $order = Order::findOrFail($orderId);
    $order->update(['status' => $status]);

    // Gửi thông báo đến user
    $this->realtimeService->sendToUser($order->user_id, 'notification.sent', [
        'id' => uniqid(),
        'type' => 'order_update',
        'title' => 'Cập nhật đơn hàng',
        'message' => "Đơn hàng #{$order->id} đã được cập nhật: {$status}",
        'data' => [
            'order_id' => $order->id,
            'status' => $status,
            'updated_at' => now()->toISOString(),
        ],
    ]);

    return $order;
}
```

### 3. Thông báo hệ thống

```php
<?php

public function sendSystemNotification($userIds, $title, $message, $data = [])
{
    foreach ($userIds as $userId) {
        $this->realtimeService->sendToUser($userId, 'notification.sent', [
            'id' => uniqid(),
            'type' => 'system',
            'title' => $title,
            'message' => $message,
            'data' => $data,
            'created_at' => now()->toISOString(),
        ]);
    }
}
```

## 🎯 Event Listeners

### 1. Tạo Event Listener

```php
<?php

namespace App\Listeners;

use App\Events\MessageSent;
use App\Services\RealtimeNotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendRealtimeNotification implements ShouldQueue
{
    private $realtimeService;

    public function __construct(RealtimeNotificationService $realtimeService)
    {
        $this->realtimeService = $realtimeService;
    }

    public function handle(MessageSent $event)
    {
        $message = $event->message;
        
        $this->realtimeService->sendToUser($message->receiver_id, 'notification.sent', [
            'id' => $message->id,
            'type' => 'message',
            'title' => 'Tin nhắn mới',
            'message' => 'Bạn có tin nhắn mới từ ' . $message->sender->name,
            'data' => [
                'message_id' => $message->id,
                'sender_id' => $message->sender_id,
                'sender_name' => $message->sender->name,
                'content' => $message->content,
            ],
            'created_at' => $message->created_at->toISOString(),
        ]);
    }
}
```

### 2. Đăng ký Event Listener

```php
<?php

// app/Providers/EventServiceProvider.php

protected $listen = [
    MessageSent::class => [
        SendRealtimeNotification::class,
    ],
    OrderStatusUpdated::class => [
        SendOrderUpdateNotification::class,
    ],
];
```

## 🔧 Artisan Commands

### 1. Command test kết nối

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\RealtimeNotificationService;

class TestRealtimeConnection extends Command
{
    protected $signature = 'realtime:test {user_id?}';
    protected $description = 'Test connection to MechaMap Realtime Server';

    private $realtimeService;

    public function __construct(RealtimeNotificationService $realtimeService)
    {
        parent::__construct();
        $this->realtimeService = $realtimeService;
    }

    public function handle()
    {
        $this->info('Testing MechaMap Realtime Server connection...');

        // Test health check
        $health = $this->realtimeService->checkHealth();
        if ($health) {
            $this->info('✅ Health check passed');
            $this->line('Server status: ' . $health['status']);
            $this->line('Uptime: ' . $health['uptime'] . ' seconds');
        } else {
            $this->error('❌ Health check failed');
            return 1;
        }

        // Test notification
        $userId = $this->argument('user_id') ?? 1;
        $result = $this->realtimeService->sendToUser($userId, 'test.notification', [
            'title' => 'Test Notification',
            'message' => 'This is a test notification from Laravel',
            'timestamp' => now()->toISOString(),
        ]);

        if ($result) {
            $this->info("✅ Test notification sent to user {$userId}");
            $this->line('Response: ' . json_encode($result, JSON_PRETTY_PRINT));
        } else {
            $this->error("❌ Failed to send test notification to user {$userId}");
            return 1;
        }

        return 0;
    }
}
```

### 2. Command gửi thông báo hàng loạt

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\RealtimeNotificationService;
use App\Models\User;

class SendBulkNotification extends Command
{
    protected $signature = 'realtime:broadcast {title} {message} {--users=all}';
    protected $description = 'Send notification to multiple users';

    private $realtimeService;

    public function __construct(RealtimeNotificationService $realtimeService)
    {
        parent::__construct();
        $this->realtimeService = $realtimeService;
    }

    public function handle()
    {
        $title = $this->argument('title');
        $message = $this->argument('message');
        $usersOption = $this->option('users');

        if ($usersOption === 'all') {
            $users = User::all();
        } else {
            $userIds = explode(',', $usersOption);
            $users = User::whereIn('id', $userIds)->get();
        }

        $this->info("Sending notification to {$users->count()} users...");

        $successCount = 0;
        $failCount = 0;

        foreach ($users as $user) {
            $result = $this->realtimeService->sendToUser($user->id, 'notification.sent', [
                'id' => uniqid(),
                'type' => 'system',
                'title' => $title,
                'message' => $message,
                'created_at' => now()->toISOString(),
            ]);

            if ($result) {
                $successCount++;
            } else {
                $failCount++;
            }
        }

        $this->info("✅ Successfully sent: {$successCount}");
        if ($failCount > 0) {
            $this->warn("❌ Failed to send: {$failCount}");
        }

        return 0;
    }
}
```

## 🔍 Middleware xác thực

### 1. Middleware cho Realtime Server

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RealtimeServerAuth
{
    public function handle(Request $request, Closure $next)
    {
        $apiKey = $request->header('X-API-Key');
        $expectedKey = config('services.realtime.api_key');

        if (!$apiKey || $apiKey !== $expectedKey) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Invalid API key'
            ], 401);
        }

        return $next($request);
    }
}
```

### 2. Routes cho Realtime Server callback

```php
<?php

// routes/api.php

Route::middleware(['realtime.auth'])->prefix('realtime')->group(function () {
    Route::post('/webhook/message-delivered', [RealtimeController::class, 'messageDelivered']);
    Route::post('/webhook/user-connected', [RealtimeController::class, 'userConnected']);
    Route::post('/webhook/user-disconnected', [RealtimeController::class, 'userDisconnected']);
});
```

## 📊 Monitoring và Logging

### 1. Health Check Job

```php
<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Services\RealtimeNotificationService;
use Illuminate\Support\Facades\Log;

class CheckRealtimeServerHealth implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    private $realtimeService;

    public function __construct(RealtimeNotificationService $realtimeService)
    {
        $this->realtimeService = $realtimeService;
    }

    public function handle()
    {
        $health = $this->realtimeService->checkHealth();
        
        if (!$health) {
            Log::error('MechaMap Realtime Server is down');
            // Gửi alert đến admin
        } else {
            Log::info('MechaMap Realtime Server health check passed', $health);
        }
    }
}
```

### 2. Schedule Health Check

```php
<?php

// app/Console/Kernel.php

protected function schedule(Schedule $schedule)
{
    // Check realtime server health every 5 minutes
    $schedule->job(CheckRealtimeServerHealth::class)->everyFiveMinutes();
}
```

## 🧪 Testing

### 1. Feature Test

```php
<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Services\RealtimeNotificationService;
use Illuminate\Support\Facades\Http;

class RealtimeNotificationTest extends TestCase
{
    public function test_can_send_notification_to_user()
    {
        Http::fake([
            'https://realtime.mechamap.com/api/broadcast' => Http::response([
                'success' => true,
                'message' => 'Message broadcasted successfully',
                'recipients' => 1
            ], 200)
        ]);

        $service = new RealtimeNotificationService();
        $result = $service->sendToUser(1, 'test.notification', [
            'title' => 'Test',
            'message' => 'Test message'
        ]);

        $this->assertTrue($result !== false);
        $this->assertEquals('Message broadcasted successfully', $result['message']);
    }

    public function test_handles_failed_notification()
    {
        Http::fake([
            'https://realtime.mechamap.com/api/broadcast' => Http::response([
                'error' => 'Server error'
            ], 500)
        ]);

        $service = new RealtimeNotificationService();
        $result = $service->sendToUser(1, 'test.notification', [
            'title' => 'Test',
            'message' => 'Test message'
        ]);

        $this->assertFalse($result);
    }
}
```

## 📋 Checklist tích hợp

### Setup ban đầu
- [ ] Thêm service class `RealtimeNotificationService`
- [ ] Cấu hình `config/services.php`
- [ ] Thêm environment variables
- [ ] Test kết nối với `php artisan realtime:test`

### Tích hợp thông báo
- [ ] Tích hợp vào message system
- [ ] Tích hợp vào order updates
- [ ] Tích hợp vào system notifications
- [ ] Setup event listeners

### Monitoring
- [ ] Setup health check job
- [ ] Configure logging
- [ ] Setup alerts cho downtime
- [ ] Monitor performance

### Testing
- [ ] Unit tests cho service
- [ ] Feature tests cho notifications
- [ ] Manual testing với frontend
- [ ] Load testing

## 🆘 Troubleshooting

### Lỗi thường gặp

1. **Connection timeout**
   - Kiểm tra network connectivity
   - Tăng timeout trong config
   - Kiểm tra firewall settings

2. **Authentication failed**
   - Kiểm tra API key
   - Verify headers được gửi đúng
   - Check server logs

3. **Message not delivered**
   - Kiểm tra user có đang online không
   - Verify channel name format
   - Check WebSocket connection

### Debug commands

```bash
# Test connection
php artisan realtime:test

# Send test notification
php artisan realtime:test 123

# Check health
curl https://realtime.mechamap.com/api/health

# View logs
tail -f storage/logs/laravel.log | grep -i realtime
```

Tài liệu này cung cấp tất cả thông tin cần thiết để team Laravel tích hợp với MechaMap Realtime Server một cách hiệu quả.

## 🔗 Liên kết với Frontend

Để frontend có thể kết nối WebSocket, cần:

1. **Lấy Sanctum token từ Laravel:**
```php
// API endpoint để frontend lấy token
Route::middleware('auth:sanctum')->get('/user/websocket-token', function (Request $request) {
    return response()->json([
        'token' => $request->user()->createToken('websocket')->plainTextToken,
        'user_id' => $request->user()->id,
        'websocket_url' => 'wss://realtime.mechamap.com'
    ]);
});
```

2. **Frontend sử dụng token để kết nối:**
```javascript
// Lấy token từ Laravel API
const response = await fetch('/api/user/websocket-token', {
    headers: {
        'Authorization': `Bearer ${laravelToken}`,
        'Accept': 'application/json'
    }
});
const { token, user_id, websocket_url } = await response.json();

// Kết nối WebSocket
const socket = io(websocket_url, {
    query: { token: token }
});
```

Xem thêm chi tiết trong [Frontend Integration Guide](FRONTEND_INTEGRATION.md).
