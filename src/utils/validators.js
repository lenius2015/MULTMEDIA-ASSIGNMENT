/**
 * Validation Utility Functions
 * Handles all input validation with consistent error messages
 */

const { ValidationError } = require('../exceptions/AppError');

const validators = {
  // Email validation
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Phone validation (East African format)
  isValidPhone: (phone) => {
    const phoneRegex = /^(\+?254|0)[17][0-9]{8}$/;
    return phoneRegex.test(phone);
  },

  // Password validation (min 8 chars, 1 uppercase, 1 number)
  isValidPassword: (password) => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/;
    return passwordRegex.test(password);
  },

  // UUID validation
  isValidUUID: (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },

  // Numeric ID validation
  isValidId: (id) => {
    return Number.isInteger(Number(id)) && Number(id) > 0;
  },

  // URL validation
  isValidUrl: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  // Currency validation (0-999999.99)
  isValidPrice: (price) => {
    const num = parseFloat(price);
    return !isNaN(num) && num >= 0 && num <= 999999.99;
  },

  // Positive integer validation
  isPositiveInteger: (value) => {
    return Number.isInteger(Number(value)) && Number(value) > 0;
  },

  // String length validation
  isValidLength: (str, min = 1, max = 255) => {
    if (typeof str !== 'string') return false;
    return str.length >= min && str.length <= max;
  },

  // Required field check
  isRequired: (value) => {
    if (typeof value === 'string') return value.trim().length > 0;
    return value !== null && value !== undefined;
  },

  // Array validation
  isValidArray: (arr, minLength = 0) => {
    return Array.isArray(arr) && arr.length >= minLength;
  },

  // Enum validation
  isValidEnum: (value, enumValues) => {
    return enumValues.includes(value);
  }
};

/**
 * Validates required fields
 * @throws {ValidationError}
 */
function validateRequired(data, fields) {
  const errors = {};
  
  fields.forEach(field => {
    if (!validators.isRequired(data[field])) {
      errors[field] = `${field} is required`;
    }
  });

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }
}

/**
 * Validates email format
 * @throws {ValidationError}
 */
function validateEmail(email) {
  if (!validators.isValidEmail(email)) {
    throw new ValidationError('Invalid email format', { email: 'Email must be valid' });
  }
}

/**
 * Validates password strength
 * @throws {ValidationError}
 */
function validatePassword(password) {
  if (!validators.isValidPassword(password)) {
    throw new ValidationError('Password is too weak', {
      password: 'Password must be at least 8 characters with 1 uppercase letter and 1 number'
    });
  }
}

/**
 * Validates phone number
 * @throws {ValidationError}
 */
function validatePhone(phone) {
  if (!validators.isValidPhone(phone)) {
    throw new ValidationError('Invalid phone number', {
      phone: 'Phone must be in format +254XXX... or 0XXX...'
    });
  }
}

/**
 * Sanitizes user input
 */
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
}

/**
 * Sanitizes object inputs
 */
function sanitizeObject(obj) {
  const sanitized = {};
  
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'string') {
      sanitized[key] = sanitizeInput(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  });

  return sanitized;
}

module.exports = {
  validators,
  validateRequired,
  validateEmail,
  validatePassword,
  validatePhone,
  sanitizeInput,
  sanitizeObject
};
