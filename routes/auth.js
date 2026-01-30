const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
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

module.exports = router;
