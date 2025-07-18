#!/usr/bin/env node

/**
 * MechaMap Realtime Server
 * Main application entry point
 */

// Load environment variables with auto-detection
const path = require('path');
const fs = require('fs');

function loadEnvironment() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const rootDir = path.join(__dirname, '..');

  // Determine which .env file to load
  let envFile = '.env';
  if (nodeEnv === 'production') {
    envFile = '.env.production';
  } else if (nodeEnv === 'development') {
    envFile = '.env.development';
  }

  const envPath = path.join(rootDir, envFile);

  // Check if environment file exists
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log(`✅ Loaded environment from: ${envFile}`);
  } else {
    // Fallback to default .env
    require('dotenv').config();
    console.log(`⚠️  Environment file ${envFile} not found, using default .env`);
  }
}

// Load environment first
loadEnvironment();

// Load environment detection and configuration
const { loadEnvironmentConfig } = require('./config/environment');
const environmentConfig = loadEnvironmentConfig();
const RealtimeServer = require('./server');
const logger = require('./utils/logger');
const config = require('./config');

// Load enhanced utilities
const errorHandler = require('./utils/errorHandler');
const performanceMonitor = require('./utils/performanceMonitor');

// Setup enhanced error handling
errorHandler.setupGlobalHandlers();

// Enhanced error handling (keeping original for compatibility)
process.on('uncaughtException', (error) => {
  errorHandler.handleError(error, { source: 'uncaughtException' });
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  errorHandler.handleError(error, { source: 'unhandledRejection', promise: promise.toString() });
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start server
async function startServer() {
  try {
    logger.info('Starting MechaMap Realtime Server...');
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`Port: ${config.port}`);
    logger.info(`SSL Enabled: ${config.ssl.enabled}`);

    const server = new RealtimeServer();
    await server.start();

    logger.info('🚀 MechaMap Realtime Server started successfully!');
    logger.info(`🌐 Server running on ${config.ssl.enabled ? 'https' : 'http'}://localhost:${config.port}`);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();
