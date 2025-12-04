/**
 * Centralized Error Handler Utility
 * 
 * Provides standardized error responses across the entire backend.
 * All error responses follow this format:
 * {
 *   error_code: "SHORT_STABLE_STRING",
 *   message: "Human-readable English message",
 *   details: { ... } // Optional extra info
 * }
 */

/**
 * Error code constants - organized by module
 */
const ERROR_CODES = {
  // Authentication & Authorization
  AUTH: {
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    TOKEN_MISSING: 'TOKEN_MISSING',
    TOKEN_TYPE_INVALID: 'TOKEN_TYPE_INVALID',
    REFRESH_TOKEN_INVALID: 'REFRESH_TOKEN_INVALID',
    REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
    FORBIDDEN: 'FORBIDDEN',
    UNAUTHORIZED: 'UNAUTHORIZED',
    OTP_INVALID: 'OTP_INVALID',
    OTP_EXPIRED: 'OTP_EXPIRED',
    OTP_RATE_LIMIT: 'OTP_RATE_LIMIT',
    EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  },

  // User Management
  USER: {
    NOT_FOUND: 'USER_NOT_FOUND',
    ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
    EMAIL_ALREADY_IN_USE: 'EMAIL_ALREADY_IN_USE',
    INVALID_EMAIL: 'INVALID_EMAIL',
    INVALID_PASSWORD: 'INVALID_PASSWORD',
    PASSWORD_TOO_WEAK: 'PASSWORD_TOO_WEAK',
    PROFILE_UPDATE_FAILED: 'PROFILE_UPDATE_FAILED',
  },

  // Logo Management
  LOGO: {
    NOT_FOUND: 'LOGO_NOT_FOUND',
    CREATE_FAILED: 'LOGO_CREATE_FAILED',
    UPDATE_FAILED: 'LOGO_UPDATE_FAILED',
    DELETE_FAILED: 'LOGO_DELETE_FAILED',
    DUPLICATE_FAILED: 'LOGO_DUPLICATE_FAILED',
    OWNERSHIP_REQUIRED: 'LOGO_OWNERSHIP_REQUIRED',
  },

  // Export & Rendering
  EXPORT: {
    FAILED: 'EXPORT_FAILED',
    INVALID_FORMAT: 'EXPORT_INVALID_FORMAT',
    INVALID_DIMENSIONS: 'EXPORT_INVALID_DIMENSIONS',
    RENDER_FAILED: 'RENDER_FAILED',
    UPLOAD_FAILED: 'UPLOAD_FAILED',
  },

  // Assets (Icons, Shapes, Images)
  ASSET: {
    NOT_FOUND: 'ASSET_NOT_FOUND',
    INVALID_TYPE: 'ASSET_INVALID_TYPE',
    UPLOAD_FAILED: 'ASSET_UPLOAD_FAILED',
  },

  // Categories
  CATEGORY: {
    NOT_FOUND: 'CATEGORY_NOT_FOUND',
    ALREADY_EXISTS: 'CATEGORY_ALREADY_EXISTS',
    HAS_ASSIGNED_ITEMS: 'CATEGORY_HAS_ASSIGNED_ITEMS',
  },

  // Projects
  PROJECT: {
    NOT_FOUND: 'PROJECT_NOT_FOUND',
    CREATE_FAILED: 'PROJECT_CREATE_FAILED',
    UPDATE_FAILED: 'PROJECT_UPDATE_FAILED',
    DELETE_FAILED: 'PROJECT_DELETE_FAILED',
  },

  // Billing & Subscriptions
  BILLING: {
    PLAN_LIMIT_REACHED: 'PLAN_LIMIT_REACHED',
    SUBSCRIPTION_NOT_FOUND: 'SUBSCRIPTION_NOT_FOUND',
    SUBSCRIPTION_INACTIVE: 'SUBSCRIPTION_INACTIVE',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    CHECKOUT_FAILED: 'CHECKOUT_FAILED',
    INVALID_PLAN: 'INVALID_PLAN',
    STRIPE_ERROR: 'STRIPE_ERROR',
  },

  // Validation
  VALIDATION: {
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
    INVALID_INPUT: 'INVALID_INPUT',
    INVALID_FORMAT: 'INVALID_FORMAT',
    INVALID_VALUE: 'INVALID_VALUE',
    NO_UPDATES_PROVIDED: 'NO_UPDATES_PROVIDED',
  },

  // Business Rules
  BUSINESS: {
    INVALID_STATE: 'INVALID_STATE',
    OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
    RESOURCE_IN_USE: 'RESOURCE_IN_USE',
  },

  // General
  GENERAL: {
    NOT_FOUND: 'NOT_FOUND',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  },
};

