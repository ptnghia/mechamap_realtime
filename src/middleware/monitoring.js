const logger = require('../utils/logger');

class MonitoringMiddleware {
    constructor() {
        this.metrics = {
            connections: {
                total: 0,
                active: 0,
                peak: 0,
                byRole: {},
                failed: 0
            },
            messages: {
                sent: 0,
                received: 0,
                failed: 0,
                byType: {}
            },
            channels: {
                total: 0,
                subscriptions: 0,
                byChannel: {}
            },
            performance: {
                avgResponseTime: 0,
                totalRequests: 0,
                slowRequests: 0,
                errorRate: 0
            },
            authentication: {
                successful: 0,
                failed: 0,
                byMethod: {}
            },
            notifications: {
                sent: 0,
                delivered: 0,
                failed: 0,
                byType: {}
            }
        };

        this.startTime = Date.now();
        this.requestTimes = [];
        this.errorCount = 0;
        this.alertThresholds = {
            maxResponseTime: 1000,
            maxErrorRate: 0.05,
            maxActiveConnections: 10000
        };
    }

    // Track connection metrics with enhanced details
    trackConnection(socketId, userId, userRole = 'unknown') {
        this.metrics.connections.total++;
        this.metrics.connections.active++;

        // Track by role
        if (!this.metrics.connections.byRole[userRole]) {
            this.metrics.connections.byRole[userRole] = 0;
        }
        this.metrics.connections.byRole[userRole]++;

        if (this.metrics.connections.active > this.metrics.connections.peak) {
            this.metrics.connections.peak = this.metrics.connections.active;
        }

        logger.info('Connection tracked', {
            socketId,
            userId,
            userRole,
            totalConnections: this.metrics.connections.total,
            activeConnections: this.metrics.connections.active,
            peakConnections: this.metrics.connections.peak,
            category: 'monitoring'
        });

        // Check for connection alerts
        this.checkConnectionAlerts();
    }

    // Track disconnection with enhanced details
    trackDisconnection(socketId, userId, userRole = 'unknown', reason = 'unknown') {
        this.metrics.connections.active--;

        // Update role tracking
        if (this.metrics.connections.byRole[userRole] > 0) {
            this.metrics.connections.byRole[userRole]--;
        }

        logger.info('Disconnection tracked', {
            socketId,
            userId,
            userRole,
            reason,
            activeConnections: this.metrics.connections.active,
            category: 'monitoring'
        });
    }

    // Track failed connections
    trackConnectionFailure(reason, socketId = null) {
        this.metrics.connections.failed++;

        logger.warn('Connection failure tracked', {
            reason,
            socketId,
            totalFailures: this.metrics.connections.failed,
            category: 'monitoring'
        });
    }

    // Track message metrics with type classification
    trackMessage(type, success = true, messageType = 'general') {
        if (success) {
            this.metrics.messages.sent++;
        } else {
            this.metrics.messages.failed++;
        }

        this.metrics.messages.received++;

        // Track by message type
        if (!this.metrics.messages.byType[messageType]) {
            this.metrics.messages.byType[messageType] = { sent: 0, failed: 0 };
        }

        if (success) {
            this.metrics.messages.byType[messageType].sent++;
        } else {
            this.metrics.messages.byType[messageType].failed++;
        }
    }

    // Track authentication metrics
    trackAuthentication(success, method = 'sanctum', userId = null) {
        if (success) {
            this.metrics.authentication.successful++;
        } else {
            this.metrics.authentication.failed++;
        }

        // Track by method
        if (!this.metrics.authentication.byMethod[method]) {
            this.metrics.authentication.byMethod[method] = { successful: 0, failed: 0 };
        }

        if (success) {
            this.metrics.authentication.byMethod[method].successful++;
        } else {
            this.metrics.authentication.byMethod[method].failed++;
        }

        logger.debug('Authentication tracked', {
            success,
            method,
            userId,
            totalSuccessful: this.metrics.authentication.successful,
            totalFailed: this.metrics.authentication.failed,
            category: 'monitoring'
        });
    }

    // Track notification delivery
    trackNotification(type, status, userId = null) {
        this.metrics.notifications.sent++;

        if (status === 'delivered') {
            this.metrics.notifications.delivered++;
        } else if (status === 'failed') {
            this.metrics.notifications.failed++;
        }

        // Track by notification type
        if (!this.metrics.notifications.byType[type]) {
            this.metrics.notifications.byType[type] = { sent: 0, delivered: 0, failed: 0 };
        }
        this.metrics.notifications.byType[type][status]++;

        logger.debug('Notification tracked', {
            type,
            status,
            userId,
            category: 'monitoring'
        });
    }

