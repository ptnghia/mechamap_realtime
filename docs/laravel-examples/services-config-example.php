<?php

/*
|--------------------------------------------------------------------------
| Services Configuration for MechaMap Realtime Server
|--------------------------------------------------------------------------
|
| Add this configuration to your config/services.php file to enable
| integration with MechaMap Realtime Server.
|
*/

return [

    // ... your existing services

    /*
    |--------------------------------------------------------------------------
    | MechaMap Realtime Server Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for connecting to MechaMap Realtime Server for sending
    | real-time notifications and WebSocket communications.
    |
    */
    'realtime' => [

        // Base URL of the realtime server
        'url' => env('REALTIME_SERVER_URL', 'https://realtime.mechamap.com'),

        // WebSocket URL for frontend connections
        'websocket_url' => env('REALTIME_WEBSOCKET_URL', 'wss://realtime.mechamap.com'),

        // API key for authenticating with the realtime server
        'api_key' => env('REALTIME_API_KEY', 'mechamap_ws_kCTy45s4obktB6IJJH6DpKHzoveEJLgrnmbST8fxwufexn0u80RnqMSO51ubWVQ3'),

        // Request timeout in seconds
        'timeout' => env('REALTIME_TIMEOUT', 10),

        // Enable/disable realtime notifications
        'enabled' => env('REALTIME_ENABLED', true),

        // Retry configuration
        'retry_attempts' => env('REALTIME_RETRY_ATTEMPTS', 3),
        'retry_delay' => env('REALTIME_RETRY_DELAY', 1000), // milliseconds

        // Connection limits
        'max_connections_per_user' => env('REALTIME_MAX_CONNECTIONS', 5),

        // Token expiration (in hours)
        'token_expiration' => env('REALTIME_TOKEN_EXPIRATION', 24),

        // Health check cache duration (in seconds)
        'health_cache_duration' => env('REALTIME_HEALTH_CACHE', 30),

        // Notification settings
        'notifications' => [

            // Default notification settings
            'defaults' => [
                'priority' => 'normal', // low, normal, high
                'sound' => true,
                'badge' => true,
                'vibration' => true,
            ],

            // Notification types configuration
            'types' => [
                'message' => [
                    'enabled' => true,
                    'priority' => 'high',
                    'sound' => true,
                    'template' => 'Bạn có tin nhắn mới từ {sender_name}',
                ],
                'order_update' => [
                    'enabled' => true,
                    'priority' => 'normal',
                    'sound' => true,
                    'template' => 'Đơn hàng #{order_id} đã được cập nhật',
                ],
                'system' => [
                    'enabled' => true,
                    'priority' => 'normal',
                    'sound' => false,
                    'template' => '{message}',
                ],
                'payment' => [
                    'enabled' => true,
                    'priority' => 'high',
                    'sound' => true,
                    'template' => 'Thanh toán {amount} đã được xử lý',
                ],
                'welcome' => [
                    'enabled' => true,
                    'priority' => 'low',
                    'sound' => false,
                    'template' => 'Chào mừng đến với MechaMap!',
                ],
            ],

            // Rate limiting for notifications
            'rate_limits' => [
                'per_user_per_minute' => 10,
                'per_user_per_hour' => 100,
                'global_per_minute' => 1000,
            ],
        ],

        // Channel configuration
        'channels' => [

            // Channel prefixes
            'prefixes' => [
                'user' => 'private-user.',
                'admin' => 'private-admin.',
                'public' => 'public.',
                'system' => 'system.',
            ],

            // Channel permissions
            'permissions' => [
                'private-user.*' => ['owner', 'admin'],
                'private-admin.*' => ['admin'],
                'public.*' => ['all'],
                'system.*' => ['admin'],
            ],
        ],

        // Development/Testing settings
        'development' => [
            'enabled' => env('APP_ENV') !== 'production',
            'log_all_requests' => env('REALTIME_LOG_REQUESTS', false),
            'fake_responses' => env('REALTIME_FAKE_RESPONSES', false),
            'test_user_id' => env('REALTIME_TEST_USER_ID', 1),
        ],

        // Monitoring and alerting
        'monitoring' => [
            'enabled' => env('REALTIME_MONITORING_ENABLED', true),
            'alert_on_failure' => env('REALTIME_ALERT_ON_FAILURE', true),
            'failure_threshold' => env('REALTIME_FAILURE_THRESHOLD', 5), // failures before alert
            'health_check_interval' => env('REALTIME_HEALTH_CHECK_INTERVAL', 300), // seconds
        ],
    ],

    // ... your other services
];

/*
|--------------------------------------------------------------------------
| Environment Variables (.env)
|--------------------------------------------------------------------------
|
| Add these environment variables to your .env file:
|
| # MechaMap Realtime Server Configuration
| REALTIME_SERVER_URL=https://realtime.mechamap.com
| REALTIME_WEBSOCKET_URL=wss://realtime.mechamap.com
| REALTIME_API_KEY=mechamap_ws_kCTy45s4obktB6IJJH6DpKHzoveEJLgrnmbST8fxwufexn0u80RnqMSO51ubWVQ3
| REALTIME_TIMEOUT=10
| REALTIME_ENABLED=true
| REALTIME_RETRY_ATTEMPTS=3
| REALTIME_RETRY_DELAY=1000
| REALTIME_MAX_CONNECTIONS=5
| REALTIME_TOKEN_EXPIRATION=24
| REALTIME_HEALTH_CACHE=30
| REALTIME_LOG_REQUESTS=false
| REALTIME_FAKE_RESPONSES=false
| REALTIME_TEST_USER_ID=1
| REALTIME_MONITORING_ENABLED=true
| REALTIME_ALERT_ON_FAILURE=true
| REALTIME_FAILURE_THRESHOLD=5
| REALTIME_HEALTH_CHECK_INTERVAL=300
|
| # CORS Configuration for production
| SANCTUM_STATEFUL_DOMAINS=mechamap.com,www.mechamap.com
| SESSION_DOMAIN=.mechamap.com
|
*/
