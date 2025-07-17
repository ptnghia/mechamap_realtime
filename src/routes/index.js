const express = require('express');
const { StatusCodes } = require('http-status-codes');

const config = require('../config');
const logger = require('../utils/logger');
const broadcastRoutes = require('./broadcast');
const monitoringRoutes = require('./monitoring');

/**
 * Setup Express routes
 */
function setupRoutes(app, monitoring = null) {
  logger.info('Setting up Express routes...');

  // API routes
  const apiRouter = express.Router();

  // Health check endpoint
  apiRouter.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: require('../../package.json').version,
      environment: config.nodeEnv
    });
  });

  // Metrics endpoint (basic implementation)
  apiRouter.get('/metrics', (req, res) => {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: require('../../package.json').version,
      environment: config.nodeEnv,
      // Will be populated by server instance
      connections: 0,
      users: 0
    };

    res.json(metrics);
  });

  // Broadcast endpoint for Laravel integration
  apiRouter.post('/broadcast', async (req, res) => {
    try {
      const { channel, event, data, auth_token } = req.body;

      // Validate required fields
      if (!channel || !event || !data) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Missing required fields',
          message: 'channel, event, and data are required'
        });
      }

      // TODO: Validate auth_token against Laravel API
      // For now, we'll implement basic validation

      logger.api('Broadcast request received', {
        channel,
        event,
        requestId: req.id
      });

      // TODO: Implement actual broadcasting logic
      // This will be implemented in the next task

      res.json({
        success: true,
        message: 'Broadcast queued successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.errorWithStack('Broadcast error', error, {
        requestId: req.id
      });

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'Broadcast failed',
        message: 'Failed to process broadcast request'
      });
    }
  });

  // Status endpoint
  apiRouter.get('/status', (req, res) => {
    res.json({
      service: 'MechaMap Realtime Server',
      status: 'running',
      timestamp: new Date().toISOString(),
      version: require('../../package.json').version,
      environment: config.nodeEnv,
      features: {
        ssl: config.ssl.enabled,
        clustering: config.performance.clusterEnabled,
        metrics: config.monitoring.metricsEnabled,
        redis: !!config.redis.host
      }
    });
  });

  // Configuration endpoint (development only)
  if (config.nodeEnv === 'development') {
    apiRouter.get('/config', (req, res) => {
      // Return safe configuration (no secrets)
      const safeConfig = {
        nodeEnv: config.nodeEnv,
        port: config.port,
        ssl: {
          enabled: config.ssl.enabled
        },
        cors: {
          allowedOrigins: config.cors.allowedOrigins
        },
        websocket: config.websocket,
        connections: config.connections,
        monitoring: config.monitoring
      };

      res.json(safeConfig);
    });
  }

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      service: 'MechaMap Realtime Server',
      message: 'WebSocket server is running',
      version: require('../../package.json').version,
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/api/health',
        status: '/api/status',
        metrics: '/api/metrics',
        broadcast: 'POST /api/broadcast'
      },
      websocket: {
        url: `${config.ssl.enabled ? 'wss' : 'ws'}://localhost:${config.port}`,
        transports: config.websocket.transports
      }
    });
  });

  // Mount API routes
  app.use('/api', apiRouter);

  // Mount broadcast routes
  app.use('/api', broadcastRoutes);

  // Mount monitoring routes if monitoring instance is provided
  if (monitoring) {
    app.use('/api/monitoring', monitoringRoutes(monitoring));
  }

  // 404 handler - must be last
  app.use('*', (req, res) => {
    res.status(StatusCodes.NOT_FOUND).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      requestId: req.id
    });
  });

  logger.info('Express routes setup complete');
}

module.exports = setupRoutes;
