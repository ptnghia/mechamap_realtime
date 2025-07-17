const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Monitoring routes
module.exports = (monitoring) => {
    // Health check endpoint
    router.get('/health', (req, res) => {
        try {
            const startTime = Date.now();
            const healthStatus = monitoring.getHealthStatus();
            
            monitoring.trackResponseTime(startTime, '/health');
            
            res.status(healthStatus.status === 'healthy' ? 200 : 503).json({
                success: true,
                data: healthStatus,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            monitoring.trackError(error, { endpoint: '/health' });
            res.status(500).json({
                success: false,
                error: 'Health check failed',
                timestamp: new Date().toISOString()
            });
        }
    });

    // Detailed metrics endpoint
    router.get('/metrics', (req, res) => {
        try {
            const startTime = Date.now();
            const metrics = monitoring.getMetrics();
            
            monitoring.trackResponseTime(startTime, '/metrics');
            
            res.json({
                success: true,
                data: metrics,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            monitoring.trackError(error, { endpoint: '/metrics' });
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve metrics',
                timestamp: new Date().toISOString()
            });
        }
    });

    // Performance summary endpoint
    router.get('/performance', (req, res) => {
        try {
            const startTime = Date.now();
            const performance = monitoring.getPerformanceSummary();
            
            monitoring.trackResponseTime(startTime, '/performance');
            
            res.json({
                success: true,
                data: performance,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            monitoring.trackError(error, { endpoint: '/performance' });
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve performance data',
                timestamp: new Date().toISOString()
            });
        }
    });

    // Active alerts endpoint
    router.get('/alerts', (req, res) => {
        try {
            const startTime = Date.now();
            const alerts = monitoring.getActiveAlerts();
            
            monitoring.trackResponseTime(startTime, '/alerts');
            
            res.json({
                success: true,
                data: {
                    alerts,
                    count: alerts.length,
                    hasAlerts: alerts.length > 0
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            monitoring.trackError(error, { endpoint: '/alerts' });
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve alerts',
                timestamp: new Date().toISOString()
            });
        }
    });

    // Connection statistics endpoint
    router.get('/connections', (req, res) => {
        try {
            const startTime = Date.now();
            const metrics = monitoring.getMetrics();
            
            monitoring.trackResponseTime(startTime, '/connections');
            
            res.json({
                success: true,
                data: {
                    connections: metrics.connections,
                    channels: metrics.channels,
                    authentication: metrics.authentication
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            monitoring.trackError(error, { endpoint: '/connections' });
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve connection data',
                timestamp: new Date().toISOString()
            });
        }
    });

    // Reset metrics endpoint (admin only)
    router.post('/reset', (req, res) => {
        try {
            const startTime = Date.now();
            
            // Simple admin check - in production, use proper authentication
            const adminKey = req.headers['x-admin-key'];
            if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized - Admin key required',
                    timestamp: new Date().toISOString()
                });
            }
            
            monitoring.resetMetrics();
            monitoring.trackResponseTime(startTime, '/reset');
            
            logger.info('Metrics reset via API', {
                adminKey: adminKey.substring(0, 4) + '***',
                category: 'monitoring'
            });
            
            res.json({
                success: true,
                message: 'Metrics reset successfully',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            monitoring.trackError(error, { endpoint: '/reset' });
            res.status(500).json({
                success: false,
                error: 'Failed to reset metrics',
                timestamp: new Date().toISOString()
            });
        }
    });

    // Update alert thresholds endpoint (admin only)
    router.put('/thresholds', (req, res) => {
        try {
            const startTime = Date.now();
            
            // Simple admin check - in production, use proper authentication
            const adminKey = req.headers['x-admin-key'];
            if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized - Admin key required',
                    timestamp: new Date().toISOString()
                });
            }
            
            const { thresholds } = req.body;
            if (!thresholds || typeof thresholds !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid thresholds data',
                    timestamp: new Date().toISOString()
                });
            }
            
            monitoring.updateThresholds(thresholds);
            monitoring.trackResponseTime(startTime, '/thresholds');
            
            logger.info('Alert thresholds updated via API', {
                thresholds,
                adminKey: adminKey.substring(0, 4) + '***',
                category: 'monitoring'
            });
            
            res.json({
                success: true,
                message: 'Alert thresholds updated successfully',
                data: { thresholds },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            monitoring.trackError(error, { endpoint: '/thresholds' });
            res.status(500).json({
                success: false,
                error: 'Failed to update thresholds',
                timestamp: new Date().toISOString()
            });
        }
    });

    // Server info endpoint
    router.get('/info', (req, res) => {
        try {
            const startTime = Date.now();
            const metrics = monitoring.getMetrics();
            
            monitoring.trackResponseTime(startTime, '/info');
            
            res.json({
                success: true,
                data: {
                    server: metrics.server,
                    uptime: metrics.uptime,
                    version: process.env.npm_package_version || '1.0.0',
                    environment: process.env.NODE_ENV || 'development'
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            monitoring.trackError(error, { endpoint: '/info' });
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve server info',
                timestamp: new Date().toISOString()
            });
        }
    });

    // Prometheus-style metrics endpoint
    router.get('/prometheus', (req, res) => {
        try {
            const startTime = Date.now();
            const metrics = monitoring.getMetrics();
            
            // Convert metrics to Prometheus format
            let prometheusMetrics = '';
            
            // Connection metrics
            prometheusMetrics += `# HELP websocket_connections_total Total number of WebSocket connections\n`;
            prometheusMetrics += `# TYPE websocket_connections_total counter\n`;
            prometheusMetrics += `websocket_connections_total ${metrics.connections.total}\n\n`;
            
            prometheusMetrics += `# HELP websocket_connections_active Current active WebSocket connections\n`;
            prometheusMetrics += `# TYPE websocket_connections_active gauge\n`;
            prometheusMetrics += `websocket_connections_active ${metrics.connections.active}\n\n`;
            
            prometheusMetrics += `# HELP websocket_connections_peak Peak WebSocket connections\n`;
            prometheusMetrics += `# TYPE websocket_connections_peak gauge\n`;
            prometheusMetrics += `websocket_connections_peak ${metrics.connections.peak}\n\n`;
            
            // Performance metrics
            prometheusMetrics += `# HELP http_request_duration_ms Average HTTP request duration in milliseconds\n`;
            prometheusMetrics += `# TYPE http_request_duration_ms gauge\n`;
            prometheusMetrics += `http_request_duration_ms ${metrics.performance.avgResponseTime}\n\n`;
            
            prometheusMetrics += `# HELP http_requests_total Total number of HTTP requests\n`;
            prometheusMetrics += `# TYPE http_requests_total counter\n`;
            prometheusMetrics += `http_requests_total ${metrics.performance.totalRequests}\n\n`;
            
            // Authentication metrics
            prometheusMetrics += `# HELP auth_attempts_total Total authentication attempts\n`;
            prometheusMetrics += `# TYPE auth_attempts_total counter\n`;
            prometheusMetrics += `auth_attempts_total{result="success"} ${metrics.authentication.successful}\n`;
            prometheusMetrics += `auth_attempts_total{result="failure"} ${metrics.authentication.failed}\n\n`;
            
            // Notification metrics
            prometheusMetrics += `# HELP notifications_total Total notifications sent\n`;
            prometheusMetrics += `# TYPE notifications_total counter\n`;
            prometheusMetrics += `notifications_total ${metrics.notifications.sent}\n\n`;
            
            monitoring.trackResponseTime(startTime, '/prometheus');
            
            res.set('Content-Type', 'text/plain');
            res.send(prometheusMetrics);
        } catch (error) {
            monitoring.trackError(error, { endpoint: '/prometheus' });
            res.status(500).json({
                success: false,
                error: 'Failed to generate Prometheus metrics',
                timestamp: new Date().toISOString()
            });
        }
    });

    return router;
};
