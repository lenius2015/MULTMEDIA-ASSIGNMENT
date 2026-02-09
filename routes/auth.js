const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const Logger = require('../utils/logger');
const NotificationService = require('../utils/notificationService');

// Passport serialize/deserialize
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const [users] = await pool.query('SELECT id, name, email FROM users WHERE id = ?', [id]);
    if (users.length > 0) {
      done(null, users[0]);
    } else {
      done(null, false);
    }
  } catch (error) {
    done(error, null);
  }
});

// OAuth Strategies
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    const name = profile.displayName;
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return done(null, existingUsers[0]);
    } else {
      const [result] = await pool.query('INSERT INTO users (name, email, oauth_provider) VALUES (?, ?, ?)', [name, email, 'google']);
      const [newUser] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      return done(null, newUser[0]);
    }
  } catch (error) {
    return done(error, null);
  }
}));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: '/auth/facebook/callback',
  profileFields: ['id', 'displayName', 'emails']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    const name = profile.displayName;
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return done(null, existingUsers[0]);
    } else {
      const [result] = await pool.query('INSERT INTO users (name, email, oauth_provider) VALUES (?, ?, ?)', [name, email, 'facebook']);
      const [newUser] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      return done(null, newUser[0]);
    }
  } catch (error) {
    return done(error, null);
  }
}));

passport.use(new MicrosoftStrategy({
  clientID: process.env.MICROSOFT_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  callbackURL: '/auth/microsoft/callback',
  scope: ['user.read']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    const name = profile.displayName;
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return done(null, existingUsers[0]);
    } else {
      const [result] = await pool.query('INSERT INTO users (name, email, oauth_provider) VALUES (?, ?, ?)', [name, email, 'microsoft']);
      const [newUser] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      return done(null, newUser[0]);
    }
  } catch (error) {
    return done(error, null);
  }
}));

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Check if user already exists
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    // Create session
    req.session.userId = result.insertId;
    req.session.userName = name;
    req.session.userEmail = email;
    req.session.role = 'user';

    // Send welcome notification
    try {
      await NotificationService.sendToUser(result.insertId,
        'Welcome to OMUNJU SHOPPERS!',
        'Thank you for joining our community. Start shopping for amazing deals!',
        {
          type: 'account',
          priority: 'low'
        }
      );

      // Notify admin about new user
      await NotificationService.notifyNewUser(result.insertId, name, email);
    } catch (notificationError) {
      console.error('Error sending welcome notification:', notificationError);
      // Don't fail registration if notification fails
    }

    res.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: result.insertId,
        name,
        email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again. Error: ' + error.message
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      await Logger.loginAttempt(email || 'unknown', req.ip, false, {
        userAgent: req.get('User-Agent')
      });
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user - explicitly select role field
    const [users] = await pool.query(
      'SELECT id, name, email, password, role, profile_picture FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      await Logger.loginAttempt(email, req.ip, false, {
        userAgent: req.get('User-Agent'),
        req
      });
      await Logger.security('warning', 'Failed login attempt - user not found', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method,
        req
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      await Logger.loginAttempt(email, req.ip, false, {
        userAgent: req.get('User-Agent'),
        req
      });
      await Logger.security('warning', 'Failed login attempt - invalid password', {
        ip: req.ip,
        userId: user.id,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method,
        req
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Log successful login
    await Logger.loginAttempt(email, req.ip, true, {
      userAgent: req.get('User-Agent'),
      req
    });
    await Logger.activity(user.id, 'login', 'User logged in successfully', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      req
    });
    await Logger.createSession(user.id, req.sessionID, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      req
    });

    // Ensure role is properly set (fallback to 'user' if null/undefined)
    const userRole = user.role || 'user';

    // Create session with correct role
    req.session.userId = user.id;
    req.session.userName = user.name;
    req.session.userEmail = user.email;
    req.session.userProfilePicture = user.profile_picture;
    req.session.role = userRole;

    // Role-based redirect
    const redirectUrl = userRole === 'admin' ? '/admin/dashboard' : '/';

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: userRole
      },
      redirect: redirectUrl
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed. Please try again.' 
    });
  }
});

// Logout user
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Logout failed' 
      });
    }
    res.json({ 
      success: true, 
      message: 'Logout successful' 
    });
  });
});

