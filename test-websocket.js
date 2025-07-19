const io = require('socket.io-client');

console.log('🔌 Testing WebSocket connection to realtime.mechamap.com...');

const socket = io('https://realtime.mechamap.com', {
  transports: ['websocket', 'polling'],
  timeout: 10000,
  forceNew: true
});

socket.on('connect', () => {
  console.log('✅ WebSocket connected successfully!');
  console.log('Socket ID:', socket.id);
  
  // Test ping
  socket.emit('ping');
  
  setTimeout(() => {
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on('pong', (data) => {
  console.log('🏓 Pong received:', data);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.error('⏰ Connection timeout');
  process.exit(1);
}, 15000);
