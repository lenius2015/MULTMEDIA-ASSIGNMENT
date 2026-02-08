/**
 * Standard Response Handler
 * Ensures consistent API response format across all endpoints
 */

/**
 * Send success response
 */
function sendSuccess(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Send paginated response
 */
function sendPaginated(res, data, pagination, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: Math.ceil(pagination.total / pagination.limit),
      hasNextPage: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrevPage: pagination.page > 1
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * Send error response
 */
function sendError(res, error, statusCode = 500) {
  const isAppError = error.statusCode && error.code;
  
  return res.status(isAppError ? error.statusCode : statusCode).json({
    success: false,
    message: error.message,
    code: isAppError ? error.code : 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    timestamp: new Date().toISOString()
  });
}

/**
 * Send validation error response
 */
function sendValidationError(res, errors, message = 'Validation failed') {
  return res.status(400).json({
    success: false,
    message,
    code: 'VALIDATION_ERROR',
    errors,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  sendSuccess,
  sendPaginated,
  sendError,
  sendValidationError
};
