<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * WebSocket Controller for MechaMap Realtime Server Integration
 * 
 * This controller handles:
 * 1. User verification for WebSocket connections
 * 2. WebSocket token generation for frontend
 * 3. User permissions management for real-time features
 */
class WebSocketController extends Controller
{
    /**
     * Verify user for WebSocket connection
     * 
     * This endpoint is called by MechaMap Realtime Server to verify
     * that a Sanctum token is valid and get user information.
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function verifyUser(Request $request)
    {
        try {
            // Get authenticated user from Sanctum token
            $user = Auth::guard('sanctum')->user();
            
            if (!$user) {
                Log::warning('WebSocket auth failed: No authenticated user', [
                    'headers' => $request->headers->all(),
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent()
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated'
                ], 401);
            }

            // Check if user is active
            if (isset($user->status) && $user->status !== 'active') {
                Log::warning('WebSocket auth failed: User not active', [
                    'user_id' => $user->id,
                    'status' => $user->status
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'User account is not active'
                ], 403);
            }

            // Get user permissions for WebSocket
            $userPermissions = $this->getUserPermissions($user);
            
            Log::info('WebSocket user verification successful', [
                'user_id' => $user->id,
                'email' => $user->email,
                'role' => $user->role ?? 'member',
                'permissions' => $userPermissions,
                'ip' => $request->ip()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'User verified successfully',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'role' => $user->role ?? 'member',
                        'permissions' => $userPermissions,
                        'avatar' => $user->avatar ?? null,
                        'status' => $user->status ?? 'active',
                        'created_at' => $user->created_at,
                        'updated_at' => $user->updated_at
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('WebSocket user verification error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'ip' => $request->ip()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get WebSocket token for frontend
     * 
     * This endpoint generates a new Sanctum token specifically for WebSocket connections.
     * Frontend calls this endpoint to get a token for connecting to the WebSocket server.
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getWebSocketToken(Request $request)
    {
        try {
            $user = Auth::guard('sanctum')->user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated'
                ], 401);
            }

            // Check if user is active
            if (isset($user->status) && $user->status !== 'active') {
                return response()->json([
                    'success' => false,
                    'message' => 'User account is not active'
                ], 403);
            }

            // Revoke old WebSocket tokens to prevent multiple connections
            $user->tokens()->where('name', 'websocket-connection')->delete();

            // Create new Sanctum token specifically for WebSocket
            $token = $user->createToken('websocket-connection', [
                'websocket:connect',
                'websocket:receive-notifications'
            ]);
            
            Log::info('WebSocket token generated', [
                'user_id' => $user->id,
                'token_id' => $token->accessToken->id,
                'ip' => $request->ip()
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'WebSocket token generated successfully',
                'data' => [
                    'token' => $token->plainTextToken,
                    'user_id' => $user->id,
                    'websocket_url' => config('services.realtime.websocket_url', 'wss://realtime.mechamap.com'),
                    'expires_at' => now()->addHours(24)->toISOString(),
                    'permissions' => $this->getUserPermissions($user)
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('WebSocket token generation error', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate WebSocket token'
            ], 500);
        }
    }

    /**
     * Revoke WebSocket token
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function revokeWebSocketToken(Request $request)
    {
        try {
            $user = Auth::guard('sanctum')->user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated'
                ], 401);
            }

            // Revoke all WebSocket tokens
            $revokedCount = $user->tokens()->where('name', 'websocket-connection')->delete();
            
            Log::info('WebSocket tokens revoked', [
                'user_id' => $user->id,
                'revoked_count' => $revokedCount
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'WebSocket tokens revoked successfully',
                'data' => [
                    'revoked_count' => $revokedCount
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('WebSocket token revocation error', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to revoke WebSocket tokens'
            ], 500);
        }
    }

    /**
     * Get user permissions for WebSocket
     * 
     * @param $user
     * @return array
     */
    private function getUserPermissions($user)
    {
        // Default permissions for all users
        $permissions = ['receive_notifications'];
        
        // Add role-based permissions
        switch ($user->role ?? 'member') {
            case 'admin':
                $permissions = array_merge($permissions, [
                    'admin_notifications',
                    'broadcast_messages',
                    'manage_connections',
                    'view_all_users',
                    'moderate_content'
                ]);
                break;
                
            case 'moderator':
                $permissions = array_merge($permissions, [
                    'moderate_messages',
                    'view_user_status',
                    'send_announcements'
                ]);
                break;
                
            case 'premium':
                $permissions = array_merge($permissions, [
                    'priority_notifications',
                    'custom_channels',
                    'advanced_features'
                ]);
                break;
                
            case 'business':
                $permissions = array_merge($permissions, [
                    'business_notifications',
                    'analytics_access',
                    'bulk_messaging'
                ]);
                break;
                
            default: // member
                $permissions = ['receive_notifications'];
                break;
        }
        
        // Add custom permissions if user has specific permissions
        if (method_exists($user, 'permissions') && $user->permissions) {
            $customPermissions = $user->permissions()->pluck('name')->toArray();
            $permissions = array_merge($permissions, $customPermissions);
        }
        
        // Add permissions based on user settings
        if (isset($user->settings)) {
            $settings = is_string($user->settings) ? json_decode($user->settings, true) : $user->settings;
            
            if (isset($settings['notifications']) && $settings['notifications']) {
                if ($settings['notifications']['email'] ?? false) {
                    $permissions[] = 'email_notifications';
                }
                if ($settings['notifications']['push'] ?? false) {
                    $permissions[] = 'push_notifications';
                }
                if ($settings['notifications']['realtime'] ?? true) {
                    $permissions[] = 'realtime_notifications';
                }
            }
        }
        
        return array_unique($permissions);
    }

    /**
     * Get WebSocket connection status for user
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getConnectionStatus(Request $request)
    {
        try {
            $user = Auth::guard('sanctum')->user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated'
                ], 401);
            }

            // Get active WebSocket tokens
            $activeTokens = $user->tokens()
                ->where('name', 'websocket-connection')
                ->where('created_at', '>', now()->subHours(24))
                ->count();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'user_id' => $user->id,
                    'active_tokens' => $activeTokens,
                    'max_connections' => 5, // Configurable limit
                    'can_connect' => $activeTokens < 5
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('WebSocket connection status error', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get connection status'
            ], 500);
        }
    }
}
