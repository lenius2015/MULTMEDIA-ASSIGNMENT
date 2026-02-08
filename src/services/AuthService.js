/**
 * Authentication Service
 * Handles user authentication logic
 */

const User = require('../models/User');
const { generateTokenPair } = require('../utils/jwt');
const {
  validateEmail, validatePassword, validateRequired
} = require('../utils/validators');
const {
  ValidationError, UnauthorizedError, ConflictError
} = require('../exceptions/AppError');

class AuthService {
  /**
   * Register new user
   */
  static async register(data) {
    const { email, password, firstName, lastName, phone } = data;

    // Validate input
    validateRequired(data, ['email', 'password', 'firstName', 'lastName']);
    validateEmail(email);
    validatePassword(password);

    // Check if email exists
    if (await User.emailExists(email)) {
      throw new ConflictError('Email already registered');
    }

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone: phone || null
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokenPair(user.id, 'user');

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName,
        lastName
      },
      accessToken,
      refreshToken
    };
  }

  /**
   * Login user
   */
  static async login(email, password) {
    // Validate input
    validateRequired({ email, password }, ['email', 'password']);
    validateEmail(email);

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new UnauthorizedError('User account is inactive');
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokenPair(user.id, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      accessToken,
      refreshToken
    };
  }

  /**
   * Get current user
   */
  static async getCurrentUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role
    };
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId, data) {
    const updated = await User.update(userId, data);
    if (!updated) {
      throw new ValidationError('Failed to update profile');
    }

    return this.getCurrentUser(userId);
  }
}

module.exports = AuthService;
