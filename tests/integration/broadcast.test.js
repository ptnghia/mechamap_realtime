const request = require('supertest');
const express = require('express');
const { Server } = require('socket.io');
const { createServer } = require('http');

const setupMiddleware = require('../../src/middleware');
const broadcastRoutes = require('../../src/routes/broadcast');
const channelManager = require('../../src/websocket/channelManager');

describe('Broadcast API Integration', () => {
  let app;
  let server;
  let io;
  let authToken;

  beforeAll(() => {
    // Create Express app
    app = express();
    setupMiddleware(app);
    app.use('/api', broadcastRoutes);
    
    // Create HTTP server and Socket.IO
    server = createServer(app);
    io = new Server(server);
    
    // Make Socket.IO available to routes
    app.set('socketio', io);
    
    // Generate auth token
    authToken = global.testUtils.generateTestToken(1, 'admin');
  });

  beforeEach(() => {
    // Clear channel manager state
    channelManager.channels.clear();
    channelManager.userChannels.clear();
    channelManager.channelMetadata.clear();
    
    // Mock some subscribers
    const mockSocket = global.testUtils.createMockSocket(1, 'member');
    channelManager.subscribe(mockSocket, 'private-user.1');
    channelManager.subscribe(mockSocket, 'public.announcements');
  });

  afterAll(() => {
    if (server) {
      server.close();
    }
  });

  describe('POST /api/broadcast', () => {
    it('should broadcast notification successfully', async () => {
      const broadcastData = {
        channel: 'private-user.1',
        event: 'notification.sent',
        data: {
          title: 'Test Notification',
          message: 'This is a test notification',
          type: 'info'
        }
      };

      const response = await request(app)
        .post('/api/broadcast')
        .set('Authorization', `Bearer ${authToken}`)
        .send(broadcastData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Broadcast sent successfully',
        channel: 'private-user.1',
        event: 'notification.sent',
        subscriberCount: 1
      });

      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return validation error for missing fields', async () => {
      const invalidData = {
        channel: 'private-user.1'
        // Missing event and data
      };

      const response = await request(app)
        .post('/api/broadcast')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation Error',
        message: 'Invalid input data'
      });

      expect(response.body.details).toBeInstanceOf(Array);
    });

    it('should return unauthorized for missing token', async () => {
      const broadcastData = {
        channel: 'private-user.1',
        event: 'notification.sent',
        data: { message: 'test' }
      };

      await request(app)
        .post('/api/broadcast')
        .send(broadcastData)
        .expect(401);
    });

    it('should handle broadcast to channel with no subscribers', async () => {
      const broadcastData = {
        channel: 'private-user.999', // No subscribers
        event: 'notification.sent',
        data: {
          title: 'Test Notification',
          message: 'This is a test notification'
        }
      };

      const response = await request(app)
        .post('/api/broadcast')
        .set('Authorization', `Bearer ${authToken}`)
        .send(broadcastData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        subscriberCount: 0
      });
    });
  });

  describe('POST /api/broadcast/multi', () => {
    it('should broadcast to multiple channels successfully', async () => {
      const multicastData = {
        broadcasts: [
          {
            channel: 'private-user.1',
            event: 'notification.sent',
            data: { title: 'Notification 1' }
          },
          {
            channel: 'public.announcements',
            event: 'announcement.new',
            data: { title: 'Announcement 1' }
          }
        ]
      };

      const response = await request(app)
        .post('/api/broadcast/multi')
        .set('Authorization', `Bearer ${authToken}`)
        .send(multicastData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Multi-broadcast completed'
      });

      expect(response.body.results).toHaveLength(2);
      expect(response.body.results[0]).toMatchObject({
        channel: 'private-user.1',
        event: 'notification.sent',
        subscriberCount: 1,
        success: true
      });
    });

    it('should return validation error for invalid broadcasts array', async () => {
      const invalidData = {
        broadcasts: [] // Empty array
      };

      const response = await request(app)
        .post('/api/broadcast/multi')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation Error'
      });
    });
  });

  describe('POST /api/broadcast/user/:userId', () => {
    it('should broadcast to specific user successfully', async () => {
      const userData = {
        event: 'notification.sent',
        data: {
          title: 'Personal Notification',
          message: 'This is for you specifically'
        }
      };

      const response = await request(app)
        .post('/api/broadcast/user/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'User broadcast sent successfully',
        userId: '1',
        event: 'notification.sent',
        subscriberCount: 1
      });
    });

    it('should handle broadcast to user with no active connections', async () => {
      const userData = {
        event: 'notification.sent',
        data: { title: 'Test' }
      };

      const response = await request(app)
        .post('/api/broadcast/user/999') // User with no connections
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        subscriberCount: 0
      });
    });
  });

  describe('GET /api/channels/:channel', () => {
    it('should return channel information', async () => {
      const response = await request(app)
        .get('/api/channels/private-user.1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        channel: 'private-user.1',
        subscriberCount: 1
      });

      expect(response.body.subscribers).toBeInstanceOf(Array);
    });

    it('should return empty info for non-existent channel', async () => {
      const response = await request(app)
        .get('/api/channels/non-existent-channel')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        channel: 'non-existent-channel',
        subscriberCount: 0,
        subscribers: []
      });
    });
  });

  describe('GET /api/channels/stats', () => {
    it('should return channel statistics', async () => {
      const response = await request(app)
        .get('/api/channels/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true
      });

      expect(response.body.stats).toHaveProperty('totalChannels');
      expect(response.body.stats).toHaveProperty('totalSubscriptions');
      expect(response.body.stats).toHaveProperty('channelsByType');
      expect(response.body.stats).toHaveProperty('topChannels');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests with invalid token', async () => {
      await request(app)
        .post('/api/broadcast')
        .set('Authorization', 'Bearer invalid.token')
        .send({
          channel: 'test',
          event: 'test',
          data: {}
        })
        .expect(401);
    });

    it('should reject requests without authorization header', async () => {
      await request(app)
        .get('/api/channels/stats')
        .expect(401);
    });

    it('should accept token from request body', async () => {
      const broadcastData = {
        channel: 'private-user.1',
        event: 'notification.sent',
        data: { message: 'test' },
        auth_token: authToken
      };

      await request(app)
        .post('/api/broadcast')
        .send(broadcastData)
        .expect(200);
    });
  });
});
