const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { StatusCodes } = require('http-status-codes');

const config = require('../config');
const logger = require('../utils/logger');
const { getCorsConfig } = require('../config/cors');

/**
 * Setup Express middleware
 */
function setupMiddleware(app) {
  logger.info('Setting up Express middleware...');

  // Trust proxy if configured
  if (config.security.trustProxy) {
    app.set('trust proxy', 1);
  }

  // Security headers with Helmet
  if (config.security.helmetEnabled) {
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "ws:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false
    }));
  }

  // Compression
  if (config.security.compressionEnabled) {
    app.use(compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      threshold: 1024
    }));
  }

  // CORS configuration - Environment-specific
  const corsOptions = getCorsConfig();

  logger.info('Setting up CORS middleware', {
    environment: process.env.NODE_ENV,
    origins: Array.isArray(corsOptions.origin) ? corsOptions.origin : 'dynamic',
    credentials: corsOptions.credentials
  });

  app.use(cors(corsOptions));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      if (req.path === '/health' || req.path === '/metrics') {
        return true;
      }

      // Skip for successful requests if configured
      if (config.rateLimit.skipSuccessfulRequests) {
        return false;
      }

      return false;
    },
    handler: (req, res) => {
      logger.security('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });

      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
      });
    }
  });

  app.use('/api', limiter);

  // JSON parsing with size limit
  app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  }));

  // URL encoded parsing
  app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
  }));

  // Request logging with detailed Socket.IO debugging
  app.use((req, res, next) => {
    // Log all requests including Socket.IO
    if (req.url.includes('socket.io')) {
      logger.debug('Socket.IO request', {
        method: req.method,
        url: req.url,
        headers: req.headers,
        contentLength: req.headers['content-length'],
        userAgent: req.get('User-Agent')
      });
    }

    logger.requestMiddleware(req, res, next);
  });

  // Request ID for tracing
  app.use((req, res, next) => {
    req.id = require('uuid').v4();
    res.setHeader('X-Request-ID', req.id);
    next();
  });

  // Request timeout
  app.use((req, res, next) => {
    const timeout = 30000; // 30 seconds

    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout', {
          requestId: req.id,
          method: req.method,
          url: req.url,
          timeout
        });

        res.status(StatusCodes.REQUEST_TIMEOUT).json({
          error: 'Request timeout',
          message: 'The request took too long to process'
        });
      }
    }, timeout);

    res.on('finish', () => {
      clearTimeout(timer);
    });

    next();
  });

  // Error handling middleware
  app.use((error, req, res, next) => {
    logger.errorWithStack('Express error', error, {
      requestId: req.id,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Don't expose error details in production
    const isDevelopment = config.nodeEnv === 'development';

    if (error.name === 'ValidationError') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Validation Error',
        message: error.message,
        ...(isDevelopment && { stack: error.stack })
      });
    }

    if (error.name === 'UnauthorizedError') {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Default error response
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      message: isDevelopment ? error.message : 'Something went wrong',
      requestId: req.id,
      ...(isDevelopment && { stack: error.stack })
    });
  });

  logger.info('Express middleware setup complete');
}

module.exports = setupMiddleware;
