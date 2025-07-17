/**
 * Environment Detection and Configuration for MechaMap Realtime Server
 * Auto-detects environment based on LARAVEL_API_URL and provides appropriate configuration
 */

const fs = require('fs');
const path = require('path');

/**
 * Domain to environment mapping
 */
const DOMAIN_MAPPING = {
  'mechamap.test': 'development',
  'localhost': 'development',
  '127.0.0.1': 'development',
  'mechamap.com': 'production',
  'www.mechamap.com': 'production'
};

/**
 * Environment-specific configurations
 */
const ENVIRONMENT_CONFIGS = {
  development: {
    cors_origins: [
      'https://mechamap.test',
      'http://localhost:8000',
      'https://localhost:8000',
      'http://127.0.0.1:8000',
      'https://127.0.0.1:8000'
    ],
    ssl_enabled: false,
    log_level: 'debug',
    cluster_enabled: false,
    max_connections: 1000,
    rate_limit_max: 100,
    trust_proxy: false
  },
  production: {
    cors_origins: [
      'https://mechamap.com',
      'https://www.mechamap.com'
    ],
    ssl_enabled: true,
    log_level: 'info',
    cluster_enabled: true,
    max_connections: 50000,
    rate_limit_max: 200,
    trust_proxy: true
  }
};

/**
 * Detect environment based on LARAVEL_API_URL
 */
function detectEnvironment() {
  const laravelUrl = process.env.LARAVEL_API_URL || 'https://mechamap.test';
  
  try {
    const url = new URL(laravelUrl);
    const hostname = url.hostname;
    
    const detectedEnv = DOMAIN_MAPPING[hostname] || 'development';
    
    console.log(`🔍 Environment Detection:`, {
      laravel_url: laravelUrl,
      hostname: hostname,
      detected_env: detectedEnv,
      node_env: process.env.NODE_ENV
    });
    
    return detectedEnv;
  } catch (error) {
    console.warn('⚠️  Failed to parse LARAVEL_API_URL, defaulting to development');
    return 'development';
  }
}

/**
 * Get configuration for detected environment
 */
function getEnvironmentConfig() {
  const detectedEnv = detectEnvironment();
  const baseConfig = ENVIRONMENT_CONFIGS[detectedEnv] || ENVIRONMENT_CONFIGS.development;
  
  // Override with environment variables if provided
  const config = {
    ...baseConfig,
    environment: detectedEnv,
    node_env: process.env.NODE_ENV || detectedEnv,
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0',
    laravel_api_url: process.env.LARAVEL_API_URL || 'https://mechamap.test',
    laravel_api_key: process.env.LARAVEL_API_KEY,
    jwt_secret: process.env.JWT_SECRET,
    admin_key: process.env.ADMIN_KEY,
    
    // Override CORS origins if provided
    cors_origins: process.env.CORS_ORIGIN ? 
      process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : 
      baseConfig.cors_origins,
    
    // SSL configuration
    ssl_enabled: process.env.SSL_ENABLED === 'true' || baseConfig.ssl_enabled,
    ssl_cert_path: process.env.SSL_CERT_PATH,
    ssl_key_path: process.env.SSL_KEY_PATH,
    
    // Database configuration
    db_host: process.env.DB_HOST || 'localhost',
    db_port: parseInt(process.env.DB_PORT) || 3306,
    db_name: process.env.DB_NAME || 'mechamap_backend',
    db_user: process.env.DB_USER || 'root',
    db_password: process.env.DB_PASSWORD || '',
    
    // Performance settings
    cluster_enabled: process.env.CLUSTER_ENABLED === 'true' || baseConfig.cluster_enabled,
    max_connections: parseInt(process.env.MAX_CONNECTIONS) || baseConfig.max_connections,
    
    // Rate limiting
    rate_limit_max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || baseConfig.rate_limit_max,
    rate_limit_window: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    
    // Logging
    log_level: process.env.LOG_LEVEL || baseConfig.log_level,
    log_file: process.env.LOG_FILE,
    
    // Security
    trust_proxy: process.env.TRUST_PROXY === 'true' || baseConfig.trust_proxy,
    helmet_enabled: process.env.HELMET_ENABLED !== 'false',
    compression_enabled: process.env.COMPRESSION_ENABLED !== 'false',
    
    // Monitoring
    monitoring_enabled: process.env.MONITORING_ENABLED !== 'false',
    metrics_enabled: process.env.METRICS_ENABLED !== 'false'
  };
  
  return config;
}

/**
 * Validate required configuration
 */
function validateConfig(config) {
  const required = ['laravel_api_url', 'laravel_api_key', 'jwt_secret'];
  const missing = [];
  
  for (const key of required) {
    if (!config[key]) {
      missing.push(key.toUpperCase());
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    return false;
  }
  
  // Validate JWT secret
  if (config.jwt_secret === 'your_super_secure_jwt_secret_key_here' ||
      config.jwt_secret === 'your_super_secure_production_jwt_secret_key_here') {
    console.warn('⚠️  Using default JWT secret. Please update JWT_SECRET environment variable.');
  }
  
  // Validate API key
  if (config.laravel_api_key === 'your_laravel_api_key_here' ||
      config.laravel_api_key === 'your_production_laravel_api_key_here') {
    console.warn('⚠️  Using default Laravel API key. Please update LARAVEL_API_KEY environment variable.');
  }
  
  return true;
}

/**
 * Load and validate environment configuration
 */
function loadEnvironmentConfig() {
  const config = getEnvironmentConfig();
  
  console.log('⚙️  Environment Configuration:', {
    environment: config.environment,
    node_env: config.node_env,
    laravel_url: config.laravel_api_url,
    cors_origins: config.cors_origins,
    ssl_enabled: config.ssl_enabled,
    cluster_enabled: config.cluster_enabled,
    max_connections: config.max_connections,
    port: config.port
  });
  
  if (!validateConfig(config)) {
    process.exit(1);
  }
  
  return config;
}

/**
 * Get CORS configuration for current environment
 */
function getCorsConfig(config) {
  return {
    origin: config.cors_origins,
    credentials: true,
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
    maxAge: 86400
  };
}

/**
 * Check if current environment is production
 */
function isProduction(config) {
  return config.environment === 'production' || config.node_env === 'production';
}

/**
 * Check if current environment is development
 */
function isDevelopment(config) {
  return config.environment === 'development' || config.node_env === 'development';
}

module.exports = {
  detectEnvironment,
  getEnvironmentConfig,
  loadEnvironmentConfig,
  validateConfig,
  getCorsConfig,
  isProduction,
  isDevelopment,
  DOMAIN_MAPPING,
  ENVIRONMENT_CONFIGS
};
