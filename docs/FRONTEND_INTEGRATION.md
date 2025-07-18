# Tích hợp Frontend với MechaMap Realtime Server

Tài liệu này hướng dẫn team Frontend cách tích hợp với MechaMap Realtime Server để nhận thông báo real-time.

## 🔗 Thông tin kết nối

### Production URLs
- **WebSocket URL**: `wss://realtime.mechamap.com`
- **HTTP API**: `https://realtime.mechamap.com`

### Yêu cầu
- **Socket.IO Client**: >= 4.0.0
- **Authentication**: Laravel Sanctum token

## 📦 Cài đặt Socket.IO Client

### NPM/Yarn
```bash
npm install socket.io-client
# hoặc
yarn add socket.io-client
```

### CDN
```html
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
```

## 🚀 Kết nối WebSocket

### 1. Lấy Authentication Token

Trước tiên, cần lấy Sanctum token từ Laravel API:

```javascript
// Lấy WebSocket token từ Laravel
async function getWebSocketToken() {
    try {
        const response = await fetch('/api/user/websocket-token', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${laravelToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to get WebSocket token');
        }

        const data = await response.json();
        return data.token;
    } catch (error) {
        console.error('Error getting WebSocket token:', error);
        return null;
    }
}
```

### 2. Kết nối Socket.IO

```javascript
import { io } from 'socket.io-client';

class RealtimeService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    async connect(userId) {
        try {
            // Lấy token
            const token = await getWebSocketToken();
            if (!token) {
                throw new Error('No WebSocket token available');
            }

            // Kết nối Socket.IO
            this.socket = io('wss://realtime.mechamap.com', {
                query: {
                    token: token
                },
                transports: ['websocket', 'polling'],
                timeout: 20000,
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000
            });

            this.setupEventHandlers(userId);
            
        } catch (error) {
            console.error('Failed to connect to WebSocket:', error);
        }
    }

    setupEventHandlers(userId) {
        // Connection events
        this.socket.on('connect', () => {
            console.log('✅ Connected to MechaMap Realtime Server');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Subscribe to user channel
            this.subscribeToUserChannel(userId);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ Disconnected from server:', reason);
            this.isConnected = false;
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.reconnectAttempts++;
            
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('Max reconnection attempts reached');
                this.socket.disconnect();
            }
        });

        // Subscription events
        this.socket.on('subscribed', (data) => {
            console.log('✅ Subscribed to channel:', data.channel);
        });

        this.socket.on('subscription_error', (error) => {
            console.error('Subscription error:', error);
        });

        // Notification events
        this.socket.on('notification.sent', (notification) => {
            this.handleNotification(notification);
        });

        this.socket.on('notification.read', (data) => {
            this.handleNotificationRead(data);
        });

        // User status events
        this.socket.on('user.status', (data) => {
            this.handleUserStatus(data);
        });

        // Error handling
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    }

    subscribeToUserChannel(userId) {
        if (this.socket && this.isConnected) {
            this.socket.emit('subscribe', {
                channel: `private-user.${userId}`
            });
        }
    }

    handleNotification(notification) {
        console.log('📢 New notification:', notification);
        
        // Hiển thị notification trong UI
        this.showNotification(notification);
        
        // Cập nhật notification count
        this.updateNotificationCount();
        
        // Play sound (nếu enabled)
        this.playNotificationSound();
    }

    handleNotificationRead(data) {
        console.log('👁️ Notification read:', data);
        
        // Cập nhật UI để đánh dấu notification đã đọc
        this.markNotificationAsRead(data.notification_id);
    }

    handleUserStatus(data) {
        console.log('👤 User status update:', data);
        
        // Cập nhật user status trong UI
        this.updateUserStatus(data.user_id, data.status);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }

    // UI Methods (implement theo framework của bạn)
    showNotification(notification) {
        // Implement notification display logic
        // Ví dụ với toast notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico',
                tag: notification.id
            });
        }
        
        // Hoặc hiển thị trong app
        this.addNotificationToUI(notification);
    }

    addNotificationToUI(notification) {
        // Implement theo UI framework của bạn
        console.log('Adding notification to UI:', notification);
    }

    updateNotificationCount() {
        // Cập nhật badge count
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            const currentCount = parseInt(badge.textContent) || 0;
            badge.textContent = currentCount + 1;
        }
    }

    markNotificationAsRead(notificationId) {
        // Đánh dấu notification đã đọc trong UI
        const element = document.querySelector(`[data-notification-id="${notificationId}"]`);
        if (element) {
            element.classList.add('read');
        }
    }

    updateUserStatus(userId, status) {
        // Cập nhật user status indicator
        const statusElement = document.querySelector(`[data-user-id="${userId}"] .status`);
        if (statusElement) {
            statusElement.className = `status ${status}`;
        }
    }

    playNotificationSound() {
        // Play notification sound
        const audio = new Audio('/sounds/notification.mp3');
        audio.play().catch(e => console.log('Could not play notification sound'));
    }
}

// Export singleton instance
export const realtimeService = new RealtimeService();
```

