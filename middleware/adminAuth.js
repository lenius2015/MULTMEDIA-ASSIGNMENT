// Admin Authentication Middleware
// Completely separate from user authentication

const pool = require('../db');

// Session configuration
const SESSION_CONFIG = {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true
};

// Check if admin is authenticated
const requireAdminAuth = (req, res, next) => {
  // Check if admin session exists
  if (!req.session || !req.session.adminId) {
    // Save the original URL to redirect back after login
    if (req.session) {
      req.session.returnTo = req.originalUrl || req.url;
    }
    
    // For API requests, return JSON error
    if (req.path.startsWith('/api') || req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized: Admin authentication required',
        redirect: '/admin/login'
      });
    }
    
    // For regular requests, redirect to login
    return res.redirect('/admin/login');
  }

  next();
};

// Optional admin auth (doesn't block if not authenticated)
const optionalAdminAuth = (req, res, next) => {
  // Just pass through, but admin info will be available if logged in
  next();
};

// Check if admin session is valid and admin still exists/active
const validateAdminSession = async (req, res, next) => {
  if (!req.session || !req.session.adminId) {
    return next();
  }
  
  try {
    const [admins] = await pool.query(
      'SELECT id, status FROM admins WHERE id = ?',
      [req.session.adminId]
    );

    if (admins.length === 0) {
      // Admin no longer exists, destroy session
      return req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
          return res.status(401).json({ success: false, message: 'Session invalid: Admin not found' });
        }
        return res.redirect('/admin/login');
      });
    }

    if (admins[0].status !== 'active') {
      // Admin is disabled, destroy session
      return req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
          return res.status(401).json({ success: false, message: 'Session invalid: Admin account disabled' });
        }
        return res.redirect('/admin/login');
      });
    }
    
    // Session is valid, update last activity
    req.session.lastActivity = Date.now();
    
  } catch (error) {
    console.error('Admin session validation error:', error);
    // On database error, log but don't block - let the route handler deal with auth
    // This prevents cascading failures
  }

  next();
};

// Middleware to add admin data to res.locals for templates
const addAdminData = async (req, res, next) => {
   if (req.session && req.session.adminId) {
      res.locals.admin = {
         id: req.session.adminId,
         name: req.session.adminName,
         email: req.session.adminEmail,
         profile_picture: req.session.adminProfilePicture,
         role: req.session.adminRole,
         isSuperAdmin: req.session.adminIsSuperAdmin,
         permissions: req.session.adminPermissions || []
      };
   } else {
      res.locals.admin = null;
   }
   next();
};

module.exports = {
  requireAdminAuth,
  optionalAdminAuth,
  validateAdminSession,
  addAdminData
};