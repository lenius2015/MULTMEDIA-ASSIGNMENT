// Admin Authentication Middleware
// Completely separate from user authentication

const pool = require('../db');

// Check if admin is authenticated
const requireAdminAuth = (req, res, next) => {
  // Check if admin session exists (just need adminId, role can be anything)
  if (req.session && req.session.adminId) {
    return next();
  }

  // Save the original URL to redirect back after login
  req.session.returnTo = req.originalUrl;
  
  // Redirect to admin login if not authenticated
  return res.redirect('/admin/login');
};

// Optional admin auth (doesn't block if not authenticated)
const optionalAdminAuth = (req, res, next) => {
  // Just pass through, but admin info will be available if logged in
  next();
};

// Check if admin session is valid and admin still exists/active
const validateAdminSession = async (req, res, next) => {
  if (req.session && req.session.adminId) {
    try {
      const [admins] = await pool.query(
        'SELECT id, status FROM admins WHERE id = ?',
        [req.session.adminId]
      );

      if (admins.length === 0 || admins[0].status !== 'active') {
        // Admin no longer exists or is disabled, destroy session
        req.session.destroy();
        return res.redirect('/admin/login');
      }
    } catch (error) {
      console.error('Admin session validation error:', error);
      req.session.destroy();
      return res.redirect('/admin/login');
    }
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