## 🎯 Sử dụng trong ứng dụng

### 1. Khởi tạo kết nối

```javascript
// Trong main app file hoặc sau khi user login
import { realtimeService } from './services/RealtimeService';

// Sau khi user đăng nhập thành công
async function initializeRealtime(user) {
    await realtimeService.connect(user.id);
}

// Khi user logout
function cleanupRealtime() {
    realtimeService.disconnect();
}
```

### 2. React Hook Example

```javascript
import { useState, useEffect } from 'react';
import { realtimeService } from '../services/RealtimeService';

export function useRealtime(user) {
    const [isConnected, setIsConnected] = useState(false);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        if (user) {
            // Connect to realtime server
            realtimeService.connect(user.id);

            // Override notification handler
            realtimeService.handleNotification = (notification) => {
                setNotifications(prev => [notification, ...prev]);
            };

            // Listen for connection status
            if (realtimeService.socket) {
                realtimeService.socket.on('connect', () => setIsConnected(true));
                realtimeService.socket.on('disconnect', () => setIsConnected(false));
            }
        }

        return () => {
            realtimeService.disconnect();
        };
    }, [user]);

    return {
        isConnected,
        notifications,
        clearNotifications: () => setNotifications([])
    };
}
```

### 3. Vue.js Composition API Example

```javascript
import { ref, onMounted, onUnmounted } from 'vue';
import { realtimeService } from '../services/RealtimeService';

export function useRealtime(user) {
    const isConnected = ref(false);
    const notifications = ref([]);

    onMounted(async () => {
        if (user.value) {
            await realtimeService.connect(user.value.id);
            
            // Override handlers
            realtimeService.handleNotification = (notification) => {
                notifications.value.unshift(notification);
            };

            if (realtimeService.socket) {
                realtimeService.socket.on('connect', () => {
                    isConnected.value = true;
                });
                
                realtimeService.socket.on('disconnect', () => {
                    isConnected.value = false;
                });
            }
        }
    });

    onUnmounted(() => {
        realtimeService.disconnect();
    });

    return {
        isConnected,
        notifications
    };
}
```

## 🔔 Notification Permissions

### Request Browser Notification Permission

```javascript
class NotificationManager {
    static async requestPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }

    static isSupported() {
        return 'Notification' in window;
    }

    static getPermission() {
        return Notification.permission;
    }
}

// Sử dụng
async function setupNotifications() {
    if (NotificationManager.isSupported()) {
        const granted = await NotificationManager.requestPermission();
        if (granted) {
            console.log('✅ Notification permission granted');
        } else {
            console.log('❌ Notification permission denied');
        }
    }
}
```

## 🎨 UI Components Examples

### 1. Notification Toast Component (React)

```jsx
import React, { useState, useEffect } from 'react';

export function NotificationToast({ notification, onClose }) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for animation
        }, 5000);

        return () => clearTimeout(timer);
    }, [onClose]);

    if (!isVisible) return null;

    return (
        <div className={`notification-toast ${notification.type}`}>
            <div className="notification-content">
                <h4>{notification.title}</h4>
                <p>{notification.message}</p>
                <small>{new Date(notification.created_at).toLocaleTimeString()}</small>
            </div>
            <button onClick={() => setIsVisible(false)}>×</button>
        </div>
    );
}
```

