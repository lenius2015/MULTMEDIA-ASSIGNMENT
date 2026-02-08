/**
 * Promotions API Routes
 * Full promotion management with coupon validation and discount calculation
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAuthenticated, optionalAuth, isAuthenticated: auth } = require('../middleware/auth');
const { requireAdminAuth } = require('../middleware/adminAuth');

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get active promotions
const getActivePromotions = async () => {
    const query = `
        SELECT p.*, c.code as coupon_code
        FROM promotions p
        LEFT JOIN coupons c ON p.id = c.promotion_id AND c.is_active = TRUE
        WHERE p.is_active = TRUE 
        AND p.start_date <= NOW() 
        AND p.end_date >= NOW()
        ORDER BY p.priority DESC, p.created_at DESC
    `;
    return db.query(query);
};

// Calculate discount for cart
const calculateDiscount = async (promotion, cartTotal, cartItems) => {
    let discount = 0;
    
    // Check minimum order amount
    if (cartTotal < promotion.min_order_amount) {
        return { discount: 0, error: `Minimum order of $${promotion.min_order_amount} required` };
    }

    // Check minimum quantity
    if (promotion.min_quantity > 1 && cartItems.length < promotion.min_quantity) {
        return { discount: 0, error: `Minimum ${promotion.min_quantity} items required` };
    }

    if (promotion.discount_type === 'percentage') {
        discount = (cartTotal * promotion.discount_value) / 100;
        // Cap at max discount
        if (promotion.max_discount_amount && discount > promotion.max_discount_amount) {
            discount = promotion.max_discount_amount;
        }
    } else if (promotion.discount_type === 'fixed') {
        discount = Math.min(promotion.discount_value, cartTotal);
    } else if (promotion.discount_type === 'bogo') {
        // Buy One Get One - calculate discount on cheapest item
        const prices = cartItems.map(item => item.price);
        const cheapestItem = Math.min(...prices);
        discount = cheapestItem;
    }

    return { discount: Math.round(discount * 100) / 100, error: null };
};

// Validate coupon for user
const validateCoupon = async (code, userId, cartTotal, cartItems) => {
    const query = `
        SELECT p.*, c.code as coupon_code
        FROM promotions p
        INNER JOIN coupons c ON p.id = c.promotion_id
        WHERE c.code = ? AND c.is_active = TRUE AND p.is_active = TRUE
        LIMIT 1
    `;
    
    const results = await db.query(query, [code]);
    
    if (results.length === 0) {
        return { valid: false, error: 'Invalid coupon code', promotion: null };
    }

    const promotion = results[0];

    // Check dates
    const now = new Date();
    const startDate = new Date(promotion.start_date);
    const endDate = new Date(promotion.end_date);

    if (now < startDate) {
        return { valid: false, error: 'This coupon is not yet active', promotion };
    }

    if (now > endDate) {
        return { valid: false, error: 'This coupon has expired', promotion };
    }

    // Check usage limit
    if (promotion.usage_limit && promotion.usage_count >= promotion.usage_limit) {
        return { valid: false, error: 'Coupon usage limit reached', promotion };
    }

    // Check user usage
    if (promotion.usage_limit_per_user && userId) {
        const usageQuery = 'SELECT COUNT(*) as count FROM promotion_usage WHERE promotion_id = ? AND user_id = ?';
        const usageResult = await db.query(usageQuery, [promotion.id, userId]);
        
        if (usageResult[0].count >= promotion.usage_limit_per_user) {
            return { valid: false, error: 'You have already used this coupon', promotion };
        }
    }

    // Check minimum order
    if (cartTotal < promotion.min_order_amount) {
        return { 
            valid: false, 
            error: `Minimum order of $${promotion.min_order_amount} required`,
            promotion 
        };
    }

    // Calculate discount
    const discountResult = await calculateDiscount(promotion, cartTotal, cartItems);

    return {
        valid: true,
        error: null,
        promotion,
        discount: discountResult.discount
    };
};

// ============================================
// PUBLIC ROUTES
// ============================================

// Get all active promotions for display
router.get('/', async (req, res) => {
    try {
        const promotions = await getActivePromotions();
        
        // Group by type
        const grouped = {
            coupons: promotions.filter(p => p.type === 'coupon' || p.type === 'first_order'),
            banners: promotions.filter(p => p.type === 'banner' || p.type === 'seasonal'),
            category: promotions.filter(p => p.type === 'category'),
            cart: promotions.filter(p => p.type === 'cart')
        };

        res.json({
            success: true,
            data: grouped,
            total: promotions.length
        });
    } catch (error) {
        console.error('Error fetching promotions:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch promotions' });
    }
});

// Get active banners for homepage
router.get('/banners', async (req, res) => {
    try {
        const query = `
            SELECT bp.*, p.type, p.discount_type, p.discount_value, p.end_date
            FROM banner_promotions bp
            INNER JOIN promotions p ON bp.promotion_id = p.id
            WHERE bp.is_active = TRUE AND p.is_active = TRUE
            AND p.start_date <= NOW() AND p.end_date >= NOW()
            ORDER BY bp.sort_order, bp.id
        `;
        
        const banners = await db.query(query);
        
        res.json({
            success: true,
            data: banners
        });
    } catch (error) {
        console.error('Error fetching banners:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch banners' });
    }
});

// Validate coupon code
router.post('/validate-coupon', auth, async (req, res) => {
    try {
        const { code, cart_total = 0, cart_items = [] } = req.body;
        const userId = req.user ? req.user.id : null;

        if (!code) {
            return res.status(400).json({ 
                success: false, 
                error: 'Coupon code is required' 
            });
        }

        const result = await validateCoupon(code, userId, cart_total, cart_items);

        res.json({
            success: result.valid,
            valid: result.valid,
            error: result.error,
            promotion: result.promotion ? {
                id: result.promotion.id,
                name: result.promotion.name,
                description: result.promotion.description,
                discount_type: result.promotion.discount_type,
                discount_value: result.promotion.discount_value
            } : null,
            discount: result.discount || 0
        });
    } catch (error) {
        console.error('Error validating coupon:', error);
        res.status(500).json({ success: false, error: 'Failed to validate coupon' });
    }
});

// Calculate discount preview
router.post('/calculate-discount', auth, async (req, res) => {
    try {
        const { promotion_id, cart_total, cart_items = [] } = req.body;

        if (!promotion_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'Promotion ID is required' 
            });
        }

        const query = 'SELECT * FROM promotions WHERE id = ? AND is_active = TRUE';
        const promotions = await db.query(query, [promotion_id]);

        if (promotions.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Promotion not found' 
            });
        }

        const promotion = promotions[0];
        const result = await calculateDiscount(promotion, cart_total, cart_items);

        res.json({
            success: true,
            original_total: cart_total,
            discount: result.discount,
            final_total: Math.round((cart_total - result.discount) * 100) / 100,
            error: result.error
        });
    } catch (error) {
        console.error('Error calculating discount:', error);
        res.status(500).json({ success: false, error: 'Failed to calculate discount' });
    }
});

// Get auto-applicable promotions for cart
router.post('/auto-promotions', auth, async (req, res) => {
    try {
        const { cart_total, cart_items = [] } = req.body;
        const userId = req.user ? req.user.id : null;

        const query = `
            SELECT * FROM promotions 
            WHERE is_active = TRUE 
            AND is_auto_apply = TRUE
            AND start_date <= NOW() 
            AND end_date >= NOW()
            ORDER BY priority DESC
        `;
        
        const promotions = await db.query(query);
        const applicablePromotions = [];

        for (const promotion of promotions) {
            const result = await calculateDiscount(promotion, cart_total, cart_items);
            
            if (result.error === null && result.discount > 0) {
                applicablePromotions.push({
                    id: promotion.id,
                    name: promotion.name,
                    description: promotion.description,
                    discount_type: promotion.discount_type,
                    discount_value: promotion.discount_value,
                    discount: result.discount
                });
            }
        }

        res.json({
            success: true,
            promotions: applicablePromotions,
            best_discount: applicablePromotions.length > 0 
                ? Math.max(...applicablePromotions.map(p => p.discount)) 
                : 0
        });
    } catch (error) {
        console.error('Error fetching auto promotions:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch promotions' });
    }
});

// ============================================
// PROTECTED ROUTES (User)
// ============================================

// Apply coupon to cart (records usage on order completion)
router.post('/apply', auth, async (req, res) => {
    try {
        const { code, cart_total, cart_items = [] } = req.body;
        const userId = req.user.id;

        const result = await validateCoupon(code, userId, cart_total, cart_items);

        if (!result.valid) {
            return res.json({
                success: false,
                error: result.error,
                coupon_applied: false
            });
        }

        res.json({
            success: true,
            coupon_applied: true,
            coupon_code: code,
            promotion: {
                id: result.promotion.id,
                name: result.promotion.name,
                discount_type: result.promotion.discount_type,
                discount_value: result.promotion.discount_value
            },
            discount: result.discount
        });
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ success: false, error: 'Failed to apply coupon' });
    }
});

// Remove coupon from cart
router.post('/remove', auth, async (req, res) => {
    try {
        // This just confirms removal - actual removal is handled in cart
        res.json({
            success: true,
            message: 'Coupon removed successfully',
            coupon_removed: true
        });
    } catch (error) {
        console.error('Error removing coupon:', error);
        res.status(500).json({ success: false, error: 'Failed to remove coupon' });
    }
});

// Get user's promotion usage history
router.get('/history', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const query = `
            SELECT pu.*, p.name as promotion_name, p.discount_type, p.discount_value
            FROM promotion_usage pu
            INNER JOIN promotions p ON pu.promotion_id = p.id
            WHERE pu.user_id = ?
            ORDER BY pu.used_at DESC
            LIMIT 50
        `;
        
        const history = await db.query(query, [userId]);

        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error('Error fetching promotion history:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch history' });
    }
});

// ============================================
// ADMIN ROUTES
// ============================================

// Get all promotions (admin)
router.get('/admin/all', requireAdminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, type, active } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT p.*, 
                   (SELECT COUNT(*) FROM promotion_usage WHERE promotion_id = p.id) as total_uses,
                   (SELECT COUNT(*) FROM coupons WHERE promotion_id = p.id) as coupon_count
            FROM promotions p
            WHERE 1=1
        `;
        
        const params = [];

        if (type) {
            query += ' AND p.type = ?';
            params.push(type);
        }

        if (active !== undefined) {
            query += ' AND p.is_active = ?';
            params.push(active === 'true');
        }

        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const promotions = await db.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM promotions WHERE 1=1';
        const countParams = [];
        if (type) {
            countQuery += ' AND type = ?';
            countParams.push(type);
        }
        const countResult = await db.query(countQuery, countParams);

        res.json({
            success: true,
            data: promotions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching admin promotions:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch promotions' });
    }
});

// Create promotion (admin)
router.post('/admin/create', requireAdminAuth, async (req, res) => {
    try {
        const {
            name, description, type, discount_type, discount_value,
            max_discount_amount, min_order_amount, min_quantity,
            usage_limit, usage_limit_per_user, start_date, end_date,
            is_auto_apply, priority, code, banner_data, category_ids
        } = req.body;

        // Insert promotion
        const insertQuery = `
            INSERT INTO promotions (
                name, description, type, discount_type, discount_value,
                max_discount_amount, min_order_amount, min_quantity,
                usage_limit, usage_limit_per_user, start_date, end_date,
                is_auto_apply, priority, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const promotionResult = await db.query(insertQuery, [
            name, description, type, discount_type, discount_value,
            max_discount_amount, min_order_amount, min_quantity,
            usage_limit, usage_limit_per_user, start_date, end_date,
            is_auto_apply, priority || 0, req.user.id
        ]);

        const promotionId = promotionResult.insertId;

        // Create coupon if provided
        if (code && (type === 'coupon' || type === 'first_order')) {
            await db.query('INSERT INTO coupons (promotion_id, code) VALUES (?, ?)', 
                [promotionId, code.toUpperCase()]);
        }

        // Create banner if provided
        if (banner_data && (type === 'banner' || type === 'seasonal')) {
            const bannerQuery = `
                INSERT INTO banner_promotions (
                    promotion_id, title, subtitle, image_url, position, sort_order
                ) VALUES (?, ?, ?, ?, ?, ?)
            `;
            await db.query(bannerQuery, [
                promotionId, banner_data.title, banner_data.subtitle,
                banner_data.image_url, banner_data.position || 'hero', 
                banner_data.sort_order || 0
            ]);
        }

        // Link categories if provided
        if (category_ids && category_ids.length > 0 && type === 'category') {
            for (const catId of category_ids) {
                await db.query(
                    'INSERT INTO category_promotions (promotion_id, category_id) VALUES (?, ?)',
                    [promotionId, catId]
                );
            }
        }

        res.json({
            success: true,
            message: 'Promotion created successfully',
            promotion_id: promotionId
        });
    } catch (error) {
        console.error('Error creating promotion:', error);
        res.status(500).json({ success: false, error: 'Failed to create promotion' });
    }
});

// Update promotion (admin)
router.put('/admin/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const fields = [];
        const values = [];

        const allowedFields = [
            'name', 'description', 'type', 'discount_type', 'discount_value',
            'max_discount_amount', 'min_order_amount', 'min_quantity',
            'usage_limit', 'usage_limit_per_user', 'start_date', 'end_date',
            'is_active', 'is_auto_apply', 'priority'
        ];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(updates[field]);
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({ success: false, error: 'No valid fields to update' });
        }

        values.push(id);

        await db.query(
            `UPDATE promotions SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
            values
        );

        // Update coupon code if provided
        if (updates.code) {
            await db.query(
                'UPDATE coupons SET code = ? WHERE promotion_id = ?',
                [updates.code.toUpperCase(), id]
            );
        }

        res.json({
            success: true,
            message: 'Promotion updated successfully'
        });
    } catch (error) {
        console.error('Error updating promotion:', error);
        res.status(500).json({ success: false, error: 'Failed to update promotion' });
    }
});

// Delete promotion (admin)
router.delete('/admin/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        await db.query('DELETE FROM promotions WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Promotion deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting promotion:', error);
        res.status(500).json({ success: false, error: 'Failed to delete promotion' });
    }
});

// Toggle promotion status (admin)
router.put('/admin/:id/toggle', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        await db.query(
            'UPDATE promotions SET is_active = NOT is_active, updated_at = NOW() WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: 'Promotion status toggled successfully'
        });
    } catch (error) {
        console.error('Error toggling promotion:', error);
        res.status(500).json({ success: false, error: 'Failed to toggle status' });
    }
});

// Get promotion analytics (admin)
router.get('/admin/:id/analytics', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { days = 30 } = req.query;

        // Get promotion details
        const promotion = await db.query('SELECT * FROM promotions WHERE id = ?', [id]);
        
        if (promotion.length === 0) {
            return res.status(404).json({ success: false, error: 'Promotion not found' });
        }

        // Get daily analytics
        const analyticsQuery = `
            SELECT date, views, clicks, usages, revenue_generated, discount_given
            FROM promotion_analytics
            WHERE promotion_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            ORDER BY date DESC
        `;
        const analytics = await db.query(analyticsQuery, [id, days]);

        // Get usage summary
        const usageQuery = `
            SELECT COUNT(*) as total_uses, SUM(discount_amount) as total_discount
            FROM promotion_usage WHERE promotion_id = ?
        `;
        const usageSummary = await db.query(usageQuery, [id]);

        res.json({
            success: true,
            data: {
                promotion: promotion[0],
                analytics,
                summary: usageSummary[0]
            }
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }
});

module.exports = router;
