const jwt = require('jsonwebtoken');
const { 
  authMiddleware, 
  expressAuthMiddleware, 
  generateTestToken,
  validateJwtToken 
} = require('../../../src/middleware/auth');

describe('Authentication Middleware', () => {
  describe('validateJwtToken', () => {
    it('should validate a valid JWT token', async () => {
      const token = global.testUtils.generateTestToken(1, 'member');
      const decoded = await validateJwtToken(token);
      
      expect(decoded).toHaveProperty('userId', 1);
      expect(decoded).toHaveProperty('role', 'member');
      expect(decoded).toHaveProperty('permissions');
    });

    it('should reject an invalid JWT token', async () => {
      const invalidToken = 'invalid.jwt.token';
      
      await expect(validateJwtToken(invalidToken)).rejects.toThrow();
    });

    it('should reject an expired JWT token', async () => {
      const expiredToken = jwt.sign(
        {
          userId: 1,
          role: 'member',
          exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
        },
        process.env.JWT_SECRET
      );
      
      await expect(validateJwtToken(expiredToken)).rejects.toThrow('Token expired');
    });
  });

  describe('authMiddleware (Socket.IO)', () => {
    it('should authenticate valid socket connection', async () => {
      const socket = global.testUtils.createMockSocket(1, 'member');
      const next = jest.fn();
      
      await authMiddleware(socket, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(socket.userId).toBe(1);
      expect(socket.userRole).toBe('member');
    });

    it('should reject socket connection without token', async () => {
      const socket = global.testUtils.createMockSocket();
      socket.handshake.auth.token = null;
      const next = jest.fn();
      
      await authMiddleware(socket, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toContain('No token provided');
    });

    it('should reject socket connection with invalid token', async () => {
      const socket = global.testUtils.createMockSocket();
      socket.handshake.auth.token = 'invalid.token';
      const next = jest.fn();
      
      await authMiddleware(socket, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toContain('Authentication failed');
    });

    it('should reject socket connection with insufficient permissions', async () => {
      const token = jwt.sign(
        {
          userId: 1,
          role: 'guest',
          permissions: [], // No permissions
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        process.env.JWT_SECRET
      );
      
      const socket = global.testUtils.createMockSocket();
      socket.handshake.auth.token = token;
      const next = jest.fn();
      
      await authMiddleware(socket, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toContain('Insufficient permissions');
    });
  });

  describe('expressAuthMiddleware', () => {
    it('should authenticate valid Express request', () => {
      const token = global.testUtils.generateTestToken(1, 'admin');
      const req = global.testUtils.createMockRequest({}, {
        authorization: `Bearer ${token}`
      });
      const res = global.testUtils.createMockResponse();
      const next = jest.fn();
      
      expressAuthMiddleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(req.userId).toBe(1);
      expect(req.userRole).toBe('admin');
    });

    it('should reject Express request without token', () => {
      const req = global.testUtils.createMockRequest();
      const res = global.testUtils.createMockResponse();
      const next = jest.fn();
      
      expressAuthMiddleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'No token provided'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject Express request with invalid token', () => {
      const req = global.testUtils.createMockRequest({}, {
        authorization: 'Bearer invalid.token'
      });
      const res = global.testUtils.createMockResponse();
      const next = jest.fn();
      
      expressAuthMiddleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept token from request body', () => {
      const token = global.testUtils.generateTestToken(2, 'moderator');
      const req = global.testUtils.createMockRequest({
        auth_token: token
      });
      const res = global.testUtils.createMockResponse();
      const next = jest.fn();
      
      expressAuthMiddleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(req.userId).toBe(2);
      expect(req.userRole).toBe('moderator');
    });
  });

  describe('generateTestToken', () => {
    it('should generate valid test token in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const token = generateTestToken(5, 'admin');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      expect(decoded.userId).toBe(5);
      expect(decoded.role).toBe('admin');
      expect(decoded.permissions).toContain('read_notifications');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should throw error in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      expect(() => {
        generateTestToken(1, 'member');
      }).toThrow('Test tokens can only be generated in development');
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});
