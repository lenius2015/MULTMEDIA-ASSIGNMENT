// Admin Authentication Controller
// Completely separate from user authentication

const bcrypt = require('bcryptjs');
const pool = require('../db');

// Render admin login page
const getAdminLogin = (req, res) => {
  // If already logged in as admin, redirect to dashboard
  if (req.session && req.session.adminId) {
    return res.redirect('/admin/dashboard');
  }

  res.render('admin/login', {
    title: 'Admin Login - OMUNJU SHOPPERS'
  });
};

// Handle admin login
const postAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find admin in admins table with role information
    const [admins] = await pool.query(`
      SELECT a.id, a.name, a.email, a.password, a.profile_picture, a.status, a.role_id, a.phone,
             r.name as role_name, r.display_name as role_display_name, r.is_super_admin
      FROM admins a
      LEFT JOIN admin_roles r ON a.role_id = r.id
      WHERE a.email = ?
    `, [email]);

    if (admins.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    const admin = admins[0];

    // Check if admin is active
    if (admin.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Admin account is disabled'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Update last login
    await pool.query(
      'UPDATE admins SET last_login = NOW() WHERE id = ?',
      [admin.id]
    );

    // Get admin permissions
    let permissions = [];
    if (admin.role_id) {
        const [rolePermissions] = await pool.query(`
            SELECT p.name
            FROM role_permissions rp
            JOIN admin_permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = ?
        `, [admin.role_id]);
        permissions = rolePermissions.map(p => p.name);
    }

    // Create admin session (completely separate from user sessions)
    req.session.adminId = admin.id;
    req.session.adminName = admin.name;
    req.session.adminEmail = admin.email;
    req.session.adminProfilePicture = admin.profile_picture;
    req.session.adminRole = admin.role_name || 'admin';
    req.session.adminRoleId = admin.role_id;
    req.session.adminIsSuperAdmin = admin.is_super_admin || false;
    req.session.adminPermissions = permissions;
    req.session.adminPhone = admin.phone;

    // Get the return URL or default to dashboard
    const redirectUrl = req.session.returnTo || '/admin/dashboard';
    delete req.session.returnTo; // Clear the saved URL

    // Save session before sending response
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          message: 'Login failed. Please try again.'
        });
      }

      res.json({
        success: true,
        message: 'Admin login successful',
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email
        },
        redirect: redirectUrl
      });
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin login failed. Please try again.'
    });
  }
};

// Handle admin logout
const postAdminLogout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Admin logout error:', err);
      return res.status(500).json({
        success: false,
        message: 'Admin logout failed'
      });
    }

    res.json({
      success: true,
      message: 'Admin logout successful'
    });
  });
};

// Check admin authentication status
const getAdminStatus = (req, res) => {
  if (req.session && req.session.adminId) {
    res.json({
      success: true,
      authenticated: true,
      admin: {
        id: req.session.adminId,
        name: req.session.adminName,
        email: req.session.adminEmail,
        role: req.session.adminRole,
        isSuperAdmin: req.session.adminIsSuperAdmin,
        permissions: req.session.adminPermissions || []
      }
    });
  } else {
    res.json({
      success: true,
      authenticated: false
    });
  }
};

module.exports = {
  getAdminLogin,
  postAdminLogin,
  postAdminLogout,
  getAdminStatus
};