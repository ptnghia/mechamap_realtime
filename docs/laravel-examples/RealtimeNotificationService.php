<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

/**
 * Realtime Notification Service for MechaMap Realtime Server
 * 
 * This service handles:
 * 1. Sending real-time notifications to users
 * 2. Broadcasting messages to channels
 * 3. Health checking the realtime server
 * 4. Managing notification queues and retries
 */
class RealtimeNotificationService
{
    private $baseUrl;
    private $apiKey;
    private $timeout;
    private $enabled;
    private $retryAttempts;
    private $retryDelay;

    public function __construct()
    {
        $this->baseUrl = config('services.realtime.url', 'https://realtime.mechamap.com');
        $this->apiKey = config('services.realtime.api_key');
        $this->timeout = config('services.realtime.timeout', 10);
        $this->enabled = config('services.realtime.enabled', true);
        $this->retryAttempts = config('services.realtime.retry_attempts', 3);
        $this->retryDelay = config('services.realtime.retry_delay', 1000); // milliseconds
    }

    /**
     * Gửi thông báo đến user cụ thể
     * 
     * @param int $userId
     * @param string $event
     * @param array $data
     * @param array $options
     * @return array|false
     */
    public function sendToUser($userId, $event, $data, $options = [])
    {
        if (!$this->enabled) {
            Log::info('Realtime notifications disabled', ['user_id' => $userId]);
            return false;
        }

        return $this->broadcast("private-user.{$userId}", $event, $data, $options);
    }

    /**
     * Gửi thông báo đến nhiều users
     * 
     * @param array $userIds
     * @param string $event
     * @param array $data
     * @param array $options
     * @return array
     */
    public function sendToUsers($userIds, $event, $data, $options = [])
    {
        $results = [];
        
        foreach ($userIds as $userId) {
            $results[$userId] = $this->sendToUser($userId, $event, $data, $options);
        }
        
        return $results;
    }

