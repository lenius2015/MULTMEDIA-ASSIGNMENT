const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdminAuth } = require('../middleware/adminAuth');
const NotificationService = require('../utils/notificationService');

// Get recent notifications for dropdown
router.get('/recent', requireAdminAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        // Get notifications for this admin, broadcasts, or NULL admin_id (unassigned)
        const [notifications] = await db.query(`
            SELECT an.*,
                   u.name as related_user_name,
                   u.email as related_user_email,
                   o.id as related_order_id_display,
                   a.title as related_auction_title
            FROM admin_notifications an
            LEFT JOIN users u ON an.related_user_id = u.id
            LEFT JOIN orders o ON an.related_order_id = o.id
            LEFT JOIN auctions a ON an.related_auction_id = a.id
            WHERE (an.admin_id = ? OR an.admin_id IS NULL OR an.is_broadcast = 1)
            ORDER BY an.created_at DESC
            LIMIT ?
        `, [req.session.adminId || 0, limit]);

        // Get unread count
        const [unreadResult] = await db.query(`
            SELECT COUNT(*) as count FROM admin_notifications
            WHERE (admin_id = ? OR admin_id IS NULL OR is_broadcast = 1) AND is_read = 0
        `, [req.session.adminId || 0]);

        res.json({
            success: true,
            notifications,
            unreadCount: unreadResult[0].count
        });
    } catch (error) {
        console.error('Error fetching recent notifications:', error);
        res.status(500).json({ success: false, message: 'Database error', notifications: [], unreadCount: 0 });
    }
});

// Mark notification as read
router.put('/:id/read', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        await db.query(
            'UPDATE admin_notifications SET is_read = 1 WHERE id = ? AND (admin_id = ? OR is_broadcast = 1 OR admin_id IS NULL)',
            [id, req.session.adminId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Mark all notifications as read
router.put('/mark-all-read', requireAdminAuth, async (req, res) => {
    try {
        await db.query(
            'UPDATE admin_notifications SET is_read = 1 WHERE (admin_id = ? OR is_broadcast = 1 OR admin_id IS NULL) AND is_read = 0',
            [req.session.adminId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Get admin notifications management page
router.get('/', requireAdminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const type = req.query.type || 'all';
        const status = req.query.status || 'all';
        const offset = (page - 1) * limit;

        // Get admin notifications
        let whereClause = '';
        let params = [];

        if (type !== 'all') {
            whereClause += ' AND type = ?';
            params.push(type);
        }

        if (status === 'unread') {
            whereClause += ' AND is_read = 0';
        } else if (status === 'read') {
            whereClause += ' AND is_read = 1';
        }

        const [notifications] = await db.query(`
            SELECT an.*,
                   u.name as related_user_name,
                   u.email as related_user_email,
                   o.id as related_order_id_display,
                   a.title as related_auction_title
            FROM admin_notifications an
            LEFT JOIN users u ON an.related_user_id = u.id
            LEFT JOIN orders o ON an.related_order_id = o.id
            LEFT JOIN auctions a ON an.related_auction_id = a.id
            WHERE (an.admin_id = ? OR an.is_broadcast = 1) ${whereClause}
            ORDER BY an.created_at DESC
            LIMIT ? OFFSET ?
        `, [req.session.adminId, ...params, limit, offset]);

        // Get total count
        const [countResult] = await db.query(`
            SELECT COUNT(*) as total FROM admin_notifications
            WHERE (admin_id = ? OR is_broadcast = 1) ${whereClause}
        `, [req.session.adminId, ...params]);

        const totalNotifications = countResult[0].total;
        const totalPages = Math.ceil(totalNotifications / limit);

        // Get notification counts
        const counts = await NotificationService.getNotificationCounts('admin', req.session.adminId);

        res.render('admin/notifications', {
            title: 'Notification Management - OMUNJU SHOPPERS',
            currentPage: 'notifications',
            notifications,
            counts,
            page,
            totalPages,
            totalNotifications,
            limit,
            type,
            status
        });
    } catch (error) {
        console.error('Error fetching admin notifications:', error);
        res.status(500).render('error', { message: 'Failed to load notifications' });
    }
});

// Send notification to users
router.post('/send', requireAdminAuth, async (req, res) => {
    try {
        const {
            recipient_type, // 'all', 'specific_users', 'user_groups'
            user_ids, // comma-separated user IDs
            title,
            message,
            type,
            priority,
            send_email
        } = req.body;

        const adminId = req.session.adminId;

        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: 'Title and message are required'
            });
        }

        let recipients = [];
        let notificationCount = 0;

        if (recipient_type === 'all') {
            // Get all users
            const [users] = await db.query('SELECT id FROM users WHERE status = "active"');
            recipients = users.map(u => u.id);
        } else if (recipient_type === 'specific_users' && user_ids) {
            recipients = user_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        } else {
            // If no recipient type or users selected, notify all users
            const [users] = await db.query('SELECT id FROM users WHERE status = "active"');
            recipients = users.map(u => u.id);
        }

        // Send notifications to each recipient
        for (const userId of recipients) {
            try {
                await NotificationService.sendToUser(userId, title, message, {
                    type: type || 'system',
                    priority: priority || 'medium',
                    sendEmail: send_email === 'on'
                });
                notificationCount++;
            } catch (error) {
                console.error(`Failed to send notification to user ${userId}:`, error);
            }
        }

        // Log admin action
        const Logger = require('../utils/logger');
        await Logger.activity(adminId, 'bulk_notification_sent',
            `Sent "${title}" to ${notificationCount} users`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: `Notification sent to ${notificationCount} users successfully`
        });
    } catch (error) {
        console.error('Error sending bulk notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send notifications'
        });
    }
});

// Mark notification as read (using NotificationService)
router.put('/:id/read', requireAdminAuth, async (req, res) => {
    try {
        await NotificationService.markAsRead('admin', req.params.id, req.session.adminId);
        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
    }
});

// Mark all notifications as read
router.put('/read-all', requireAdminAuth, async (req, res) => {
    try {
        await db.query(`
            UPDATE admin_notifications
            SET is_read = 1
            WHERE (admin_id = ? OR is_broadcast = 1) AND is_read = 0
        `, [req.session.adminId]);

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ success: false, message: 'Failed to mark all notifications as read' });
    }
});

