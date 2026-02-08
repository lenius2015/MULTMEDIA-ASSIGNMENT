/**
 * Authentication Routes
 * API endpoints for user authentication
 */

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { authMiddleware } = require('../middleware/auth');
const { validateBody } = require('../middleware/validators');

/**
 * POST /api/auth/register
 * Register new user
 */
router.post('/register', validateBody(['email', 'password', 'firstName', 'lastName']), AuthController.register);

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login', validateBody(['email', 'password']), AuthController.login);

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authMiddleware, AuthController.getCurrentUser);

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authMiddleware, AuthController.updateProfile);

/**
 * POST /api/auth/logout
 * User logout
 */
router.post('/logout', authMiddleware, AuthController.logout);

module.exports = router;
