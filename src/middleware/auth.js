const jwt = require('jsonwebtoken');
const axios = require('axios');

const config = require('../config');
const logger = require('../utils/logger');

/**
 * JWT Authentication Middleware for Socket.IO
 * Validates JWT tokens and integrates with Laravel backend
 */

// Cache for validated tokens to reduce Laravel API calls
const tokenCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Validate Laravel Sanctum token
 */
async function validateSanctumToken(token) {
  try {
    // Laravel Sanctum tokens have format: {id}|{hash}
    if (!token.includes('|')) {
      throw new Error('Invalid Sanctum token format');
    }

    const [tokenId, tokenHash] = token.split('|', 2);

    if (!tokenId || !tokenHash) {
      throw new Error('Invalid Sanctum token structure');
    }

    logger.auth('Sanctum token parsed', {
      tokenId,
      hashLength: tokenHash.length
    });

    return { tokenId, tokenHash, type: 'sanctum' };
  } catch (error) {
    logger.auth('Sanctum token validation failed', {
      error: error.message,
      token: token.substring(0, 20) + '...'
    });
    throw error;
  }
}

/**
 * Validate JWT token
 */
async function validateJwtToken(token) {
  try {
    // Verify JWT signature
    const decoded = jwt.verify(token, config.jwt.secret, {
      algorithms: [config.jwt.algorithm]
    });

    // Check expiration
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    return decoded;
  } catch (error) {
    logger.auth('JWT validation failed', {
      error: error.message,
      token: token.substring(0, 20) + '...'
    });
    throw error;
  }
}

/**
 * Detect and validate token (Sanctum or JWT)
 */
async function validateToken(token) {
  try {
    // Check if it's a Laravel Sanctum token (contains |)
    if (token.includes('|')) {
      return await validateSanctumToken(token);
    } else {
      // Try JWT validation
      return await validateJwtToken(token);
    }
  } catch (error) {
    logger.auth('Token validation failed', {
      error: error.message,
      token: token.substring(0, 20) + '...'
    });
    throw error;
  }
}

/**
 * Validate user with Laravel backend
 */
async function validateUserWithLaravel(userId, token) {
  try {
    // Check cache first (use token hash for cache key)
    const cacheKey = `user_${userId || 'sanctum'}_${token.substring(0, 20)}`;
    const cached = tokenCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      logger.auth('User validation from cache', { userId: cached.user.id });
      return cached.user;
    }

    // Call Laravel API to validate user
    const axiosConfig = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 5000
    };

    // Ignore SSL certificate errors in development
    if (config.nodeEnv === 'development') {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      axiosConfig.httpsAgent = new (require('https').Agent)({
        rejectUnauthorized: false
      });
    }

    const response = await axios.get(`${config.laravel.apiUrl}/api/v1/auth/me`, axiosConfig);

    logger.auth('Laravel API response received', {
      status: response.status,
      dataKeys: Object.keys(response.data || {}),
      hasUser: !!(response.data && response.data.data && response.data.data.user),
      responseStructure: {
        success: response.data?.success,
        hasData: !!response.data?.data,
        hasUserInData: !!(response.data?.data?.user)
      }
    });

    if (response.status === 200 && response.data.success && response.data.data && response.data.data.user) {
      const user = response.data.data.user;

      // For JWT tokens, validate user ID matches
      if (userId && user.id !== userId) {
        throw new Error('User ID mismatch');
      }

      // Add default permissions for WebSocket
      user.permissions = user.permissions || ['receive_notifications'];

      // Cache the result
      tokenCache.set(cacheKey, {
        user,
        timestamp: Date.now()
      });

      // Clean up old cache entries
      if (tokenCache.size > 1000) {
        const oldEntries = Array.from(tokenCache.entries())
          .filter(([key, value]) => (Date.now() - value.timestamp) > CACHE_TTL);

        oldEntries.forEach(([key]) => tokenCache.delete(key));
      }

      logger.auth('User validated with Laravel', {
        userId: user.id,
        role: user.role,
        email: user.email,
        tokenType: token.includes('|') ? 'sanctum' : 'jwt'
      });

      return user;
    }

    throw new Error('Invalid user response from Laravel');

  } catch (error) {
    if (error.response) {
      logger.auth('Laravel API validation failed', {
        userId,
        status: error.response.status,
        message: error.response.data?.message || error.message,
        tokenType: token.includes('|') ? 'sanctum' : 'jwt'
      });
    } else {
      logger.auth('Laravel API request failed', {
        userId,
        error: error.message,
        tokenType: token.includes('|') ? 'sanctum' : 'jwt'
      });
    }

    throw error;
  }
}

