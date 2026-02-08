// Admin Permissions Middleware
// Advanced permission checking for admin system

const pool = require('../db');

/**
 * Check if admin has specific permission
 * @param {string} permission - Permission name to check
 */
const requirePermission = (permission) => {
    return async (req, res, next) => {
        try {
            // Check if admin is authenticated
            if (!req.session || !req.session.adminId) {
                // For API requests, return JSON error
                if (req.xhr || req.path.startsWith('/api')) {
                  return res.status(401).json({ success: false, message: 'Authentication required' });
                }
                return res.redirect('/admin/login');
            }

            // Super admin has all permissions
            if (req.session.adminIsSuperAdmin === true) {
                return next();
            }

            // Check if admin has the required permission
            const permissions = req.session.adminPermissions || [];
            if (!permissions.includes(permission)) {
                // For API requests, return JSON error
                if (req.xhr || req.path.startsWith('/api')) {
                  return res.status(403).json({ 
                    success: false, 
                    message: 'Access denied: Missing permission ' + permission 
                  });
                }
                return res.status(403).render('admin/error', {
                    title: 'Access Denied - OMUNJU SHOPPERS',
                    message: 'You do not have permission to access this resource.',
                    error: { status: 403 }
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            const errorMessage = process.env.NODE_ENV === 'development' ? error.message : 'Permission check failed';
            if (req.xhr || req.path.startsWith('/api')) {
                return res.status(500).json({ success: false, message: errorMessage });
            }
            res.status(500).render('admin/error', { 
                title: 'Error - OMUNJU SHOPPERS',
                message: errorMessage,
                error: { status: 500 }
            });
        }
    };
};

/**
 * Check if admin has any of the specified permissions
 * @param {string[]} permissions - Array of permission names
 */
const requireAnyPermission = (permissions) => {
    return async (req, res, next) => {
        try {
            // Check if admin is authenticated
            if (!req.session || !req.session.adminId) {
                return res.redirect('/admin/login');
            }

            // Super admin has all permissions
            if (req.session.adminIsSuperAdmin) {
                return next();
            }

            // Check if admin has any of the required permissions
            const hasPermission = req.session.adminPermissions &&
                permissions.some(permission => req.session.adminPermissions.includes(permission));

            if (!hasPermission) {
                return res.status(403).render('admin/error', {
                    title: 'Access Denied - OMUNJU SHOPPERS',
                    message: 'You do not have permission to access this resource.',
                    error: { status: 403 }
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).render('error', { message: 'Permission check failed' });
        }
    };
};

/**
 * Check if admin is super admin
 */
const requireSuperAdmin = (req, res, next) => {
    if (!req.session || !req.session.adminId) {
        if (req.xhr || req.path.startsWith('/api')) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        return res.redirect('/admin/login');
    }

    if (req.session.adminIsSuperAdmin !== true) {
        if (req.xhr || req.path.startsWith('/api')) {
            return res.status(403).json({ success: false, message: 'Super admin access required' });
        }
        return res.status(403).render('admin/error', {
            title: 'Access Denied - OMUNJU SHOPPERS',
            message: 'Super admin access required.',
            error: { status: 403 }
        });
    }

    next();
};

/**
 * Log admin activity
 * @param {string} action - Action performed
 * @param {string} description - Description of the action
 * @param {Object} metadata - Additional metadata
 */
const logAdminActivity = async (req, action, description, metadata = {}) => {
    try {
        if (!req.session || !req.session.adminId) return;

        await pool.query(`
            INSERT INTO admin_activity_logs (admin_id, action, description, ip_address, user_agent, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            req.session.adminId,
            action,
            description,
            req.ip,
            req.get('User-Agent'),
            JSON.stringify(metadata)
        ]);
    } catch (error) {
        console.error('Failed to log admin activity:', error);
    }
};

/**
 * Refresh admin permissions in session
 * Useful after role changes
 */
const refreshAdminPermissions = async (req, res, next) => {
    try {
        if (req.session && req.session.adminId) {
            // Get updated permissions
            const [permissions] = await pool.query(`
                SELECT p.name
                FROM role_permissions rp
                JOIN admin_permissions p ON rp.permission_id = p.id
                WHERE rp.role_id = ?
            `, [req.session.adminRoleId]);

            req.session.adminPermissions = permissions.map(p => p.name);

            // Check if still super admin
            const [role] = await pool.query(
                'SELECT is_super_admin FROM admin_roles WHERE id = ?',
                [req.session.adminRoleId]
            );

            req.session.adminIsSuperAdmin = role.length > 0 && role[0].is_super_admin;
        }
        next();
    } catch (error) {
        console.error('Error refreshing admin permissions:', error);
        next();
    }
};

module.exports = {
    requirePermission,
    requireAnyPermission,
    requireSuperAdmin,
    logAdminActivity,
    refreshAdminPermissions
};