/**
 * Send standardized error response
 * 
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} errorCode - Error code constant
 * @param {string} message - Human-readable message
 * @param {Object} details - Optional additional details
 */
function sendError(res, statusCode, errorCode, message, details = null) {
  const response = {
    error_code: errorCode,
    message: message,
  };

  if (details !== null && details !== undefined) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}

/**
 * Helper functions for common error scenarios
 */

// 400 - Bad Request / Validation Errors
function badRequest(res, errorCode, message, details = null) {
  return sendError(res, 400, errorCode, message, details);
}

// 401 - Unauthorized (ONLY for expired/invalid access token requiring refresh)
function unauthorized(res, errorCode = ERROR_CODES.AUTH.TOKEN_EXPIRED, message = 'Access token expired or invalid. Please refresh your token.', details = null) {
  return sendError(res, 401, errorCode, message, details);
}

// 403 - Forbidden (Not allowed / No permission)
function forbidden(res, errorCode = ERROR_CODES.AUTH.FORBIDDEN, message = 'You do not have permission to perform this action.', details = null) {
  return sendError(res, 403, errorCode, message, details);
}

// 404 - Not Found
function notFound(res, errorCode, message, details = null) {
  return sendError(res, 404, errorCode, message, details);
}

// 409 - Conflict (Duplicated resource, etc.)
function conflict(res, errorCode, message, details = null) {
  return sendError(res, 409, errorCode, message, details);
}

// 422 - Unprocessable Entity (Business rule errors)
function unprocessableEntity(res, errorCode, message, details = null) {
  return sendError(res, 422, errorCode, message, details);
}

// 429 - Too Many Requests
function tooManyRequests(res, errorCode = ERROR_CODES.GENERAL.RATE_LIMIT_EXCEEDED, message = 'Too many requests. Please try again later.', details = null) {
  return sendError(res, 429, errorCode, message, details);
}

// 500 - Internal Server Error
function internalError(res, errorCode = ERROR_CODES.GENERAL.INTERNAL_ERROR, message = 'An unexpected error occurred.', details = null) {
  return sendError(res, 500, errorCode, message, details);
}

/**
 * Express error handler middleware
 * Catches unhandled errors and formats them consistently
 */
function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);

  // If response already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle known error types
  if (err.name === 'ValidationError') {
    return badRequest(res, ERROR_CODES.VALIDATION.INVALID_INPUT, err.message);
  }

  if (err.name === 'JsonWebTokenError') {
    return unauthorized(res, ERROR_CODES.AUTH.TOKEN_INVALID, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return unauthorized(res, ERROR_CODES.AUTH.TOKEN_EXPIRED, 'Token expired');
  }

  // Default to 500
  const message = process.env.NODE_ENV === 'production' 
    ? 'An unexpected error occurred' 
    : err.message;

  return internalError(res, ERROR_CODES.GENERAL.INTERNAL_ERROR, message, 
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : null
  );
}

module.exports = {
  ERROR_CODES,
  sendError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessableEntity,
  tooManyRequests,
  internalError,
  errorHandler,
};




