/**
 * Error Handler Middleware
 * Centralizes error handling for all routes
 */

const { sendError } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Main error handler middleware
 * Should be registered last in middleware chain
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error(err.message, {
    statusCode: err.statusCode || 500,
    code: err.code || 'INTERNAL_ERROR',
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  // Set default status code
  const statusCode = err.statusCode || 500;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: err.errors || {}
    });
  }

  if (err.name === 'SyntaxError' && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request body',
      code: 'INVALID_REQUEST'
    });
  }

  // Send error response
  return sendError(res, err, statusCode);
};

/**
 * 404 Not Found middleware
 */
const notFoundHandler = (req, res) => {
  return res.status(404).json({
    success: false,
    message: `Cannot find ${req.method} ${req.path}`,
    code: 'NOT_FOUND'
  });
};

/**
 * Async route wrapper to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
