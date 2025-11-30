const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { unauthorized, notFound, internalError, ERROR_CODES } = require('../utils/errorHandler');

/**
 * Middleware to verify JWT token and attach user to request
 * 
 * IMPORTANT: This middleware returns 401 ONLY when the access token is expired/invalid
 * and requires using the refresh token. This is the ONLY place 401 should be returned.
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, ERROR_CODES.AUTH.TOKEN_MISSING, 
        'No token provided. Please include a Bearer token in the Authorization header.');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return internalError(res, ERROR_CODES.GENERAL.INTERNAL_ERROR, 
        'Server configuration error');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify token type (must be access token)
    // If type is not set, it's an old token format - reject it for security
    if (decoded.type && decoded.type !== 'access') {
      return unauthorized(res, ERROR_CODES.AUTH.TOKEN_TYPE_INVALID, 
        'Invalid token type. Access token required.');
    }
    
    // Reject tokens without type (old format) - they need to refresh
    if (!decoded.type) {
      return unauthorized(res, ERROR_CODES.AUTH.TOKEN_INVALID, 
        'Token format invalid. Please refresh your token.');
    }
    
    // Get user from database
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return notFound(res, ERROR_CODES.USER.NOT_FOUND, 'User not found');
    }

    // Attach user to request object
    req.user = user;
    req.userId = user.id;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return unauthorized(res, ERROR_CODES.AUTH.TOKEN_INVALID, 'Invalid token');
    }
    
    if (error.name === 'TokenExpiredError') {
      return unauthorized(res, ERROR_CODES.AUTH.TOKEN_EXPIRED, 
        'Access token expired. Please refresh your token.');
    }

    console.error('Auth middleware error:', error);
    return internalError(res, ERROR_CODES.GENERAL.INTERNAL_ERROR, 
      'Authentication error');
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (process.env.JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.userId);
          
          if (user) {
            req.user = user;
            req.userId = user.id;
          }
        } catch (error) {
          // Token invalid, but continue without user
        }
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth
};

