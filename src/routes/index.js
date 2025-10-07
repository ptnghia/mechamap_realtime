const express = require('express');
const { StatusCodes } = require('http-status-codes');

const config = require('../config');
const logger = require('../utils/logger');
const broadcastRoutes = require('./broadcast');
const monitoringRoutes = require('./monitoring');

// Translation services
const translationService = require('../services/TranslationService');
const {
  validateTranslateRequest,
  validateDetectLanguageRequest,
  getSupportedLanguages
} = require('../validation/translationValidation');

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

  // Test authentication endpoint
  apiRouter.post('/test-auth', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const token = authHeader.substring(7);
      const authMiddleware = require('../middleware/auth');

      // Test token validation
      const result = await authMiddleware.validateJwtToken(token);

      res.json({
        success: true,
        message: 'Token validation successful',
        data: {
          tokenType: result.type || 'jwt',
          userId: result.userId || result.user?.id,
          role: result.role || result.user?.role,
          permissions: result.permissions || result.user?.permissions,
          tokenInfo: {
            iat: result.iat,
            exp: result.exp,
            algorithm: 'HS256'
          }
        }
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Token validation failed',
        error: error.message
      });
    }
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
    // In production, SSL is handled by reverse proxy
    const sslStatus = config.nodeEnv === 'production' ? true : config.ssl.enabled;

    res.json({
      service: 'MechaMap Realtime Server',
      status: 'running',
      timestamp: new Date().toISOString(),
      version: require('../../package.json').version,
      environment: config.nodeEnv,
      features: {
        ssl: sslStatus,
        clustering: config.performance.clusterEnabled,
        metrics: config.monitoring.metricsEnabled,
        redis: !!config.redis.host,
        proxy: config.nodeEnv === 'production' ? 'nginx-reverse-proxy' : 'none'
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
    // Determine the correct WebSocket URL based on environment
    let websocketUrl;
    if (config.nodeEnv === 'production') {
      // In production, use the configured domain with SSL
      websocketUrl = `wss://${config.domain}`;
    } else {
      // In development, use localhost with SSL config
      websocketUrl = `${config.ssl.enabled ? 'wss' : 'ws'}://localhost:${config.port}`;
    }

    res.json({
      service: 'MechaMap Realtime Server',
      message: 'WebSocket server is running',
      version: require('../../package.json').version,
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      endpoints: {
        health: '/api/health',
        status: '/api/status',
        metrics: '/api/metrics',
        broadcast: 'POST /api/broadcast'
      },
      websocket: {
        url: websocketUrl,
        transports: config.websocket.transports
      }
    });
  });

  // Connection management endpoints
  apiRouter.get('/connections/stats', (req, res) => {
    const connectionManager = require('../services/ConnectionManager');
    const stats = connectionManager.getStats();

    res.json({
      success: true,
      message: 'Connection statistics',
      data: stats
    });
  });

  apiRouter.get('/connections/user/:userId', (req, res) => {
    const connectionManager = require('../services/ConnectionManager');
    const { userId } = req.params;
    const connection = connectionManager.getUserConnection(userId);

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'User connection not found'
      });
    }

    res.json({
      success: true,
      message: 'User connection info',
      data: connection
    });
  });

  apiRouter.post('/connections/disconnect/:userId', (req, res) => {
    const connectionManager = require('../services/ConnectionManager');
    const { userId } = req.params;
    const { reason = 'admin_disconnect' } = req.body;

    const disconnected = connectionManager.forceDisconnect(userId, reason);

    if (disconnected) {
      res.json({
        success: true,
        message: 'User disconnected successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User connection not found'
      });
    }
  });

  // Clear all connections (for testing)
  apiRouter.post('/connections/clear-all', (req, res) => {
    const connectionManager = require('../services/ConnectionManager');
    connectionManager.clearAll();

    res.json({
      success: true,
      message: 'All connections cleared'
    });
  });

  // Performance metrics endpoint
  apiRouter.get('/performance/metrics', (req, res) => {
    const performanceMonitor = require('../utils/performanceMonitor');
    const metrics = performanceMonitor.getMetrics();

    res.json({
      success: true,
      message: 'Performance metrics',
      data: metrics
    });
  });

  // Error statistics endpoint
  apiRouter.get('/errors/stats', (req, res) => {
    const errorHandler = require('../utils/errorHandler');
    const stats = errorHandler.getStats();

    res.json({
      success: true,
      message: 'Error statistics',
      data: stats
    });
  });

  // Main endpoint - Server information
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
        broadcast: 'POST /api/broadcast',
        translate: 'POST /api/translate',
        detectLanguage: 'POST /api/detect-language',
        supportedLanguages: 'GET /api/supported-languages'
      },
      websocket: {
        url: `wss://realtime.mechamap.com`,
        transports: ['websocket', 'polling']
      }
    });
  });

  // Translation endpoints

  // POST /api/translate - Translate text or HTML content
  apiRouter.post('/translate', async (req, res) => {
    try {
      // Validate request
      const validation = validateTranslateRequest(req.body);
      if (!validation.isValid) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const { sourceLanguage, targetLanguage, content, contentType } = validation.data;

      // Perform translation
      const result = await translationService.translate(
        content,
        sourceLanguage,
        targetLanguage,
        contentType
      );

      res.json({
        success: true,
        message: 'Translation completed successfully',
        data: result
      });

    } catch (error) {
      logger.error('Translation endpoint error:', error);

      // Handle specific error types
      if (error.message.includes('Invalid') || error.message.includes('required')) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
          success: false,
          message: 'Translation service rate limit exceeded. Please try again later.'
        });
      }

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Translation service temporarily unavailable'
      });
    }
  });

  // POST /api/detect-language - Detect language of text
  apiRouter.post('/detect-language', async (req, res) => {
    try {
      // Validate request
      const validation = validateDetectLanguageRequest(req.body);
      if (!validation.isValid) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const { content } = validation.data;

      // Detect language
      const detectedLanguage = await translationService.detectLanguage(content);

      res.json({
        success: true,
        message: 'Language detection completed successfully',
        data: {
          content: content,
          detectedLanguage: detectedLanguage
        }
      });

    } catch (error) {
      logger.error('Language detection endpoint error:', error);

      if (error.message.includes('required') || error.message.includes('Invalid')) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: error.message
        });
      }

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Language detection service temporarily unavailable'
      });
    }
  });

  // GET /api/supported-languages - Get list of supported languages
  apiRouter.get('/supported-languages', (req, res) => {
    try {
      const languages = getSupportedLanguages();

      res.json({
        success: true,
        message: 'Supported languages retrieved successfully',
        data: languages
      });

    } catch (error) {
      logger.error('Supported languages endpoint error:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Unable to retrieve supported languages'
      });
    }
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
