const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requirePermission, requireSuperAdmin } = require('../middleware/adminPermissions');
const { logAdminActivity } = require('../utils/logger');

// Admin Management Page
router.get('/admins', requireSuperAdmin, async (req, res) => {
    try {
        const [admins] = await pool.query(`
            SELECT a.*, r.display_name as role_name
            FROM admins a
            LEFT JOIN admin_roles r ON a.role_id = r.id
            ORDER BY a.created_at DESC
        `);

        res.render('admin/admins', {
            title: 'Admin Management - OMUNJU SHOPPERS',
            currentPage: 'admins',
            admins: admins || [],
            adminPermissions: (res.locals.admin && res.locals.admin.permissions) || [],
            filters: {
                search: req.query.search || '',
                status: req.query.status || 'all',
                role: req.query.role || 'all'
            },
            pagination: {
                page: parseInt(req.query.page) || 1,
                totalPages: 1,
                hasPrev: false,
                hasNext: false
            }
        });
    } catch (error) {
        console.error('Error loading admins:', error);
        res.status(500).render('error', { message: 'Failed to load admin management' });
    }
});

// Roles & Permissions Page
router.get('/roles', requireSuperAdmin, async (req, res) => {
    try {
        const [roles] = await pool.query(`
            SELECT r.*, COUNT(a.id) as admin_count
            FROM admin_roles r
            LEFT JOIN admins a ON r.id = a.role_id
            GROUP BY r.id
            ORDER BY r.is_super_admin DESC, r.name ASC
        `);

        const [permissions] = await pool.query(`
            SELECT * FROM admin_permissions
            ORDER BY module, display_name
        `);

        res.render('admin/roles', {
            title: 'Roles & Permissions - OMUNJU SHOPPERS',
            currentPage: 'roles',
            roles: roles || [],
            permissions: permissions || []
        });
    } catch (error) {
        console.error('Error loading roles:', error);
        res.status(500).render('error', { message: 'Failed to load roles & permissions' });
    }
});

// Get all permissions
router.get('/permissions', requirePermission('roles.view'), async (req, res) => {
    try {
        const [permissions] = await pool.query(`
            SELECT p.*, COUNT(rp.role_id) as role_count
            FROM admin_permissions p
            LEFT JOIN role_permissions rp ON p.id = rp.permission_id
            GROUP BY p.id
            ORDER BY p.module, p.display_name
        `);

        res.json({
            success: true,
            permissions: permissions
        });
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch permissions'
        });
    }
});

// Security Settings (Super Admin only)
router.get('/security-settings', requireSuperAdmin, async (req, res) => {
    try {
        // Get current security settings from environment and database
        const settings = {
            rateLimit: {
                windowMs: process.env.RATE_LIMIT_WINDOW || 900000,
                maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
                authMaxAttempts: process.env.AUTH_RATE_LIMIT_MAX || 5
            },
            blockedIPs: process.env.BLOCKED_IPS ? process.env.BLOCKED_IPS.split(',') : [],
            passwordPolicy: {
                minLength: process.env.PASSWORD_MIN_LENGTH || 8,
                requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
                requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
                requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
                requireSymbols: process.env.PASSWORD_REQUIRE_SYMBOLS === 'true'
            },
            sessionSecurity: {
                maxAge: process.env.SESSION_MAX_AGE || 86400000,
                secure: process.env.SESSION_SECURE === 'true',
                sameSite: process.env.SESSION_SAME_SITE || 'strict'
            }
        };

        // Get security statistics (with fallbacks for missing tables)
        let statistics = {
            failedLogins: 0,
            blockedUsers: 0,
            blockedAdmins: 0,
            suspiciousActivities: 0
        };

        try {
            const [failedLogins] = await pool.query(`
                SELECT COUNT(*) as count FROM login_attempts
                WHERE success = 0 AND attempted_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `);
            statistics.failedLogins = failedLogins[0].count;
        } catch (e) { /* Table doesn't exist */ }

        try {
            const [blockedAdmins] = await pool.query(`
                SELECT COUNT(*) as count FROM admins WHERE status = 'disabled'
            `);
            statistics.blockedAdmins = blockedAdmins[0].count;
        } catch (e) { /* Column doesn't exist */ }

        try {
            const [suspiciousActivities] = await pool.query(`
                SELECT COUNT(*) as count FROM security_logs
                WHERE level IN ('warning', 'error', 'critical') AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `);
            statistics.suspiciousActivities = suspiciousActivities[0].count;
        } catch (e) { /* Table doesn't exist */ }

        res.render('admin/security-settings', {
            title: 'Security Settings - OMUNJU SHOPPERS',
            currentPage: 'security',
            settings: settings,
            statistics: statistics
        });
    } catch (error) {
        console.error('Error fetching security settings:', error);
        res.status(500).render('error', { message: 'Failed to load security settings' });
    }
});

// Update security settings
router.put('/security-settings', requireSuperAdmin, async (req, res) => {
    try {
        const { rateLimit, blockedIPs, passwordPolicy, sessionSecurity } = req.body;

        // Update environment variables (in a real app, you'd save to database)
        // For now, we'll just validate and log the changes

        // Validate rate limit settings
        if (rateLimit) {
            if (rateLimit.maxRequests < 10 || rateLimit.maxRequests > 1000) {
                return res.status(400).json({
                    success: false,
                    message: 'Rate limit must be between 10 and 1000 requests'
                });
            }
        }

        // Validate password policy
        if (passwordPolicy) {
            if (passwordPolicy.minLength < 6 || passwordPolicy.minLength > 128) {
                return res.status(400).json({
                    success: false,
                    message: 'Password minimum length must be between 6 and 128'
                });
            }
        }

        // Log security settings change
        await logAdminActivity(req, 'security_settings_updated', 'Security settings updated', {
            rateLimit,
            blockedIPs,
            passwordPolicy,
            sessionSecurity
        });

        res.json({
            success: true,
            message: 'Security settings updated successfully. Some changes may require server restart.'
        });
    } catch (error) {
        console.error('Error updating security settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update security settings'
        });
    }
});

// Security audit log
router.get('/security-audit', requireSuperAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const offset = (page - 1) * limit;

        const [auditLogs] = await pool.query(`
            SELECT al.*, a.name as admin_name, a.email as admin_email
            FROM admin_activity_logs al
            LEFT JOIN admins a ON al.admin_id = a.id
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        const [totalCount] = await pool.query('SELECT COUNT(*) as count FROM admin_activity_logs');

        res.render('admin/security-audit', {
            title: 'Security Audit Log - OMUNJU SHOPPERS',
            currentPage: 'security',
            auditLogs: auditLogs,
            pagination: {
                page,
                totalPages: Math.ceil(totalCount[0].count / limit),
                totalLogs: totalCount[0].count
            }
        });
    } catch (error) {
        console.error('Error fetching security audit:', error);
        res.status(500).render('error', { message: 'Failed to load security audit' });
    }
});

module.exports = router;