const express = require('express');
const { StatusCodes } = require('http-status-codes');
const { body, validationResult } = require('express-validator');

const logger = require('../utils/logger');
const { expressAuthMiddleware } = require('../middleware/auth');
const channelManager = require('../websocket/channelManager');

const router = express.Router();

/**
 * Broadcast from Laravel (no auth required)
 * POST /api/laravel-broadcast
 */
router.post('/laravel-broadcast',
  // Input validation
  [
    body('channels')
      .isArray({ min: 1 })
      .withMessage('Channels must be a non-empty array'),

    body('event')
      .notEmpty()
      .withMessage('Event is required')
      .isString()
      .withMessage('Event must be a string'),

    body('data')
      .notEmpty()
      .withMessage('Data is required')
      .isObject()
      .withMessage('Data must be an object'),

    body('timestamp')
      .optional()
      .isISO8601()
      .withMessage('Timestamp must be a valid ISO 8601 date')
  ],

  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: errors.array()
        });
      }

      const { channels, event, data, timestamp } = req.body;
      const broadcastData = {
        ...data,
        timestamp: timestamp || new Date().toISOString(),
        source: 'laravel'
      };

      // Get Socket.IO instance from app
      const io = req.app.get('socketio');
      if (!io) {
        logger.error('Socket.IO instance not found');
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          error: 'Server Error',
          message: 'WebSocket server not available'
        });
      }

      let totalSubscribers = 0;
      const results = [];

      // Broadcast to each channel
      channels.forEach(channel => {
        const subscriberCount = channelManager.getChannelSubscribers(channel).size;
        totalSubscribers += subscriberCount;

        if (subscriberCount > 0) {
          io.to(channel).emit(event, broadcastData);
        }

        results.push({
          channel,
          subscriberCount
        });

        logger.api('Laravel broadcast sent', {
          channel,
          event,
          subscriberCount,
          dataSize: JSON.stringify(broadcastData).length
        });
      });

      res.json({
        success: true,
        message: 'Laravel broadcast sent successfully',
        event,
        channelCount: channels.length,
        totalSubscribers,
        results,
        timestamp: broadcastData.timestamp
      });

    } catch (error) {
      logger.errorWithStack('Laravel broadcast error', error, {
        body: req.body
      });

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'Laravel Broadcast Failed',
        message: 'Failed to process Laravel broadcast request'
      });
    }
  }
);

/**
 * Broadcast notification to WebSocket clients
 * POST /api/broadcast
 */
router.post('/broadcast',
  // Authentication middleware
  expressAuthMiddleware,

  // Input validation
  [
    body('channel')
      .notEmpty()
      .withMessage('Channel is required')
      .isString()
      .withMessage('Channel must be a string'),

    body('event')
      .notEmpty()
      .withMessage('Event is required')
      .isString()
      .withMessage('Event must be a string'),

    body('data')
      .notEmpty()
      .withMessage('Data is required')
      .isObject()
      .withMessage('Data must be an object'),

    body('timestamp')
      .optional()
      .isISO8601()
      .withMessage('Timestamp must be a valid ISO 8601 date')
  ],

  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: errors.array()
        });
      }

      const { channel, event, data, timestamp } = req.body;
      const broadcastData = {
        ...data,
        timestamp: timestamp || new Date().toISOString(),
        source: 'laravel'
      };

      // Get Socket.IO instance from app
      const io = req.app.get('socketio');
      if (!io) {
        logger.error('Socket.IO instance not found');
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          error: 'Server Error',
          message: 'WebSocket server not available'
        });
      }

      // Broadcast to channel
      const subscriberCount = channelManager.getChannelSubscribers(channel).size;

      if (subscriberCount > 0) {
        io.to(channel).emit(event, broadcastData);

        logger.api('Notification broadcasted', {
          channel,
          event,
          subscriberCount,
          dataSize: JSON.stringify(broadcastData).length,
          requestId: req.id
        });
      } else {
        logger.api('No subscribers for channel', {
          channel,
          event,
          requestId: req.id
        });
      }

      res.json({
        success: true,
        message: 'Broadcast sent successfully',
        channel,
        event,
        subscriberCount,
        timestamp: broadcastData.timestamp
      });

    } catch (error) {
      logger.errorWithStack('Broadcast error', error, {
        requestId: req.id,
        body: req.body
      });

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'Broadcast Failed',
        message: 'Failed to process broadcast request'
      });
    }
  }
);

