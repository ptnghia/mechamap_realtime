const logger = require('../utils/logger');
const channelManager = require('../websocket/channelManager');

/**
 * Notification Broadcasting Service
 * Handles notification delivery and management
 */

class NotificationService {
  constructor() {
    this.io = null;
    this.deliveryStats = {
      sent: 0,
      delivered: 0,
      failed: 0
    };
  }

  /**
   * Initialize service with Socket.IO instance
   */
  initialize(io) {
    this.io = io;
    logger.info('NotificationService initialized');
  }

  /**
   * Broadcast notification to a specific channel
   */
  async broadcastToChannel(channel, event, data, options = {}) {
    try {
      if (!this.io) {
        throw new Error('NotificationService not initialized');
      }

      const broadcastData = {
        ...data,
        id: data.id || this.generateNotificationId(),
        timestamp: data.timestamp || new Date().toISOString(),
        source: options.source || 'system'
      };

      // Get subscriber count
      const subscriberCount = channelManager.getChannelSubscribers(channel).size;

      if (subscriberCount === 0) {
        logger.debug('No subscribers for channel', { channel, event });
        return {
          success: true,
          subscriberCount: 0,
          message: 'No subscribers'
        };
      }

      // Broadcast to channel
      this.io.to(channel).emit(event, broadcastData);

      // Update stats
      this.deliveryStats.sent++;
      this.deliveryStats.delivered += subscriberCount;

      logger.info('Notification broadcasted', {
        channel,
        event,
        notificationId: broadcastData.id,
        subscriberCount,
        dataSize: JSON.stringify(broadcastData).length
      });

      return {
        success: true,
        subscriberCount,
        notificationId: broadcastData.id,
        timestamp: broadcastData.timestamp
      };

    } catch (error) {
      this.deliveryStats.failed++;
      logger.errorWithStack('Broadcast to channel failed', error, {
        channel,
        event
      });

      throw error;
    }
  }

  /**
   * Broadcast notification to a user (all user's devices)
   */
  async broadcastToUser(userId, event, data, options = {}) {
    const channel = `private-user.${userId}`;
    
    logger.debug('Broadcasting to user', {
      userId,
      channel,
      event
    });

    return await this.broadcastToChannel(channel, event, data, options);
  }

  /**
   * Broadcast to multiple users
   */
  async broadcastToUsers(userIds, event, data, options = {}) {
    const results = [];

    for (const userId of userIds) {
      try {
        const result = await this.broadcastToUser(userId, event, data, options);
        results.push({
          userId,
          success: true,
          ...result
        });
      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error.message
        });
      }
    }

    const totalSubscribers = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.subscriberCount, 0);

    logger.info('Multi-user broadcast completed', {
      userCount: userIds.length,
      successCount: results.filter(r => r.success).length,
      totalSubscribers,
      event
    });

    return {
      success: true,
      results,
      totalSubscribers,
      userCount: userIds.length
    };
  }

  /**
   * Send notification with automatic channel detection
   */
  async sendNotification(notification) {
    try {
      const {
        userId,
        type,
        title,
        message,
        data = {},
        channels = ['database'],
        priority = 'normal'
      } = notification;

      // Prepare notification data
      const notificationData = {
        id: this.generateNotificationId(),
        type,
        title,
        message,
        data,
        priority,
        timestamp: new Date().toISOString(),
        read: false
      };

      // Broadcast to user's private channel
      if (channels.includes('database') || channels.includes('realtime')) {
        await this.broadcastToUser(userId, 'notification.sent', notificationData);
      }

      // Handle other channel types (email, sms, etc.) in the future
      // This would integrate with Laravel's notification system

      return {
        success: true,
        notificationId: notificationData.id,
        timestamp: notificationData.timestamp
      };

    } catch (error) {
      logger.errorWithStack('Send notification failed', error, {
        notification
      });

      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    try {
      // TODO: Update database record
      // For now, just broadcast the read status

      await this.broadcastToUser(userId, 'notification.read', {
        notificationId,
        readAt: new Date().toISOString(),
        readBy: userId
      });

      logger.info('Notification marked as read', {
        notificationId,
        userId
      });

      return { success: true };

    } catch (error) {
      logger.errorWithStack('Mark notification as read failed', error, {
        notificationId,
        userId
      });

      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, userId) {
    try {
      // TODO: Delete from database
      // For now, just broadcast the deletion

      await this.broadcastToUser(userId, 'notification.deleted', {
        notificationId,
        deletedAt: new Date().toISOString(),
        deletedBy: userId
      });

      logger.info('Notification deleted', {
        notificationId,
        userId
      });

      return { success: true };

    } catch (error) {
      logger.errorWithStack('Delete notification failed', error, {
        notificationId,
        userId
      });

      throw error;
    }
  }

  /**
   * Get unread notification count for user
   */
  async getUnreadCount(userId) {
    try {
      // TODO: Query database for unread count
      // For now, return mock data

      const unreadCount = 0; // This should come from database

      await this.broadcastToUser(userId, 'notification.unread_count', {
        userId,
        unreadCount,
        timestamp: new Date().toISOString()
      });

      return { unreadCount };

    } catch (error) {
      logger.errorWithStack('Get unread count failed', error, {
        userId
      });

      throw error;
    }
  }

  /**
   * Generate unique notification ID
   */
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get delivery statistics
   */
  getDeliveryStats() {
    return {
      ...this.deliveryStats,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  /**
   * Reset delivery statistics
   */
  resetDeliveryStats() {
    this.deliveryStats = {
      sent: 0,
      delivered: 0,
      failed: 0
    };

    logger.info('Delivery statistics reset');
  }

  /**
   * Health check for notification service
   */
  healthCheck() {
    return {
      status: this.io ? 'healthy' : 'unhealthy',
      initialized: !!this.io,
      stats: this.deliveryStats,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
module.exports = new NotificationService();
