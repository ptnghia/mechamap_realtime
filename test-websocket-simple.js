#!/usr/bin/env node

/**
 * Simple WebSocket test for realtime.mechamap.com
 */

const { io } = require('socket.io-client');

console.log('🔌 Testing WebSocket connection to realtime.mechamap.com...');

// Test connection
const socket = io('https://realtime.mechamap.com', {
  transports: ['websocket', 'polling'],
  timeout: 10000,
  forceNew: true
});

socket.on('connect', () => {
  console.log('✅ WebSocket connected successfully!');
  console.log('📡 Socket ID:', socket.id);
  console.log('🚀 Transport:', socket.io.engine.transport.name);
  
  // Test sending a message
  socket.emit('test', { message: 'Hello from test client!' });
  
  setTimeout(() => {
    socket.disconnect();
    console.log('🔌 Connection closed');
    process.exit(0);
  }, 2000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection failed:', error.message);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

socket.on('test_response', (data) => {
  console.log('📨 Received response:', data);
});

// Timeout fallback
setTimeout(() => {
  console.error('❌ Connection timeout');
  process.exit(1);
}, 15000);
