/**
 * Authentication Controller
 * Handles authentication requests
 */

const AuthService = require('../services/AuthService');
const { sendSuccess } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

class AuthController {
  /**
   * Register endpoint
   * POST /api/auth/register
   */
  static register = asyncHandler(async (req, res) => {
    const result = await AuthService.register(req.body);
    
    return sendSuccess(res, result, 'Registration successful', 201);
  });

  /**
   * Login endpoint
   * POST /api/auth/login
   */
  static login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    
    return sendSuccess(res, result, 'Login successful');
  });

  /**
   * Get current user
   * GET /api/auth/me
   */
  static getCurrentUser = asyncHandler(async (req, res) => {
    const user = await AuthService.getCurrentUser(req.user.id);
    
    return sendSuccess(res, user, 'User retrieved successfully');
  });

  /**
   * Update profile
   * PUT /api/auth/profile
   */
  static updateProfile = asyncHandler(async (req, res) => {
    const user = await AuthService.updateProfile(req.user.id, req.body);
    
    return sendSuccess(res, user, 'Profile updated successfully');
  });

  /**
   * Logout endpoint
   * POST /api/auth/logout
   */
  static logout = asyncHandler(async (req, res) => {
    // JWT is stateless, so logout is handled on client by removing token
    return sendSuccess(res, {}, 'Logout successful');
  });
}

module.exports = AuthController;
