# Laravel Integration Guide - MechaMap Realtime Server

🔗 **Complete guide for integrating Laravel backend with MechaMap Realtime Server**

## 🎯 **Integration Overview**

```
Laravel Backend (https://mechamap.com)
    ↓ HTTP API Calls
Realtime Server (https://realtime.mechamap.com)
    ↓ WebSocket Events
Frontend Users (https://mechamap.com)
```

## 🔐 **Authentication Setup**

### **API Key Configuration**

**Laravel .env:**
```bash
# WebSocket API Key Hash (for verification)
WEBSOCKET_API_KEY_HASH=b868ccd849f0e13b6d32fa95a250809daed5ac04c48d64fbf6bab0f035249808

# Realtime Server URLs
WEBSOCKET_SERVER_URL=https://realtime.mechamap.com
NODEJS_BROADCAST_URL=https://realtime.mechamap.com
```

**Realtime Server .env:**
```bash
# API Key (raw key for sending requests)
LARAVEL_API_KEY=mechamap_ws_kCTy45s4obktB6IJJH6DpKHzoveEJLgrnmbST8fxwufexn0u80RnqMSO51ubWVQ3

# Laravel Backend URL
LARAVEL_API_URL=https://mechamap.com
```

### **JWT Synchronization**

Both Laravel and Realtime Server must use the same JWT secret:

```bash
# Same value in both .env files
JWT_SECRET=cc779c53b425a9c6efab2e9def898a025bc077dec144726be95bd50916345e02d2535935490f7c047506c7ae494d5d4372d38189a5c4d8922a326d79090ae744
```

## 🚀 **Laravel Service Implementation**

### **RealtimeNotificationService**

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;

class RealtimeNotificationService
{
    private string $baseUrl;
    private string $apiKey;
    private int $timeout;

    public function __construct()
    {
        $this->baseUrl = Config::get('websocket.server.url', 'https://realtime.mechamap.com');
        $this->apiKey = Config::get('websocket.api_key');
        $this->timeout = 10; // seconds
    }