    // Track channel metrics with detailed breakdown
    trackChannelSubscription(channel, userId, userRole = 'unknown') {
        this.metrics.channels.subscriptions++;

        // Track by channel
        if (!this.metrics.channels.byChannel[channel]) {
            this.metrics.channels.byChannel[channel] = { subscriptions: 0, users: new Set() };
        }
        this.metrics.channels.byChannel[channel].subscriptions++;
        this.metrics.channels.byChannel[channel].users.add(userId);

        logger.debug('Channel subscription tracked', {
            channel,
            userId,
            userRole,
            totalSubscriptions: this.metrics.channels.subscriptions,
            channelSubscriptions: this.metrics.channels.byChannel[channel].subscriptions,
            category: 'monitoring'
        });
    }

    // Track channel unsubscription
    trackChannelUnsubscription(channel, userId) {
        if (this.metrics.channels.byChannel[channel]) {
            this.metrics.channels.byChannel[channel].subscriptions--;
            this.metrics.channels.byChannel[channel].users.delete(userId);

            if (this.metrics.channels.byChannel[channel].subscriptions <= 0) {
                delete this.metrics.channels.byChannel[channel];
            }
        }

        this.metrics.channels.subscriptions--;
    }

    // Track response time with performance analysis
    trackResponseTime(startTime, endpoint = 'unknown') {
        const responseTime = Date.now() - startTime;
        this.requestTimes.push(responseTime);
        this.metrics.performance.totalRequests++;

        // Track slow requests
        if (responseTime > this.alertThresholds.maxResponseTime) {
            this.metrics.performance.slowRequests++;
            logger.warn('Slow request detected', {
                responseTime,
                endpoint,
                threshold: this.alertThresholds.maxResponseTime,
                category: 'monitoring'
            });
        }

        // Keep only last 1000 requests for average calculation
        if (this.requestTimes.length > 1000) {
            this.requestTimes.shift();
        }

        // Calculate average response time
        const sum = this.requestTimes.reduce((a, b) => a + b, 0);
        this.metrics.performance.avgResponseTime = sum / this.requestTimes.length;

        // Calculate error rate
        this.metrics.performance.errorRate = this.errorCount / this.metrics.performance.totalRequests;
    }

    // Track errors
    trackError(error, context = {}) {
        this.errorCount++;
        this.metrics.performance.errorRate = this.errorCount / Math.max(this.metrics.performance.totalRequests, 1);

        logger.error('Error tracked', {
            error: error.message,
            stack: error.stack,
            context,
            errorCount: this.errorCount,
            errorRate: this.metrics.performance.errorRate,
            category: 'monitoring'
        });

        // Check for error rate alerts
        this.checkErrorRateAlerts();
    }

    // Check connection alerts
    checkConnectionAlerts() {
        if (this.metrics.connections.active > this.alertThresholds.maxActiveConnections) {
            logger.warn('High connection count alert', {
                activeConnections: this.metrics.connections.active,
                threshold: this.alertThresholds.maxActiveConnections,
                category: 'monitoring'
            });
        }
    }

    // Check error rate alerts
    checkErrorRateAlerts() {
        if (this.metrics.performance.errorRate > this.alertThresholds.maxErrorRate) {
            logger.warn('High error rate alert', {
                errorRate: this.metrics.performance.errorRate,
                threshold: this.alertThresholds.maxErrorRate,
                totalRequests: this.metrics.performance.totalRequests,
                errorCount: this.errorCount,
                category: 'monitoring'
            });
        }
    }