// Delete notification
router.delete('/:id', requireAdminAuth, async (req, res) => {
    try {
        await NotificationService.deleteNotification('admin', req.params.id, req.session.adminId);
        res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ success: false, message: 'Failed to delete notification' });
    }
});

// Get notification templates
router.get('/templates', requireAdminAuth, async (req, res) => {
    try {
        const [templates] = await db.query(
            'SELECT * FROM notification_templates WHERE is_active = 1 ORDER BY name ASC'
        );

        res.json({ success: true, templates });
    } catch (error) {
        console.error('Error fetching notification templates:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch templates' });
    }
});

// Send notification using template
router.post('/send-template', requireAdminAuth, async (req, res) => {
    try {
        const {
            template_name,
            recipient_type,
            user_ids,
            variables
        } = req.body;

        const adminId = req.session.adminId;

        if (!template_name) {
            return res.status(400).json({
                success: false,
                message: 'Template name is required'
            });
        }

        let recipients = [];
        let notificationCount = 0;

        if (recipient_type === 'all') {
            const [users] = await db.query('SELECT id FROM users WHERE status = "active"');
            recipients = users.map(u => u.id);
        } else if (recipient_type === 'specific_users' && user_ids) {
            recipients = user_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        }

        // Parse variables
        let templateVariables = {};
        if (variables) {
            try {
                templateVariables = JSON.parse(variables);
            } catch (error) {
                console.warn('Invalid variables JSON, using empty object');
            }
        }

        // Send notifications using template
        for (const userId of recipients) {
            try {
                await NotificationService.sendFromTemplate(template_name, userId, templateVariables);
                notificationCount++;
            } catch (error) {
                console.error(`Failed to send template notification to user ${userId}:`, error);
            }
        }

        // Log admin action
        const Logger = require('../utils/logger');
        await Logger.activity(adminId, 'template_notification_sent',
            `Sent "${template_name}" template to ${notificationCount} users`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: `Template notification sent to ${notificationCount} users successfully`
        });
    } catch (error) {
        console.error('Error sending template notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send template notifications'
        });
    }
});

// Get users for notification targeting
router.get('/users', requireAdminAuth, async (req, res) => {
    try {
        const search = req.query.search || '';
        const limit = parseInt(req.query.limit) || 50;

        let whereClause = 'WHERE status = "active"';
        let params = [];

        if (search) {
            whereClause += ' AND (name LIKE ? OR email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        const [users] = await db.query(`
            SELECT id, name, email
            FROM users
            ${whereClause}
            ORDER BY name ASC
            LIMIT ?
        `, [...params, limit]);

        res.json({ success: true, users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
});

// API endpoint for real-time notification counts
router.get('/counts', requireAdminAuth, async (req, res) => {
    try {
        const counts = await NotificationService.getNotificationCounts('admin', req.session.adminId);
        res.json({ success: true, counts });
    } catch (error) {
        console.error('Error fetching notification counts:', error);
        res.status(500).json({ success: false, counts: { total: 0, unread: 0 } });
    }
});

module.exports = router;