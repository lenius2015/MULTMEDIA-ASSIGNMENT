// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  // Check if it's an API request or web page
  const accept = req.headers.accept || '';
  if (accept.includes('application/json') || req.xhr || req.path.startsWith('/api/')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required. Please login to continue.' 
    });
  }
  // Redirect to login for web pages
  return res.redirect('/login');
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.session && req.session.userId && req.session.role === 'admin') {
    return next();
  }
  return res.status(403).json({ 
    success: false, 
    message: 'Admin access required.' 
  });
};

// Optional authentication (doesn't block if not authenticated)
const optionalAuth = (req, res, next) => {
  // Just pass through, but user info will be available if logged in
  next();
};

module.exports = {
  isAuthenticated,
  isAdmin,
  optionalAuth,
  requireAuth: isAuthenticated  // Alias for backward compatibility
};
