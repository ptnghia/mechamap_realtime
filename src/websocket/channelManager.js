const logger = require('../utils/logger');
const config = require('../config');

/**
 * Channel Management System
 * Handles channel subscriptions, authorization, and access control
 */

class ChannelManager {
  constructor() {
    this.channels = new Map(); // channel -> Set of socket IDs
    this.userChannels = new Map(); // userId -> Set of channels
    this.channelMetadata = new Map(); // channel -> metadata
  }

  /**
   * Channel naming conventions and patterns
   */
  static CHANNEL_PATTERNS = {
    // Public channels - accessible to all authenticated users
    PUBLIC: /^public\.(.+)$/,
    
    // Private user channels - only accessible to the specific user
    PRIVATE_USER: /^private-user\.(\d+)$/,
    
    // Thread presence channels - accessible to users who can view the thread
    PRESENCE_THREAD: /^presence-thread\.(\d+)$/,
    
    // Forum channels - accessible based on forum permissions
    FORUM: /^forum\.(\d+)$/,
    
    // Admin channels - only accessible to admin users
    ADMIN: /^admin\.(.+)$/,
    
    // Moderator channels - accessible to moderators and admins
    MODERATOR: /^moderator\.(.+)$/
  };

  /**
   * Role hierarchy for permission checking
   */
  static ROLE_HIERARCHY = {
    'guest': 1,
    'member': 2,
    'senior_member': 3,
    'verified_partner': 4,
    'manufacturer': 4,
    'supplier': 4,
    'brand': 4,
    'moderator': 5,
    'admin': 6,
    'super_admin': 7
  };

  /**
   * Authorize channel access for a socket
   */
  async authorize(socket, channel) {
    try {
      const userId = socket.userId;
      const userRole = socket.userRole;
      const userPermissions = socket.userPermissions || [];
      
      logger.debug('Channel authorization request', {
        userId,
        userRole,
        channel,
        socketId: socket.id
      });

      // Check channel pattern and apply appropriate authorization
      
      // Public channels - always allowed for authenticated users
      if (ChannelManager.CHANNEL_PATTERNS.PUBLIC.test(channel)) {
        return this.authorizePublicChannel(socket, channel);
      }
      
      // Private user channels
      if (ChannelManager.CHANNEL_PATTERNS.PRIVATE_USER.test(channel)) {
        return this.authorizePrivateUserChannel(socket, channel);
      }
      
      // Thread presence channels
      if (ChannelManager.CHANNEL_PATTERNS.PRESENCE_THREAD.test(channel)) {
        return await this.authorizeThreadPresenceChannel(socket, channel);
      }
      
      // Forum channels
      if (ChannelManager.CHANNEL_PATTERNS.FORUM.test(channel)) {
        return await this.authorizeForumChannel(socket, channel);
      }
      
      // Admin channels
      if (ChannelManager.CHANNEL_PATTERNS.ADMIN.test(channel)) {
        return this.authorizeAdminChannel(socket, channel);
      }
      
      // Moderator channels
      if (ChannelManager.CHANNEL_PATTERNS.MODERATOR.test(channel)) {
        return this.authorizeModeratorChannel(socket, channel);
      }
      
      // Unknown channel pattern - deny by default
      logger.security('Unknown channel pattern', {
        userId,
        channel,
        socketId: socket.id
      });
      
      return false;
      
    } catch (error) {
      logger.errorWithStack('Channel authorization error', error, {
        userId: socket.userId,
        channel,
        socketId: socket.id
      });
      
      return false;
    }
  }

  /**
   * Authorize public channel access
   */
  authorizePublicChannel(socket, channel) {
    // All authenticated users can access public channels
    logger.debug('Public channel authorized', {
      userId: socket.userId,
      channel
    });
    
    return true;
  }

  /**
   * Authorize private user channel access
   */
  authorizePrivateUserChannel(socket, channel) {
    const match = channel.match(ChannelManager.CHANNEL_PATTERNS.PRIVATE_USER);
    if (!match) return false;
    
    const targetUserId = parseInt(match[1]);
    const authorized = socket.userId === targetUserId;
    
    if (!authorized) {
      logger.security('Private user channel access denied', {
        userId: socket.userId,
        targetUserId,
        channel
      });
    }
    
    return authorized;
  }

  /**
   * Authorize thread presence channel access
   */
  async authorizeThreadPresenceChannel(socket, channel) {
    const match = channel.match(ChannelManager.CHANNEL_PATTERNS.PRESENCE_THREAD);
    if (!match) return false;
    
    const threadId = parseInt(match[1]);
    
    // TODO: Implement thread access checking with database
    // For now, allow access for all authenticated users
    // In production, this should check:
    // 1. Thread exists
    // 2. User has permission to view the thread
    // 3. Thread's forum is accessible to user's role
    
    logger.debug('Thread presence channel authorized (mock)', {
      userId: socket.userId,
      threadId,
      channel
    });
    
    return true;
  }

