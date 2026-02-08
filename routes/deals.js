/**
 * Deals API Routes
 * Advanced deals management with real-time functionality
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAuthenticated } = require('../middleware/auth');
const { requireAdminAuth } = require('../middleware/adminAuth');
const { v4: uuidv4 } = require('uuid');

// ============================================
// PUBLIC DEALS ENDPOINTS
// ============================================

/**
 * GET /api/deals
 * Get all active deals with pagination and filters
 */
router.get('/', async (req, res) => {
    try {
        const {
            type,
            status = 'active',
            featured,
            page = 1,
            limit = 12,
            sortBy = 'end_date'
        } = req.query;

        // Check if deals table exists first
        const [tables] = await db.query("SHOW TABLES LIKE 'deals'");
        if (tables.length === 0) {
            // Deals table doesn't exist - return empty response
            return res.json({
                success: true,
                deals: [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: 0,
                    pages: 0
                },
                message: 'Deals system not initialized'
            });
        }

        let query = `
            SELECT d.*, 
                   (SELECT COUNT(*) FROM deal_products WHERE deal_id = d.id) as product_count
            FROM deals d
            WHERE d.status = ?
        `;
        const params = [status];

        if (type) {
            query += ' AND d.type = ?';
            params.push(type);
        }

        if (featured === 'true') {
            query += ' AND d.is_featured = TRUE';
        }

        // Sorting
        switch (sortBy) {
            case 'discount':
                query += ' ORDER BY d.discount_percent DESC';
                break;
            case 'price':
                query += ' ORDER BY d.deal_price ASC';
                break;
            case 'newest':
                query += ' ORDER BY d.created_at DESC';
                break;
            default:
                query += ' ORDER BY d.end_date ASC';
        }

        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [deals] = await db.query(query, params);

        // Get count
        const countQuery = 'SELECT COUNT(*) as total FROM deals WHERE status = ?';
        const [countResult] = await db.query(countQuery, [status]);
        const total = countResult[0].total;

        res.json({
            success: true,
            deals,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching deals:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch deals'
        });
    }
});

/**
 * GET /api/deals/active
 * Get all active deals with countdown data
 */
router.get('/active', async (req, res) => {
    try {
        // Check if deals table exists
        const [tables] = await db.query("SHOW TABLES LIKE 'deals'");
        if (tables.length === 0) {
            return res.json({
                success: true,
                deals: [],
                serverTime: Date.now()
            });
        }

        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const [deals] = await db.query(`
            SELECT d.*,
                   TIMESTAMPDIFF(SECOND, NOW(), d.end_date) as seconds_remaining,
                   (SELECT COUNT(*) FROM deal_products WHERE deal_id = d.id) as product_count
            FROM deals d
            WHERE d.status = 'active' 
            AND d.start_date <= ?
            AND d.end_date > ?
            AND d.available_stock > 0
            ORDER BY d.is_featured DESC, d.end_date ASC
        `, [now, now]);

        // Add stock percentage for UI
        const dealsWithStock = deals.map(deal => ({
            ...deal,
            stock_percentage: deal.total_stock > 0 
                ? Math.round((deal.available_stock / deal.total_stock) * 100) 
                : 0,
            is_low_stock: deal.available_stock < 10,
            is_expiring_soon: deal.seconds_remaining < 3600 // Less than 1 hour
        }));

        res.json({
            success: true,
            deals: dealsWithStock,
            serverTime: Date.now()
        });
    } catch (error) {
        console.error('Error fetching active deals:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch deals'
        });
    }
});

/**
 * GET /api/deals/:slug
 * Get single deal with products and countdown
 */
router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        // Get deal
        const [deals] = await db.query(`
            SELECT d.*,
                   TIMESTAMPDIFF(SECOND, NOW(), d.end_date) as seconds_remaining
            FROM deals d
            WHERE d.slug = ?
        `, [slug]);

        if (deals.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Deal not found'
            });
        }

        const deal = deals[0];
        
        // Increment view count
        await db.query(
            'UPDATE deals SET view_count = view_count + 1 WHERE id = ?',
            [deal.id]
        );

        // Get deal products
        const [products] = await db.query(`
            SELECT dp.*, p.name, p.image_url, p.description, p.category,
                   ROUND(dp.deal_price * (1 - p.discount/100), 2) as final_price
            FROM deal_products dp
            JOIN products p ON dp.product_id = p.id
            WHERE dp.deal_id = ?
            ORDER BY dp.sort_order ASC
        `, [deal.id]);

        res.json({
            success: true,
            deal: {
                ...deal,
                stock_percentage: deal.total_stock > 0 
                    ? Math.round((deal.available_stock / deal.total_stock) * 100) 
                    : 0,
                is_live: deal.status === 'active' && deal.seconds_remaining > 0
            },
            products
        });
    } catch (error) {
        console.error('Error fetching deal:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch deal'
        });
    }
});

