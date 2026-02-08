const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    // Check for admin session - supports both session-based and token-based auth
    if (!req.session || !req.session.adminId) {
        return res.status(401).json({ success: false, message: 'Unauthorized access' });
    }
    
    // Verify admin role (super admin bypasses role check)
    const isSuperAdmin = req.session.adminIsSuperAdmin === true;
    const hasAdminRole = req.session.adminRole === 'admin' || req.session.adminRole === 'super_admin';
    
    if (!isSuperAdmin && !hasAdminRole) {
        return res.status(403).json({ success: false, message: 'Access denied: Admin privileges required' });
    }
    
    next();
};

// Input validation helpers
const validateSearchQuery = (q) => {
    // Sanitize search query - only allow alphanumeric, spaces, and basic punctuation
    const sanitized = q.replace(/[^a-zA-Z0-9\s\-_]/g, '');
    return sanitized.trim();
};

const validateProductData = (data) => {
    const errors = [];
    
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
        errors.push('Product name must be at least 2 characters');
    }
    
    if (data.price !== undefined) {
        const price = parseFloat(data.price);
        if (isNaN(price) || price < 0) {
            errors.push('Price must be a valid positive number');
        }
    }
    
    if (data.stock !== undefined) {
        const stock = parseInt(data.stock);
        if (isNaN(stock) || stock < 0) {
            errors.push('Stock must be a valid non-negative number');
        }
    }
    
    return { isValid: errors.length === 0, errors };
};

const validateCategoryData = (data) => {
    const errors = [];
    
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
        errors.push('Category name must be at least 2 characters');
    }
    
    return { isValid: errors.length === 0, errors };
};

// Helper to safely get database results
const safeGetResult = (result, defaultValue = []) => {
    if (!result) return defaultValue;
    if (Array.isArray(result)) return result;
    return [result];
};