    /**
     * Gửi thông báo đến channel cụ thể
     * 
     * @param string $channel
     * @param string $event
     * @param array $data
     * @param array $options
     * @return array|false
     */
    public function broadcast($channel, $event, $data, $options = [])
    {
        try {
            $payload = [
                'channel' => $channel,
                'event' => $event,
                'data' => array_merge($data, [
                    'timestamp' => now()->toISOString(),
                    'server_time' => time(),
                    'source' => 'laravel'
                ])
            ];

            // Add options to payload
            if (!empty($options)) {
                $payload['options'] = $options;
            }

            Log::info('Sending realtime notification', [
                'channel' => $channel,
                'event' => $event,
                'data_keys' => array_keys($data),
                'options' => $options
            ]);

            $response = $this->makeRequest('POST', '/api/broadcast', $payload);

            if ($response && $response['success']) {
                Log::info('Realtime notification sent successfully', [
                    'channel' => $channel,
                    'event' => $event,
                    'recipients' => $response['recipients'] ?? 0,
                    'message_id' => $response['message_id'] ?? null
                ]);
                
                return $response;
            }

            Log::error('Failed to send realtime notification', [
                'channel' => $channel,
                'event' => $event,
                'response' => $response
            ]);

            return false;

        } catch (\Exception $e) {
            Log::error('Realtime notification exception', [
                'channel' => $channel,
                'event' => $event,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return false;
        }
    }

    /**
     * Gửi thông báo tin nhắn mới
     * 
     * @param int $receiverId
     * @param object $message
     * @return array|false
     */
    public function sendMessageNotification($receiverId, $message)
    {
        return $this->sendToUser($receiverId, 'notification.sent', [
            'id' => $message->id,
            'type' => 'message',
            'title' => 'Tin nhắn mới',
            'message' => 'Bạn có tin nhắn mới từ ' . $message->sender->name,
            'data' => [
                'message_id' => $message->id,
                'sender_id' => $message->sender_id,
                'sender_name' => $message->sender->name,
                'sender_avatar' => $message->sender->avatar ?? null,
                'content' => $message->content,
                'created_at' => $message->created_at->toISOString()
            ]
        ]);
    }

    /**
     * Gửi thông báo cập nhật đơn hàng
     * 
     * @param int $userId
     * @param object $order
     * @param string $status
     * @return array|false
     */
    public function sendOrderUpdateNotification($userId, $order, $status)
    {
        $statusMessages = [
            'pending' => 'Đơn hàng đang chờ xử lý',
            'confirmed' => 'Đơn hàng đã được xác nhận',
            'processing' => 'Đơn hàng đang được xử lý',
            'shipped' => 'Đơn hàng đã được gửi đi',
            'delivered' => 'Đơn hàng đã được giao thành công',
            'cancelled' => 'Đơn hàng đã bị hủy'
        ];

        return $this->sendToUser($userId, 'notification.sent', [
            'id' => uniqid('order_'),
            'type' => 'order_update',
            'title' => 'Cập nhật đơn hàng',
            'message' => $statusMessages[$status] ?? "Đơn hàng #{$order->id} đã được cập nhật",
            'data' => [
                'order_id' => $order->id,
                'status' => $status,
                'total_amount' => $order->total_amount,
                'updated_at' => now()->toISOString()
            ]
        ]);
    }

    /**
     * Gửi thông báo hệ thống
     * 
     * @param array $userIds
     * @param string $title
     * @param string $message
     * @param array $data
     * @return array
     */
    public function sendSystemNotification($userIds, $title, $message, $data = [])
    {
        return $this->sendToUsers($userIds, 'notification.sent', [
            'id' => uniqid('system_'),
            'type' => 'system',
            'title' => $title,
            'message' => $message,
            'data' => $data
        ]);
    }

    /**
     * Kiểm tra health của Realtime Server
     * 
     * @return array|false
     */
    public function checkHealth()
    {
        try {
            $cacheKey = 'realtime_server_health';
            
            // Check cache first (cache for 30 seconds)
            $cachedHealth = Cache::get($cacheKey);
            if ($cachedHealth) {
                return $cachedHealth;
            }

            $response = $this->makeRequest('GET', '/api/health', null, 5); // 5 second timeout
            
            if ($response) {
                Cache::put($cacheKey, $response, 30); // Cache for 30 seconds
                return $response;
            }
            
            return false;
            
        } catch (\Exception $e) {
            Log::error('Realtime server health check failed', [
                'error' => $e->getMessage()
            ]);
            
            return false;
        }
    }

    /**
     * Lấy thông tin server
     * 
     * @return array|false
     */
    public function getServerInfo()
    {
        try {
            return $this->makeRequest('GET', '/api/monitoring/info');
        } catch (\Exception $e) {
            Log::error('Failed to get realtime server info', [
                'error' => $e->getMessage()
            ]);
            
            return false;
        }
    }

    /**
     * Test connection với development token
     * 
     * @param int|null $userId
     * @return array|false
     */
    public function testConnection($userId = null)
    {
        $testUserId = $userId ?? auth()->id() ?? 1;
        
        return $this->sendToUser($testUserId, 'test.notification', [
            'title' => 'Test Notification',
            'message' => 'This is a test notification from Laravel',
            'type' => 'test',
            'test_time' => now()->toDateTimeString(),
            'laravel_version' => app()->version(),
            'environment' => app()->environment()
        ]);
    }

    /**
     * Gửi thông báo với retry logic
     * 
     * @param string $channel
     * @param string $event
     * @param array $data
     * @param int $maxRetries
     * @return array|false
     */
    public function broadcastWithRetry($channel, $event, $data, $maxRetries = null)
    {
        $maxRetries = $maxRetries ?? $this->retryAttempts;
        $attempt = 0;
        
        while ($attempt < $maxRetries) {
            $result = $this->broadcast($channel, $event, $data);
            
            if ($result) {
                return $result;
            }
            
            $attempt++;
            
            if ($attempt < $maxRetries) {
                Log::warning("Retrying realtime notification", [
                    'channel' => $channel,
                    'event' => $event,
                    'attempt' => $attempt,
                    'max_retries' => $maxRetries
                ]);
                
                usleep($this->retryDelay * 1000); // Convert to microseconds
            }
        }
        
        Log::error("Failed to send realtime notification after {$maxRetries} attempts", [
            'channel' => $channel,
            'event' => $event
        ]);
        
        return false;
    }

    /**
     * Make HTTP request to realtime server
     * 
     * @param string $method
     * @param string $endpoint
     * @param array|null $data
     * @param int|null $timeout
     * @return array|false
     */
    private function makeRequest($method, $endpoint, $data = null, $timeout = null)
    {
        $timeout = $timeout ?? $this->timeout;
        
        $httpClient = Http::timeout($timeout)
            ->withHeaders([
                'Content-Type' => 'application/json',
                'X-API-Key' => $this->apiKey,
                'User-Agent' => 'Laravel-MechaMap/1.0',
                'Accept' => 'application/json'
            ]);

        $url = $this->baseUrl . $endpoint;
        
        try {
            if ($method === 'GET') {
                $response = $httpClient->get($url);
            } else {
                $response = $httpClient->post($url, $data);
            }

            if ($response->successful()) {
                return $response->json();
            }

            Log::error('Realtime server request failed', [
                'method' => $method,
                'url' => $url,
                'status' => $response->status(),
                'response' => $response->body()
            ]);

            return false;

        } catch (\Exception $e) {
            Log::error('Realtime server request exception', [
                'method' => $method,
                'url' => $url,
                'error' => $e->getMessage()
            ]);

            return false;
        }
    }

    /**
     * Check if realtime service is enabled and healthy
     * 
     * @return bool
     */
    public function isHealthy()
    {
        if (!$this->enabled) {
            return false;
        }

        $health = $this->checkHealth();
        return $health && ($health['status'] ?? '') === 'healthy';
    }

    /**
     * Get service statistics
     * 
     * @return array
     */
    public function getStats()
    {
        return [
            'enabled' => $this->enabled,
            'base_url' => $this->baseUrl,
            'timeout' => $this->timeout,
            'retry_attempts' => $this->retryAttempts,
            'healthy' => $this->isHealthy()
        ];
    }
}
