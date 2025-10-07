const logger = require('../utils/logger');
const config = require('../config');

/**
 * Connection Manager - Handles WebSocket connection limits and optimization
 *
 * Features:
 * - Limit 1 WebSocket connection per user session
 * - Connection pooling/reuse mechanisms
 * - Connection throttling to prevent spam
 * - Monitoring and alerting for connection thresholds
 */
class ConnectionManager {
  constructor() {
    // Track active connections by user ID
    this.userConnections = new Map(); // userId -> { socketId, socket, connectedAt, lastActivity }

    // Track connection attempts for throttling
    this.connectionAttempts = new Map(); // userId -> { count, firstAttempt, lastAttempt }

    // Connection statistics
    this.stats = {
      totalConnections: 0,
      peakConnections: 0,
      connectionAttempts: 0,
      rejectedConnections: 0,
      duplicateConnections: 0
    };

    // Configuration - More aggressive throttling
    this.maxConnectionsPerUser = config.maxConnectionsPerUser || 1;
    this.connectionThrottleWindow = config.connectionThrottleWindow || 60000; // 1 minute
    this.maxConnectionAttemptsPerWindow = config.maxConnectionAttemptsPerWindow || 5; // Reduced from 20 to 5
    this.connectionTimeout = config.connectionTimeout || 60000; // 60 seconds

    // Start cleanup interval
    this.startCleanupInterval();

    logger.info('ConnectionManager initialized', {
      maxConnectionsPerUser: this.maxConnectionsPerUser,
      throttleWindow: this.connectionThrottleWindow,
      maxAttempts: this.maxConnectionAttemptsPerWindow
    });
  }

  /**
   * Check if user can establish new connection
   */
  canConnect(userId, socketId) {
    // Check connection throttling
    if (this.isThrottled(userId)) {
      this.stats.rejectedConnections++;
      logger.warn('Connection throttled', { userId, socketId });
      return {
        allowed: false,
        reason: 'connection_throttled',
        message: 'Too many connection attempts. Please wait before trying again.'
      };
    }

    // Check existing connections
    const existingConnection = this.userConnections.get(userId);
    if (existingConnection) {
      // Check if existing connection is still alive
      if (this.isConnectionAlive(existingConnection)) {
        this.stats.duplicateConnections++;
        logger.warn('Duplicate connection attempt', {
          userId,
          newSocketId: socketId,
          existingSocketId: existingConnection.socketId
        });

        return {
          allowed: false,
          reason: 'duplicate_connection',
          message: 'User already has an active WebSocket connection.',
          existingConnection: {
            socketId: existingConnection.socketId,
            connectedAt: existingConnection.connectedAt
          }
        };
      } else {
        // Clean up dead connection
        this.removeConnection(userId);
        logger.info('Cleaned up dead connection', { userId, socketId: existingConnection.socketId });
      }
    }

    // Check global connection limits
    if (this.stats.totalConnections >= config.maxConnections) {
      this.stats.rejectedConnections++;
      logger.error('Global connection limit reached', {
        current: this.stats.totalConnections,
        limit: config.maxConnections
      });

      return {
        allowed: false,
        reason: 'global_limit_reached',
        message: 'Server connection limit reached. Please try again later.'
      };
    }

    return { allowed: true };
  }

  /**
   * Register new connection
   */
  addConnection(userId, socket) {
    // Record connection attempt
    this.recordConnectionAttempt(userId);

    // Check if connection is allowed
    const canConnect = this.canConnect(userId, socket.id);
    if (!canConnect.allowed) {
      return canConnect;
    }

    // Add connection
    const connectionInfo = {
      socketId: socket.id,
      socket: socket,
      connectedAt: new Date(),
      lastActivity: new Date(),
      userAgent: socket.handshake.headers['user-agent'],
      remoteAddress: socket.handshake.address
    };

    this.userConnections.set(userId, connectionInfo);
    this.stats.totalConnections++;
    this.stats.connectionAttempts++;

    // Update peak connections
    if (this.stats.totalConnections > this.stats.peakConnections) {
      this.stats.peakConnections = this.stats.totalConnections;
    }

    // Setup connection monitoring
    this.setupConnectionMonitoring(userId, socket);

    logger.info('Connection established', {
      userId,
      socketId: socket.id,
      totalConnections: this.stats.totalConnections
    });

    return {
      allowed: true,
      connectionInfo: {
        socketId: socket.id,
        connectedAt: connectionInfo.connectedAt,
        totalConnections: this.stats.totalConnections
      }
    };
  }

  /**
   * Remove connection
   */
  removeConnection(userId) {
    const connection = this.userConnections.get(userId);
    if (connection) {
      this.userConnections.delete(userId);
      this.stats.totalConnections--;

      logger.info('Connection removed', {
        userId,
        socketId: connection.socketId,
        totalConnections: this.stats.totalConnections,
        duration: Date.now() - connection.connectedAt.getTime()
      });
    }
  }

