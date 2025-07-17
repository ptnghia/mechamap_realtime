const path = require('path');

/**
 * Application configuration
 * Loads configuration from environment variables with defaults
 */

const config = {
  // Server configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  
  // SSL configuration
  ssl: {
    enabled: process.env.SSL_ENABLED === 'true',
    certPath: process.env.SSL_CERT_PATH || path.join(__dirname, '../../deployment/ssl/localhost.crt'),
    keyPath: process.env.SSL_KEY_PATH || path.join(__dirname, '../../deployment/ssl/localhost.key')
  },
  
  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    name: process.env.DB_NAME || 'mechamap_backend',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    timeout: parseInt(process.env.DB_TIMEOUT) || 60000
  },
  
  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB) || 0,
    prefix: process.env.REDIS_PREFIX || 'mechamap_realtime:'
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your_super_secure_jwt_secret_key_here',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    algorithm: process.env.JWT_ALGORITHM || 'HS256'
  },
  
  // Laravel integration
  laravel: {
    apiUrl: process.env.LARAVEL_API_URL || 'https://mechamap.test',
    apiKey: process.env.LARAVEL_API_KEY || '',
    dbConnection: process.env.LARAVEL_DB_CONNECTION === 'true'
  },
  
  // CORS configuration
  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'https://mechamap.test,https://mechamap.com,https://www.mechamap.com').split(','),
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true'
  },
  
  // WebSocket configuration
  websocket: {
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT) || 60000,
    pingInterval: parseInt(process.env.WS_PING_INTERVAL) || 25000,
    maxHttpBufferSize: parseInt(process.env.WS_MAX_HTTP_BUFFER_SIZE) || 1e6,
    transports: (process.env.WS_TRANSPORTS || 'websocket,polling').split(','),
    upgradeTimeout: parseInt(process.env.WS_UPGRADE_TIMEOUT) || 10000
  },
  
  // Connection limits
  connections: {
    maxConnections: parseInt(process.env.MAX_CONNECTIONS) || 10000,
    maxConnectionsPerUser: parseInt(process.env.MAX_CONNECTIONS_PER_USER) || 5,
    connectionTimeout: parseInt(process.env.CONNECTION_TIMEOUT) || 30000,
    heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL) || 25000
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
    datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD'
  },
  
  // Monitoring configuration
  monitoring: {
    metricsEnabled: process.env.METRICS_ENABLED === 'true',
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
    healthCheckTimeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
    prometheusMetrics: process.env.PROMETHEUS_METRICS === 'true'
  },
  
  // Performance configuration
  performance: {
    clusterEnabled: process.env.CLUSTER_ENABLED === 'true',
    clusterWorkers: process.env.CLUSTER_WORKERS === 'auto' ? require('os').cpus().length : parseInt(process.env.CLUSTER_WORKERS) || 1,
    memoryLimit: parseInt(process.env.MEMORY_LIMIT) || 1024,
    gcInterval: parseInt(process.env.GC_INTERVAL) || 300000
  },
  
  // Security configuration
  security: {
    helmetEnabled: process.env.HELMET_ENABLED !== 'false',
    compressionEnabled: process.env.COMPRESSION_ENABLED !== 'false',
    trustProxy: process.env.TRUST_PROXY === 'true'
  },
  
  // Development configuration
  development: {
    debugMode: process.env.DEBUG_MODE === 'true',
    verboseLogging: process.env.VERBOSE_LOGGING === 'true',
    mockLaravelApi: process.env.MOCK_LARAVEL_API === 'true'
  }
};

// Validation
if (!config.jwt.secret || config.jwt.secret === 'your_super_secure_jwt_secret_key_here') {
  if (config.nodeEnv === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
  console.warn('⚠️  Warning: Using default JWT secret. Set JWT_SECRET environment variable.');
}

if (!config.laravel.apiUrl) {
  throw new Error('LARAVEL_API_URL must be set');
}

// Log configuration in development
if (config.nodeEnv === 'development' && config.development.verboseLogging) {
  console.log('📋 Configuration loaded:', {
    nodeEnv: config.nodeEnv,
    port: config.port,
    sslEnabled: config.ssl.enabled,
    database: {
      host: config.database.host,
      name: config.database.name
    },
    laravel: {
      apiUrl: config.laravel.apiUrl
    }
  });
}

module.exports = config;
