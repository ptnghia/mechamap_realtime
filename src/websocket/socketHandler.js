const logger = require('../utils/logger');
const channelManager = require('./channelManager');
const connectionManager = require('../services/ConnectionManager');
const performanceMonitor = require('../utils/performanceMonitor');
const errorHandler = require('../utils/errorHandler');

/**
 * Handle WebSocket connections and events
 */
function socketHandler(socket, io, server) {
  const userId = socket.userId;
  const socketId = socket.id;

  // Check connection limits and register connection
  const connectionResult = connectionManager.addConnection(userId, socket);

  if (!connectionResult.allowed) {
    logger.warn('Connection rejected', {
      userId,
      socketId,
      reason: connectionResult.reason,
      message: connectionResult.message
    });

    // Send rejection message and disconnect
    socket.emit('connection_rejected', {
      reason: connectionResult.reason,
      message: connectionResult.message,
      existingConnection: connectionResult.existingConnection
    });

    socket.disconnect(true);
    return;
  }

  logger.socketConnection(socket, 'connected', {
    userAgent: socket.handshake.headers['user-agent'],
    remoteAddress: socket.handshake.address,
    connectionInfo: connectionResult.connectionInfo
  });

  // Track WebSocket connection in performance monitor
  performanceMonitor.trackWebSocketConnection(socketId, 'connected', {
    userId,
    userAgent: socket.handshake.headers['user-agent'],
    remoteAddress: socket.handshake.address
  });

  // Auto-subscribe to user's private channel
  const userChannel = `private-user.${userId}`;
  socket.join(userChannel);

  // Send connection confirmation
  socket.emit('connected', {
    socketId,
    userId,
    timestamp: new Date().toISOString(),
    channels: [userChannel]
  });

  // Handle channel subscription
  socket.on('subscribe', async (data) => {
    try {
      const { channel } = data;

      if (!channel) {
        socket.emit('subscription_error', {
          error: 'Channel is required'
        });
        return;
      }

      logger.socketConnection(socket, 'subscribe_request', { channel });

      // Check authorization with channel manager
      const authorized = await channelManager.authorize(socket, channel);

      if (authorized) {
        // Join Socket.IO room
        socket.join(channel);

        // Track subscription in channel manager
        channelManager.subscribe(socket, channel);

        socket.emit('subscribed', {
          channel,
          status: 'success',
          timestamp: new Date().toISOString()
        });

        logger.socketConnection(socket, 'subscribed', { channel });
      } else {
        socket.emit('subscription_error', {
          channel,
          error: 'Unauthorized'
        });

        logger.socketConnection(socket, 'subscription_denied', { channel });
      }

    } catch (error) {
      logger.errorWithStack('Subscription error', error, {
        socketId,
        userId
      });

      socket.emit('subscription_error', {
        channel: data.channel,
        error: 'Internal error'
      });
    }
  });

  // Handle channel unsubscription
  socket.on('unsubscribe', (data) => {
    try {
      const { channel } = data;

      if (!channel) {
        return;
      }

      // Leave Socket.IO room
      socket.leave(channel);

      // Remove from channel manager tracking
      channelManager.unsubscribe(socket, channel);

      socket.emit('unsubscribed', {
        channel,
        timestamp: new Date().toISOString()
      });

      logger.socketConnection(socket, 'unsubscribed', { channel });

    } catch (error) {
      logger.errorWithStack('Unsubscription error', error, {
        socketId,
        userId
      });
    }
  });

  // Handle notification acknowledgment
  socket.on('notification_read', async (data) => {
    try {
      const { notificationId } = data;

      if (!notificationId) {
        return;
      }

      logger.socketConnection(socket, 'notification_read', { notificationId });

      // TODO: Update notification status in database
      // TODO: Broadcast to user's other devices

      // Broadcast to user's other devices
      socket.to(`private-user.${userId}`).emit('notification_read', {
        notificationId,
        readBy: userId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.errorWithStack('Notification read error', error, {
        socketId,
        userId,
        notificationId: data.notificationId
      });
    }
  });

  // Handle ping/pong for connection health
  socket.on('ping', () => {
    socket.emit('pong', {
      timestamp: new Date().toISOString()
    });
  });

  // Handle custom events
  socket.on('user_activity', (data) => {
    try {
      // Update last activity timestamp
      if (server.connections.has(socketId)) {
        server.connections.get(socketId).lastActivity = new Date();
      }

      logger.socketConnection(socket, 'user_activity', {
        activity: data.activity
      });

    } catch (error) {
      logger.errorWithStack('User activity error', error, {
        socketId,
        userId
      });
    }
  });

  // Handle typing indicators (for future chat features)
  socket.on('typing_start', (data) => {
    try {
      const { channel } = data;

      if (channel && socket.rooms.has(channel)) {
        socket.to(channel).emit('user_typing', {
          userId,
          channel,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      logger.errorWithStack('Typing start error', error, {
        socketId,
        userId
      });
    }
  });

  socket.on('typing_stop', (data) => {
    try {
      const { channel } = data;

      if (channel && socket.rooms.has(channel)) {
        socket.to(channel).emit('user_stopped_typing', {
          userId,
          channel,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      logger.errorWithStack('Typing stop error', error, {
        socketId,
        userId
      });
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    logger.errorWithStack('Socket error', error, {
      socketId,
      userId
    });
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    // Clean up channel subscriptions
    channelManager.unsubscribeAll(socket);

    logger.socketConnection(socket, 'disconnected', {
      reason,
      duration: Date.now() - socket.handshake.time
    });
  });
}

module.exports = socketHandler;