### 2. Connection Status Indicator

```jsx
export function ConnectionStatus({ isConnected }) {
    return (
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            <span className="status-text">
                {isConnected ? 'Đã kết nối' : 'Mất kết nối'}
            </span>
        </div>
    );
}
```

### 3. CSS Styles

```css
.notification-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 16px;
    max-width: 400px;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
}

.notification-toast.message {
    border-left: 4px solid #007bff;
}

.notification-toast.system {
    border-left: 4px solid #28a745;
}

.notification-toast.order_update {
    border-left: 4px solid #ffc107;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.connection-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
}

.connection-status.connected {
    background: #d4edda;
    color: #155724;
}

.connection-status.disconnected {
    background: #f8d7da;
    color: #721c24;
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
}

.connected .status-dot {
    background: #28a745;
}

.disconnected .status-dot {
    background: #dc3545;
}
```

## 🧪 Testing

### 1. Connection Test

```javascript
// Test connection manually
async function testConnection() {
    console.log('Testing WebSocket connection...');
    
    try {
        await realtimeService.connect(123); // Test user ID
        
        setTimeout(() => {
            if (realtimeService.isConnected) {
                console.log('✅ Connection test passed');
            } else {
                console.log('❌ Connection test failed');
            }
        }, 3000);
        
    } catch (error) {
        console.error('❌ Connection test error:', error);
    }
}
```

### 2. Mock Notification Test

```javascript
// Test notification handling
function testNotification() {
    const mockNotification = {
        id: 'test-123',
        type: 'message',
        title: 'Test Notification',
        message: 'This is a test notification',
        data: {
            sender_id: 456,
            sender_name: 'Test User'
        },
        created_at: new Date().toISOString()
    };

    realtimeService.handleNotification(mockNotification);
}
```

## 🔧 Configuration

### Environment Variables

```javascript
// config.js
export const config = {
    websocket: {
        url: process.env.REACT_APP_WEBSOCKET_URL || 'wss://realtime.mechamap.com',
        timeout: 20000,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    },
    notifications: {
        sound: process.env.REACT_APP_NOTIFICATION_SOUND !== 'false',
        browser: process.env.REACT_APP_BROWSER_NOTIFICATIONS !== 'false',
        duration: 5000
    }
};
```

## 🚨 Error Handling

### Common Issues

1. **Authentication Failed**
   ```javascript
   // Check if token is valid
   if (error.message.includes('Authentication failed')) {
       // Refresh token and reconnect
       const newToken = await getWebSocketToken();
       if (newToken) {
           realtimeService.connect(userId);
       }
   }
   ```

2. **Connection Timeout**
   ```javascript
   // Increase timeout or check network
   this.socket = io(url, {
       timeout: 30000, // Increase timeout
       transports: ['polling', 'websocket'] // Try polling first
   });
   ```

3. **CORS Issues**
   ```javascript
   // Make sure Laravel API returns correct CORS headers
   // Check if domain is whitelisted in server CORS config
   ```

## 📋 Checklist Integration

### Setup
- [ ] Cài đặt Socket.IO client
- [ ] Tạo RealtimeService class
- [ ] Setup authentication với Laravel
- [ ] Test connection cơ bản

### UI Integration
- [ ] Tạo notification components
- [ ] Setup connection status indicator
- [ ] Implement notification sound
- [ ] Request browser notification permission

### Testing
- [ ] Test connection với production server
- [ ] Test notification receiving
- [ ] Test reconnection logic
- [ ] Test error handling

### Production
- [ ] Configure environment variables
- [ ] Setup error monitoring
- [ ] Optimize performance
- [ ] Document for team

Tài liệu này cung cấp tất cả thông tin cần thiết để team Frontend tích hợp với MechaMap Realtime Server một cách hiệu quả.
