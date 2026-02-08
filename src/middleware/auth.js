/**
 * Authentication Middleware
 * Verifies JWT tokens and protects routes
 */

const { extractToken, verifyToken } = require('../utils/jwt');
const { UnauthorizedError } = require('../exceptions/AppError');

/**
 * Verify JWT token middleware
 */
const authMiddleware = (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const decoded = verifyToken(token);
    req.user = {
      id: decoded.userId,
      role: decoded.role,
      ...decoded
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Verify role middleware
 */
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new UnauthorizedError('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Admin-only middleware
 */
const isAdmin = roleMiddleware(['admin']);

/**
 * Vendor-only middleware
 */
const isVendor = roleMiddleware(['vendor', 'admin']);

/**
 * Optional auth middleware (doesn't fail if no token)
 */
const optionalAuth = (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (token) {
      const decoded = verifyToken(token);
      req.user = {
        id: decoded.userId,
        role: decoded.role,
        ...decoded
      };
    }
  } catch (error) {
    // Ignore auth errors for optional middleware
  }
  
  next();
};

module.exports = {
  authMiddleware,
  roleMiddleware,
  isAdmin,
  isVendor,
  optionalAuth,
  // compatibility aliases used across the codebase
  authenticate: authMiddleware,
  authorize: roleMiddleware
};
