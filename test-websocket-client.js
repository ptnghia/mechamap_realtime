#!/usr/bin/env node

/**
 * Simple WebSocket Client Test
 * Tests WebSocket connection and basic functionality
 */

const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Generate test JWT token
const testToken = jwt.sign(
  {
    userId: 1,
    role: 'member',
    permissions: ['read_notifications', 'receive_notifications'],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
  },
  process.env.JWT_SECRET || 'your_super_secure_jwt_secret_key_here'
);

console.log('🔐 Generated test token for user ID 1');

// Create Socket.IO client
const socket = io('https://localhost:3000', {
  auth: {
    token: testToken
  },
  transports: ['websocket'],
  rejectUnauthorized: false // Accept self-signed certificates
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log('   Socket ID:', socket.id);
  
  // Test basic functionality
  testBasicFunctionality();
});

socket.on('connected', (data) => {
  console.log('✅ Received connection confirmation:', data);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

// Test basic functionality
function testBasicFunctionality() {
  console.log('\n🧪 Testing basic functionality...');
  
  // Test 1: Subscribe to private channel
  console.log('📡 Test 1: Subscribing to private channel...');
  socket.emit('subscribe', {
    channel: 'private-user.1'
  });
  
  // Test 2: Subscribe to public channel
  setTimeout(() => {
    console.log('📡 Test 2: Subscribing to public channel...');
    socket.emit('subscribe', {
      channel: 'public.announcements'
    });
  }, 1000);
  
  // Test 3: Ping/Pong
  setTimeout(() => {
    console.log('📡 Test 3: Testing ping/pong...');
    socket.emit('ping');
  }, 2000);
  
  // Test 4: User activity
  setTimeout(() => {
    console.log('📡 Test 4: Sending user activity...');
    socket.emit('user_activity', {
      activity: 'testing'
    });
  }, 3000);
  
  // Test 5: Notification read
  setTimeout(() => {
    console.log('📡 Test 5: Marking notification as read...');
    socket.emit('notification_read', {
      notificationId: 'test_notification_123'
    });
  }, 4000);
  
  // Disconnect after tests
  setTimeout(() => {
    console.log('\n✅ All tests completed, disconnecting...');
    socket.disconnect();
    process.exit(0);
  }, 6000);
}

// Handle subscription responses
socket.on('subscribed', (data) => {
  console.log('✅ Successfully subscribed to channel:', data.channel);
});

socket.on('subscription_error', (data) => {
  console.error('❌ Subscription error:', data);
});

socket.on('unsubscribed', (data) => {
  console.log('✅ Successfully unsubscribed from channel:', data.channel);
});

// Handle ping/pong
socket.on('pong', (data) => {
  console.log('✅ Received pong:', data);
});

// Handle notification events
socket.on('notification.sent', (data) => {
  console.log('📬 Received notification:', data);
});

socket.on('notification.read', (data) => {
  console.log('👁️  Notification read:', data);
});

// Handle typing events
socket.on('user_typing', (data) => {
  console.log('⌨️  User typing:', data);
});

socket.on('user_stopped_typing', (data) => {
  console.log('⌨️  User stopped typing:', data);
});

// Handle errors
socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

console.log('🚀 Starting WebSocket client test...');
console.log('   Server: https://localhost:3000');
console.log('   User ID: 1');
console.log('   Role: member');
console.log('');
