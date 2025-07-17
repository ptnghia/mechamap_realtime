const express = require('express');
const { createServer } = require('https');
const { createServer: createHttpServer } = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const config = require('./config');
const logger = require('./utils/logger');
const setupMiddleware = require('./middleware');
const setupRoutes = require('./routes');
const socketHandler = require('./websocket/socketHandler');
const { authMiddleware } = require('./middleware/auth');

class RealtimeServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.io = null;
    this.connections = new Map();
    this.userConnections = new Map();
  }

  /**
   * Initialize Express application
   */
  setupExpress() {
    logger.info('Setting up Express application...');

    // Setup middleware
    setupMiddleware(this.app);

    // Setup routes
    setupRoutes(this.app);

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        connections: this.connections.size,
        users: this.userConnections.size,
        memory: process.memoryUsage(),
        version: require('../package.json').version
      });
    });

    logger.info('Express application setup complete');
  }

  /**
   * Create HTTP/HTTPS server
   */
  createHttpServer() {
    logger.info('Creating HTTP server...');

    if (config.ssl.enabled) {
      try {
        const sslOptions = {
          key: fs.readFileSync(config.ssl.keyPath),
          cert: fs.readFileSync(config.ssl.certPath)
        };

        this.server = createServer(sslOptions, this.app);
        logger.info('HTTPS server created with SSL certificates');
      } catch (error) {
        logger.error('Failed to load SSL certificates:', error);
        logger.warn('Falling back to HTTP server');
        this.server = createHttpServer(this.app);
      }
    } else {
      this.server = createHttpServer(this.app);
      logger.info('HTTP server created');
    }
  }

  /**
   * Setup Socket.IO server
   */
  setupSocketIO() {
    logger.info('Setting up Socket.IO server...');

    this.io = new Server(this.server, {
      cors: {
        origin: config.cors.allowedOrigins,
        credentials: config.cors.credentials,
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling'],
      pingTimeout: config.websocket.pingTimeout,
      pingInterval: config.websocket.pingInterval,
      maxHttpBufferSize: 10e6, // 10MB - increased from 1MB
      upgradeTimeout: config.websocket.upgradeTimeout,
      allowEIO3: true // Allow Engine.IO v3 clients
    });

    // Make Socket.IO instance available to Express routes
    this.app.set('socketio', this.io);

    // Debug Socket.IO events
    this.io.engine.on('connection_error', (err) => {
      logger.error('Socket.IO connection error:', {
        req: err.req && {
          url: err.req.url,
          headers: err.req.headers,
          method: err.req.method
        },
        code: err.code,
        message: err.message,
        context: err.context
      });
    });

    // Authentication middleware
    this.io.use(authMiddleware);

    // Connection handler
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    logger.info('Socket.IO server setup complete');
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket) {
    const userId = socket.userId;
    const socketId = socket.id;

    // Track connection
    this.connections.set(socketId, {
      socket,
      userId,
      connectedAt: new Date(),
      lastActivity: new Date()
    });

    // Track user connections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId).add(socketId);

    logger.info(`User connected: ${userId}`, {
      userId,
      socketId,
      totalConnections: this.connections.size,
      userConnections: this.userConnections.get(userId).size
    });

    // Setup socket handlers
    socketHandler(socket, this.io, this);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnection(socket, reason) {
    const userId = socket.userId;
    const socketId = socket.id;

    // Remove connection tracking
    this.connections.delete(socketId);

    if (this.userConnections.has(userId)) {
      this.userConnections.get(userId).delete(socketId);

      // Remove user if no more connections
      if (this.userConnections.get(userId).size === 0) {
        this.userConnections.delete(userId);
      }
    }

    logger.info(`User disconnected: ${userId}`, {
      userId,
      socketId,
      reason,
      totalConnections: this.connections.size,
      remainingUserConnections: this.userConnections.has(userId)
        ? this.userConnections.get(userId).size
        : 0
    });
  }

  /**
   * Get user's socket connections
   */
  getUserSockets(userId) {
    if (!this.userConnections.has(userId)) {
      return [];
    }

    const socketIds = this.userConnections.get(userId);
    return Array.from(socketIds)
      .map(socketId => this.connections.get(socketId)?.socket)
      .filter(Boolean);
  }

  /**
   * Broadcast to user's all devices
   */
  broadcastToUser(userId, event, data) {
    const sockets = this.getUserSockets(userId);
    sockets.forEach(socket => {
      socket.emit(event, data);
    });

    logger.debug(`Broadcasted to user ${userId}`, {
      event,
      socketCount: sockets.length
    });
  }

  /**
   * Start the server
   */
  async start() {
    try {
      // Setup Express
      this.setupExpress();

      // Create HTTP server
      this.createHttpServer();

      // Setup Socket.IO
      this.setupSocketIO();

      // Start listening
      await new Promise((resolve, reject) => {
        this.server.listen(config.port, config.host, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      logger.info(`Server started on ${config.host}:${config.port}`);

    } catch (error) {
      logger.error('Failed to start server:', error);
      throw error;
    }
  }

  /**
   * Stop the server
   */
  async stop() {
    logger.info('Stopping server...');

    if (this.io) {
      this.io.close();
    }

    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
    }

    logger.info('Server stopped');
  }
}

module.exports = RealtimeServer;