/**
 * Broadcast to multiple channels
 * POST /api/broadcast/multi
 */
router.post('/broadcast/multi',
  expressAuthMiddleware,
  [
    body('broadcasts')
      .isArray({ min: 1 })
      .withMessage('Broadcasts must be a non-empty array'),

    body('broadcasts.*.channel')
      .notEmpty()
      .withMessage('Each broadcast must have a channel'),

    body('broadcasts.*.event')
      .notEmpty()
      .withMessage('Each broadcast must have an event'),

    body('broadcasts.*.data')
      .isObject()
      .withMessage('Each broadcast must have data object')
  ],

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: errors.array()
        });
      }

      const { broadcasts } = req.body;
      const io = req.app.get('socketio');

      if (!io) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          error: 'Server Error',
          message: 'WebSocket server not available'
        });
      }

      const results = [];
      const timestamp = new Date().toISOString();

      for (const broadcast of broadcasts) {
        const { channel, event, data } = broadcast;
        const broadcastData = {
          ...data,
          timestamp,
          source: 'laravel'
        };

        const subscriberCount = channelManager.getChannelSubscribers(channel).size;

        if (subscriberCount > 0) {
          io.to(channel).emit(event, broadcastData);
        }

        results.push({
          channel,
          event,
          subscriberCount,
          success: true
        });
      }

      logger.api('Multi-broadcast completed', {
        broadcastCount: broadcasts.length,
        totalSubscribers: results.reduce((sum, r) => sum + r.subscriberCount, 0),
        requestId: req.id
      });

      res.json({
        success: true,
        message: 'Multi-broadcast completed',
        results,
        timestamp
      });

    } catch (error) {
      logger.errorWithStack('Multi-broadcast error', error, {
        requestId: req.id
      });

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'Multi-broadcast Failed',
        message: 'Failed to process multi-broadcast request'
      });
    }
  }
);

/**
 * Broadcast to user (all user's devices)
 * POST /api/broadcast/user/:userId
 */
router.post('/broadcast/user/:userId',
  expressAuthMiddleware,
  [
    body('event')
      .notEmpty()
      .withMessage('Event is required'),

    body('data')
      .isObject()
      .withMessage('Data must be an object')
  ],

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Validation Error',
          details: errors.array()
        });
      }

      const { userId } = req.params;
      const { event, data } = req.body;
      const io = req.app.get('socketio');

      if (!io) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          error: 'Server Error',
          message: 'WebSocket server not available'
        });
      }

      const channel = `private-user.${userId}`;
      const broadcastData = {
        ...data,
        timestamp: new Date().toISOString(),
        source: 'laravel'
      };

      const subscriberCount = channelManager.getChannelSubscribers(channel).size;

      if (subscriberCount > 0) {
        io.to(channel).emit(event, broadcastData);
      }

      logger.api('User broadcast sent', {
        userId,
        event,
        subscriberCount,
        requestId: req.id
      });

      res.json({
        success: true,
        message: 'User broadcast sent successfully',
        userId,
        event,
        subscriberCount,
        timestamp: broadcastData.timestamp
      });

    } catch (error) {
      logger.errorWithStack('User broadcast error', error, {
        requestId: req.id,
        userId: req.params.userId
      });

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'User Broadcast Failed',
        message: 'Failed to send user broadcast'
      });
    }
  }
);

/**
 * Get channel information
 * GET /api/channels/:channel
 */
router.get('/channels/:channel',
  expressAuthMiddleware,

  async (req, res) => {
    try {
      const { channel } = req.params;
      const subscribers = channelManager.getChannelSubscribers(channel);

      res.json({
        channel,
        subscriberCount: subscribers.size,
        subscribers: Array.from(subscribers),
        metadata: channelManager.channelMetadata.get(channel) || null
      });

    } catch (error) {
      logger.errorWithStack('Channel info error', error, {
        requestId: req.id,
        channel: req.params.channel
      });

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'Channel Info Failed',
        message: 'Failed to get channel information'
      });
    }
  }
);

/**
 * Get channel statistics
 * GET /api/channels/stats
 */
router.get('/channels/stats',
  expressAuthMiddleware,

  async (req, res) => {
    try {
      const stats = channelManager.getChannelStats();

      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.errorWithStack('Channel stats error', error, {
        requestId: req.id
      });

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'Channel Stats Failed',
        message: 'Failed to get channel statistics'
      });
    }
  }
);

module.exports = router;
