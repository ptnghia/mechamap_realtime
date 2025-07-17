#!/usr/bin/env node

/**
 * Simple WebSocket Client Test - No Authentication
 * Test basic Socket.IO connection without JWT
 */

const { io } = require('socket.io-client');

console.log('🚀 Testing basic Socket.IO connection (no auth)...');

// Test with minimal configuration
const socket = io('http://localhost:3000', {
  transports: ['polling'], // Start with polling only
  timeout: 10000,
  forceNew: true,
  autoConnect: true
});

let connected = false;

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to Socket.IO server');
  console.log('   Socket ID:', socket.id);
  console.log('   Transport:', socket.io.engine.transport.name);
  connected = true;
  
  // Test basic emit
  socket.emit('test', { message: 'Hello from client' });
  
  setTimeout(() => {
    console.log('✅ Basic connection test successful!');
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
  if (!connected) {
    console.log('❌ Failed to establish initial connection');
    process.exit(1);
  }
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  console.error('   Error type:', error.type);
  console.error('   Error description:', error.description);
  console.error('   Error context:', error.context);
  process.exit(1);
});

// Test timeout
setTimeout(() => {
  if (!connected) {
    console.log('❌ Connection timeout after 15 seconds');
    process.exit(1);
  }
}, 15000);