    // Get current metrics with computed values
    getMetrics() {
        const uptime = Date.now() - this.startTime;

        // Convert Set objects to counts for serialization
        const channelMetrics = {};
        Object.keys(this.metrics.channels.byChannel).forEach(channel => {
            channelMetrics[channel] = {
                subscriptions: this.metrics.channels.byChannel[channel].subscriptions,
                uniqueUsers: this.metrics.channels.byChannel[channel].users.size
            };
        });

        return {
            connections: this.metrics.connections,
            messages: this.metrics.messages,
            channels: {
                ...this.metrics.channels,
                byChannel: channelMetrics
            },
            performance: {
                ...this.metrics.performance,
                uptimeSeconds: Math.floor(uptime / 1000)
            },
            authentication: this.metrics.authentication,
            notifications: this.metrics.notifications,
            uptime: {
                milliseconds: uptime,
                seconds: Math.floor(uptime / 1000),
                minutes: Math.floor(uptime / 60000),
                hours: Math.floor(uptime / 3600000),
                days: Math.floor(uptime / 86400000)
            },
            timestamp: new Date().toISOString(),
            server: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                memory: process.memoryUsage(),
                pid: process.pid
            }
        };
    }

    // Get health status with comprehensive checks
    getHealthStatus() {
        const metrics = this.getMetrics();
        const checks = {
            connections: {
                status: metrics.connections.active >= 0,
                message: `${metrics.connections.active} active connections`
            },
            responseTime: {
                status: metrics.performance.avgResponseTime < this.alertThresholds.maxResponseTime,
                message: `${Math.round(metrics.performance.avgResponseTime)}ms avg response time`
            },
            errorRate: {
                status: metrics.performance.errorRate < this.alertThresholds.maxErrorRate,
                message: `${(metrics.performance.errorRate * 100).toFixed(2)}% error rate`
            },
            uptime: {
                status: metrics.uptime.seconds > 0,
                message: `${metrics.uptime.hours}h ${metrics.uptime.minutes % 60}m uptime`
            },
            memory: {
                status: metrics.server.memory.heapUsed < metrics.server.memory.heapTotal * 0.9,
                message: `${Math.round(metrics.server.memory.heapUsed / 1024 / 1024)}MB heap used`
            }
        };

        const isHealthy = Object.values(checks).every(check => check.status);

        return {
            status: isHealthy ? 'healthy' : 'unhealthy',
            checks,
            metrics,
            alerts: this.getActiveAlerts()
        };
    }

    // Get active alerts
    getActiveAlerts() {
        const alerts = [];
        const metrics = this.getMetrics();

        if (metrics.connections.active > this.alertThresholds.maxActiveConnections) {
            alerts.push({
                type: 'high_connections',
                severity: 'warning',
                message: `High connection count: ${metrics.connections.active}`,
                threshold: this.alertThresholds.maxActiveConnections
            });
        }

        if (metrics.performance.avgResponseTime > this.alertThresholds.maxResponseTime) {
            alerts.push({
                type: 'slow_response',
                severity: 'warning',
                message: `Slow response time: ${Math.round(metrics.performance.avgResponseTime)}ms`,
                threshold: this.alertThresholds.maxResponseTime
            });
        }

        if (metrics.performance.errorRate > this.alertThresholds.maxErrorRate) {
            alerts.push({
                type: 'high_error_rate',
                severity: 'critical',
                message: `High error rate: ${(metrics.performance.errorRate * 100).toFixed(2)}%`,
                threshold: this.alertThresholds.maxErrorRate
            });
        }

        return alerts;
    }

    // Get performance summary
    getPerformanceSummary() {
        const metrics = this.getMetrics();

        return {
            connections: {
                current: metrics.connections.active,
                peak: metrics.connections.peak,
                total: metrics.connections.total,
                failed: metrics.connections.failed,
                successRate: ((metrics.connections.total - metrics.connections.failed) / Math.max(metrics.connections.total, 1) * 100).toFixed(2) + '%'
            },
            performance: {
                avgResponseTime: Math.round(metrics.performance.avgResponseTime) + 'ms',
                totalRequests: metrics.performance.totalRequests,
                slowRequests: metrics.performance.slowRequests,
                errorRate: (metrics.performance.errorRate * 100).toFixed(2) + '%'
            },
            authentication: {
                successRate: ((metrics.authentication.successful / Math.max(metrics.authentication.successful + metrics.authentication.failed, 1)) * 100).toFixed(2) + '%',
                total: metrics.authentication.successful + metrics.authentication.failed
            },
            notifications: {
                deliveryRate: ((metrics.notifications.delivered / Math.max(metrics.notifications.sent, 1)) * 100).toFixed(2) + '%',
                total: metrics.notifications.sent
            },
            uptime: `${metrics.uptime.days}d ${metrics.uptime.hours % 24}h ${metrics.uptime.minutes % 60}m`
        };
    }

    // Reset metrics
    resetMetrics() {
        this.metrics = {
            connections: {
                total: 0,
                active: 0,
                peak: 0,
                byRole: {},
                failed: 0
            },
            messages: {
                sent: 0,
                received: 0,
                failed: 0,
                byType: {}
            },
            channels: {
                total: 0,
                subscriptions: 0,
                byChannel: {}
            },
            performance: {
                avgResponseTime: 0,
                totalRequests: 0,
                slowRequests: 0,
                errorRate: 0
            },
            authentication: {
                successful: 0,
                failed: 0,
                byMethod: {}
            },
            notifications: {
                sent: 0,
                delivered: 0,
                failed: 0,
                byType: {}
            }
        };

        this.requestTimes = [];
        this.errorCount = 0;
        this.startTime = Date.now();

        logger.info('Metrics reset', { category: 'monitoring' });
    }

    // Update alert thresholds
    updateThresholds(newThresholds) {
        this.alertThresholds = { ...this.alertThresholds, ...newThresholds };

        logger.info('Alert thresholds updated', {
            thresholds: this.alertThresholds,
            category: 'monitoring'
        });
    }
}

module.exports = MonitoringMiddleware;
