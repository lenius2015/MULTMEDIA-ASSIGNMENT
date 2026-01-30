const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdminAuth } = require('../middleware/adminAuth');
const Logger = require('../utils/logger');

// Get all countdown events
router.get('/', requireAdminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const type = req.query.type || 'all';
        const status = req.query.status || 'all';
        const offset = (page - 1) * limit;

        let whereClause = '';
        let params = [];

        if (type !== 'all') {
            whereClause += ' AND event_type = ?';
            params.push(type);
        }

        if (status === 'active') {
            whereClause += ' AND is_active = 1 AND end_date > NOW()';
        } else if (status === 'expired') {
            whereClause += ' AND end_date <= NOW()';
        } else if (status === 'inactive') {
            whereClause += ' AND is_active = 0';
        }

        // Get countdown events
        const [events] = await db.query(`
            SELECT
                c.*,
                a.title as related_auction_title,
                p.name as related_product_name,
                adm.name as created_by_name
            FROM countdown_events c
            LEFT JOIN auctions a ON c.related_auction_id = a.id
            LEFT JOIN products p ON c.related_product_id = p.id
            LEFT JOIN admins adm ON c.created_by = adm.id
            WHERE 1=1 ${whereClause}
            ORDER BY c.start_date DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        // Get total count
        const [countResult] = await db.query(`
            SELECT COUNT(*) as total FROM countdown_events WHERE 1=1 ${whereClause}
        `, params);

        const totalEvents = countResult[0].total;
        const totalPages = Math.ceil(totalEvents / limit);

        res.render('admin/countdowns', {
            title: 'Countdown Events - OMUNJU SHOPPERS',
            currentPage: 'countdowns',
            events,
            page,
            totalPages,
            totalEvents,
            limit,
            type,
            status
        });
    } catch (error) {
        console.error('Error fetching countdown events:', error);
        res.status(500).render('error', { message: 'Failed to load countdown events' });
    }
});

// Get countdown creation form
router.get('/create', requireAdminAuth, async (req, res) => {
    try {
        // Get active auctions for linking
        const [auctions] = await db.query(`
            SELECT id, title FROM auctions
            WHERE status IN ('scheduled', 'active')
            ORDER BY start_date ASC
        `);

        // Get products for linking
        const [products] = await db.query(`
            SELECT id, name FROM products
            WHERE stock_quantity > 0
            ORDER BY name ASC
        `);

        res.render('admin/countdown-create', {
            title: 'Create Countdown Event - OMUNJU SHOPPERS',
            currentPage: 'countdowns',
            auctions,
            products
        });
    } catch (error) {
        console.error('Error loading countdown creation form:', error);
        res.status(500).render('error', { message: 'Failed to load countdown form' });
    }
});

// Create new countdown event
router.post('/create', requireAdminAuth, async (req, res) => {
    try {
        const {
            title,
            description,
            event_type,
            start_date,
            end_date,
            display_on_homepage,
            display_on_product,
            related_auction_id,
            related_product_id
        } = req.body;

        const adminId = req.session.adminId;

        // Validate required fields
        if (!title || !event_type || !start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in all required fields'
            });
        }

        // Validate dates
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        const now = new Date();

        if (endDate <= startDate) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date'
            });
        }

        // Create countdown event
        const [result] = await db.query(`
            INSERT INTO countdown_events (
                title, description, event_type, start_date, end_date,
                is_active, display_on_homepage, display_on_product,
                related_auction_id, related_product_id, created_by
            ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
        `, [
            title, description || '', event_type, start_date, end_date,
            display_on_homepage === 'on' ? 1 : 0,
            display_on_product === 'on' ? 1 : 0,
            related_auction_id || null,
            related_product_id || null,
            adminId
        ]);

        // Log the action
        await Logger.activity(adminId, 'countdown_created',
            `Created countdown event "${title}" (${event_type})`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: 'Countdown event created successfully',
            eventId: result.insertId
        });
    } catch (error) {
        console.error('Error creating countdown event:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create countdown event'
        });
    }
});

// Update countdown event
router.put('/:id', requireAdminAuth, async (req, res) => {
    try {
        const eventId = req.params.id;
        const {
            title,
            description,
            event_type,
            start_date,
            end_date,
            is_active,
            display_on_homepage,
            display_on_product,
            related_auction_id,
            related_product_id
        } = req.body;

        const adminId = req.session.adminId;

        // Validate required fields
        if (!title || !event_type || !start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in all required fields'
            });
        }

        // Update countdown event
        await db.query(`
            UPDATE countdown_events SET
                title = ?, description = ?, event_type = ?,
                start_date = ?, end_date = ?, is_active = ?,
                display_on_homepage = ?, display_on_product = ?,
                related_auction_id = ?, related_product_id = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            title, description || '', event_type, start_date, end_date,
            is_active === 'on' ? 1 : 0,
            display_on_homepage === 'on' ? 1 : 0,
            display_on_product === 'on' ? 1 : 0,
            related_auction_id || null,
            related_product_id || null,
            eventId
        ]);

        // Log the action
        await Logger.activity(adminId, 'countdown_updated',
            `Updated countdown event "${title}"`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: 'Countdown event updated successfully'
        });
    } catch (error) {
        console.error('Error updating countdown event:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update countdown event'
        });
    }
});

