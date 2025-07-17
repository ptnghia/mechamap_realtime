/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_only';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
process.env.MOCK_LARAVEL_API = 'true';

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test utilities
global.testUtils = {
  /**
   * Generate test JWT token
   */
  generateTestToken: (userId = 1, role = 'member') => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      {
        userId,
        role,
        permissions: ['read_notifications', 'receive_notifications'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
      },
      process.env.JWT_SECRET
    );
  },

  /**
   * Create test user data
   */
  createTestUser: (id = 1, role = 'member') => ({
    id,
    email: `user${id}@test.com`,
    name: `Test User ${id}`,
    role,
    permissions: ['read_notifications', 'receive_notifications']
  }),

  /**
   * Create test notification data
   */
  createTestNotification: (userId = 1, type = 'info') => ({
    id: `test_notif_${Date.now()}`,
    userId,
    type,
    title: 'Test Notification',
    message: 'This is a test notification',
    data: { test: true },
    timestamp: new Date().toISOString(),
    read: false
  }),

  /**
   * Wait for async operations
   */
  wait: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Create mock Socket.IO socket
   */
  createMockSocket: (userId = 1, role = 'member') => {
    const EventEmitter = require('events');
    const socket = new EventEmitter();
    
    socket.id = `socket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    socket.userId = userId;
    socket.userRole = role;
    socket.userEmail = `user${userId}@test.com`;
    socket.userName = `Test User ${userId}`;
    socket.userPermissions = ['read_notifications', 'receive_notifications'];
    socket.authToken = global.testUtils.generateTestToken(userId, role);
    socket.authTime = new Date();
    
    socket.rooms = new Set();
    socket.handshake = {
      auth: { token: socket.authToken },
      headers: { 'user-agent': 'test-client' },
      address: '127.0.0.1',
      time: Date.now()
    };
    
    socket.join = jest.fn((room) => {
      socket.rooms.add(room);
    });
    
    socket.leave = jest.fn((room) => {
      socket.rooms.delete(room);
    });
    
    socket.to = jest.fn(() => ({
      emit: jest.fn()
    }));
    
    socket.emit = jest.fn();
    
    return socket;
  },

  /**
   * Create mock Express request
   */
  createMockRequest: (body = {}, headers = {}, params = {}) => ({
    body,
    headers: {
      'content-type': 'application/json',
      ...headers
    },
    params,
    id: `req_${Date.now()}`,
    ip: '127.0.0.1',
    get: jest.fn((header) => headers[header.toLowerCase()]),
    ...body
  }),

  /**
   * Create mock Express response
   */
  createMockResponse: () => {
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
      send: jest.fn(() => res),
      setHeader: jest.fn(() => res),
      headersSent: false
    };
    return res;
  }
};

// Global test constants
global.testConstants = {
  TEST_USER_ID: 1,
  TEST_ADMIN_ID: 999,
  TEST_CHANNELS: {
    PUBLIC: 'public.announcements',
    PRIVATE_USER: 'private-user.1',
    ADMIN: 'admin.system',
    FORUM: 'forum.1'
  },
  TEST_EVENTS: {
    NOTIFICATION_SENT: 'notification.sent',
    NOTIFICATION_READ: 'notification.read',
    USER_TYPING: 'user_typing'
  }
};

// Setup and teardown hooks
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up any test artifacts
});

// Global error handler for unhandled promises in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = {};
