<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\RealtimeNotificationService;
use App\Models\User;
use Illuminate\Support\Facades\Http;

/**
 * Artisan Command to test MechaMap Realtime Server connection
 * 
 * Usage:
 * php artisan realtime:test
 * php artisan realtime:test --user=123
 * php artisan realtime:test --health-only
 * php artisan realtime:test --full-test
 */
class TestRealtimeConnection extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'realtime:test 
                            {user_id? : User ID to test notification (default: 1)}
                            {--health-only : Only run health check}
                            {--full-test : Run comprehensive tests}
                            {--no-notification : Skip notification test}';

    /**
     * The console command description.
     */
    protected $description = 'Test connection to MechaMap Realtime Server';

    private $realtimeService;

    /**
     * Create a new command instance.
     */
    public function __construct(RealtimeNotificationService $realtimeService)
    {
        parent::__construct();
        $this->realtimeService = $realtimeService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔍 Testing MechaMap Realtime Server Connection');
        $this->info('=' . str_repeat('=', 50));
        $this->newLine();

        // Show service configuration
        $this->showServiceConfig();
        $this->newLine();

        // Test 1: Health Check
        if (!$this->testHealthCheck()) {
            $this->error('❌ Health check failed. Aborting further tests.');
            return 1;
        }

        // If health-only option is set, stop here
        if ($this->option('health-only')) {
            $this->info('✅ Health check completed successfully.');
            return 0;
        }

        $this->newLine();

        // Test 2: Server Info
        $this->testServerInfo();
        $this->newLine();

        // Test 3: Notification Test (unless disabled)
        if (!$this->option('no-notification')) {
            $this->testNotification();
            $this->newLine();
        }

        // Test 4: Full comprehensive tests
        if ($this->option('full-test')) {
            $this->runFullTests();
        }

        $this->info('🎉 All tests completed successfully!');
        $this->info('MechaMap Realtime Server is working correctly.');
        
        return 0;
    }

    /**
     * Show service configuration
     */
    private function showServiceConfig()
    {
        $this->info('📋 Service Configuration:');
        
        $stats = $this->realtimeService->getStats();
        
        $this->line("   Base URL: {$stats['base_url']}");
        $this->line("   Enabled: " . ($stats['enabled'] ? '✅ Yes' : '❌ No'));
        $this->line("   Timeout: {$stats['timeout']} seconds");
        $this->line("   Retry Attempts: {$stats['retry_attempts']}");
        
        if (!$stats['enabled']) {
            $this->warn('⚠️  Realtime service is disabled in configuration');
        }
    }

    /**
     * Test health check
     */
    private function testHealthCheck()
    {
        $this->info('1. 🏥 Testing Health Check...');
        
        $health = $this->realtimeService->checkHealth();
        
        if (!$health) {
            $this->error('   ❌ Health check failed - Server not responding');
            return false;
        }

        $this->info('   ✅ Health check passed');
        $this->line("   Status: {$health['status']}");
        $this->line("   Version: " . ($health['version'] ?? 'Unknown'));
        $this->line("   Uptime: " . ($health['uptime'] ?? 0) . ' seconds');
        
        if (isset($health['memory'])) {
            $this->line("   Memory: {$health['memory']['used']}MB / {$health['memory']['total']}MB");
        }
        
        if (isset($health['connections'])) {
            $this->line("   Active Connections: {$health['connections']['active']}");
        }

        return true;
    }

    /**
     * Test server info
     */
    private function testServerInfo()
    {
        $this->info('2. 📊 Testing Server Info...');
        
        $info = $this->realtimeService->getServerInfo();
        
        if (!$info) {
            $this->warn('   ⚠️  Could not retrieve server info');
            return false;
        }

        $this->info('   ✅ Server info retrieved successfully');
        
        if (isset($info['server'])) {
            $server = $info['server'];
            $this->line("   Server Name: " . ($server['name'] ?? 'Unknown'));
            $this->line("   Environment: " . ($server['environment'] ?? 'Unknown'));
            $this->line("   Node Version: " . ($server['node_version'] ?? 'Unknown'));
        }
        
        if (isset($info['configuration'])) {
            $config = $info['configuration'];
            $this->line("   Port: " . ($config['port'] ?? 'Unknown'));
            $this->line("   SSL Enabled: " . (($config['ssl_enabled'] ?? false) ? 'Yes' : 'No'));
            $this->line("   Cluster Mode: " . (($config['cluster_mode'] ?? false) ? 'Yes' : 'No'));
            $this->line("   Instances: " . ($config['instances'] ?? 'Unknown'));
        }

        return true;
    }

    /**
     * Test notification sending
     */
    private function testNotification()
    {
        $userId = $this->argument('user_id') ?? 1;
        
        $this->info("3. 📢 Testing Notification to User {$userId}...");
        
        // Check if user exists
        $user = User::find($userId);
        if (!$user) {
            $this->warn("   ⚠️  User {$userId} not found in database, but continuing test...");
        } else {
            $this->line("   User: {$user->name} ({$user->email})");
        }
        
        $result = $this->realtimeService->testConnection($userId);

        if (!$result) {
            $this->error('   ❌ Failed to send test notification');
            return false;
        }

        $this->info('   ✅ Test notification sent successfully');
        $this->line("   Recipients: " . ($result['recipients'] ?? 0));
        $this->line("   Channel: " . ($result['channel'] ?? 'Unknown'));
        $this->line("   Event: " . ($result['event'] ?? 'Unknown'));
        
        if (isset($result['message_id'])) {
            $this->line("   Message ID: {$result['message_id']}");
        }

        return true;
    }

    /**
     * Run comprehensive tests
     */
    private function runFullTests()
    {
        $this->info('4. 🧪 Running Comprehensive Tests...');
        $this->newLine();

        // Test multiple notification types
        $this->testMultipleNotificationTypes();
        $this->newLine();

        // Test error handling
        $this->testErrorHandling();
        $this->newLine();

        // Test performance
        $this->testPerformance();
    }

    /**
     * Test multiple notification types
     */
    private function testMultipleNotificationTypes()
    {
        $this->info('   📝 Testing Multiple Notification Types...');
        
        $userId = $this->argument('user_id') ?? 1;
        $testTypes = [
            'message' => [
                'title' => 'Test Message',
                'message' => 'This is a test message notification',
                'type' => 'message'
            ],
            'order_update' => [
                'title' => 'Test Order Update',
                'message' => 'Your order has been updated',
                'type' => 'order_update'
            ],
            'system' => [
                'title' => 'Test System Notification',
                'message' => 'This is a system notification',
                'type' => 'system'
            ]
        ];

        $successCount = 0;
        $totalCount = count($testTypes);

        foreach ($testTypes as $type => $data) {
            $result = $this->realtimeService->sendToUser($userId, 'notification.sent', array_merge($data, [
                'id' => uniqid("test_{$type}_"),
                'test' => true
            ]));

            if ($result) {
                $this->line("      ✅ {$type}: Success");
                $successCount++;
            } else {
                $this->line("      ❌ {$type}: Failed");
            }

            // Small delay between tests
            usleep(500000); // 0.5 seconds
        }

        $this->info("   📊 Results: {$successCount}/{$totalCount} notification types successful");
    }

    /**
     * Test error handling
     */
    private function testErrorHandling()
    {
        $this->info('   🚨 Testing Error Handling...');
        
        // Test with invalid channel
        $result = $this->realtimeService->broadcast('invalid-channel-format', 'test.event', [
            'test' => 'error_handling'
        ]);

        if (!$result) {
            $this->line('      ✅ Invalid channel handled correctly');
        } else {
            $this->line('      ⚠️  Invalid channel was accepted (unexpected)');
        }

        // Test with very large payload
        $largeData = [
            'large_text' => str_repeat('A', 10000), // 10KB of text
            'test' => 'large_payload'
        ];

        $result = $this->realtimeService->sendToUser(1, 'test.large', $largeData);
        
        if ($result) {
            $this->line('      ✅ Large payload handled successfully');
        } else {
            $this->line('      ⚠️  Large payload rejected');
        }
    }

    /**
     * Test performance
     */
    private function testPerformance()
    {
        $this->info('   ⚡ Testing Performance...');
        
        $userId = $this->argument('user_id') ?? 1;
        $testCount = 5;
        $times = [];

        for ($i = 1; $i <= $testCount; $i++) {
            $startTime = microtime(true);
            
            $result = $this->realtimeService->sendToUser($userId, 'performance.test', [
                'test_number' => $i,
                'timestamp' => now()->toISOString()
            ]);
            
            $endTime = microtime(true);
            $duration = ($endTime - $startTime) * 1000; // Convert to milliseconds
            
            if ($result) {
                $times[] = $duration;
                $this->line("      Test {$i}: {$duration}ms");
            } else {
                $this->line("      Test {$i}: Failed");
            }

            // Small delay between tests
            usleep(200000); // 0.2 seconds
        }

        if (!empty($times)) {
            $avgTime = array_sum($times) / count($times);
            $minTime = min($times);
            $maxTime = max($times);
            
            $this->info("   📊 Performance Results:");
            $this->line("      Average: " . number_format($avgTime, 2) . "ms");
            $this->line("      Min: " . number_format($minTime, 2) . "ms");
            $this->line("      Max: " . number_format($maxTime, 2) . "ms");
            
            if ($avgTime < 1000) {
                $this->line("      ✅ Performance is good (< 1 second)");
            } else {
                $this->line("      ⚠️  Performance is slow (> 1 second)");
            }
        }
    }
}
