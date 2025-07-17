#!/usr/bin/env node

/**
 * Simple WebSocket Client Test - HTTP version
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
  'your_super_secure_jwt_secret_key_here'
);

console.log('🔐 Generated test token for user ID 1');
console.log('🚀 Testing WebSocket connection...');

// Test with polling first (more reliable)
const socket = io('http://localhost:3000', {
  auth: {
    token: testToken
  },
  transports: ['polling'], // Start with polling
  timeout: 5000,
  forceNew: true
});

let connected = false;

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log('   Socket ID:', socket.id);
  console.log('   Transport:', socket.io.engine.transport.name);
  connected = true;

  // Try to upgrade to websocket
  socket.io.engine.upgrade();
});

socket.on('connected', (data) => {
  console.log('✅ Received connection confirmation:', data);
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
  process.exit(1);
});

// Transport events
socket.io.engine.on('upgrade', () => {
  console.log('🔄 Upgraded to transport:', socket.io.engine.transport.name);
});

socket.io.engine.on('upgradeError', (error) => {
  console.log('⚠️  Upgrade error:', error.message);
});

// Test timeout
setTimeout(() => {
  if (!connected) {
    console.log('❌ Connection timeout after 10 seconds');
    process.exit(1);
  } else {
    console.log('✅ Connection test successful!');
    socket.disconnect();
    process.exit(0);
  }
}, 10000);
