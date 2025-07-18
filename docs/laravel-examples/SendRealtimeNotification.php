<?php

namespace App\Listeners;

use App\Events\MessageSent;
use App\Events\OrderStatusUpdated;
use App\Events\UserRegistered;
use App\Events\PaymentCompleted;
use App\Services\RealtimeNotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

/**
 * Event Listener for sending real-time notifications
 * 
 * This listener automatically sends real-time notifications when certain events occur:
 * - MessageSent: When a new message is sent
 * - OrderStatusUpdated: When order status changes
 * - UserRegistered: When a new user registers
 * - PaymentCompleted: When payment is completed
 */
class SendRealtimeNotification implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * The number of times the job may be attempted.
     */
    public $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     */
    public $backoff = [1, 5, 10];

    private $realtimeService;

    /**
     * Create the event listener.
     */
    public function __construct(RealtimeNotificationService $realtimeService)
    {
        $this->realtimeService = $realtimeService;
    }

    /**
     * Handle the event
     */
    public function handle($event)
    {
        try {
            // Check if realtime service is enabled and healthy
            if (!$this->realtimeService->isHealthy()) {
                Log::warning('Realtime service is not healthy, skipping notification', [
                    'event' => get_class($event)
                ]);
                return;
            }

            // Route to appropriate handler based on event type
            switch (get_class($event)) {
                case MessageSent::class:
                    $this->handleMessageSent($event);
                    break;
                    
                case OrderStatusUpdated::class:
                    $this->handleOrderStatusUpdated($event);
                    break;
                    
                case UserRegistered::class:
                    $this->handleUserRegistered($event);
                    break;
                    
                case PaymentCompleted::class:
                    $this->handlePaymentCompleted($event);
                    break;
                    
                default:
                    Log::warning('Unknown event type for realtime notification', [
                        'event' => get_class($event)
                    ]);
            }

        } catch (\Exception $e) {
            Log::error('Failed to send realtime notification', [
                'event' => get_class($event),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // Re-throw exception to trigger job retry
            throw $e;
        }
    }

    /**
     * Handle MessageSent event
     */
    private function handleMessageSent(MessageSent $event)
    {
        $message = $event->message;
        
        // Send notification to message receiver
        $result = $this->realtimeService->sendMessageNotification(
            $message->receiver_id,
            $message
        );

        if ($result) {
            Log::info('Message notification sent successfully', [
                'message_id' => $message->id,
                'receiver_id' => $message->receiver_id,
                'sender_id' => $message->sender_id
            ]);
        }

        // Optional: Send notification to sender about delivery status
        if ($result && config('app.notify_sender_on_delivery', false)) {
            $this->realtimeService->sendToUser($message->sender_id, 'message.delivered', [
                'message_id' => $message->id,
                'delivered_at' => now()->toISOString(),
                'recipient_id' => $message->receiver_id
            ]);
        }
    }

    /**
     * Handle OrderStatusUpdated event
     */
    private function handleOrderStatusUpdated(OrderStatusUpdated $event)
    {
        $order = $event->order;
        $newStatus = $event->newStatus;
        $oldStatus = $event->oldStatus ?? null;
        
        // Send notification to order owner
        $result = $this->realtimeService->sendOrderUpdateNotification(
            $order->user_id,
            $order,
            $newStatus
        );

        if ($result) {
            Log::info('Order update notification sent successfully', [
                'order_id' => $order->id,
                'user_id' => $order->user_id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus
            ]);
        }

        // Send notification to admin for important status changes
        $importantStatuses = ['cancelled', 'refunded', 'disputed'];
        if (in_array($newStatus, $importantStatuses)) {
            $this->notifyAdminsAboutOrder($order, $newStatus);
        }
    }

    /**
     * Handle UserRegistered event
     */
    private function handleUserRegistered(UserRegistered $event)
    {
        $user = $event->user;
        
        // Send welcome notification to new user
        $result = $this->realtimeService->sendToUser($user->id, 'notification.sent', [
            'id' => uniqid('welcome_'),
            'type' => 'welcome',
            'title' => 'Chào mừng đến với MechaMap!',
            'message' => 'Cảm ơn bạn đã đăng ký tài khoản. Hãy khám phá các tính năng tuyệt vời của chúng tôi!',
            'data' => [
                'user_id' => $user->id,
                'registration_date' => $user->created_at->toISOString(),
                'next_steps' => [
                    'complete_profile',
                    'verify_email',
                    'explore_features'
                ]
            ]
        ]);

        if ($result) {
            Log::info('Welcome notification sent to new user', [
                'user_id' => $user->id,
                'email' => $user->email
            ]);
        }

        // Notify admins about new registration (if enabled)
        if (config('app.notify_admins_on_registration', false)) {
            $this->notifyAdminsAboutNewUser($user);
        }
    }

    /**
     * Handle PaymentCompleted event
     */
    private function handlePaymentCompleted(PaymentCompleted $event)
    {
        $payment = $event->payment;
        $order = $payment->order ?? null;
        
        // Send payment confirmation to user
        $result = $this->realtimeService->sendToUser($payment->user_id, 'notification.sent', [
            'id' => uniqid('payment_'),
            'type' => 'payment_success',
            'title' => 'Thanh toán thành công',
            'message' => "Thanh toán {$payment->amount} VNĐ đã được xử lý thành công.",
            'data' => [
                'payment_id' => $payment->id,
                'order_id' => $order->id ?? null,
                'amount' => $payment->amount,
                'currency' => $payment->currency ?? 'VND',
                'payment_method' => $payment->payment_method,
                'completed_at' => $payment->completed_at->toISOString()
            ]
        ]);

        if ($result) {
            Log::info('Payment confirmation sent to user', [
                'payment_id' => $payment->id,
                'user_id' => $payment->user_id,
                'amount' => $payment->amount
            ]);
        }
    }

    /**
     * Notify admins about important order changes
     */
    private function notifyAdminsAboutOrder($order, $status)
    {
        try {
            // Get admin user IDs (adjust based on your user role system)
            $adminIds = \App\Models\User::where('role', 'admin')
                ->where('status', 'active')
                ->pluck('id')
                ->toArray();

            if (empty($adminIds)) {
                return;
            }

            $this->realtimeService->sendToUsers($adminIds, 'admin.notification', [
                'id' => uniqid('admin_order_'),
                'type' => 'order_alert',
                'title' => 'Cảnh báo đơn hàng',
                'message' => "Đơn hàng #{$order->id} đã chuyển sang trạng thái: {$status}",
                'data' => [
                    'order_id' => $order->id,
                    'user_id' => $order->user_id,
                    'status' => $status,
                    'total_amount' => $order->total_amount,
                    'priority' => 'high'
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to notify admins about order', [
                'order_id' => $order->id,
                'status' => $status,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Notify admins about new user registration
     */
    private function notifyAdminsAboutNewUser($user)
    {
        try {
            $adminIds = \App\Models\User::where('role', 'admin')
                ->where('status', 'active')
                ->pluck('id')
                ->toArray();

            if (empty($adminIds)) {
                return;
            }

            $this->realtimeService->sendToUsers($adminIds, 'admin.notification', [
                'id' => uniqid('admin_user_'),
                'type' => 'new_user',
                'title' => 'Người dùng mới đăng ký',
                'message' => "Người dùng mới: {$user->name} ({$user->email}) đã đăng ký tài khoản.",
                'data' => [
                    'user_id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'registered_at' => $user->created_at->toISOString()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to notify admins about new user', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed($event, $exception)
    {
        Log::error('Realtime notification job failed permanently', [
            'event' => get_class($event),
            'exception' => $exception->getMessage(),
            'attempts' => $this->attempts()
        ]);
    }

    /**
     * Determine the time at which the job should timeout.
     */
    public function retryUntil()
    {
        return now()->addMinutes(5);
    }
}
