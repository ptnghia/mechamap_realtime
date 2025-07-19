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
const MonitoringMiddleware = require('./middleware/monitoring');
const { getCorsConfig, socketCorsConfig, corsLogger } = require('./config/cors');

// Enhanced utilities
const errorHandler = require('./utils/errorHandler');
const performanceMonitor = require('./utils/performanceMonitor');
const GCOptimizer = require('../scripts/gc-optimizer');

class RealtimeServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.io = null;
    this.connections = new Map();
    this.userConnections = new Map();
    this.monitoring = new MonitoringMiddleware();

    // Initialize GC Optimizer
    this.gcOptimizer = new GCOptimizer({
      gcInterval: 30000, // 30 seconds
      memoryThreshold: 0.75, // 75%
      forceGCThreshold: 0.85, // 85%
      logger: logger
    });
  }

  /**
   * Initialize Express application
   */
  setupExpress() {
    logger.info('Setting up Express application...', {
      environment: process.env.NODE_ENV,
      corsOrigins: process.env.CORS_ORIGIN
    });

    // Add CORS logging middleware
    this.app.use(corsLogger);

    // Add performance monitoring middleware
    this.app.use(performanceMonitor.middleware());

    // Setup middleware (includes CORS)
    setupMiddleware(this.app);

    // Setup routes with monitoring
    setupRoutes(this.app, this.monitoring);

    // Enhanced health check endpoint with monitoring data
    this.app.get('/health', (req, res) => {
      const healthStatus = this.monitoring.getHealthStatus();
      res.status(healthStatus.status === 'healthy' ? 200 : 503).json({
        ...healthStatus,
        connections: this.connections.size,
        users: this.userConnections.size,
        version: require('../package.json').version
      });
    });

    // Memory monitoring endpoint
    this.app.get('/api/memory', (req, res) => {
      const memoryReport = this.gcOptimizer.getMemoryReport();
      res.json({
        ...memoryReport,
        connections: this.connections.size,
        users: this.userConnections.size,
        recommendations: this.getMemoryRecommendations(memoryReport)
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
      this.monitoring.trackConnectionFailure(err.message, err.req?.socketId);
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

    // Authentication middleware with monitoring
    this.io.use(async (socket, next) => {
      const startTime = Date.now();
      try {
        await authMiddleware(socket, next);
        // Track successful authentication
        this.monitoring.trackAuthentication(true, socket.tokenType || 'unknown', socket.userId);
        this.monitoring.trackResponseTime(startTime, 'auth');
      } catch (error) {
        // Track failed authentication
        this.monitoring.trackAuthentication(false, 'unknown', null);
        this.monitoring.trackError(error, { context: 'authentication', socketId: socket.id });
        this.monitoring.trackResponseTime(startTime, 'auth');
        throw error;
      }
    });

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
    const userRole = socket.userRole || 'unknown';

    // Track connection in monitoring
    this.monitoring.trackConnection(socketId, userId, userRole);

    // Track connection
    this.connections.set(socketId, {
      socket,
      userId,
      userRole,
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
      userRole,
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
    const userRole = socket.userRole || 'unknown';

    // Track disconnection in monitoring
    this.monitoring.trackDisconnection(socketId, userId, userRole, reason);

    // Remove connection tracking with memory cleanup
    this.connections.delete(socketId);

    if (this.userConnections.has(userId)) {
      this.userConnections.get(userId).delete(socketId);

      // Remove user if no more connections
      if (this.userConnections.get(userId).size === 0) {
        this.userConnections.delete(userId);
      }
    }

    // Clean up socket references to prevent memory leaks
    socket.removeAllListeners();
    socket = null;

    logger.info(`User disconnected: ${userId}`, {
      userId,
      socketId,
      userRole,
      reason,
      totalConnections: this.connections.size,
      remainingUserConnections: this.userConnections.has(userId)
        ? this.userConnections.get(userId).size
        : 0
    });

    // Trigger GC check after disconnection
    if (this.connections.size % 10 === 0) {
      this.gcOptimizer.checkMemoryUsage();
    }
  }

  /**
   * Get memory recommendations based on current usage
   */
  getMemoryRecommendations(memoryReport) {
    const recommendations = [];

    if (memoryReport.memory.heapUsagePercent > 85) {
      recommendations.push({
        level: 'critical',
        message: 'Heap usage > 85% - Immediate action required',
        actions: ['Force garbage collection', 'Restart instance', 'Check for memory leaks']
      });
    } else if (memoryReport.memory.heapUsagePercent > 75) {
      recommendations.push({
        level: 'warning',
        message: 'Heap usage > 75% - Monitor closely',
        actions: ['Schedule garbage collection', 'Review connection count']
      });
    }

    if (memoryReport.gc.detachedContexts > 0) {
      recommendations.push({
        level: 'critical',
        message: 'Memory leak detected - Detached contexts found',
        actions: ['Investigate event listeners', 'Check for circular references']
      });
    }

    if (this.connections.size > 1000) {
      recommendations.push({
        level: 'info',
        message: 'High connection count detected',
        actions: ['Consider connection pooling', 'Monitor per-user limits']
      });
    }

    return recommendations;
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