// Logout user - GET route for easy access
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

// Admin login (separate from regular user login)
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user with admin role
    const [users] = await pool.query(
      'SELECT id, name, email, password, role FROM users WHERE email = ? AND role = ?',
      [email, 'admin']
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Admin access denied. Invalid credentials or insufficient privileges.'
      });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Admin access denied. Invalid credentials.'
      });
    }

    // Create admin session
    req.session.userId = user.id;
    req.session.userName = user.name;
    req.session.userEmail = user.email;
    req.session.role = 'admin';

    res.json({
      success: true,
      message: 'Admin access granted',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'admin'
      },
      redirect: '/admin/dashboard'
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin login failed. Please try again.'
    });
  }
});

// Get current user info (for frontend authentication)
router.get('/me', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      success: true,
      data: {
        id: req.session.userId,
        name: req.session.userName,
        email: req.session.userEmail,
        role: req.session.role,
        profile_picture: req.session.userProfilePicture
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
});

// Check authentication status
router.get('/status', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      success: true,
      authenticated: true,
      user: {
        id: req.session.userId,
        name: req.session.userName,
        email: req.session.userEmail,
        role: req.session.role
      }
    });
  } else {
    res.json({
      success: true,
      authenticated: false
    });
  }
});

// OAuth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
   req.session.userId = req.user.id;
   req.session.userName = req.user.name;
   req.session.userEmail = req.user.email;
   req.session.role = 'user';
   res.redirect('/');
});

router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), (req, res) => {
   req.session.userId = req.user.id;
   req.session.userName = req.user.name;
   req.session.userEmail = req.user.email;
   req.session.role = 'user';
   res.redirect('/');
});

router.get('/microsoft', passport.authenticate('microsoft', { scope: ['user.read'] }));

router.get('/microsoft/callback', passport.authenticate('microsoft', { failureRedirect: '/login' }), (req, res) => {
   req.session.userId = req.user.id;
   req.session.userName = req.user.name;
   req.session.userEmail = req.user.email;
   req.session.role = 'user';
   res.redirect('/');
});

// Apple OAuth (requires passport-apple-signin package)
// router.get('/apple', passport.authenticate('apple'));
// router.get('/apple/callback', passport.authenticate('apple', { failureRedirect: '/login' }), (req, res) => {
//   req.session.userId = req.user.id;
//   req.session.userName = req.user.name;
//   req.session.userEmail = req.user.email;
//   req.session.role = 'user';
//   res.redirect('/dashboard');
// });

// Multer configuration for profile picture upload
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/profile-pictures');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'profile-' + req.session.userId + '-' + uniqueSuffix + ext);
  }
});

const profileUpload = multer({
  storage: profileStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Profile picture upload route
router.post('/profile/picture', profileUpload.single('profile_picture'), async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const userId = req.session.userId;
    const profilePicturePath = '/uploads/profile-pictures/' + req.file.filename;

    // Update database
    await pool.query(
      'UPDATE users SET profile_picture = ? WHERE id = ?',
      [profilePicturePath, userId]
    );

    // Update session
    req.session.userProfilePicture = profilePicturePath;

    // Get updated user data
    const [users] = await pool.query(
      'SELECT id, name, email, role, profile_picture FROM users WHERE id = ?',
      [userId]
    );

    const user = users[0];

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_picture: user.profile_picture
      }
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload profile picture: ' + error.message 
    });
  }
});

// Update profile route
router.put('/profile', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const userId = req.session.userId;
    const { name, email } = req.body;

    // Validate input
    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and email are required' 
      });
    }

    // Check if email is already taken by another user
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, userId]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already in use' 
      });
    }

    // Update user
    await pool.query(
      'UPDATE users SET name = ?, email = ? WHERE id = ?',
      [name, email, userId]
    );

    // Update session
    req.session.userName = name;
    req.session.userEmail = email;

    // Get updated user data
    const [users] = await pool.query(
      'SELECT id, name, email, role, profile_picture FROM users WHERE id = ?',
      [userId]
    );

    const user = users[0];

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_picture: user.profile_picture
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update profile: ' + error.message 
    });
  }
});

module.exports = router;
