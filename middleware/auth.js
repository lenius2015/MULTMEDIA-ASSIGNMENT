// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ 
    success: false, 
    message: 'Authentication required. Please login to continue.' 
  });
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
  optionalAuth
};
