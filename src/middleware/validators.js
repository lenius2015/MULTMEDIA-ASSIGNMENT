/**
 * Validation Middleware
 * Validates request data before processing
 */

const { validateRequired, sanitizeObject } = require('../utils/validators');
const { ValidationError } = require('../exceptions/AppError');

/**
 * Validate request body
 */
const validateBody = (requiredFields) => {
  return (req, res, next) => {
    try {
      // Sanitize input
      req.body = sanitizeObject(req.body);

      // Validate required fields
      validateRequired(req.body, requiredFields);

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate query parameters
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const errors = {};

      Object.entries(schema).forEach(([key, rule]) => {
        const value = req.query[key];

        if (rule.required && !value) {
          errors[key] = `${key} is required`;
          return;
        }

        if (value && rule.type) {
          if (rule.type === 'number' && isNaN(value)) {
            errors[key] = `${key} must be a number`;
          }
          if (rule.type === 'integer' && !Number.isInteger(Number(value))) {
            errors[key] = `${key} must be an integer`;
          }
        }
      });

      if (Object.keys(errors).length > 0) {
        throw new ValidationError('Query validation failed', errors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (page < 1) {
      throw new ValidationError('Page must be greater than 0');
    }

    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    req.pagination = {
      page,
      limit,
      offset: (page - 1) * limit
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateBody,
  validateQuery,
  validatePagination
};
