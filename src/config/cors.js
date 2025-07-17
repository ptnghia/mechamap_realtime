/**
 * CORS Configuration for MechaMap Realtime Server
 * Auto-detects environment and provides appropriate CORS settings
 */

const { getEnvironmentConfig, getCorsConfig } = require('./environment');

/**
 * Get allowed origins based on auto-detected environment
 */
function getAllowedOrigins() {
  const config = getEnvironmentConfig();
  return config.cors_origins;
}

/**
 * CORS configuration for Express
 */
const corsConfig = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`, {
        allowedOrigins,
        environment: process.env.NODE_ENV
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Admin-Key',
    'X-Socket-ID'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  maxAge: 86400 // 24 hours
};

/**
 * Socket.IO CORS configuration
 */
const socketCorsConfig = {
  origin: getAllowedOrigins(),
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST']
};

/**
 * Middleware to log CORS requests
 */
function corsLogger(req, res, next) {
  const origin = req.get('Origin');
  const allowedOrigins = getAllowedOrigins();

  console.log('CORS Request:', {
    origin,
    method: req.method,
    path: req.path,
    allowed: !origin || allowedOrigins.includes(origin),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });

  next();
}

/**
 * Development CORS configuration (more permissive)
 */
const developmentCorsConfig = {
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: '*',
  exposedHeaders: '*'
};

/**
 * Production CORS configuration (restrictive)
 */
const productionCorsConfig = {
  origin: [
    'https://mechamap.com',
    'https://www.mechamap.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Admin-Key'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  maxAge: 86400
};

/**
 * Get CORS configuration based on auto-detected environment
 */
function getAutoDetectedCorsConfig() {
  const config = getEnvironmentConfig();
  return getCorsConfig(config);
}

module.exports = {
  corsConfig,
  socketCorsConfig,
  corsLogger,
  getAllowedOrigins,
  getCorsConfig: getAutoDetectedCorsConfig,
  developmentCorsConfig,
  productionCorsConfig
};
