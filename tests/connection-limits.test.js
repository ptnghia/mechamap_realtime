const { test, expect } = require('@playwright/test');
const io = require('socket.io-client');

/**
 * Connection Limits Test Suite
 * Tests WebSocket connection management and limits
 */

const SERVER_URL = 'http://localhost:3000';
const TEST_USER_ID = 13;
const JWT_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjEzLCJyb2xlIjoibWVtYmVyIiwicGVybWlzc2lvbnMiOlsid2Vic29ja2V0OmNvbm5lY3QiXSwiaWF0IjoxNzUyNzg1MTQ4LCJleHAiOjE3NTI3ODg3NDh9.tXS_bSob_FvjYw8H8TAHGcbApMgp0-5E4XmfF6zPwyM';

test.describe('WebSocket Connection Management', () => {

  test.beforeEach(async () => {
    // Clear all connections and attempts
    try {
      await fetch(`${SERVER_URL}/api/connections/clear-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.log('Clear all failed:', error.message);
    }

    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  test('should allow first WebSocket connection', async () => {
    const socket = io(SERVER_URL, {
      auth: { token: JWT_TOKEN },
      transports: ['websocket']
    });

    await new Promise((resolve, reject) => {
      socket.on('connected', (data) => {
        expect(data.userId).toBe(TEST_USER_ID);
        expect(data.socketId).toBeDefined();
        resolve();
      });

      socket.on('connection_rejected', (data) => {
        reject(new Error(`Connection rejected: ${data.message}`));
      });

      socket.on('connect_error', (error) => {
        reject(error);
      });

      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    // Check connection stats
    const statsResponse = await fetch(`${SERVER_URL}/api/connections/stats`);
    const stats = await statsResponse.json();

    expect(stats.success).toBe(true);
    expect(stats.data.activeConnections).toBe(1);
    expect(stats.data.totalConnections).toBe(1);

    socket.disconnect();
  });

  test('should reject duplicate WebSocket connection from same user', async () => {
    // First connection
    const socket1 = io(SERVER_URL, {
      auth: { token: JWT_TOKEN },
      transports: ['websocket']
    });

    // Wait for first connection to establish
    await new Promise((resolve, reject) => {
      socket1.on('connected', resolve);
      socket1.on('connection_rejected', reject);
      socket1.on('connect_error', reject);
      setTimeout(() => reject(new Error('First connection timeout')), 5000);
    });

    // Second connection (should be rejected)
    const socket2 = io(SERVER_URL, {
      auth: { token: JWT_TOKEN },
      transports: ['websocket']
    });

    await new Promise((resolve, reject) => {
      socket2.on('connection_rejected', (data) => {
        expect(data.reason).toBe('duplicate_connection');
        expect(data.message).toContain('already has an active WebSocket connection');
        expect(data.existingConnection).toBeDefined();
        resolve();
      });

      socket2.on('connected', () => {
        reject(new Error('Second connection should have been rejected'));
      });

      setTimeout(() => reject(new Error('Rejection timeout')), 5000);
    });

    // Check connection stats
    const statsResponse = await fetch(`${SERVER_URL}/api/connections/stats`);
    const stats = await statsResponse.json();

    expect(stats.data.activeConnections).toBe(1); // Only first connection
    expect(stats.data.duplicateConnections).toBe(1); // One duplicate attempt

    socket1.disconnect();
    socket2.disconnect();
  });

  test('should allow new connection after previous one disconnects', async () => {
    // First connection
    const socket1 = io(SERVER_URL, {
      auth: { token: JWT_TOKEN },
      transports: ['websocket']
    });

    await new Promise((resolve, reject) => {
      socket1.on('connected', resolve);
      socket1.on('connection_rejected', reject);
      setTimeout(() => reject(new Error('First connection timeout')), 5000);
    });

    // Disconnect first connection
    socket1.disconnect();

    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Second connection (should be allowed)
    const socket2 = io(SERVER_URL, {
      auth: { token: JWT_TOKEN },
      transports: ['websocket']
    });

    await new Promise((resolve, reject) => {
      socket2.on('connected', (data) => {
        expect(data.userId).toBe(TEST_USER_ID);
        resolve();
      });

      socket2.on('connection_rejected', (data) => {
        reject(new Error(`Second connection rejected: ${data.message}`));
      });

      setTimeout(() => reject(new Error('Second connection timeout')), 5000);
    });

    socket2.disconnect();
  });

  test('should handle force disconnect', async () => {
    // Establish connection
    const socket = io(SERVER_URL, {
      auth: { token: JWT_TOKEN },
      transports: ['websocket']
    });

    await new Promise((resolve, reject) => {
      socket.on('connected', resolve);
      socket.on('connection_rejected', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    // Force disconnect via API
    const disconnectResponse = await fetch(`${SERVER_URL}/api/connections/disconnect/${TEST_USER_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'test_force_disconnect' })
    });

    const disconnectResult = await disconnectResponse.json();
    expect(disconnectResult.success).toBe(true);

    // Wait for disconnect event
    await new Promise((resolve, reject) => {
      socket.on('force_disconnect', (data) => {
        expect(data.reason).toBe('test_force_disconnect');
        resolve();
      });

      socket.on('disconnect', resolve);

      setTimeout(() => reject(new Error('Force disconnect timeout')), 5000);
    });

    // Check connection stats
    const statsResponse = await fetch(`${SERVER_URL}/api/connections/stats`);
    const stats = await statsResponse.json();

    expect(stats.data.activeConnections).toBe(0);
  });

  test('should provide user connection info', async () => {
    // Establish connection
    const socket = io(SERVER_URL, {
      auth: { token: JWT_TOKEN },
      transports: ['websocket']
    });

    await new Promise((resolve, reject) => {
      socket.on('connected', resolve);
      socket.on('connection_rejected', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    // Get user connection info
    const infoResponse = await fetch(`${SERVER_URL}/api/connections/user/${TEST_USER_ID}`);
    const info = await infoResponse.json();

    expect(info.success).toBe(true);
    expect(info.data.socketId).toBeDefined();
    expect(info.data.connectedAt).toBeDefined();
    expect(info.data.lastActivity).toBeDefined();
    expect(info.data.isAlive).toBe(true);

    socket.disconnect();
  });

  test('should return 404 for non-existent user connection', async () => {
    const infoResponse = await fetch(`${SERVER_URL}/api/connections/user/999999`);
    const info = await infoResponse.json();

    expect(infoResponse.status).toBe(404);
    expect(info.success).toBe(false);
    expect(info.message).toBe('User connection not found');
  });

  test('should handle connection throttling', async () => {
    const connections = [];
    const rejectedConnections = [];

    // Try to create multiple connections rapidly
    for (let i = 0; i < 10; i++) {
      const socket = io(SERVER_URL, {
        auth: { token: JWT_TOKEN },
        transports: ['websocket']
      });

      const result = await new Promise((resolve) => {
        socket.on('connected', (data) => {
          resolve({ type: 'connected', data });
        });

        socket.on('connection_rejected', (data) => {
          resolve({ type: 'rejected', data });
        });

        socket.on('connect_error', (error) => {
          resolve({ type: 'error', error });
        });

        setTimeout(() => resolve({ type: 'timeout' }), 2000);
      });

      if (result.type === 'connected') {
        connections.push(socket);
      } else if (result.type === 'rejected') {
        rejectedConnections.push(result.data);
        socket.disconnect();
      } else {
        socket.disconnect();
      }
    }

    // Should have at most 1 successful connection
    expect(connections.length).toBeLessThanOrEqual(1);

    // Should have some rejections due to duplicate connection attempts
    expect(rejectedConnections.length).toBeGreaterThan(0);

    // Cleanup
    connections.forEach(socket => socket.disconnect());
  });

  test.afterEach(async () => {
    // Cleanup any remaining connections
    try {
      await fetch(`${SERVER_URL}/api/connections/disconnect/${TEST_USER_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'test_cleanup' })
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});
