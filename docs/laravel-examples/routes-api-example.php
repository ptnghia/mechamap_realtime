<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WebSocketController;

/*
|--------------------------------------------------------------------------
| API Routes for MechaMap Realtime Server Integration
|--------------------------------------------------------------------------
|
| Add these routes to your routes/api.php file to enable WebSocket
| integration with MechaMap Realtime Server.
|
*/

// WebSocket API routes (protected by Sanctum)
Route::middleware(['auth:sanctum'])->group(function () {
    
    // Get WebSocket token for frontend
    Route::get('/user/websocket-token', [WebSocketController::class, 'getWebSocketToken'])
        ->name('websocket.token');
    
    // Revoke WebSocket token
    Route::delete('/user/websocket-token', [WebSocketController::class, 'revokeWebSocketToken'])
        ->name('websocket.revoke');
    
    // Get WebSocket connection status
    Route::get('/user/websocket-status', [WebSocketController::class, 'getConnectionStatus'])
        ->name('websocket.status');
});

// WebSocket verification endpoint (called by Realtime Server)
Route::middleware(['auth:sanctum'])->prefix('websocket-api')->group(function () {
    
    // Verify user for WebSocket connection
    Route::post('/verify-user', [WebSocketController::class, 'verifyUser'])
        ->name('websocket.verify');
});

// Optional: Test routes (remove in production)
Route::middleware(['auth:sanctum'])->prefix('realtime-test')->group(function () {
    
    // Test notification sending
    Route::post('/send-notification', function (Request $request) {
        $realtimeService = app(\App\Services\RealtimeNotificationService::class);
        
        $userId = $request->input('user_id', auth()->id());
        $title = $request->input('title', 'Test Notification');
        $message = $request->input('message', 'This is a test notification');
        
        $result = $realtimeService->sendToUser($userId, 'notification.sent', [
            'id' => uniqid('test_'),
            'type' => 'test',
            'title' => $title,
            'message' => $message,
            'data' => [
                'sent_from' => 'api_test',
                'timestamp' => now()->toISOString()
            ]
        ]);
        
        return response()->json([
            'success' => !!$result,
            'result' => $result
        ]);
    })->name('realtime.test.notification');
    
    // Test server health
    Route::get('/health', function () {
        $realtimeService = app(\App\Services\RealtimeNotificationService::class);
        
        $health = $realtimeService->checkHealth();
        $stats = $realtimeService->getStats();
        
        return response()->json([
            'health' => $health,
            'stats' => $stats,
            'is_healthy' => $realtimeService->isHealthy()
        ]);
    })->name('realtime.test.health');
});

/*
|--------------------------------------------------------------------------
| Example Usage in Controllers
|--------------------------------------------------------------------------
|
| Here are some examples of how to use the realtime service in your controllers:
|

// Example 1: Send message notification
Route::post('/messages', function (Request $request) {
    $message = Message::create([
        'sender_id' => auth()->id(),
        'receiver_id' => $request->receiver_id,
        'content' => $request->content
    ]);
    
    // Send real-time notification
    $realtimeService = app(\App\Services\RealtimeNotificationService::class);
    $realtimeService->sendMessageNotification($message->receiver_id, $message);
    
    return response()->json($message);
});

// Example 2: Update order status
Route::patch('/orders/{order}/status', function (Request $request, Order $order) {
    $oldStatus = $order->status;
    $order->update(['status' => $request->status]);
    
    // Send real-time notification
    $realtimeService = app(\App\Services\RealtimeNotificationService::class);
    $realtimeService->sendOrderUpdateNotification($order->user_id, $order, $request->status);
    
    return response()->json($order);
});

// Example 3: Send system notification to multiple users
Route::post('/admin/broadcast', function (Request $request) {
    $userIds = $request->input('user_ids', []);
    $title = $request->input('title');
    $message = $request->input('message');
    
    $realtimeService = app(\App\Services\RealtimeNotificationService::class);
    $results = $realtimeService->sendSystemNotification($userIds, $title, $message);
    
    return response()->json([
        'success' => true,
        'results' => $results,
        'sent_count' => count(array_filter($results))
    ]);
})->middleware(['auth:sanctum', 'role:admin']);

*/