  /**
   * Update connection activity
   */
  updateActivity(userId) {
    const connection = this.userConnections.get(userId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  /**
   * Check if user is throttled
   */
  isThrottled(userId) {
    const attempts = this.connectionAttempts.get(userId);
    if (!attempts) return false;

    const now = Date.now();
    const windowStart = now - this.connectionThrottleWindow;

    // Clean old attempts
    if (attempts.firstAttempt < windowStart) {
      this.connectionAttempts.delete(userId);
      return false;
    }

    return attempts.count >= this.maxConnectionAttemptsPerWindow;
  }

  /**
   * Record connection attempt for throttling
   */
  recordConnectionAttempt(userId) {
    const now = Date.now();
    const attempts = this.connectionAttempts.get(userId);

    if (!attempts) {
      this.connectionAttempts.set(userId, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      });
    } else {
      const windowStart = now - this.connectionThrottleWindow;

      if (attempts.firstAttempt < windowStart) {
        // Reset window
        attempts.count = 1;
        attempts.firstAttempt = now;
      } else {
        attempts.count++;
      }

      attempts.lastAttempt = now;
    }
  }

  /**
   * Check if connection is still alive
   */
  isConnectionAlive(connectionInfo) {
    if (!connectionInfo.socket) return false;

    // Check if socket is connected
    if (!connectionInfo.socket.connected) return false;

    // Check connection timeout
    const now = Date.now();
    const lastActivity = connectionInfo.lastActivity.getTime();
    const timeSinceActivity = now - lastActivity;

    return timeSinceActivity < this.connectionTimeout;
  }

  /**
   * Setup connection monitoring
   */
  setupConnectionMonitoring(userId, socket) {
    // Handle disconnect
    socket.on('disconnect', (reason) => {
      this.removeConnection(userId);
      logger.info('Socket disconnected', { userId, socketId: socket.id, reason });
    });

    // Handle activity events
    const activityEvents = ['message', 'subscribe', 'unsubscribe', 'ping'];
    activityEvents.forEach(event => {
      socket.on(event, () => {
        this.updateActivity(userId);
      });
    });

    // Setup heartbeat
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
        this.updateActivity(userId);
      } else {
        clearInterval(heartbeatInterval);
      }
    }, config.heartbeatInterval || 25000);

    socket.on('pong', () => {
      this.updateActivity(userId);
    });
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeConnections: this.userConnections.size,
      throttledUsers: this.connectionAttempts.size
    };
  }

  /**
   * Get user connection info
   */
  getUserConnection(userId) {
    // Convert userId to number if it's a string
    const userIdKey = typeof userId === 'string' ? parseInt(userId) : userId;
    const connection = this.userConnections.get(userIdKey);
    if (!connection) return null;

    return {
      socketId: connection.socketId,
      connectedAt: connection.connectedAt,
      lastActivity: connection.lastActivity,
      isAlive: this.isConnectionAlive(connection)
    };
  }

  /**
   * Force disconnect user
   */
  forceDisconnect(userId, reason = 'admin_disconnect') {
    // Convert userId to number if it's a string
    const userIdKey = typeof userId === 'string' ? parseInt(userId) : userId;
    const connection = this.userConnections.get(userIdKey);
    if (connection && connection.socket) {
      connection.socket.emit('force_disconnect', { reason });
      connection.socket.disconnect(true);
      this.removeConnection(userIdKey);

      logger.warn('Force disconnect', { userId: userIdKey, reason });
      return true;
    }
    return false;
  }

  /**
   * Start cleanup interval for dead connections
   */
  startCleanupInterval() {
    setInterval(() => {
      this.cleanupDeadConnections();
      this.cleanupOldAttempts();
    }, 60000); // Run every minute
  }

  /**
   * Cleanup dead connections
   */
  cleanupDeadConnections() {
    const deadConnections = [];

    for (const [userId, connection] of this.userConnections.entries()) {
      if (!this.isConnectionAlive(connection)) {
        deadConnections.push(userId);
      }
    }

    deadConnections.forEach(userId => {
      this.removeConnection(userId);
    });

    if (deadConnections.length > 0) {
      logger.info('Cleaned up dead connections', { count: deadConnections.length });
    }
  }

  /**
   * Cleanup old connection attempts
   */
  cleanupOldAttempts() {
    const now = Date.now();
    const windowStart = now - this.connectionThrottleWindow;
    const expiredUsers = [];

    for (const [userId, attempts] of this.connectionAttempts.entries()) {
      if (attempts.lastAttempt < windowStart) {
        expiredUsers.push(userId);
      }
    }

    expiredUsers.forEach(userId => {
      this.connectionAttempts.delete(userId);
    });
  }

  /**
   * Clear all connections and attempts (for testing)
   */
  clearAll() {
    // Disconnect all active connections
    for (const [userId, connection] of this.userConnections.entries()) {
      if (connection.socket && connection.socket.connected) {
        connection.socket.emit('force_disconnect', { reason: 'system_reset' });
        connection.socket.disconnect(true);
      }
    }

    // Clear all data
    this.userConnections.clear();
    this.connectionAttempts.clear();

    // Reset stats
    this.stats = {
      totalConnections: 0,
      peakConnections: 0,
      connectionAttempts: 0,
      rejectedConnections: 0,
      duplicateConnections: 0
    };

    logger.info('All connections and attempts cleared');
  }
}

module.exports = new ConnectionManager();