    /**
     * Send notification to specific user
     */
    public function sendNotificationToUser(int $userId, array $notification): bool
    {
        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'X-WebSocket-API-Key' => $this->apiKey,
                    'Content-Type' => 'application/json',
                ])
                ->post("{$this->baseUrl}/api/broadcast", [
                    'event' => 'notification',
                    'to' => 'user',
                    'user_id' => $userId,
                    'data' => $notification
                ]);

            if ($response->successful()) {
                Log::info('Realtime notification sent successfully', [
                    'user_id' => $userId,
                    'notification_id' => $notification['id'] ?? null
                ]);
                return true;
            }

            Log::warning('Failed to send realtime notification', [
                'user_id' => $userId,
                'status' => $response->status(),
                'response' => $response->body()
            ]);

            return false;

        } catch (\Exception $e) {
            Log::error('Error sending realtime notification', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Send thread update to all participants
     */
    public function sendThreadUpdate(int $threadId, array $data): bool
    {
        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'X-WebSocket-API-Key' => $this->apiKey,
                    'Content-Type' => 'application/json',
                ])
                ->post("{$this->baseUrl}/api/broadcast", [
                    'event' => 'thread_updated',
                    'to' => 'thread',
                    'thread_id' => $threadId,
                    'data' => $data
                ]);

            return $response->successful();

        } catch (\Exception $e) {
            Log::error('Error sending thread update', [
                'thread_id' => $threadId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Send new reply notification
     */
    public function sendNewReply(int $threadId, array $reply): bool
    {
        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'X-WebSocket-API-Key' => $this->apiKey,
                    'Content-Type' => 'application/json',
                ])
                ->post("{$this->baseUrl}/api/broadcast", [
                    'event' => 'new_reply',
                    'to' => 'thread',
                    'thread_id' => $threadId,
                    'data' => $reply
                ]);

            return $response->successful();

        } catch (\Exception $e) {
            Log::error('Error sending new reply notification', [
                'thread_id' => $threadId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Test connection to realtime server
     */
    public function testConnection(): array
    {
        try {
            $response = Http::timeout(5)
                ->get("{$this->baseUrl}/health");

            if ($response->successful()) {
                return [
                    'status' => 'success',
                    'message' => 'Connection successful',
                    'data' => $response->json()
                ];
            }

            return [
                'status' => 'error',
                'message' => 'Connection failed',
                'http_status' => $response->status()
            ];

        } catch (\Exception $e) {
            return [
                'status' => 'error',
                'message' => 'Connection error: ' . $e->getMessage()
            ];
        }
    }
}
```

### **Service Provider Registration**

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\RealtimeNotificationService;

class RealtimeServiceProvider extends ServiceProvider
{
    public function register()
    {
        $this->app->singleton(RealtimeNotificationService::class, function ($app) {
            return new RealtimeNotificationService();
        });
    }

    public function boot()
    {
        //
    }
}
```

**Register in `config/app.php`:**
```php
'providers' => [
    // ...
    App\Providers\RealtimeServiceProvider::class,
],
```

## 🔧 **Configuration Files**

### **config/websocket.php**

```php
<?php

return [
    'server' => [
        'url' => env('WEBSOCKET_SERVER_URL', 'https://realtime.mechamap.com'),
        'host' => env('WEBSOCKET_SERVER_HOST', 'realtime.mechamap.com'),
        'port' => env('WEBSOCKET_SERVER_PORT', 443),
        'secure' => env('WEBSOCKET_SERVER_SECURE', true),
    ],

    'api_key' => env('WEBSOCKET_API_KEY'),
    'api_key_hash' => env('WEBSOCKET_API_KEY_HASH'),

    'broadcasting' => [
        'url' => env('NODEJS_BROADCAST_URL', 'https://realtime.mechamap.com'),
        'timeout' => 10,
        'retry_attempts' => 3,
    ],

    'events' => [
        'notification' => 'notification',
        'thread_updated' => 'thread_updated',
        'new_reply' => 'new_reply',
        'user_online' => 'user_online',
        'user_offline' => 'user_offline',
    ],
];
```

## 📡 **Usage Examples**

### **Send Notification**

```php
<?php

use App\Services\RealtimeNotificationService;

class NotificationController extends Controller
{
    public function sendNotification(Request $request, RealtimeNotificationService $realtimeService)
    {
        $notification = [
            'id' => 'notif_' . uniqid(),
            'type' => 'thread_reply',
            'title' => 'New reply to your thread',
            'message' => 'Someone replied to your thread',
            'data' => [
                'thread_id' => $request->thread_id,
                'reply_id' => $request->reply_id,
                'user' => [
                    'id' => auth()->id(),
                    'name' => auth()->user()->name,
                    'avatar' => auth()->user()->avatar_url
                ]
            ],
            'timestamp' => now()->toISOString(),
            'read' => false
        ];

        $success = $realtimeService->sendNotificationToUser(
            $request->user_id,
            $notification
        );

        return response()->json([
            'success' => $success,
            'message' => $success ? 'Notification sent' : 'Failed to send notification'
        ]);
    }
}
```

### **Thread Reply Event**

```php
<?php

use App\Services\RealtimeNotificationService;

class ThreadReplyController extends Controller
{
    public function store(Request $request, RealtimeNotificationService $realtimeService)
    {
        // Create reply in database
        $reply = ThreadReply::create([
            'thread_id' => $request->thread_id,
            'user_id' => auth()->id(),
            'content' => $request->content,
        ]);

        // Send real-time notification
        $realtimeService->sendNewReply($request->thread_id, [
            'reply_id' => $reply->id,
            'thread_id' => $reply->thread_id,
            'content' => $reply->content,
            'author' => [
                'id' => auth()->id(),
                'name' => auth()->user()->name,
                'avatar' => auth()->user()->avatar_url,
                'role' => auth()->user()->role
            ],
            'created_at' => $reply->created_at->toISOString()
        ]);

        return response()->json([
            'success' => true,
            'reply' => $reply
        ]);
    }
}
```

### **Test Connection**

```php
<?php

use App\Services\RealtimeNotificationService;

class HealthController extends Controller
{
    public function testRealtimeConnection(RealtimeNotificationService $realtimeService)
    {
        $result = $realtimeService->testConnection();
        
        return response()->json($result);
    }
}
```

## 🧪 **Testing**

### **Artisan Command for Testing**

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\RealtimeNotificationService;

class TestRealtimeConnection extends Command
{
    protected $signature = 'realtime:test';
    protected $description = 'Test connection to realtime server';

    public function handle(RealtimeNotificationService $realtimeService)
    {
        $this->info('Testing realtime server connection...');

        $result = $realtimeService->testConnection();

        if ($result['status'] === 'success') {
            $this->info('✅ Connection successful!');
            $this->line('Server status: ' . ($result['data']['status'] ?? 'unknown'));
        } else {
            $this->error('❌ Connection failed!');
            $this->line('Error: ' . $result['message']);
        }

        return $result['status'] === 'success' ? 0 : 1;
    }
}
```

**Run test:**
```bash
php artisan realtime:test
```

## 🔍 **Debugging**

### **Enable Debug Logging**

```php
// In your service method
Log::debug('Sending realtime notification', [
    'url' => $this->baseUrl,
    'payload' => $payload,
    'headers' => $headers
]);
```

### **Check Logs**

```bash
# Laravel logs
tail -f storage/logs/laravel.log

# Realtime server logs
pm2 logs mechamap-realtime
```

## ⚠️ **Best Practices**

1. **Error Handling**: Always wrap realtime calls in try-catch
2. **Timeouts**: Set reasonable timeouts (10 seconds max)
3. **Logging**: Log all realtime operations for debugging
4. **Fallbacks**: Don't fail main operations if realtime fails
5. **Rate Limiting**: Respect realtime server rate limits
6. **Security**: Never expose API keys in frontend

## 🔗 **Related Documentation**

- **[API Documentation](API.md)** - Complete API reference
- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment
- **[Monitoring Guide](MONITORING.md)** - Production monitoring

---

**Laravel Integration Guide v1.0 - Production Ready** 🚀
