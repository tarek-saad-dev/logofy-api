const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please include a Bearer token in the Authorization header.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify token type (must be access token)
    // If type is not set, it's an old token format - reject it for security
    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type. Access token required.'
      });
    }
    
    // Reject tokens without type (old format) - they need to refresh
    if (!decoded.type) {
      return res.status(401).json({
        success: false,
        message: 'Token format invalid. Please refresh your token.'
      });
    }
    
    // Get user from database
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Attach user to request object
    req.user = user;
    req.userId = user.id;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
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

