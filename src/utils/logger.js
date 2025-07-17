const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}] ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    return log;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: {
    service: 'mechamap-realtime',
    version: require('../../package.json').version,
    pid: process.pid,
    hostname: require('os').hostname(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),

    // Separate file for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ],

  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log')
    })
  ],

  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log')
    })
  ]
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || 'debug'
  }));
}

// Add console transport for production with limited output
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'warn' // Only warnings and errors in production console
  }));
}

// Custom logging methods for specific use cases
logger.websocket = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'websocket' });
};

logger.auth = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'auth' });
};

logger.api = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'api' });
};

logger.database = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'database' });
};

logger.performance = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'performance' });
};

logger.security = (message, meta = {}) => {
  logger.warn(message, { ...meta, category: 'security' });
};

// Request logging middleware
logger.requestMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    };

    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};

// WebSocket connection logging
logger.socketConnection = (socket, event, data = {}) => {
  logger.websocket(`Socket ${event}`, {
    socketId: socket.id,
    userId: socket.userId,
    event,
    ...data
  });
};

// Performance monitoring
logger.performance.timer = (label) => {
  const start = process.hrtime.bigint();

  return {
    end: () => {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // Convert to milliseconds

      logger.performance(`Timer: ${label}`, {
        duration: `${duration.toFixed(2)}ms`
      });

      return duration;
    }
  };
};

// Error logging with stack trace
logger.errorWithStack = (message, error, meta = {}) => {
  logger.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    ...meta
  });
};

// Startup banner
logger.banner = () => {
  const banner = `
╔══════════════════════════════════════════════════════════════╗
║                    MechaMap Realtime Server                  ║
║                                                              ║
║  🚀 Node.js WebSocket Server for Real-time Notifications    ║
║  📡 Socket.IO + Express + JWT Authentication                 ║
║  🔒 SSL/TLS Support + Laravel Integration                    ║
║                                                              ║
║  Environment: ${process.env.NODE_ENV || 'development'}${' '.repeat(Math.max(0, 43 - (process.env.NODE_ENV || 'development').length))}║
║  Version: ${require('../../package.json').version}${' '.repeat(Math.max(0, 51 - require('../../package.json').version.length))}║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `;

  console.log(banner);
};

module.exports = logger;
