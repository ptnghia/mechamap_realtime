const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * WebSocket Integration Tests for MechaMap
 * 
 * Tests:
 * - WebSocket connection establishment
 * - Authentication with JWT token
 * - Real-time message broadcasting
 * - Connection limits enforcement
 * - Reconnection handling
 * - Channel subscription/unsubscription
 */

test.describe('WebSocket Integration', () => {
  let jwtToken;
  let userId;

  test.beforeAll(async () => {
    // Load JWT token from global setup
    const tokenFile = path.join(__dirname, 'jwt-token.json');
    if (fs.existsSync(tokenFile)) {
      const tokenData = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
      jwtToken = tokenData.token;
      userId = tokenData.user.id;
      console.log(`Using JWT token for user ID: ${userId}`);
    } else {
      throw new Error('JWT token not found. Global setup may have failed.');
    }
  });

  test.beforeEach(async ({ page }) => {
    // Clear any existing connections
    try {
      await page.request.post('http://localhost:3000/api/connections/clear-all', {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.log('Failed to clear connections:', error.message);
    }
    
    await page.waitForTimeout(1000);
  });

  test('should establish WebSocket connection with valid JWT token', async ({ page }) => {
    // Navigate to a page that uses WebSocket
    await page.goto('/dashboard');
    
    // Inject WebSocket client code
    const connectionResult = await page.evaluate(async (token) => {
      return new Promise((resolve, reject) => {
        const socket = io('http://localhost:3000', {
          auth: { token },
          transports: ['websocket']
        });

        const timeout = setTimeout(() => {
          socket.disconnect();
          reject(new Error('Connection timeout'));
        }, 10000);

        socket.on('connected', (data) => {
          clearTimeout(timeout);
          socket.disconnect();
          resolve({
            success: true,
            data: data
          });
        });

        socket.on('connection_rejected', (data) => {
          clearTimeout(timeout);
          socket.disconnect();
          resolve({
            success: false,
            reason: data.reason,
            message: data.message
          });
        });

        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          socket.disconnect();
          reject(error);
        });
      });
    }, jwtToken);

    expect(connectionResult.success).toBe(true);
    expect(connectionResult.data.userId).toBe(userId);
    expect(connectionResult.data.socketId).toBeDefined();
    
    console.log('✅ WebSocket connection established successfully');
  });

  test('should reject WebSocket connection with invalid token', async ({ page }) => {
    await page.goto('/dashboard');
    
    const connectionResult = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const socket = io('http://localhost:3000', {
          auth: { token: 'invalid-token' },
          transports: ['websocket']
        });

        const timeout = setTimeout(() => {
          socket.disconnect();
          resolve({ success: false, reason: 'timeout' });
        }, 5000);

        socket.on('connected', (data) => {
          clearTimeout(timeout);
          socket.disconnect();
          resolve({ success: true, data });
        });

        socket.on('connection_rejected', (data) => {
          clearTimeout(timeout);
          socket.disconnect();
          resolve({
            success: false,
            reason: data.reason,
            message: data.message
          });
        });

        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          socket.disconnect();
          resolve({
            success: false,
            reason: 'connect_error',
            message: error.message
          });
        });
      });
    });

    expect(connectionResult.success).toBe(false);
    console.log('✅ Invalid token correctly rejected');
  });

  test('should enforce connection limits (1 connection per user)', async ({ page }) => {
    await page.goto('/dashboard');
    
    const result = await page.evaluate(async (token) => {
      const connections = [];
      const results = [];

      // Try to create 3 connections
      for (let i = 0; i < 3; i++) {
        const connectionPromise = new Promise((resolve) => {
          const socket = io('http://localhost:3000', {
            auth: { token },
            transports: ['websocket']
          });

          const timeout = setTimeout(() => {
            socket.disconnect();
            resolve({ index: i, success: false, reason: 'timeout' });
          }, 5000);

          socket.on('connected', (data) => {
            clearTimeout(timeout);
            connections.push(socket);
            resolve({
              index: i,
              success: true,
              data: data
            });
          });

          socket.on('connection_rejected', (data) => {
            clearTimeout(timeout);
            socket.disconnect();
            resolve({
              index: i,
              success: false,
              reason: data.reason,
              message: data.message
            });
          });

          socket.on('connect_error', (error) => {
            clearTimeout(timeout);
            socket.disconnect();
            resolve({
              index: i,
              success: false,
              reason: 'connect_error',
              message: error.message
            });
          });
        });

        results.push(await connectionPromise);
        
        // Small delay between connection attempts
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Clean up connections
      connections.forEach(socket => socket.disconnect());

      return results;
    }, jwtToken);

    // Should have exactly 1 successful connection
    const successfulConnections = result.filter(r => r.success);
    const rejectedConnections = result.filter(r => !r.success && r.reason === 'duplicate_connection');

    expect(successfulConnections).toHaveLength(1);
    expect(rejectedConnections.length).toBeGreaterThan(0);
    
    console.log('✅ Connection limits enforced correctly');
  });

  test('should handle real-time message broadcasting', async ({ page }) => {
    await page.goto('/dashboard');
    
    const result = await page.evaluate(async (token, testUserId) => {
      return new Promise((resolve, reject) => {
        const socket = io('http://localhost:3000', {
          auth: { token },
          transports: ['websocket']
        });

        let connected = false;
        const receivedMessages = [];

        const timeout = setTimeout(() => {
          socket.disconnect();
          if (!connected) {
            reject(new Error('Connection timeout'));
          } else {
            resolve({ receivedMessages });
          }
        }, 10000);

        socket.on('connected', async (data) => {
          connected = true;
          console.log('Connected, subscribing to user channel');
          
          // Subscribe to user channel
          socket.emit('subscribe', `user.${testUserId}`);
          
          // Wait a bit then trigger a test broadcast
          setTimeout(async () => {
            try {
              // Trigger a test notification via API
              const response = await fetch('http://localhost:3000/api/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  channel: `user.${testUserId}`,
                  event: 'test_notification',
                  data: {
                    message: 'Test broadcast message',
                    timestamp: Date.now()
                  }
                })
              });
              
              console.log('Broadcast triggered');
            } catch (error) {
              console.log('Broadcast failed:', error);
            }
          }, 2000);
        });

        socket.on('test_notification', (data) => {
          receivedMessages.push(data);
          console.log('Received test notification:', data);
          
          clearTimeout(timeout);
          socket.disconnect();
          resolve({ receivedMessages });
        });

        socket.on('notification', (data) => {
          receivedMessages.push(data);
          console.log('Received notification:', data);
        });

        socket.on('connection_rejected', (data) => {
          clearTimeout(timeout);
          socket.disconnect();
          reject(new Error(`Connection rejected: ${data.message}`));
        });
      });
    }, jwtToken, userId);

    // Should receive the broadcast message
    expect(result.receivedMessages.length).toBeGreaterThan(0);
    
    console.log('✅ Real-time message broadcasting working');
  });

  test('should handle connection reconnection', async ({ page }) => {
    await page.goto('/dashboard');
    
    const result = await page.evaluate(async (token) => {
      return new Promise((resolve, reject) => {
        const socket = io('http://localhost:3000', {
          auth: { token },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 1000
        });

        let connectionCount = 0;
        let disconnectionCount = 0;

        const timeout = setTimeout(() => {
          socket.disconnect();
          resolve({
            connectionCount,
            disconnectionCount,
            success: connectionCount > 1
          });
        }, 15000);

        socket.on('connected', (data) => {
          connectionCount++;
          console.log(`Connection ${connectionCount} established`);
          
          if (connectionCount === 1) {
            // Force disconnect after first connection
            setTimeout(() => {
              socket.disconnect();
            }, 2000);
          }
        });

        socket.on('disconnect', (reason) => {
          disconnectionCount++;
          console.log(`Disconnection ${disconnectionCount}: ${reason}`);
        });

        socket.on('reconnect', (attemptNumber) => {
          console.log(`Reconnected after ${attemptNumber} attempts`);
        });

        socket.on('connection_rejected', (data) => {
          clearTimeout(timeout);
          socket.disconnect();
          reject(new Error(`Connection rejected: ${data.message}`));
        });
      });
    }, jwtToken);

    // Should have reconnected at least once
    expect(result.connectionCount).toBeGreaterThan(1);
    expect(result.disconnectionCount).toBeGreaterThan(0);
    
    console.log('✅ Connection reconnection working');
  });

  test('should validate connection statistics API', async ({ page }) => {
    // Establish a connection first
    await page.goto('/dashboard');
    
    await page.evaluate(async (token) => {
      const socket = io('http://localhost:3000', {
        auth: { token },
        transports: ['websocket']
      });

      return new Promise((resolve) => {
        socket.on('connected', () => {
          // Keep connection open for stats test
          setTimeout(() => {
            socket.disconnect();
            resolve();
          }, 2000);
        });
      });
    }, jwtToken);

    // Check connection statistics
    const statsResponse = await page.request.get('http://localhost:3000/api/connections/stats');
    const stats = await statsResponse.json();

    expect(stats.success).toBe(true);
    expect(stats.data).toBeDefined();
    expect(typeof stats.data.totalConnections).toBe('number');
    expect(typeof stats.data.activeConnections).toBe('number');
    
    console.log('Connection stats:', stats.data);
    console.log('✅ Connection statistics API working');
  });

  test('should handle channel subscription and unsubscription', async ({ page }) => {
    await page.goto('/dashboard');
    
    const result = await page.evaluate(async (token, testUserId) => {
      return new Promise((resolve, reject) => {
        const socket = io('http://localhost:3000', {
          auth: { token },
          transports: ['websocket']
        });

        let subscribed = false;
        let unsubscribed = false;

        const timeout = setTimeout(() => {
          socket.disconnect();
          resolve({ subscribed, unsubscribed });
        }, 10000);

        socket.on('connected', (data) => {
          console.log('Connected, testing channel subscription');
          
          // Subscribe to a channel
          socket.emit('subscribe', `user.${testUserId}`);
        });

        socket.on('subscribed', (data) => {
          subscribed = true;
          console.log('Subscribed to channel:', data.channel);
          
          // Now unsubscribe
          socket.emit('unsubscribe', `user.${testUserId}`);
        });

        socket.on('unsubscribed', (data) => {
          unsubscribed = true;
          console.log('Unsubscribed from channel:', data.channel);
          
          clearTimeout(timeout);
          socket.disconnect();
          resolve({ subscribed, unsubscribed });
        });

        socket.on('connection_rejected', (data) => {
          clearTimeout(timeout);
          socket.disconnect();
          reject(new Error(`Connection rejected: ${data.message}`));
        });
      });
    }, jwtToken, userId);

    expect(result.subscribed).toBe(true);
    expect(result.unsubscribed).toBe(true);
    
    console.log('✅ Channel subscription/unsubscription working');
  });
});