// Main Dashboard Page
router.get('/', isAdmin, async (req, res) => {
    try {
        // Get basic statistics
        const [ordersResult] = await db.query('SELECT COUNT(*) as totalOrders FROM orders');
        const [usersResult] = await db.query('SELECT COUNT(*) as totalUsers FROM users');
        const [productsResult] = await db.query('SELECT COUNT(*) as totalProducts FROM products WHERE is_active = 1');
        const [messagesResult] = await db.query('SELECT COUNT(*) as totalMessages FROM contact_messages');
        const [activeAuctionsResult] = await db.query('SELECT COUNT(*) as activeAuctions FROM auctions WHERE status = "active" AND end_date > NOW()');
        const [activeCountdownsResult] = await db.query('SELECT COUNT(*) as activeCountdowns FROM countdown_events WHERE is_active = 1 AND end_date > NOW()');

        // Get recent orders
        const [recentOrders] = await db.query(`
            SELECT o.id, o.customer_name, o.customer_email, o.total_amount, o.status, o.created_at
            FROM orders o
            ORDER BY o.created_at DESC
            LIMIT 5
        `);

        // Get recent messages
        const [recentMessages] = await db.query(`
            SELECT cm.id, cm.name, cm.email, cm.subject, cm.created_at
            FROM contact_messages cm
            ORDER BY cm.created_at DESC
            LIMIT 5
        `);

        // Get top products
        const [topProducts] = await db.query(`
            SELECT p.id, p.name, p.image_url, p.price,
                   COALESCE(SUM(oi.quantity), 0) as sales_count,
                   COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
            GROUP BY p.id
            ORDER BY sales_count DESC
            LIMIT 5
        `);

        res.render('admin/dashboard', {
            title: 'Admin Dashboard - OMUNJU SHOPPERS',
            stats: {
                totalOrders: ordersResult[0].totalOrders || 0,
                totalUsers: usersResult[0].totalUsers || 0,
                totalProducts: productsResult[0].totalProducts || 0,
                totalMessages: messagesResult[0].totalMessages || 0,
                activeAuctions: activeAuctionsResult[0].activeAuctions || 0,
                activeCountdowns: activeCountdownsResult[0].activeCountdowns || 0
            },
            recentOrders: recentOrders || [],
            recentMessages: recentMessages || [],
            topProducts: topProducts || []
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).render('admin/error', { 
            title: 'Error',
            message: 'Failed to load dashboard data',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Dashboard Stats API

// Dashboard Activity
router.get('/api/dashboard/activity', isAdmin, async (req, res) => {
    try {
        const [recentOrders] = await db.query(`
            SELECT o.id, o.customer_name, o.total_amount, o.status, o.created_at
            FROM orders o
            ORDER BY o.created_at DESC
            LIMIT 5
        `);

        const [recentMessages] = await db.query(`
            SELECT cm.id, cm.name, cm.subject, cm.is_read, cm.created_at
            FROM contact_messages cm
            ORDER BY cm.created_at DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            recentOrders,
            recentMessages
        });
    } catch (error) {
        console.error('Error fetching dashboard activity:', error);
        res.status(500).json({ success: false, message: 'Error fetching activity' });
    }
});

// Products API
router.get('/api/products', isAdmin, async (req, res) => {
    try {
        const [products] = await db.query(`
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY p.created_at DESC
        `);
        res.json({ success: true, products });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ success: false, message: 'Error fetching products' });
    }
});

router.post('/api/products', isAdmin, async (req, res) => {
    try {
        const { name, description, price, stock, category_id, image_url } = req.body;
        
        // Validate product data
        const validation = validateProductData(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation failed',
                errors: validation.errors 
            });
        }
        
        // Additional validation for optional fields
        if (description && typeof description !== 'string') {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid description format' 
            });
        }
        
        // Ensure numeric fields are properly converted
        const priceValue = parseFloat(price);
        const stockValue = parseInt(stock);
        const categoryIdValue = category_id ? parseInt(category_id) : null;
        
        const [result] = await db.query(`
            INSERT INTO products (name, description, price, stock, category_id, image_url, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
        `, [
            name.trim(), 
            description ? description.trim() : '', 
            priceValue, 
            stockValue, 
            categoryIdValue, 
            image_url || null
        ]);

        res.json({ 
            success: true, 
            message: 'Product created successfully', 
            productId: result.insertId 
        });
    } catch (error) {
        console.error('Error creating product:', error);
        const message = process.env.NODE_ENV === 'development' ? 'Create product error: ' + error.message : 'Error creating product';
        res.status(500).json({ success: false, message });
    }
});

router.put('/api/products/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, stock, category_id, image_url, is_active } = req.body;
        
        // Validate ID parameter
        const productId = parseInt(id);
        if (isNaN(productId) || productId <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid product ID' });
        }
        
        // Validate product data
        const validation = validateProductData(req.body);
        if (!validation.isValid && (name || price || stock)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation failed',
                errors: validation.errors 
            });
        }
        
        // Check if product exists
        const [existing] = await db.query('SELECT id FROM products WHERE id = ?', [productId]);
        if (!existing || existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        
        await db.query(`
            UPDATE products 
            SET name = ?, description = ?, price = ?, stock = ?, category_id = ?, image_url = ?, is_active = ?, updated_at = NOW()
            WHERE id = ?
        `, [
            name ? name.trim() : undefined,
            description ? description.trim() : undefined,
            price ? parseFloat(price) : undefined,
            stock ? parseInt(stock) : undefined,
            category_id ? parseInt(category_id) : undefined,
            image_url || undefined,
            is_active !== undefined ? (is_active ? 1 : 0) : undefined,
            productId
        ]);

        res.json({ success: true, message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        const message = process.env.NODE_ENV === 'development' ? 'Update product error: ' + error.message : 'Error updating product';
        res.status(500).json({ success: false, message });
    }
});

router.delete('/api/products/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        const productId = parseInt(id);
        if (isNaN(productId) || productId <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid product ID' });
        }
        
        // Check if product exists before deletion
        const [existing] = await db.query('SELECT id, name FROM products WHERE id = ?', [productId]);
        if (!existing || existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        
        // Use soft delete (update is_active) instead of hard delete
        await db.query('UPDATE products SET is_active = 0, updated_at = NOW() WHERE id = ?', [productId]);
        
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        const message = process.env.NODE_ENV === 'development' ? 'Delete product error: ' + error.message : 'Error deleting product';
        res.status(500).json({ success: false, message });
    }
});

// Categories API
router.get('/api/categories', isAdmin, async (req, res) => {
    try {
        const [categories] = await db.query(`
            SELECT c.*, COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id
            GROUP BY c.id
            ORDER BY c.name
        `);
        res.json({ success: true, categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ success: false, message: 'Error fetching categories' });
    }
});

router.post('/api/categories', isAdmin, async (req, res) => {
    try {
        const { name, description } = req.body;
        
        // Validate category data
        const validation = validateCategoryData(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation failed',
                errors: validation.errors 
            });
        }
        
        // Sanitize and validate name
        const sanitizedName = name.trim();
        
        // Create slug from name - safe character handling
        const slug = sanitizedName
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
        
        // Check if category with same name or slug already exists
        const [existing] = await db.query(
            'SELECT id FROM categories WHERE name = ? OR slug = ?',
            [sanitizedName, slug]
        );
        
        if (existing && existing.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: 'Category with this name or slug already exists' 
            });
        }
        
        const [result] = await db.query(`
            INSERT INTO categories (name, slug, description, is_active, created_at, updated_at)
            VALUES (?, ?, ?, 1, NOW(), NOW())
        `, [sanitizedName, slug, description ? description.trim() : '']);

        res.json({ 
            success: true, 
            message: 'Category created successfully', 
            categoryId: result.insertId 
        });
    } catch (error) {
        console.error('Error creating category:', error);
        const message = process.env.NODE_ENV === 'development' ? 'Create category error: ' + error.message : 'Error creating category';
        res.status(500).json({ success: false, message });
    }
});

router.put('/api/categories/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, is_active } = req.body;
        
        // Validate ID parameter
        const categoryId = parseInt(id);
        if (isNaN(categoryId) || categoryId <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid category ID' });
        }
        
        // Check if category exists
        const [existing] = await db.query('SELECT id, name FROM categories WHERE id = ?', [categoryId]);
        if (!existing || existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        
        // If name is being updated, validate it and create new slug
        let slug;
        if (name) {
            const sanitizedName = name.trim();
            if (sanitizedName.length < 2) {
                return res.status(400).json({ success: false, message: 'Category name must be at least 2 characters' });
            }
            
            slug = sanitizedName
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-+|-+$/g, '');
            
            // Check for duplicate name/slug excluding current category
            const [duplicates] = await db.query(
                'SELECT id FROM categories WHERE (name = ? OR slug = ?) AND id != ?',
                [sanitizedName, slug, categoryId]
            );
            if (duplicates && duplicates.length > 0) {
                return res.status(409).json({ 
                    success: false, 
                    message: 'Category with this name or slug already exists' 
                });
            }
        }
        
        await db.query(`
            UPDATE categories 
            SET name = COALESCE(?, name), 
                slug = COALESCE(?, slug), 
                description = COALESCE(?, description), 
                is_active = COALESCE(?, is_active), 
                updated_at = NOW()
            WHERE id = ?
        `, [
            name ? name.trim() : null,
            slug || null,
            description ? description.trim() : null,
            is_active !== undefined ? (is_active ? 1 : 0) : null,
            categoryId
        ]);

        res.json({ success: true, message: 'Category updated successfully' });
    } catch (error) {
        console.error('Error updating category:', error);
        const message = process.env.NODE_ENV === 'development' ? 'Update category error: ' + error.message : 'Error updating category';
        res.status(500).json({ success: false, message });
    }
});

router.delete('/api/categories/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        const categoryId = parseInt(id);
        if (isNaN(categoryId) || categoryId <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid category ID' });
        }
        
        // Check if category has products
        const [productCount] = await db.query('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [categoryId]);
        if (productCount[0].count > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete category with existing products. Remove or reassign products first.' 
            });
        }
        
        // Check if category exists
        const [existing] = await db.query('SELECT id, name FROM categories WHERE id = ?', [categoryId]);
        if (!existing || existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        
        await db.query('DELETE FROM categories WHERE id = ?', [categoryId]);
        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting category:', error);
        const message = process.env.NODE_ENV === 'development' ? 'Delete category error: ' + error.message : 'Error deleting category';
        res.status(500).json({ success: false, message });
    }
});

// Orders API
router.get('/api/orders', isAdmin, async (req, res) => {
    try {
        // Validate pagination parameters
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;
        
        // Optional status filter
        const statusFilter = req.query.status;
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        
        let query = `
            SELECT o.id, o.customer_name, o.customer_email, o.total_amount, o.status, o.created_at
            FROM orders o
        `;
        const params = [];
        
        if (statusFilter && validStatuses.includes(statusFilter)) {
            query += ' WHERE o.status = ?';
            params.push(statusFilter);
        }
        
        query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        const [orders] = await db.query(query, params);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM orders';
        const countParams = [];
        if (statusFilter && validStatuses.includes(statusFilter)) {
            countQuery += ' WHERE status = ?';
            countParams.push(statusFilter);
        }
        const [countResult] = await db.query(countQuery, countParams);
        
        res.json({ 
            success: true, 
            orders: orders || [],
            pagination: {
                page,
                limit,
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        const message = process.env.NODE_ENV === 'development' ? 'Fetch orders error: ' + error.message : 'Error fetching orders';
        res.status(500).json({ success: false, message });
    }
});

router.put('/api/orders/:id/status', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Validate order ID
        const orderId = parseInt(id);
        if (isNaN(orderId) || orderId <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid order ID' });
        }
        
        // Validate status
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
            });
        }
        
        // Check if order exists
        const [existing] = await db.query('SELECT id, status FROM orders WHERE id = ?', [orderId]);
        if (!existing || existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        // Prevent changing cancelled orders
        if (existing[0].status === 'cancelled' && status !== 'cancelled') {
            return res.status(400).json({ success: false, message: 'Cannot modify cancelled order' });
        }
        
        await db.query('UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?', [status, orderId]);
        res.json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        const message = process.env.NODE_ENV === 'development' ? 'Update order error: ' + error.message : 'Error updating order status';
        res.status(500).json({ success: false, message });
    }
});

// Customers API
router.get('/api/customers', isAdmin, async (req, res) => {
    try {
        const [customers] = await db.query(`
            SELECT u.id, u.name, u.email, u.phone, u.is_active,
                   (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as order_count,
                   (SELECT MAX(o.created_at) FROM orders o WHERE o.user_id = u.id) as last_order
            FROM users u
            WHERE u.role = 'customer'
            ORDER BY u.created_at DESC
        `);
        res.json({ success: true, customers });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ success: false, message: 'Error fetching customers' });
    }
});

// Messages API
router.get('/api/messages', isAdmin, async (req, res) => {
    try {
        // Validate pagination
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;
        
        // Optional read status filter
        const isReadFilter = req.query.is_read;
        
        let query = `
            SELECT cm.id, cm.name, cm.email, cm.subject, cm.message, cm.is_read, cm.created_at
            FROM contact_messages cm
        `;
        const params = [];
        
        if (isReadFilter !== undefined) {
            const isRead = isReadFilter === 'true' ? 1 : 0;
            query += ' WHERE cm.is_read = ?';
            params.push(isRead);
        }
        
        query += ' ORDER BY cm.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        const [messages] = await db.query(query, params);
        
        // Get counts
        const [totalResult] = await db.query('SELECT COUNT(*) as total FROM contact_messages');
        const [unreadResult] = await db.query('SELECT COUNT(*) as unread FROM contact_messages WHERE is_read = 0');
        
        res.json({ 
            success: true, 
            messages: messages || [],
            stats: {
                total: totalResult[0].total,
                unread: unreadResult[0].unread
            }
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        const message = process.env.NODE_ENV === 'development' ? 'Fetch messages error: ' + error.message : 'Error fetching messages';
        res.status(500).json({ success: false, message });
    }
});

router.get('/api/messages/stats', isAdmin, async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as totalMessages,
                SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unreadTotal
            FROM contact_messages
        `);
        res.json({ 
            success: true, 
            stats: stats[0] || { totalMessages: 0, unreadTotal: 0 } 
        });
    } catch (error) {
        console.error('Error fetching message stats:', error);
        const message = process.env.NODE_ENV === 'development' ? 'Message stats error: ' + error.message : 'Error fetching message stats';
        res.status(500).json({ success: false, message });
    }
});

router.put('/api/messages/:id/read', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID
        const messageId = parseInt(id);
        if (isNaN(messageId) || messageId <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid message ID' });
        }
        
        // Check if message exists
        const [existing] = await db.query('SELECT id, is_read FROM contact_messages WHERE id = ?', [messageId]);
        if (!existing || existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }
        
        // Only update if not already read
        if (existing[0].is_read === 0) {
            await db.query('UPDATE contact_messages SET is_read = 1, read_at = NOW() WHERE id = ?', [messageId]);
        }
        
        res.json({ success: true, message: 'Message marked as read' });
    } catch (error) {
        console.error('Error marking message as read:', error);
        const message = process.env.NODE_ENV === 'development' ? 'Mark read error: ' + error.message : 'Error marking message as read';
        res.status(500).json({ success: false, message });
    }
});

router.delete('/api/messages/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID
        const messageId = parseInt(id);
        if (isNaN(messageId) || messageId <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid message ID' });
        }
        
        // Check if message exists
        const [existing] = await db.query('SELECT id FROM contact_messages WHERE id = ?', [messageId]);
        if (!existing || existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }
        
        await db.query('DELETE FROM contact_messages WHERE id = ?', [messageId]);
        res.json({ success: true, message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error deleting message:', error);
        const message = process.env.NODE_ENV === 'development' ? 'Delete message error: ' + error.message : 'Error deleting message';
        res.status(500).json({ success: false, message });
    }
});

// Notifications API
router.get('/api/notifications', isAdmin, async (req, res) => {
    try {
        const [notifications] = await db.query(`
            SELECT n.id, n.title, n.message, n.is_read, n.created_at
            FROM notifications n
            WHERE n.user_id IS NULL OR n.user_id = ?
            ORDER BY n.created_at DESC
            LIMIT 20
        `, [req.session.adminId]);
        res.json({ success: true, notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: 'Error fetching notifications' });
    }
});

router.put('/api/notifications/read-all', isAdmin, async (req, res) => {
    try {
        await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.session.adminId]);
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        res.status(500).json({ success: false, message: 'Error marking notifications as read' });
    }
});

// Analytics API
router.get('/api/analytics', isAdmin, async (req, res) => {
    try {
        // Revenue today
        const [revenueTodayResult] = await db.query(`
            SELECT COALESCE(SUM(total_amount), 0) as revenueToday
            FROM orders 
            WHERE DATE(created_at) = CURDATE()
        `);

        // Average order value
        const [avgOrderValueResult] = await db.query(`
            SELECT COALESCE(AVG(total_amount), 0) as avgOrderValue
            FROM orders
        `);

        // New customers today
        const [newCustomersTodayResult] = await db.query(`
            SELECT COUNT(*) as newCustomersToday
            FROM users 
            WHERE role = 'customer' AND DATE(created_at) = CURDATE()
        `);

        // Conversion rate (simplified calculation)
        const [conversionRateResult] = await db.query(`
            SELECT 5.2 as conversionRate
        `);

        res.json({
            success: true,
            analytics: {
                revenueToday: revenueTodayResult[0].revenueToday,
                avgOrderValue: avgOrderValueResult[0].avgOrderValue,
                newCustomersToday: newCustomersTodayResult[0].newCustomersToday,
                conversionRate: conversionRateResult[0].conversionRate
            }
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ success: false, message: 'Error fetching analytics' });
    }
});

// Search API
router.get('/api/search', isAdmin, async (req, res) => {
    try {
        const { q } = req.query;
        
        // Validate search query length
        if (!q || typeof q !== 'string' || q.trim().length < 2) {
            return res.json({ success: true, results: [] });
        }

        // Sanitize search query to prevent SQL injection
        const sanitizedQuery = validateSearchQuery(q);
        const searchQuery = `%${sanitizedQuery}%`;
        
        // Execute search queries with parameterized queries
        const [products] = await db.query(`
            SELECT 'product' as type, id, name as title, description as content, 'products' as url
            FROM products 
            WHERE (name LIKE ? OR description LIKE ?) AND is_active = 1
            LIMIT 5
        `, [searchQuery, searchQuery]);

        const [orders] = await db.query(`
            SELECT 'order' as type, id, CONCAT('#', id) as title, customer_name as content, 'orders' as url
            FROM orders 
            WHERE customer_name LIKE ? OR customer_email LIKE ?
            LIMIT 5
        `, [searchQuery, searchQuery]);

        const [customers] = await db.query(`
            SELECT 'customer' as type, id, name as title, email as content, 'customers' as url
            FROM users 
            WHERE role = 'customer' AND (name LIKE ? OR email LIKE ?)
            LIMIT 5
        `, [searchQuery, searchQuery]);

        // Safely combine results
        const results = [
            ...(Array.isArray(products) ? products : []),
            ...(Array.isArray(orders) ? orders : []),
            ...(Array.isArray(customers) ? customers : [])
        ];
        
        res.json({ success: true, results, count: results.length });
    } catch (error) {
        console.error('Error performing search:', error);
        // Don't expose internal errors in production
        const message = process.env.NODE_ENV === 'development' ? 'Search error: ' + error.message : 'Error performing search';
        res.status(500).json({ success: false, message });
    }
});

// Settings API
router.get('/api/settings/general', isAdmin, async (req, res) => {
    try {
        const [settings] = await db.query('SELECT * FROM settings WHERE id = 1');
        res.json({ success: true, settings: settings[0] || {} });
    } catch (error) {
        console.error('Error fetching general settings:', error);
        res.status(500).json({ success: false, message: 'Error fetching settings' });
    }
});

router.put('/api/settings/general', isAdmin, async (req, res) => {
    try {
        const { store_name, contact_email, phone, address } = req.body;
        
        await db.query(`
            INSERT INTO settings (store_name, contact_email, phone, address, updated_at)
            VALUES (?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
            store_name = VALUES(store_name),
            contact_email = VALUES(contact_email),
            phone = VALUES(phone),
            address = VALUES(address),
            updated_at = NOW()
        `, [store_name, contact_email, phone, address]);

        res.json({ success: true, message: 'General settings updated successfully' });
    } catch (error) {
        console.error('Error updating general settings:', error);
        res.status(500).json({ success: false, message: 'Error updating general settings' });
    }
});

router.get('/api/settings/notifications', isAdmin, async (req, res) => {
    try {
        const [settings] = await db.query('SELECT email_notifications, order_notifications, low_stock_alerts FROM settings WHERE id = 1');
        res.json({ success: true, settings: settings[0] || {} });
    } catch (error) {
        console.error('Error fetching notification settings:', error);
        res.status(500).json({ success: false, message: 'Error fetching notification settings' });
    }
});

router.put('/api/settings/notifications', isAdmin, async (req, res) => {
    try {
        const { email_notifications, order_notifications, low_stock_alerts } = req.body;
        
        await db.query(`
            UPDATE settings SET 
            email_notifications = ?, 
            order_notifications = ?, 
            low_stock_alerts = ?,
            updated_at = NOW()
            WHERE id = 1
        `, [email_notifications, order_notifications, low_stock_alerts]);

        res.json({ success: true, message: 'Notification settings updated successfully' });
    } catch (error) {
        console.error('Error updating notification settings:', error);
        res.status(500).json({ success: false, message: 'Error updating notification settings' });
    }
});

module.exports = router;