/**
 * Mock user validation for development
 */
function mockUserValidation(userId) {
  logger.auth('Using mock user validation', { userId });

  return {
    id: userId,
    email: `user${userId}@mechamap.test`,
    role: 'member',
    name: `Test User ${userId}`,
    permissions: ['read_notifications', 'receive_notifications']
  };
}

/**
 * Socket.IO Authentication Middleware
 */
async function authMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      logger.auth('Authentication failed: No token provided', {
        socketId: socket.id,
        remoteAddress: socket.handshake.address
      });
      return next(new Error('Authentication failed: No token provided'));
    }

    // Validate token (Sanctum or JWT)
    const tokenData = await validateToken(token);
    let userId;

    if (tokenData.type === 'sanctum') {
      // For Sanctum tokens, we need to validate with Laravel to get user ID
      logger.auth('Sanctum token detected, validating with Laravel', {
        tokenId: tokenData.tokenId
      });

      // Call Laravel API to get user info
      const user = await validateUserWithLaravel(null, token);
      userId = user.id;

      // Attach user information to socket
      socket.userId = user.id;
      socket.userEmail = user.email;
      socket.userRole = user.role;
      socket.userName = user.name;
      socket.userPermissions = user.permissions || ['receive_notifications'];
      socket.authToken = token;
      socket.authTime = new Date();
      socket.tokenType = 'sanctum';

    } else {
      // JWT token
      userId = tokenData.userId || tokenData.sub || tokenData.user_id;

      if (!userId) {
        logger.auth('Authentication failed: No user ID in JWT token', {
          socketId: socket.id,
          decoded: { ...tokenData, iat: undefined, exp: undefined }
        });
        return next(new Error('Authentication failed: Invalid token payload'));
      }

      // Validate user with Laravel backend or use mock in development
      let user;

      if (config.development.mockLaravelApi && config.nodeEnv === 'development') {
        user = mockUserValidation(userId);
      } else {
        user = await validateUserWithLaravel(userId, token);
      }

      // Attach user information to socket
      socket.userId = user.id;
      socket.userEmail = user.email;
      socket.userRole = user.role;
      socket.userName = user.name;
      socket.userPermissions = user.permissions || ['receive_notifications'];
      socket.authToken = token;
      socket.authTime = new Date();
      socket.tokenType = 'jwt';
    }

    // Check if user has required permissions
    const requiredPermissions = ['receive_notifications'];
    const hasPermissions = requiredPermissions.every(permission =>
      socket.userPermissions.includes(permission)
    );

    if (!hasPermissions) {
      logger.auth('Authentication failed: Insufficient permissions', {
        userId: socket.userId,
        role: socket.userRole,
        permissions: socket.userPermissions,
        required: requiredPermissions
      });
      return next(new Error('Authentication failed: Insufficient permissions'));
    }

    logger.auth('Authentication successful', {
      userId: socket.userId,
      role: socket.userRole,
      email: socket.userEmail,
      socketId: socket.id,
      tokenType: socket.tokenType,
      permissions: socket.userPermissions
    });

    next();

  } catch (error) {
    logger.auth('Authentication error', {
      socketId: socket.id,
      error: error.message,
      remoteAddress: socket.handshake.address
    });

    next(new Error(`Authentication failed: ${error.message}`));
  }
}

/**
 * Express JWT Authentication Middleware
 */
function expressAuthMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.body.auth_token;

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      algorithms: [config.jwt.algorithm]
    });

    req.userId = decoded.userId || decoded.sub || decoded.user_id;
    req.userRole = decoded.role;
    req.authToken = token;

    next();

  } catch (error) {
    logger.auth('Express auth failed', {
      error: error.message,
      token: token.substring(0, 20) + '...'
    });

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
}

/**
 * Generate JWT token for testing
 */
function generateTestToken(userId, role = 'member') {
  if (config.nodeEnv !== 'development') {
    throw new Error('Test tokens can only be generated in development');
  }

  const payload = {
    userId,
    role,
    permissions: ['read_notifications', 'receive_notifications'],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
  };

  return jwt.sign(payload, config.jwt.secret, {
    algorithm: config.jwt.algorithm
  });
}

/**
 * Clear token cache
 */
function clearTokenCache() {
  tokenCache.clear();
  logger.auth('Token cache cleared');
}

module.exports = {
  authMiddleware,
  expressAuthMiddleware,
  generateTestToken,
  clearTokenCache,
  validateJwtToken,
  validateUserWithLaravel
};
