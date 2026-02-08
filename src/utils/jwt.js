/**
 * JWT Token Management
 * Handles token generation, verification, and refresh logic
 */

const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../exceptions/AppError');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

/**
 * Generate JWT token
 */
function generateToken(payload, expiresIn = JWT_EXPIRY) {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
  } catch (error) {
    throw new Error('Token generation failed: ' + error.message);
  }
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Token has expired');
    }
    throw new UnauthorizedError('Invalid token');
  }
}

/**
 * Decode token without verification
 */
function decodeToken(token) {
  return jwt.decode(token);
}

/**
 * Generate access and refresh tokens
 */
function generateTokenPair(userId, role = 'user', metadata = {}) {
  const payload = {
    userId,
    role,
    type: 'access',
    ...metadata
  };

  const accessToken = generateToken(payload, JWT_EXPIRY);
  const refreshToken = generateToken(
    { ...payload, type: 'refresh' },
    REFRESH_TOKEN_EXPIRY
  );

  return { accessToken, refreshToken };
}

/**
 * Refresh access token using refresh token
 */
function refreshAccessToken(refreshToken, userData) {
  try {
    const decoded = verifyToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      throw new UnauthorizedError('Invalid refresh token');
    }

    return generateToken({
      userId: decoded.userId,
      role: decoded.role,
      type: 'access'
    }, JWT_EXPIRY);
  } catch (error) {
    throw new UnauthorizedError('Token refresh failed');
  }
}

/**
 * Extract token from header
 */
function extractToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  generateTokenPair,
  refreshAccessToken,
  extractToken,
  JWT_SECRET,
  JWT_EXPIRY
};