  /**
   * Authorize forum channel access
   */
  async authorizeForumChannel(socket, channel) {
    const match = channel.match(ChannelManager.CHANNEL_PATTERNS.FORUM);
    if (!match) return false;
    
    const forumId = parseInt(match[1]);
    
    // TODO: Implement forum access checking with database
    // For now, allow access based on role hierarchy
    const userLevel = ChannelManager.ROLE_HIERARCHY[socket.userRole] || 0;
    const authorized = userLevel >= ChannelManager.ROLE_HIERARCHY['member'];
    
    if (!authorized) {
      logger.security('Forum channel access denied', {
        userId: socket.userId,
        userRole: socket.userRole,
        forumId,
        channel
      });
    }
    
    return authorized;
  }

  /**
   * Authorize admin channel access
   */
  authorizeAdminChannel(socket, channel) {
    const userLevel = ChannelManager.ROLE_HIERARCHY[socket.userRole] || 0;
    const authorized = userLevel >= ChannelManager.ROLE_HIERARCHY['admin'];
    
    if (!authorized) {
      logger.security('Admin channel access denied', {
        userId: socket.userId,
        userRole: socket.userRole,
        channel
      });
    }
    
    return authorized;
  }

  /**
   * Authorize moderator channel access
   */
  authorizeModeratorChannel(socket, channel) {
    const userLevel = ChannelManager.ROLE_HIERARCHY[socket.userRole] || 0;
    const authorized = userLevel >= ChannelManager.ROLE_HIERARCHY['moderator'];
    
    if (!authorized) {
      logger.security('Moderator channel access denied', {
        userId: socket.userId,
        userRole: socket.userRole,
        channel
      });
    }
    
    return authorized;
  }

  /**
   * Subscribe socket to channel
   */
  subscribe(socket, channel) {
    const socketId = socket.id;
    const userId = socket.userId;
    
    // Add to channel subscribers
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel).add(socketId);
    
    // Track user's channels
    if (!this.userChannels.has(userId)) {
      this.userChannels.set(userId, new Set());
    }
    this.userChannels.get(userId).add(channel);
    
    // Update channel metadata
    this.updateChannelMetadata(channel);
    
    logger.debug('Socket subscribed to channel', {
      userId,
      socketId,
      channel,
      subscriberCount: this.channels.get(channel).size
    });
  }

  /**
   * Unsubscribe socket from channel
   */
  unsubscribe(socket, channel) {
    const socketId = socket.id;
    const userId = socket.userId;
    
    // Remove from channel subscribers
    if (this.channels.has(channel)) {
      this.channels.get(channel).delete(socketId);
      
      // Clean up empty channels
      if (this.channels.get(channel).size === 0) {
        this.channels.delete(channel);
        this.channelMetadata.delete(channel);
      } else {
        this.updateChannelMetadata(channel);
      }
    }
    
    // Remove from user's channels
    if (this.userChannels.has(userId)) {
      this.userChannels.get(userId).delete(channel);
      
      // Clean up empty user channel sets
      if (this.userChannels.get(userId).size === 0) {
        this.userChannels.delete(userId);
      }
    }
    
    logger.debug('Socket unsubscribed from channel', {
      userId,
      socketId,
      channel,
      subscriberCount: this.channels.has(channel) ? this.channels.get(channel).size : 0
    });
  }

  /**
   * Unsubscribe socket from all channels
   */
  unsubscribeAll(socket) {
    const userId = socket.userId;
    const userChannels = this.userChannels.get(userId);
    
    if (userChannels) {
      userChannels.forEach(channel => {
        this.unsubscribe(socket, channel);
      });
    }
    
    logger.debug('Socket unsubscribed from all channels', {
      userId,
      socketId: socket.id
    });
  }

  /**
   * Get channel subscribers
   */
  getChannelSubscribers(channel) {
    return this.channels.get(channel) || new Set();
  }

  /**
   * Get user's subscribed channels
   */
  getUserChannels(userId) {
    return this.userChannels.get(userId) || new Set();
  }

  /**
   * Update channel metadata
   */
  updateChannelMetadata(channel) {
    const subscribers = this.channels.get(channel);
    if (!subscribers) return;
    
    this.channelMetadata.set(channel, {
      subscriberCount: subscribers.size,
      lastActivity: new Date(),
      createdAt: this.channelMetadata.get(channel)?.createdAt || new Date()
    });
  }

  /**
   * Get channel statistics
   */
  getChannelStats() {
    const stats = {
      totalChannels: this.channels.size,
      totalSubscriptions: 0,
      channelsByType: {},
      topChannels: []
    };
    
    // Count subscriptions and categorize channels
    for (const [channel, subscribers] of this.channels.entries()) {
      stats.totalSubscriptions += subscribers.size;
      
      // Categorize by channel type
      let type = 'unknown';
      for (const [patternName, pattern] of Object.entries(ChannelManager.CHANNEL_PATTERNS)) {
        if (pattern.test(channel)) {
          type = patternName.toLowerCase();
          break;
        }
      }
      
      stats.channelsByType[type] = (stats.channelsByType[type] || 0) + 1;
      
      // Track top channels
      stats.topChannels.push({
        channel,
        subscribers: subscribers.size,
        type
      });
    }
    
    // Sort top channels by subscriber count
    stats.topChannels.sort((a, b) => b.subscribers - a.subscribers);
    stats.topChannels = stats.topChannels.slice(0, 10);
    
    return stats;
  }
}

module.exports = new ChannelManager();