/**
 * GET /api/deals/countdown/:id
 * Get real-time countdown for a deal (for polling)
 */
router.get('/countdown/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [deals] = await db.query(`
            SELECT id, name, status, end_date, 
                   available_stock, max_per_customer, sold_count
            FROM deals 
            WHERE id = ?
        `, [id]);

        if (deals.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Deal not found'
            });
        }

        const deal = deals[0];
        const secondsRemaining = Math.max(0, 
            new Date(deal.end_date).getTime() - Date.now()
        ) / 1000;

        res.json({
            success: true,
            countdown: {
                dealId: deal.id,
                status: deal.status,
                secondsRemaining,
                isExpired: secondsRemaining <= 0,
                isLowStock: deal.available_stock < 10,
                stockRemaining: deal.available_stock,
                totalSold: deal.sold_count,
                serverTime: Date.now()
            }
        });
    } catch (error) {
        console.error('Error fetching countdown:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch countdown'
        });
    }
});

/**
 * POST /api/deals/validate-purchase
 * Validate purchase against deal rules
 */
router.post('/validate-purchase', isAuthenticated, async (req, res) => {
    try {
        const { dealId, productId, quantity } = req.body;
        const userId = req.session?.user?.id || req.session?.userId;

        const [result] = await db.query(
            'CALL validate_deal_purchase(?, ?, ?, @valid, @message)',
            [dealId, userId || null, quantity || 1]
        );

        const [[validation]] = await db.query('SELECT @valid as valid, @message as message');

        res.json({
            success: validation.valid,
            message: validation.message,
            valid: validation.valid === 1
        });
    } catch (error) {
        console.error('Error validating purchase:', error);
        res.status(500).json({
            success: false,
            message: 'Validation failed'
        });
    }
});

/**
 * POST /api/deals/purchase
 * Process deal purchase with stock validation
 */
router.post('/purchase', isAuthenticated, async (req, res) => {
    try {
        const { dealId, productId, quantity = 1 } = req.body;
        const userId = req.session?.user?.id || req.session?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Please login to purchase deals'
            });
        }

        // Get deal price
        const [dealProducts] = await db.query(
            'SELECT deal_price FROM deal_products WHERE deal_id = ? AND product_id = ?',
            [dealId, productId]
        );

        if (dealProducts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found in deal'
            });
        }

        const price = dealProducts[0].deal_price;

        // Process purchase
        const [result] = await db.query(
            'CALL process_deal_purchase(?, ?, ?, ?, @success, @message)',
            [dealId, productId, userId, quantity, price]
        );

        const [[purchaseResult]] = await db.query('SELECT @success as success, @message as message');

        if (purchaseResult.success === 1) {
            res.json({
                success: true,
                message: 'Deal purchased successfully!'
            });
        } else {
            res.status(400).json({
                success: false,
                message: purchaseResult.message
            });
        }
    } catch (error) {
        console.error('Error processing purchase:', error);
        res.status(500).json({
            success: false,
            message: 'Purchase failed'
        });
    }
});

// ============================================
// ADMIN DEALS ENDPOINTS
// ============================================

/**
 * GET /api/deals/admin/all
 * Get all deals for admin
 */
router.get('/admin/all', requireAdminAuth, async (req, res) => {
    try {
        const { status, type, page = 1, limit = 20 } = req.query;

        let query = 'SELECT * FROM deals WHERE 1=1';
        const params = [];

        if (status && status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
        }

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const [deals] = await db.query(query, params);

        res.json({
            success: true,
            deals,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Error fetching admin deals:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch deals'
        });
    }
});

/**
 * POST /api/deals/admin/create
 * Create new deal
 */
router.post('/admin/create', requireAdminAuth, async (req, res) => {
    try {
        const {
            name, description, type,
            original_price, deal_price,
            total_stock, max_per_customer,
            start_date, end_date,
            is_featured, max_total_limit,
            apply_to_categories, apply_to_products,
            meta_title, meta_description
        } = req.body;

        const adminId = req.session.adminId;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const [result] = await db.query(`
            INSERT INTO deals (
                name, slug, description, type,
                original_price, deal_price,
                total_stock, available_stock, max_per_customer,
                start_date, end_date, status,
                is_featured, max_total_limit,
                apply_to_categories, apply_to_products,
                meta_title, meta_description, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?, ?)
        `, [
            name, slug, description, type,
            original_price, deal_price,
            total_stock, total_stock, max_per_customer || 1,
            start_date, end_date,
            is_featured ? 1 : 0,
            max_total_limit || 0,
            JSON.stringify(apply_to_categories || []),
            JSON.stringify(apply_to_products || []),
            meta_title, meta_description, adminId
        ]);

        // Log activity
        await db.query(`
            INSERT INTO deal_activity_log (deal_id, action, new_values, performed_by)
            VALUES (?, 'created', ?, ?)
        `, [result.insertId, JSON.stringify(req.body), adminId]);

        res.json({
            success: true,
            message: 'Deal created successfully',
            dealId: result.insertId
        });
    } catch (error) {
        console.error('Error creating deal:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create deal'
        });
    }
});

/**
 * PUT /api/deals/admin/:id
 * Update deal
 */
router.put('/admin/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const adminId = req.session.adminId;

        // Build update query
        const allowedFields = [
            'name', 'description', 'type', 'original_price', 'deal_price',
            'total_stock', 'max_per_customer', 'start_date', 'end_date',
            'status', 'is_featured', 'max_total_limit',
            'meta_title', 'meta_description'
        ];

        const setClause = [];
        const values = [];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                setClause.push(`${field} = ?`);
                values.push(updates[field]);
            }
        }

        if (setClause.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        setClause.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        await db.query(
            `UPDATE deals SET ${setClause.join(', ')} WHERE id = ?`,
            values
        );

        // Log activity
        await db.query(`
            INSERT INTO deal_activity_log (deal_id, action, new_values, performed_by)
            VALUES (?, 'updated', ?, ?)
        `, [id, JSON.stringify(updates), adminId]);

        res.json({
            success: true,
            message: 'Deal updated successfully'
        });
    } catch (error) {
        console.error('Error updating deal:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update deal'
        });
    }
});

/**
 * PUT /api/deals/admin/:id/activate
 * Activate deal
 */
router.put('/admin/:id/activate', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.session.adminId;

        await db.query(
            'UPDATE deals SET status = ? WHERE id = ?',
            ['active', id]
        );

        await db.query(`
            INSERT INTO deal_activity_log (deal_id, action, performed_by)
            VALUES (?, 'activated', ?)
        `, [id, adminId]);

        res.json({
            success: true,
            message: 'Deal activated'
        });
    } catch (error) {
        console.error('Error activating deal:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to activate deal'
        });
    }
});

/**
 * PUT /api/deals/admin/:id/pause
 * Pause deal
 */
router.put('/admin/:id/pause', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.session.adminId;

        await db.query(
            'UPDATE deals SET status = ? WHERE id = ?',
            ['paused', id]
        );

        await db.query(`
            INSERT INTO deal_activity_log (deal_id, action, performed_by)
            VALUES (?, 'paused', ?)
        `, [id, adminId]);

        res.json({
            success: true,
            message: 'Deal paused'
        });
    } catch (error) {
        console.error('Error pausing deal:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to pause deal'
        });
    }
});

/**
 * DELETE /api/deals/admin/:id
 * Delete deal
 */
router.delete('/admin/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.session.adminId;

        await db.query(
            'DELETE FROM deals WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: 'Deal deleted'
        });
    } catch (error) {
        console.error('Error deleting deal:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete deal'
        });
    }
});

/**
 * GET /api/deals/admin/analytics/:id
 * Get deal analytics
 */
router.get('/admin/analytics/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Get deal stats
        const [stats] = await db.query(`
            SELECT 
                d.name, d.view_count, d.conversion_count, 
                d.sold_count, d.available_stock,
                (SELECT COUNT(*) FROM deal_purchases WHERE deal_id = d.id) as total_purchases,
                (SELECT SUM(quantity) FROM deal_purchases WHERE deal_id = d.id AND status = 'confirmed') as total_quantity_sold
            FROM deals d WHERE d.id = ?
        `, [id]);

        // Get recent purchases
        const [recentPurchases] = await db.query(`
            SELECT dp.*, u.email, p.name as product_name
            FROM deal_purchases dp
            LEFT JOIN users u ON dp.user_id = u.id
            LEFT JOIN products p ON dp.product_id = p.id
            WHERE dp.deal_id = ?
            ORDER BY dp.purchased_at DESC
            LIMIT 10
        `, [id]);

        res.json({
            success: true,
            stats: stats[0],
            recentPurchases
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics'
        });
    }
});

module.exports = router;
