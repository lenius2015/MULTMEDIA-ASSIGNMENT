// Admin Authentication Routes
// Completely separate from user authentication

const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuth.controller');
const { requireAdminAuth, validateAdminSession } = require('../middleware/adminAuth');

// Admin login page
router.get('/login', adminAuthController.getAdminLogin);

// Admin login API
router.post('/login', adminAuthController.postAdminLogin);

// Admin logout API
router.post('/logout', requireAdminAuth, adminAuthController.postAdminLogout);

// Admin status check
router.get('/status', adminAuthController.getAdminStatus);

// Apply session validation to all admin routes
router.use(validateAdminSession);

module.exports = router;