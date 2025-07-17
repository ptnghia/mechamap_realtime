const logger = require('./logger');

/**
 * Enhanced Error Handler for MechaMap Realtime Server
 * 
 * Features:
 * - Structured error logging
 * - Error categorization
 * - Graceful error recovery
 * - Performance monitoring
 * - Memory leak detection
 */

class ErrorHandler {
  constructor() {
    this.errorCounts = new Map();
    this.errorHistory = [];
    this.maxHistorySize = 1000;
    this.criticalErrorThreshold = 10; // per minute
    this.memoryThreshold = 1024 * 1024 * 1024; // 1GB
    
    // Start monitoring
    this.startMonitoring();
    
    logger.info('ErrorHandler initialized');
  }

  /**
   * Handle different types of errors
   */
  handleError(error, context = {}) {
    const errorInfo = this.categorizeError(error, context);
    
    // Log error with context
    this.logError(errorInfo);
    
    // Track error statistics
    this.trackError(errorInfo);
    
    // Check for critical conditions
    this.checkCriticalConditions(errorInfo);
    
    // Attempt recovery if possible
    this.attemptRecovery(errorInfo);
    
    return errorInfo;
  }

  /**
   * Categorize error by type and severity
   */
  categorizeError(error, context) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      message: error.message || 'Unknown error',
      stack: error.stack,
      code: error.code,
      type: this.getErrorType(error),
      severity: this.getErrorSeverity(error),
      context: {
        ...context,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        pid: process.pid
      },
      recoverable: this.isRecoverable(error)
    };

    return errorInfo;
  }

  /**
   * Determine error type
   */
  getErrorType(error) {
    if (error.code) {
      // System errors
      if (error.code.startsWith('E')) {
        return 'SYSTEM_ERROR';
      }
    }

    if (error.name) {
      switch (error.name) {
        case 'ValidationError':
          return 'VALIDATION_ERROR';
        case 'AuthenticationError':
          return 'AUTH_ERROR';
        case 'ConnectionError':
          return 'CONNECTION_ERROR';
        case 'TimeoutError':
          return 'TIMEOUT_ERROR';
        case 'RateLimitError':
          return 'RATE_LIMIT_ERROR';
        default:
          return 'APPLICATION_ERROR';
      }
    }

    // Check error message patterns
    const message = error.message.toLowerCase();
    if (message.includes('connection')) return 'CONNECTION_ERROR';
    if (message.includes('timeout')) return 'TIMEOUT_ERROR';
    if (message.includes('auth')) return 'AUTH_ERROR';
    if (message.includes('validation')) return 'VALIDATION_ERROR';
    if (message.includes('rate limit')) return 'RATE_LIMIT_ERROR';

    return 'UNKNOWN_ERROR';
  }

  /**
   * Determine error severity
   */
  getErrorSeverity(error) {
    const criticalPatterns = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'EMFILE',
      'ENOMEM',
      'out of memory',
      'maximum call stack'
    ];

    const warningPatterns = [
      'ECONNRESET',
      'ETIMEDOUT',
      'validation',
      'authentication'
    ];

    const message = error.message.toLowerCase();
    const code = error.code || '';

    if (criticalPatterns.some(pattern => 
      message.includes(pattern.toLowerCase()) || code === pattern)) {
      return 'CRITICAL';
    }

    if (warningPatterns.some(pattern => 
      message.includes(pattern.toLowerCase()) || code === pattern)) {
      return 'WARNING';
    }

    return 'INFO';
  }

  /**
   * Check if error is recoverable
   */
  isRecoverable(error) {
    const unrecoverablePatterns = [
      'EMFILE',
      'ENOMEM',
      'out of memory',
      'maximum call stack'
    ];

    const message = error.message.toLowerCase();
    const code = error.code || '';

    return !unrecoverablePatterns.some(pattern => 
      message.includes(pattern.toLowerCase()) || code === pattern);
  }

  /**
   * Log error with appropriate level
   */
  logError(errorInfo) {
    const logData = {
      type: errorInfo.type,
      severity: errorInfo.severity,
      message: errorInfo.message,
      context: errorInfo.context,
      recoverable: errorInfo.recoverable
    };

    switch (errorInfo.severity) {
      case 'CRITICAL':
        logger.error('CRITICAL ERROR', logData);
        break;
      case 'WARNING':
        logger.warn('WARNING', logData);
        break;
      default:
        logger.info('ERROR INFO', logData);
    }

    // Log stack trace for debugging
    if (errorInfo.stack) {
      logger.debug('Stack trace', { stack: errorInfo.stack });
    }
  }

  /**
   * Track error statistics
   */
  trackError(errorInfo) {
    const key = `${errorInfo.type}:${errorInfo.severity}`;
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);

    // Add to history
    this.errorHistory.push({
      timestamp: errorInfo.timestamp,
      type: errorInfo.type,
      severity: errorInfo.severity,
      message: errorInfo.message
    });

    // Trim history if too large
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Check for critical conditions
   */
  checkCriticalConditions(errorInfo) {
    // Check error rate
    const recentErrors = this.getRecentErrors(60000); // Last minute
    if (recentErrors.length > this.criticalErrorThreshold) {
      logger.error('CRITICAL: High error rate detected', {
        errorCount: recentErrors.length,
        threshold: this.criticalErrorThreshold,
        timeWindow: '1 minute'
      });
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    if (memoryUsage.heapUsed > this.memoryThreshold) {
      logger.error('CRITICAL: High memory usage detected', {
        heapUsed: memoryUsage.heapUsed,
        threshold: this.memoryThreshold,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal * 100).toFixed(2)
      });
    }
  }

  /**
   * Attempt error recovery
   */
  attemptRecovery(errorInfo) {
    if (!errorInfo.recoverable) {
      logger.warn('Error is not recoverable, no recovery attempted');
      return false;
    }

    switch (errorInfo.type) {
      case 'CONNECTION_ERROR':
        return this.recoverConnection(errorInfo);
      case 'TIMEOUT_ERROR':
        return this.recoverTimeout(errorInfo);
      case 'RATE_LIMIT_ERROR':
        return this.recoverRateLimit(errorInfo);
      default:
        logger.debug('No specific recovery strategy for error type', { type: errorInfo.type });
        return false;
    }
  }

  /**
   * Recovery strategies
   */
  recoverConnection(errorInfo) {
    logger.info('Attempting connection recovery', { context: errorInfo.context });
    // Implement connection recovery logic
    return true;
  }

  recoverTimeout(errorInfo) {
    logger.info('Attempting timeout recovery', { context: errorInfo.context });
    // Implement timeout recovery logic
    return true;
  }

  recoverRateLimit(errorInfo) {
    logger.info('Attempting rate limit recovery', { context: errorInfo.context });
    // Implement rate limit recovery logic
    return true;
  }

  /**
   * Get recent errors within time window
   */
  getRecentErrors(timeWindow) {
    const cutoff = Date.now() - timeWindow;
    return this.errorHistory.filter(error => 
      new Date(error.timestamp).getTime() > cutoff
    );
  }

  /**
   * Get error statistics
   */
  getStats() {
    const recentErrors = this.getRecentErrors(3600000); // Last hour
    const errorsByType = {};
    const errorsBySeverity = {};

    recentErrors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    return {
      totalErrors: this.errorHistory.length,
      recentErrors: recentErrors.length,
      errorsByType,
      errorsBySeverity,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  /**
   * Start monitoring processes
   */
  startMonitoring() {
    // Monitor memory usage every 30 seconds
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      if (memoryUsage.heapUsed > this.memoryThreshold * 0.8) {
        logger.warn('High memory usage warning', {
          heapUsed: memoryUsage.heapUsed,
          threshold: this.memoryThreshold,
          percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal * 100).toFixed(2)
        });
      }
    }, 30000);

    // Clean old error history every hour
    setInterval(() => {
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
      this.errorHistory = this.errorHistory.filter(error => 
        new Date(error.timestamp).getTime() > cutoff
      );
      logger.debug('Cleaned old error history', { 
        remaining: this.errorHistory.length 
      });
    }, 3600000);
  }

  /**
   * Setup global error handlers
   */
  setupGlobalHandlers() {
    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.handleError(error, { source: 'uncaughtException' });
      logger.error('Uncaught Exception - Server will exit', { error: error.message });
      process.exit(1);
    });

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.handleError(error, { 
        source: 'unhandledRejection',
        promise: promise.toString()
      });
    });

    // SIGTERM signal
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      process.exit(0);
    });

    // SIGINT signal (Ctrl+C)
    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      process.exit(0);
    });
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

module.exports = errorHandler;
