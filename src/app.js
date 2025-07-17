#!/usr/bin/env node

/**
 * MechaMap Realtime Server
 * Main application entry point
 */

require('dotenv').config();
const RealtimeServer = require('./server');
const logger = require('./utils/logger');
const config = require('./config');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
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