// Delete countdown event
router.delete('/:id', requireAdminAuth, async (req, res) => {
    try {
        const eventId = req.params.id;
        const adminId = req.session.adminId;

        // Get event details before deletion
        const [events] = await db.query('SELECT title FROM countdown_events WHERE id = ?', [eventId]);
        if (events.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Countdown event not found'
            });
        }

        // Delete event
        await db.query('DELETE FROM countdown_events WHERE id = ?', [eventId]);

        // Log the action
        await Logger.activity(adminId, 'countdown_deleted',
            `Deleted countdown event "${events[0].title}"`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: 'Countdown event deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting countdown event:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete countdown event'
        });
    }
});

// Toggle countdown visibility
router.put('/:id/toggle', requireAdminAuth, async (req, res) => {
    try {
        const eventId = req.params.id;
        const { field } = req.body; // 'is_active', 'display_on_homepage', or 'display_on_product'
        const adminId = req.session.adminId;

        const validFields = ['is_active', 'display_on_homepage', 'display_on_product'];
        if (!validFields.includes(field)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid field'
            });
        }

        // Toggle the field
        await db.query(`
            UPDATE countdown_events
            SET ${field} = CASE WHEN ${field} = 1 THEN 0 ELSE 1 END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [eventId]);

        // Get updated event
        const [events] = await db.query('SELECT title FROM countdown_events WHERE id = ?', [eventId]);

        // Log the action
        await Logger.activity(adminId, 'countdown_toggled',
            `Toggled ${field} for countdown event "${events[0].title}"`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: `${field.replace('_', ' ')} toggled successfully`
        });
    } catch (error) {
        console.error('Error toggling countdown field:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle countdown field'
        });
    }
});

// API endpoint to get active countdowns for frontend
router.get('/api/active', async (req, res) => {
    try {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const [events] = await db.query(`
            SELECT
                id, title, description, event_type,
                start_date, end_date, display_on_homepage, display_on_product,
                related_auction_id, related_product_id
            FROM countdown_events
            WHERE is_active = 1
            AND start_date <= ?
            AND end_date > ?
            ORDER BY end_date ASC
        `, [now, now]);

        res.json({
            success: true,
            events: events
        });
    } catch (error) {
        console.error('Error fetching active countdowns:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch countdowns'
        });
    }
});

// API endpoint to get countdown by ID
router.get('/api/:id', async (req, res) => {
    try {
        const eventId = req.params.id;

        const [events] = await db.query(`
            SELECT
                id, title, description, event_type,
                start_date, end_date, display_on_homepage, display_on_product,
                related_auction_id, related_product_id
            FROM countdown_events
            WHERE id = ?
            AND is_active = 1
        `, [eventId]);

        if (events.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Countdown event not found'
            });
        }

        res.json({
            success: true,
            event: events[0]
        });
    } catch (error) {
        console.error('Error fetching countdown:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch countdown'
        });
    }
});

module.exports = router;
