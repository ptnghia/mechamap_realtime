const logger = require('./logger');

/**
 * Performance Monitor for MechaMap Realtime Server
 * 
 * Features:
 * - Request/Response time tracking
 * - Memory usage monitoring
 * - CPU usage tracking
 * - WebSocket connection metrics
 * - Database query performance
 * - Alert system for performance issues
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: new Map(),
      responses: new Map(),
      websockets: new Map(),
      database: new Map(),
      memory: [],
      cpu: []
    };
    
    this.thresholds = {
      responseTime: 1000, // 1 second
      memoryUsage: 0.8, // 80% of heap
      cpuUsage: 0.8, // 80% CPU
      connectionCount: 1000,
      errorRate: 0.05 // 5%
    };
    
    this.alerts = new Map();
    this.startTime = Date.now();
    
    // Start monitoring
    this.startSystemMonitoring();
    
    logger.info('PerformanceMonitor initialized');
  }

  /**
   * Track request start
   */
  startRequest(requestId, metadata = {}) {
    this.metrics.requests.set(requestId, {
      startTime: process.hrtime.bigint(),
      timestamp: Date.now(),
      metadata
    });
  }

  /**
   * Track request end and calculate metrics
   */
  endRequest(requestId, statusCode = 200, metadata = {}) {
    const requestData = this.metrics.requests.get(requestId);
    if (!requestData) {
      logger.warn('Request end called without start', { requestId });
      return null;
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - requestData.startTime) / 1000000; // Convert to milliseconds

    const responseData = {
      requestId,
      duration,
      statusCode,
      timestamp: Date.now(),
      metadata: { ...requestData.metadata, ...metadata }
    };

    this.metrics.responses.set(requestId, responseData);
    this.metrics.requests.delete(requestId);

    // Check for performance issues
    this.checkResponseTimeThreshold(responseData);

    // Log slow requests
    if (duration > this.thresholds.responseTime) {
      logger.warn('Slow request detected', {
        requestId,
        duration: `${duration.toFixed(2)}ms`,
        threshold: `${this.thresholds.responseTime}ms`,
        statusCode,
        metadata: responseData.metadata
      });
    }

    return responseData;
  }

  /**
   * Track WebSocket connection metrics
   */
  trackWebSocketConnection(socketId, event, metadata = {}) {
    const timestamp = Date.now();
    
    if (!this.metrics.websockets.has(socketId)) {
      this.metrics.websockets.set(socketId, {
        socketId,
        connectedAt: timestamp,
        events: [],
        lastActivity: timestamp,
        metadata
      });
    }

    const socketData = this.metrics.websockets.get(socketId);
    socketData.events.push({
      event,
      timestamp,
      metadata
    });
    socketData.lastActivity = timestamp;

    // Limit event history per socket
    if (socketData.events.length > 100) {
      socketData.events = socketData.events.slice(-50);
    }
  }

  /**
   * Track WebSocket disconnection
   */
  trackWebSocketDisconnection(socketId, reason = 'unknown') {
    const socketData = this.metrics.websockets.get(socketId);
    if (socketData) {
      socketData.disconnectedAt = Date.now();
      socketData.disconnectReason = reason;
      socketData.sessionDuration = socketData.disconnectedAt - socketData.connectedAt;
      
      logger.debug('WebSocket session ended', {
        socketId,
        duration: `${socketData.sessionDuration}ms`,
        reason,
        eventCount: socketData.events.length
      });
    }
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery(queryId, query, duration, success = true, metadata = {}) {
    const queryData = {
      queryId,
      query: query.substring(0, 200), // Limit query length in logs
      duration,
      success,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.database.set(queryId, queryData);

    // Check for slow queries
    if (duration > 500) { // 500ms threshold for database queries
      logger.warn('Slow database query detected', {
        queryId,
        duration: `${duration}ms`,
        query: queryData.query,
        success,
        metadata
      });
    }

    // Limit database metrics storage
    if (this.metrics.database.size > 1000) {
      const oldestEntries = Array.from(this.metrics.database.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, 500);
      
      oldestEntries.forEach(([key]) => {
        this.metrics.database.delete(key);
      });
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    const now = Date.now();
    const uptime = now - this.startTime;
    
    // Calculate response time statistics
    const recentResponses = Array.from(this.metrics.responses.values())
      .filter(r => now - r.timestamp < 300000) // Last 5 minutes
      .map(r => r.duration);

    const responseStats = this.calculateStats(recentResponses);

    // Calculate WebSocket statistics
    const activeConnections = Array.from(this.metrics.websockets.values())
      .filter(ws => !ws.disconnectedAt);

    const connectionStats = {
      active: activeConnections.length,
      total: this.metrics.websockets.size,
      averageSessionDuration: this.calculateAverageSessionDuration()
    };

    // Calculate database statistics
    const recentQueries = Array.from(this.metrics.database.values())
      .filter(q => now - q.timestamp < 300000); // Last 5 minutes

    const dbStats = {
      queryCount: recentQueries.length,
      averageDuration: recentQueries.length > 0 
        ? recentQueries.reduce((sum, q) => sum + q.duration, 0) / recentQueries.length 
        : 0,
      successRate: recentQueries.length > 0
        ? recentQueries.filter(q => q.success).length / recentQueries.length
        : 1
    };

    // System metrics
    const memoryUsage = process.memoryUsage();
    const systemStats = {
      uptime,
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal * 100).toFixed(2)
      },
      cpu: this.getCurrentCpuUsage()
    };

    return {
      timestamp: now,
      uptime,
      requests: {
        active: this.metrics.requests.size,
        completed: this.metrics.responses.size,
        responseTime: responseStats
      },
      websockets: connectionStats,
      database: dbStats,
      system: systemStats,
      alerts: Array.from(this.alerts.values())
    };
  }

  /**
   * Calculate statistics for an array of numbers
   */
  calculateStats(numbers) {
    if (numbers.length === 0) {
      return { min: 0, max: 0, avg: 0, p95: 0, p99: 0 };
    }

    const sorted = numbers.sort((a, b) => a - b);
    const sum = numbers.reduce((a, b) => a + b, 0);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / numbers.length,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  /**
   * Calculate average WebSocket session duration
   */
  calculateAverageSessionDuration() {
    const completedSessions = Array.from(this.metrics.websockets.values())
      .filter(ws => ws.disconnectedAt && ws.sessionDuration);

    if (completedSessions.length === 0) return 0;

    const totalDuration = completedSessions.reduce((sum, ws) => sum + ws.sessionDuration, 0);
    return totalDuration / completedSessions.length;
  }

  /**
   * Get current CPU usage (simplified)
   */
  getCurrentCpuUsage() {
    const usage = process.cpuUsage();
    return {
      user: usage.user,
      system: usage.system,
      total: usage.user + usage.system
    };
  }

  /**
   * Check response time threshold
   */
  checkResponseTimeThreshold(responseData) {
    if (responseData.duration > this.thresholds.responseTime) {
      this.createAlert('SLOW_RESPONSE', {
        message: `Response time exceeded threshold: ${responseData.duration.toFixed(2)}ms`,
        threshold: this.thresholds.responseTime,
        actual: responseData.duration,
        requestId: responseData.requestId
      });
    }
  }

  /**
   * Create performance alert
   */
  createAlert(type, data) {
    const alertId = `${type}_${Date.now()}`;
    const alert = {
      id: alertId,
      type,
      timestamp: Date.now(),
      data,
      resolved: false
    };

    this.alerts.set(alertId, alert);

    logger.warn('Performance alert created', alert);

    // Auto-resolve alerts after 5 minutes
    setTimeout(() => {
      if (this.alerts.has(alertId)) {
        this.alerts.get(alertId).resolved = true;
      }
    }, 300000);

    return alert;
  }

  /**
   * Start system monitoring
   */
  startSystemMonitoring() {
    // Monitor memory usage every 30 seconds
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      const memoryPercentage = memoryUsage.heapUsed / memoryUsage.heapTotal;

      this.metrics.memory.push({
        timestamp: Date.now(),
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: memoryPercentage
      });

      // Keep only last 100 memory readings
      if (this.metrics.memory.length > 100) {
        this.metrics.memory = this.metrics.memory.slice(-50);
      }

      // Check memory threshold
      if (memoryPercentage > this.thresholds.memoryUsage) {
        this.createAlert('HIGH_MEMORY', {
          message: `Memory usage exceeded threshold: ${(memoryPercentage * 100).toFixed(2)}%`,
          threshold: this.thresholds.memoryUsage * 100,
          actual: memoryPercentage * 100,
          memoryUsage
        });
      }
    }, 30000);

    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000);
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  cleanupOldMetrics() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

    // Clean responses
    for (const [key, response] of this.metrics.responses.entries()) {
      if (response.timestamp < cutoff) {
        this.metrics.responses.delete(key);
      }
    }

    // Clean WebSocket data
    for (const [key, ws] of this.metrics.websockets.entries()) {
      if (ws.disconnectedAt && ws.disconnectedAt < cutoff) {
        this.metrics.websockets.delete(key);
      }
    }

    // Clean database queries
    for (const [key, query] of this.metrics.database.entries()) {
      if (query.timestamp < cutoff) {
        this.metrics.database.delete(key);
      }
    }

    // Clean resolved alerts
    for (const [key, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.timestamp < cutoff) {
        this.alerts.delete(key);
      }
    }

    logger.debug('Cleaned up old performance metrics');
  }

  /**
   * Express middleware for automatic request tracking
   */
  middleware() {
    return (req, res, next) => {
      const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      req.performanceId = requestId;

      this.startRequest(requestId, {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      // Override res.end to capture response
      const originalEnd = res.end;
      res.end = (...args) => {
        this.endRequest(requestId, res.statusCode, {
          contentLength: res.get('Content-Length')
        });
        originalEnd.apply(res, args);
      };

      next();
    };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;
