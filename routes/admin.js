const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdminAuth } = require('../middleware/adminAuth');

// ============================================
// API ROUTES FOR ADMIN MESSAGING SYSTEM
// ============================================

// Get all conversations with pagination and filtering
router.get('/api/messages/conversations', requireAdminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;
        const status = req.query.status || 'all';
        const priority = req.query.priority || 'all';
        
        let whereClause = '';
        const params = [];
        
        if (status !== 'all') {
            whereClause += ' WHERE c.status = ?';
            params.push(status);
        }
        
        if (priority !== 'all') {
            whereClause += whereClause ? ' AND' : ' WHERE';
            whereClause += ' c.priority = ?';
            params.push(priority);
        }
        
        // Get conversations with user info and unread counts
        const [conversations] = await db.query(`
            SELECT c.*,
                   u.name as user_name,
                   u.email as user_email,
                   u.profile_picture,
                   au.name as admin_name,
                   (SELECT COUNT(*) FROM messages m 
                    WHERE m.conversation_id = c.id AND m.sender_type = 'user' AND m.is_read = FALSE) as unread_count,
                   (SELECT message FROM messages m 
                    WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
                   (SELECT sender_type FROM messages m 
                    WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_sender_type,
                   (SELECT created_at FROM messages m 
                    WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_at
            FROM conversations c
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN admin_users au ON c.admin_id = au.id
            ${whereClause}
            ORDER BY 
                CASE WHEN c.priority = 'urgent' THEN 1 
                     WHEN c.priority = 'high' THEN 2 
                     WHEN c.priority = 'normal' THEN 3 
                     ELSE 4 END,
                c.last_message_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);
        
        // Get total count
        const [countResult] = await db.query(`
            SELECT COUNT(*) as total FROM conversations c
            ${whereClause}
        `, params);
        
        // Get total unread messages count
        const [unreadResult] = await db.query(`
            SELECT COUNT(*) as count FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE m.sender_type = 'user' AND m.is_read = FALSE
        `);
        
        res.json({
            success: true,
            conversations: conversations,
            total: countResult[0].total,
            page: page,
            limit: limit,
            totalUnread: unreadResult[0].count
        });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
    }
});

// Get single conversation with messages
router.get('/api/messages/conversations/:id', requireAdminAuth, async (req, res) => {
    try {
        const conversationId = req.params.id;
        const adminId = req.session.userId;
        
        // Get conversation with user and admin info
        const [conversations] = await db.query(`
            SELECT c.*,
                   u.name as user_name,
                   u.email as user_email,
                   u.profile_picture,
                   au.name as admin_name
            FROM conversations c
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN admin_users au ON c.admin_id = au.id
            WHERE c.id = ?
        `, [conversationId]);
        
        if (conversations.length === 0) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }
        
        // Get messages for this conversation
        const [messages] = await db.query(`
            SELECT m.*,
                   CASE WHEN m.sender_type = 'admin' 
                        THEN au.name 
                        ELSE u.name END as sender_name,
                   CASE WHEN m.sender_type = 'admin' 
                        THEN au.profile_picture 
                        ELSE u.profile_picture END as sender_avatar
            FROM messages m
            LEFT JOIN users u ON m.sender_type = 'user' AND m.sender_id = u.id
            LEFT JOIN admin_users au ON m.sender_type = 'admin' AND m.sender_id = au.id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at ASC
        `, [conversationId]);
        
        // Mark user messages as read
        await db.query(`
            UPDATE messages 
            SET is_read = TRUE, read_at = NOW() 
            WHERE conversation_id = ? AND sender_type = 'user' AND is_read = FALSE
        `, [conversationId]);
        
        res.json({
            success: true,
            conversation: conversations[0],
            messages: messages
        });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch conversation' });
    }
});

// Update conversation status
router.put('/api/messages/conversations/:id/status', requireAdminAuth, async (req, res) => {
    try {
        const conversationId = req.params.id;
        const { status } = req.body;
        
        const validStatuses = ['active', 'closed', 'archived'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid status. Must be: active, closed, or archived' 
            });
        }
        
        const updateData = { status: status };
        if (status === 'closed') {
            updateData.closed_at = new Date();
        }
        
        await db.query(`
            UPDATE conversations 
            SET status = ?, closed_at = ?
            WHERE id = ?
        `, [status, status === 'closed' ? new Date() : null, conversationId]);
        
        res.json({ 
            success: true, 
            message: `Conversation ${status === 'closed' ? 'closed' : 'updated'} successfully` 
        });
    } catch (error) {
        console.error('Error updating conversation status:', error);
        res.status(500).json({ success: false, message: 'Failed to update conversation status' });
    }
});

// Assign conversation to admin
router.put('/api/messages/conversations/:id/assign', requireAdminAuth, async (req, res) => {
    try {
        const conversationId = req.params.id;
        const adminId = req.session.userId;
        const { assign_to } = req.body;
        
        await db.query(`
            UPDATE conversations 
            SET admin_id = ?, updated_at = NOW()
            WHERE id = ?
        `, [assign_to || adminId, conversationId]);
        
        res.json({ 
            success: true, 
            message: 'Conversation assigned successfully' 
        });
    } catch (error) {
        console.error('Error assigning conversation:', error);
        res.status(500).json({ success: false, message: 'Failed to assign conversation' });
    }
});

// Delete conversation
router.delete('/api/messages/conversations/:id', requireAdminAuth, async (req, res) => {
    try {
        const conversationId = req.params.id;
        
        // Delete associated messages first
        await db.query('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
        
        // Delete conversation
        await db.query('DELETE FROM conversations WHERE id = ?', [conversationId]);
        
        res.json({ 
            success: true, 
            message: 'Conversation deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({ success: false, message: 'Failed to delete conversation' });
    }
});

// Mark all messages in conversation as read
router.put('/api/messages/conversations/:id/read-all', requireAdminAuth, async (req, res) => {
    try {
        const conversationId = req.params.id;
        
        const [result] = await db.query(`
            UPDATE messages 
            SET is_read = TRUE, read_at = NOW() 
            WHERE conversation_id = ? AND sender_type = 'user' AND is_read = FALSE
        `, [conversationId]);
        
        res.json({ 
            success: true, 
            message: 'All messages marked as read',
            updated: result.affectedRows
        });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ success: false, message: 'Failed to mark messages as read' });
    }
});

// Mark single message as read
router.put('/api/messages/messages/:id/read', requireAdminAuth, async (req, res) => {
    try {
        const messageId = req.params.id;
        
        await db.query(`
            UPDATE messages 
            SET is_read = TRUE, read_at = NOW() 
            WHERE id = ? AND sender_type = 'user'
        `, [messageId]);
        
        res.json({ 
            success: true, 
            message: 'Message marked as read' 
        });
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({ success: false, message: 'Failed to mark message as read' });
    }
});

// Get online user statuses
router.get('/api/messages/online-users', requireAdminAuth, async (req, res) => {
    try {
        const [onlineUsers] = await db.query(`
            SELECT u.id, u.name, u.profile_picture, os.last_seen
            FROM users u
            JOIN online_status os ON u.id = os.user_id
            WHERE os.is_online = TRUE
            ORDER BY os.last_seen DESC
        `);
        
        res.json({
            success: true,
            users: onlineUsers
        });
    } catch (error) {
        console.error('Error fetching online users:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch online users' });
    }
});

// Get messaging statistics
router.get('/api/messages/stats', requireAdminAuth, async (req, res) => {
    try {
        // Get conversation stats
        const [conversationStats] = await db.query(`
            SELECT 
                COUNT(*) as total_conversations,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_conversations,
                SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_conversations,
                SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_count,
                SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority_count
            FROM conversations
        `);
        
        // Get message stats
        const [messageStats] = await db.query(`
            SELECT 
                COUNT(*) as total_messages,
                SUM(CASE WHEN sender_type = 'user' AND is_read = FALSE THEN 1 ELSE 0 END) as unread_messages,
                COUNT(DISTINCT conversation_id) as active_conversation_count
            FROM messages
        `);
        
        // Get today's stats
        const [todayStats] = await db.query(`
            SELECT 
                COUNT(*) as today_conversations,
                (SELECT COUNT(*) FROM messages WHERE DATE(created_at) = CURDATE()) as today_messages
            FROM conversations
            WHERE DATE(started_at) = CURDATE()
        `);
        
        res.json({
            success: true,
            stats: {
                conversations: conversationStats[0],
                messages: messageStats[0],
                today: todayStats[0],
                unreadTotal: parseInt(messageStats[0].unread_messages) || 0
            }
        });
    } catch (error) {
        console.error('Error fetching message stats:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch message statistics' });
    }
});

// Get admin notifications
router.get('/api/messages/notifications', requireAdminAuth, async (req, res) => {
    try {
        const adminId = req.session.userId;
        const limit = parseInt(req.query.limit) || 10;
        
        const [notifications] = await db.query(`
            SELECT * FROM admin_notifications
            WHERE admin_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `, [adminId, limit]);
        
        // Get unread count
        const [unreadCount] = await db.query(`
            SELECT COUNT(*) as count FROM admin_notifications
            WHERE admin_id = ? AND is_read = FALSE
        `, [adminId]);
        
        res.json({
            success: true,
            notifications: notifications,
            unreadCount: unreadCount[0].count
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
});

// Mark all notifications as read
router.put('/api/messages/notifications/read-all', requireAdminAuth, async (req, res) => {
    try {
        const adminId = req.session.userId;
        
        await db.query(`
            UPDATE admin_notifications 
            SET is_read = TRUE, read_at = NOW() 
            WHERE admin_id = ? AND is_read = FALSE
        `, [adminId]);
        
        res.json({ 
            success: true, 
            message: 'All notifications marked as read' 
        });
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        res.status(500).json({ success: false, message: 'Failed to mark notifications as read' });
    }
});

// Check for new messages (for polling fallback)
router.get('/api/messages/check-new', requireAdminAuth, async (req, res) => {
    try {
        const adminId = req.session.userId;
        
        // Get count of new unread messages
        const [newMessages] = await db.query(`
            SELECT COUNT(*) as count 
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE c.admin_id = ? AND m.sender_type = 'user' AND m.is_read = FALSE
            AND m.created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)
        `, [adminId]);
        
        const hasNewMessages = newMessages[0].count > 0;
        
        // Get preview of new messages if any
        let newMessagePreviews = [];
        if (hasNewMessages) {
            const [previews] = await db.query(`
                SELECT m.id, m.conversation_id, m.content, m.created_at, u.name as sender_name
                FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                JOIN users u ON m.sender_id = u.id
                WHERE c.admin_id = ? AND m.sender_type = 'user' AND m.is_read = FALSE
                AND m.created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)
                ORDER BY m.created_at DESC
                LIMIT 5
            `, [adminId]);
            
            newMessagePreviews = previews;
        }
        
        res.json({
            success: true,
            hasNewMessages: hasNewMessages,
            newCount: newMessages[0].count,
            messages: newMessagePreviews
        });
    } catch (error) {
        console.error('Error checking for new messages:', error);
        res.status(500).json({ success: false, message: 'Failed to check for new messages' });
    }
});

// Log errors to server
router.post('/api/messages/logs', requireAdminAuth, async (req, res) => {
    try {
        const { error, stack, context, url, userAgent } = req.body;
        
        await db.query(`
            INSERT INTO admin_logs (admin_id, error_type, error_message, stack_trace, context, url, user_agent, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `, [req.session.userId, 'javascript_error', error, stack, context, url, userAgent]);
        
        res.json({ success: true });
    } catch (logError) {
        console.error('Failed to log error:', logError);
        res.status(500).json({ success: false });
    }
});

// Dashboard
router.get('/dashboard', requireAdminAuth, async (req, res) => {
    try {
        // Get basic statistics
        const [orderStats] = await db.query('SELECT COUNT(*) as totalOrders FROM orders');
        const [userStats] = await db.query('SELECT COUNT(*) as totalUsers FROM users');
        const [productStats] = await db.query('SELECT COUNT(*) as totalProducts FROM products');
        const [messageStats] = await db.query('SELECT COUNT(*) as totalMessages FROM contact_messages');

        // Get auction statistics
        const [activeAuctions] = await db.query(`
            SELECT COUNT(*) as count FROM auctions
            WHERE status = 'active' AND end_date > NOW()
        `);

        // Get countdown statistics
        const [activeCountdowns] = await db.query(`
            SELECT COUNT(*) as count FROM countdown_events
            WHERE is_active = 1 AND end_date > NOW()
        `);

        // Get recent orders
        const [recentOrders] = await db.query(`
            SELECT o.id, o.total_amount, o.status, o.created_at,
                   u.name as customer_name, u.email as customer_email
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
            LIMIT 5
        `);

        // Get recent messages
        const [recentMessages] = await db.query(`
            SELECT name, email, subject, created_at
            FROM contact_messages
            ORDER BY created_at DESC
            LIMIT 5
        `);

        // Get top products
        const [topProducts] = await db.query(`
            SELECT p.id, p.name, p.price, p.image_url,
                   COUNT(oi.product_id) as sales_count,
                   SUM(oi.quantity * oi.price) as total_revenue
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
            GROUP BY p.id, p.name, p.price, p.image_url
            ORDER BY total_revenue DESC
            LIMIT 5
        `);

        const stats = {
            totalOrders: orderStats[0].totalOrders,
            totalUsers: userStats[0].totalUsers,
            totalProducts: productStats[0].totalProducts,
            totalMessages: messageStats[0].totalMessages,
            activeAuctions: activeAuctions[0].count,
            activeCountdowns: activeCountdowns[0].count
        };

        res.render('admin/dashboard', {
            title: 'Admin Dashboard - OMUNJU SHOPPERS',
            currentPage: 'dashboard',
            stats,
            recentOrders,
            recentMessages,
            topProducts
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        // Fallback to basic dashboard without stats
        res.render('admin/dashboard', {
            title: 'Admin Dashboard - OMUNJU SHOPPERS',
            currentPage: 'dashboard',
            stats: {
                totalOrders: 0,
                totalUsers: 0,
                totalProducts: 0,
                totalMessages: 0,
                activeAuctions: 0,
                activeCountdowns: 0
            },
            recentOrders: [],
            recentMessages: [],
            topProducts: []
        });
    }
});

// Products Management
router.get('/products', requireAdminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        // Get total count
        const [countResult] = await db.query('SELECT COUNT(*) as total FROM products');
        const totalProducts = countResult[0].total;
        const totalPages = Math.ceil(totalProducts / limit);

        // Get categories for filter dropdown
        const [categories] = await db.query('SELECT id, name FROM categories WHERE is_active = 1 ORDER BY name');

        // Get products with pagination
        const [products] = await db.query(`
            SELECT p.*,
                   c.name as category_name,
                   (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.id) as total_orders,
                   (SELECT COUNT(*) FROM product_reviews pr WHERE pr.product_id = p.id) as total_reviews,
                   (SELECT AVG(rating) FROM product_reviews pr WHERE pr.product_id = p.id) as avg_rating
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        res.render('admin/products', {
            title: 'Product Management - OMUNJU SHOPPERS',
            currentPage: 'products',
            products: products,
            categories: categories,
            page: page,
            totalPages: totalPages,
            totalProducts: totalProducts
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).render('error', { message: 'Failed to load products' });
    }
});

// Categories Management
router.get('/categories', requireAdminAuth, async (req, res) => {
    try {
        // Get all categories with product counts
        const [categories] = await db.query(`
            SELECT c.*,
                   COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id
            GROUP BY c.id
            ORDER BY c.sort_order, c.name
        `);

        res.render('admin/categories', {
            title: 'Category Management - OMUNJU SHOPPERS',
            currentPage: 'categories',
            categories: categories
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).render('error', { message: 'Failed to load categories' });
    }
});

// Create category
router.post('/categories', requireAdminAuth, async (req, res) => {
    try {
        const { name, description, image_url, parent_id, sort_order, is_active } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        // Insert category
        const [result] = await db.query(`
            INSERT INTO categories (name, description, image_url, parent_id, sort_order, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            name,
            description || null,
            image_url || null,
            parent_id || null,
            sort_order || 0,
            is_active ? 1 : 0
        ]);

        // Send notification to all users about new category
        const NotificationService = require('../utils/notificationService');
        await NotificationService.sendToAllUsers(
            `New Category Added: ${name}`,
            `Check out our new ${name} category with amazing products!`,
            {
                type: 'new_product',
                priority: 'medium'
            }
        );

        res.json({
            success: true,
            message: 'Category created successfully',
            categoryId: result.insertId
        });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create category'
        });
    }
});

// Update category
router.put('/categories/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, image_url, parent_id, sort_order, is_active } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        // Update category
        await db.query(`
            UPDATE categories SET
                name = ?, description = ?, image_url = ?,
                parent_id = ?, sort_order = ?, is_active = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            name,
            description || null,
            image_url || null,
            parent_id || null,
            sort_order || 0,
            is_active ? 1 : 0,
            id
        ]);

        res.json({
            success: true,
            message: 'Category updated successfully'
        });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update category'
        });
    }
});

// Delete category
router.delete('/categories/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if category has products
        const [products] = await db.query('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [id]);
        if (products[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category with existing products. Move or delete products first.'
            });
        }

        // Delete category
        await db.query('DELETE FROM categories WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete category'
        });
    }
});

// Get single category
router.get('/categories/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const [categories] = await db.query('SELECT * FROM categories WHERE id = ?', [id]);

        if (categories.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            category: categories[0]
        });
    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category'
        });
    }
});

// Orders Management
router.get('/orders', requireAdminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        // Get total count
        const [countResult] = await db.query('SELECT COUNT(*) as total FROM orders');
        const totalOrders = countResult[0].total;
        const totalPages = Math.ceil(totalOrders / limit);

        // Get orders with pagination
        const [orders] = await db.query(`
            SELECT o.*,
                   u.name as customer_name,
                   u.email as customer_email
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        res.render('admin/orders', {
            title: 'Order Management - OMUNJU SHOPPERS',
            currentPage: 'orders',
            orders: orders,
            page: page,
            totalPages: totalPages,
            totalOrders: totalOrders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('error', { message: 'Failed to load orders' });
    }
});

// Customers Management
router.get('/customers', requireAdminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        // Get total count
        const [countResult] = await db.query('SELECT COUNT(*) as total FROM users');
        const totalCustomers = countResult[0].total;
        const totalPages = Math.ceil(totalCustomers / limit);

        // Get customers with pagination
        const [customers] = await db.query(
            'SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );

        res.render('admin/customers', {
            title: 'Customer Management - OMUNJU SHOPPERS',
            currentPage: 'customers',
            customers: customers,
            page: page,
            totalPages: totalPages,
            totalCustomers: totalCustomers,
            limit: limit
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).render('error', { message: 'Failed to load customers' });
    }
});

// Promotions & Deals
router.get('/promotions', requireAdminAuth, async (req, res) => {
    try {
        // Get all products for promotion selection
        const [products] = await db.query(`
            SELECT id, name, price, stock, image_url, is_featured
            FROM products
            WHERE is_active = TRUE
            ORDER BY name ASC
        `);

        res.render('admin/promotions', {
            title: 'Promotions & Deals - OMUNJU SHOPPERS',
            currentPage: 'promotions',
            products: products || [],
            page: parseInt(req.query.page) || 1,
            totalPages: 1
        });
    } catch (error) {
        console.error('Error loading promotions:', error);
        res.status(500).render('error', { message: 'Failed to load promotions page' });
    }
});

// Messages & Conversations
router.get('/messages', requireAdminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        // Get conversations with user info and unread counts
        const [conversations] = await db.query(`
            SELECT c.*,
                   u.name as user_name,
                   u.email as user_email,
                   u.profile_picture,
                   (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.status != 'seen' AND m.sender_type = 'user') as unread_count,
                   (SELECT message FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
                   (SELECT sender_type FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_sender_type
            FROM conversations c
            LEFT JOIN users u ON c.user_id = u.id
            ORDER BY c.last_message_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        // Get total unread messages count
        const [unreadResult] = await db.query(`
            SELECT COUNT(*) as count FROM messages
            WHERE sender_type = 'user' AND status != 'seen'
        `);

        // Get contact form messages for backward compatibility
        const [contactMessages] = await db.query(`
            SELECT * FROM contact_messages
            ORDER BY created_at DESC
            LIMIT 10
        `);

        res.render('admin/messages', {
            title: 'Messages & Support - OMUNJU SHOPPERS',
            currentPage: 'messages',
            conversations: conversations,
            contactMessages: contactMessages,
            unreadCount: unreadResult[0].count,
            activeConversation: req.query.conversation || null,
            page: page,
            limit: limit
        });
    } catch (error) {
        console.error('Error fetching messages data:', error);
        res.status(500).render('error', { message: 'Failed to load messages data' });
    }
});

// Get specific conversation for admin
router.get('/conversations/:id', requireAdminAuth, async (req, res) => {
    try {
        const conversationId = req.params.id;

        // Get conversation details
        const [conversations] = await db.query(`
            SELECT c.*,
                   u.name as user_name,
                   u.email as user_email,
                   u.profile_picture
            FROM conversations c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `, [conversationId]);

        if (conversations.length === 0) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        // Get messages
        const [messages] = await db.query(`
            SELECT m.*,
                   u.name as sender_name,
                   u.profile_picture as sender_avatar
            FROM messages m
            LEFT JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at ASC
        `, [conversationId]);

        // Mark user messages as read
        await db.query(
            'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_type = ?',
            [conversationId, 'user']
        );

        res.json({
            success: true,
            conversation: conversations[0],
            messages: messages
        });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch conversation' });
    }
});

// Send message in conversation (admin)
router.post('/conversations/:id/messages', requireAdminAuth, async (req, res) => {
    try {
        const conversationId = req.params.id;
        const adminId = req.session.userId;
        const { message, messageType = 'text' } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        // Insert message
        const [messageResult] = await db.query(`
            INSERT INTO messages (conversation_id, sender_id, sender_type, message_type, content)
            VALUES (?, ?, 'admin', ?, ?)
        `, [conversationId, adminId, messageType, message]);

        // Update conversation
        await db.query(`
            UPDATE conversations
            SET last_message_at = NOW(),
                status = CASE WHEN status = 'closed' THEN 'active' ELSE status END
            WHERE id = ?
        `, [conversationId]);

        // Get the inserted message with admin info
        const [messages] = await db.query(`
            SELECT m.*,
                   u.name as sender_name,
                   u.profile_picture as sender_avatar
            FROM messages m
            LEFT JOIN users u ON m.sender_id = u.id
            WHERE m.id = ?
        `, [messageResult.insertId]);

        res.json({
            success: true,
            message: 'Message sent successfully',
            messageData: messages[0]
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
});

// Update conversation status
router.put('/conversations/:id/status', requireAdminAuth, async (req, res) => {
    try {
        const conversationId = req.params.id;
        const { status, priority, admin_id } = req.body;

        const updateData = {};
        const params = [];

        if (status) {
            updateData.status = status;
            params.push(status);
        }

        if (priority) {
            updateData.priority = priority;
            params.push(priority);
        }

        if (admin_id !== undefined) {
            updateData.admin_id = admin_id;
            params.push(admin_id);
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: 'No valid fields to update' });
        }

        params.push(conversationId);

        const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');

        await db.query(
            `UPDATE conversations SET ${setClause} WHERE id = ?`,
            params
        );

        res.json({ success: true, message: 'Conversation updated successfully' });
    } catch (error) {
        console.error('Error updating conversation:', error);
        res.status(500).json({ success: false, message: 'Failed to update conversation' });
    }
});

// Delete conversation
router.delete('/conversations/:id', requireAdminAuth, async (req, res) => {
    try {
        const conversationId = req.params.id;

        // Messages will be deleted automatically due to CASCADE constraint
        await db.query('DELETE FROM conversations WHERE id = ?', [conversationId]);

        res.json({ success: true, message: 'Conversation deleted successfully' });
    } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({ success: false, message: 'Failed to delete conversation' });
    }
});

// Logs & Security Monitoring
router.get('/logs', requireAdminAuth, async (req, res) => {
    try {
        const {
            type = 'all',
            level = 'all',
            startDate,
            endDate,
            user,
            ip,
            page = 1,
            limit = 50
        } = req.query;

        const offset = (page - 1) * limit;

        // Get security metrics
        const [failedLoginsResult] = await db.query(`
            SELECT COUNT(*) as count FROM login_attempts
            WHERE success = 0 AND attempted_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `);

        const [suspiciousActivitiesResult] = await db.query(`
            SELECT COUNT(*) as count FROM security_logs
            WHERE level = 'warning' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `);

        const [activeSessionsResult] = await db.query(`
            SELECT COUNT(*) as count FROM user_sessions
            WHERE last_activity >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
        `);

        const [blockedIPsResult] = await db.query(`
            SELECT COUNT(*) as count FROM blocked_ips
            WHERE blocked_until > NOW() OR blocked_until IS NULL
        `);

        // Build WHERE conditions for filtering
        let whereConditions = [];
        let params = [];

        if (startDate) {
            whereConditions.push('created_at >= ?');
            params.push(startDate + ' 00:00:00');
        }
        if (endDate) {
            whereConditions.push('created_at <= ?');
            params.push(endDate + ' 23:59:59');
        }
        if (level !== 'all') {
            whereConditions.push('level = ?');
            params.push(level);
        }
        if (user) {
            whereConditions.push('(user_id = ? OR user_id IN (SELECT id FROM users WHERE email LIKE ?))');
            params.push(user, `%${user}%`);
        }
        if (ip) {
            whereConditions.push('ip LIKE ?');
            params.push(`%${ip}%`);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        // Get filtered logs from different categories
        let securityLogs = [], activityLogs = [], errorLogs = [], accessLogs = [];

        if (type === 'all' || type === 'security') {
            const [securityResult] = await db.query(`
                SELECT * FROM security_logs
                ${whereClause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);
            securityLogs = securityResult;
        }

        if (type === 'all' || type === 'activity') {
            const [activityResult] = await db.query(`
                SELECT * FROM activity_logs
                ${whereClause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);
            activityLogs = activityResult;
        }

        if (type === 'all' || type === 'error') {
            const [errorResult] = await db.query(`
                SELECT * FROM error_logs
                ${whereClause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);
            errorLogs = errorResult;
        }

        if (type === 'all' || type === 'access') {
            const [accessResult] = await db.query(`
                SELECT * FROM access_logs
                ${whereClause.replace('created_at', 'timestamp')}
                ORDER BY timestamp DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);
            accessLogs = accessResult;
        }

        const security = {
            failedLogins: failedLoginsResult[0].count,
            suspiciousActivities: suspiciousActivitiesResult[0].count,
            activeSessions: activeSessionsResult[0].count,
            blockedIPs: blockedIPsResult[0].count
        };

        const logs = {
            security: securityLogs,
            activity: activityLogs,
            errors: errorLogs,
            access: accessLogs
        };

        res.render('admin/logs', {
            title: 'Logs & Security Monitoring - OMUNJU SHOPPERS',
            currentPage: 'logs',
            security,
            logs,
            filters: { type, level, startDate, endDate, user, ip, page, limit }
        });
    } catch (error) {
        console.error('Error fetching logs data:', error);
        res.status(500).render('error', { message: 'Failed to load logs data' });
    }
});

// Get individual log details
router.get('/logs/:type/:id', requireAdminAuth, async (req, res) => {
    try {
        const { type, id } = req.params;
        let tableName, timeField;

        switch (type) {
            case 'security':
                tableName = 'security_logs';
                timeField = 'created_at';
                break;
            case 'activity':
                tableName = 'activity_logs';
                timeField = 'created_at';
                break;
            case 'error':
                tableName = 'error_logs';
                timeField = 'created_at';
                break;
            case 'access':
                tableName = 'access_logs';
                timeField = 'timestamp';
                break;
            default:
                return res.status(400).json({ success: false, message: 'Invalid log type' });
        }

        const [logs] = await db.query(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);

        if (logs.length === 0) {
            return res.status(404).json({ success: false, message: 'Log entry not found' });
        }

        res.json({ success: true, log: logs[0] });
    } catch (error) {
        console.error('Error fetching log details:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch log details' });
    }
});

// Delete individual log entry
router.delete('/logs/:type/:id', requireAdminAuth, async (req, res) => {
    try {
        const { type, id } = req.params;
        let tableName;

        switch (type) {
            case 'security':
                tableName = 'security_logs';
                break;
            case 'activity':
                tableName = 'activity_logs';
                break;
            case 'error':
                tableName = 'error_logs';
                break;
            case 'access':
                tableName = 'access_logs';
                break;
            default:
                return res.status(400).json({ success: false, message: 'Invalid log type' });
        }

        const [result] = await db.query(`DELETE FROM ${tableName} WHERE id = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Log entry not found' });
        }

        res.json({ success: true, message: 'Log entry deleted successfully' });
    } catch (error) {
        console.error('Error deleting log entry:', error);
        res.status(500).json({ success: false, message: 'Failed to delete log entry' });
    }
});

// Bulk delete logs
router.post('/logs/bulk-delete', requireAdminAuth, async (req, res) => {
    try {
        const { logIds, logType } = req.body;

        if (!logIds || !Array.isArray(logIds) || logIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No log IDs provided' });
        }

        let tableName;
        switch (logType) {
            case 'security':
                tableName = 'security_logs';
                break;
            case 'activity':
                tableName = 'activity_logs';
                break;
            case 'error':
                tableName = 'error_logs';
                break;
            case 'access':
                tableName = 'access_logs';
                break;
            default:
                return res.status(400).json({ success: false, message: 'Invalid log type' });
        }

        const placeholders = logIds.map(() => '?').join(',');
        const [result] = await db.query(`DELETE FROM ${tableName} WHERE id IN (${placeholders})`, logIds);

        res.json({
            success: true,
            message: `${result.affectedRows} log entries deleted successfully`
        });
    } catch (error) {
        console.error('Error bulk deleting logs:', error);
        res.status(500).json({ success: false, message: 'Failed to delete log entries' });
    }
});

// Clear logs
router.post('/logs/clear', requireAdminAuth, async (req, res) => {
    try {
        const { days = 7 } = req.body;

        // Clear old logs (keep specified days)
        await db.query('DELETE FROM security_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)', [days]);
        await db.query('DELETE FROM activity_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)', [days]);
        await db.query('DELETE FROM error_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)', [days]);
        await db.query('DELETE FROM access_logs WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)', [days]);
        await db.query('DELETE FROM login_attempts WHERE attempted_at < DATE_SUB(NOW(), INTERVAL ? DAY)', [days]);
        await db.query('DELETE FROM user_sessions WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)', [days]);

        res.json({ success: true, message: `Logs older than ${days} days cleared successfully` });
    } catch (error) {
        console.error('Error clearing logs:', error);
        res.status(500).json({ success: false, message: 'Failed to clear logs' });
    }
});

// Export logs
router.get('/logs/export/:type', requireAdminAuth, async (req, res) => {
    try {
        const { type } = req.params;
        const { startDate, endDate, format = 'json' } = req.query;

        let tableName, timeField;
        switch (type) {
            case 'security':
                tableName = 'security_logs';
                timeField = 'created_at';
                break;
            case 'activity':
                tableName = 'activity_logs';
                timeField = 'created_at';
                break;
            case 'error':
                tableName = 'error_logs';
                timeField = 'created_at';
                break;
            case 'access':
                tableName = 'access_logs';
                timeField = 'timestamp';
                break;
            default:
                return res.status(400).json({ success: false, message: 'Invalid log type' });
        }

        let query = `SELECT * FROM ${tableName}`;
        let params = [];

        if (startDate || endDate) {
            query += ` WHERE`;
            if (startDate) {
                query += ` ${timeField} >= ?`;
                params.push(startDate + ' 00:00:00');
            }
            if (endDate) {
                if (startDate) query += ` AND`;
                query += ` ${timeField} <= ?`;
                params.push(endDate + ' 23:59:59');
            }
        }

        query += ` ORDER BY ${timeField} DESC`;

        const [logs] = await db.query(query, params);

        if (format === 'csv') {
            // Convert to CSV
            if (logs.length === 0) {
                return res.status(404).json({ success: false, message: 'No logs found' });
            }

            const headers = Object.keys(logs[0]);
            const csvContent = [
                headers.join(','),
                ...logs.map(log => headers.map(header => `"${log[header] || ''}"`).join(','))
            ].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${type}_logs_${new Date().toISOString().split('T')[0]}.csv"`);
            res.send(csvContent);
        } else {
            // JSON format
            res.json({
                success: true,
                type,
                count: logs.length,
                logs
            });
        }
    } catch (error) {
        console.error('Error exporting logs:', error);
        res.status(500).json({ success: false, message: 'Failed to export logs' });
    }
});

// Analytics & Reports
router.get('/analytics', requireAdminAuth, async (req, res) => {
    try {
        // Get total revenue
        const [revenueResult] = await db.query(`
            SELECT COALESCE(SUM(total_amount), 0) as totalRevenue
            FROM orders
            WHERE status = 'completed'
        `);
        const totalRevenue = revenueResult[0].totalRevenue;

        // Get total orders
        const [ordersResult] = await db.query('SELECT COUNT(*) as totalOrders FROM orders');
        const totalOrders = ordersResult[0].totalOrders;

        // Get total users
        const [usersResult] = await db.query('SELECT COUNT(*) as totalUsers FROM users');
        const totalUsers = usersResult[0].totalUsers;

        // Get average order value
        const [avgOrderResult] = await db.query(`
            SELECT COALESCE(AVG(total_amount), 0) as avgOrderValue
            FROM orders
            WHERE status = 'completed'
        `);
        const avgOrderValue = Math.round(avgOrderResult[0].avgOrderValue * 100) / 100;

        // Get recent orders (last 10)
        const [recentOrders] = await db.query(`
            SELECT
                o.id,
                o.total_amount,
                o.status,
                o.created_at,
                u.name as customer_name
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
            LIMIT 10
        `);

        // Get top customers
        const [topCustomers] = await db.query(`
            SELECT
                u.name,
                u.email,
                COUNT(o.id) as order_count,
                COALESCE(SUM(o.total_amount), 0) as total_spent,
                MAX(o.created_at) as last_order
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'completed'
            GROUP BY u.id, u.name, u.email
            HAVING order_count > 0
            ORDER BY total_spent DESC
            LIMIT 10
        `);

        // Prepare chart data - Sales data (last 12 months)
        const salesLabels = [];
        const salesData = [];
        const currentDate = new Date();

        for (let i = 11; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthName = date.toLocaleString('default', { month: 'short' });
            const year = date.getFullYear();
            salesLabels.push(`${monthName} ${year}`);

            const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
            const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const [monthSales] = await db.query(`
                SELECT COALESCE(SUM(total_amount), 0) as sales
                FROM orders
                WHERE status = 'completed'
                AND created_at >= ? AND created_at <= ?
            `, [startDate, endDate]);

            salesData.push(Math.round(monthSales[0].sales));
        }

        // Revenue data (same as sales for now, but could be different)
        const revenueLabels = [...salesLabels];
        const revenueData = [...salesData];

        // Order status distribution
        const [orderStatusResult] = await db.query(`
            SELECT status, COUNT(*) as count
            FROM orders
            GROUP BY status
        `);

        const orderStatusLabels = [];
        const orderStatusData = [];

        orderStatusResult.forEach(row => {
            orderStatusLabels.push(row.status.charAt(0).toUpperCase() + row.status.slice(1));
            orderStatusData.push(row.count);
        });

        // Top products
        const [topProductsResult] = await db.query(`
            SELECT
                p.name,
                SUM(oi.quantity) as total_quantity
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status = 'completed'
            GROUP BY p.id, p.name
            ORDER BY total_quantity DESC
            LIMIT 10
        `);

        const topProductsLabels = [];
        const topProductsData = [];

        topProductsResult.forEach(row => {
            topProductsLabels.push(row.name.length > 20 ? row.name.substring(0, 20) + '...' : row.name);
            topProductsData.push(row.total_quantity);
        });

        const analytics = {
            totalRevenue: Math.round(totalRevenue),
            totalOrders,
            totalUsers,
            avgOrderValue,
            recentOrders,
            topCustomers,
            salesLabels,
            salesData,
            revenueLabels,
            revenueData,
            orderStatusLabels,
            orderStatusData,
            topProductsLabels,
            topProductsData
        };

        res.render('admin/analytics', {
            title: 'Analytics & Reports - OMUNJU SHOPPERS',
            currentPage: 'analytics',
            analytics
        });
    } catch (error) {
        console.error('Error fetching analytics data:', error);
        res.status(500).render('error', { message: 'Failed to load analytics data' });
    }
});

// Send reply to contact message
router.post('/messages/:id/reply', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { subject, message } = req.body;

        if (!subject || !message) {
            return res.status(400).json({ success: false, message: 'Subject and message are required' });
        }

        // Get the contact message details
        const [messages] = await db.query(
            'SELECT * FROM contact_messages WHERE id = ?',
            [id]
        );

        if (messages.length === 0) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }

        const contactMessage = messages[0];

        // Update message status to replied
        await db.query(
            'UPDATE contact_messages SET status = ?, replied_at = NOW() WHERE id = ?',
            ['replied', id]
        );

        // Send notification to user if they are registered
        if (contactMessage.user_id) {
            const NotificationService = require('../utils/notificationService');
            await NotificationService.sendToUser(
                contactMessage.user_id,
                subject,
                message,
                {
                    type: 'support',
                    priority: 'high'
                }
            );
        }

        res.json({ success: true, message: 'Reply sent successfully' });
    } catch (error) {
        console.error('Error sending reply:', error);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Update message status
router.put('/messages/:id/status', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'replied', 'closed'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        await db.query(
            'UPDATE contact_messages SET status = ? WHERE id = ?',
            [status, id]
        );

        res.json({ success: true, message: 'Status updated successfully' });
    } catch (error) {
        console.error('Error updating message status:', error);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Delete message
router.delete('/messages/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        await db.query('DELETE FROM contact_messages WHERE id = ?', [id]);

        res.json({ success: true, message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Product CRUD operations
router.post('/products', requireAdminAuth, async (req, res) => {
    try {
        const {
            name, sku, description, cost_price, price, discount, stock,
            low_stock_threshold, category_id, weight, dimensions, tags,
            is_active, is_featured, is_new
        } = req.body;

        // Validate required fields
        if (!name || !sku || !price || !stock || !category_id) {
            return res.status(400).json({
                success: false,
                message: 'Name, SKU, price, stock, and category are required'
            });
        }

        // Insert product
        const [result] = await db.query(`
            INSERT INTO products (
                name, sku, description, cost_price, price, discount, stock,
                low_stock_threshold, category_id, weight, dimensions, tags,
                is_active, is_featured, is_new
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            name, sku, description, cost_price || 0, price, discount || 0, stock,
            low_stock_threshold || 5, category_id, weight || 0, dimensions, tags,
            is_active ? 1 : 0, is_featured ? 1 : 0, is_new ? 1 : 0
        ]);

        res.json({
            success: true,
            message: 'Product created successfully',
            productId: result.insertId
        });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create product'
        });
    }
});

router.get('/products/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const [products] = await db.query(`
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?
        `, [id]);

        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            product: products[0]
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product'
        });
    }
});

router.put('/products/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, sku, description, cost_price, price, discount, stock,
            low_stock_threshold, category_id, weight, dimensions, tags,
            is_active, is_featured, is_new
        } = req.body;

        // Validate required fields
        if (!name || !sku || !price || !stock || !category_id) {
            return res.status(400).json({
                success: false,
                message: 'Name, SKU, price, stock, and category are required'
            });
        }

        // Update product
        await db.query(`
            UPDATE products SET
                name = ?, sku = ?, description = ?, cost_price = ?, price = ?,
                discount = ?, stock = ?, low_stock_threshold = ?, category_id = ?,
                weight = ?, dimensions = ?, tags = ?, is_active = ?,
                is_featured = ?, is_new = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            name, sku, description, cost_price || 0, price, discount || 0, stock,
            low_stock_threshold || 5, category_id, weight || 0, dimensions, tags,
            is_active ? 1 : 0, is_featured ? 1 : 0, is_new ? 1 : 0, id
        ]);

        res.json({
            success: true,
            message: 'Product updated successfully'
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update product'
        });
    }
});

router.delete('/products/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if product has orders
        const [orderItems] = await db.query('SELECT COUNT(*) as count FROM order_items WHERE product_id = ?', [id]);
        if (orderItems[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete product with existing orders. Consider deactivating it instead.'
            });
        }

        // Delete product
        await db.query('DELETE FROM products WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete product'
        });
    }
});

// Update order status (admin)
router.put('/orders/:orderId/status', requireAdminAuth, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, delivery_agent, tracking_number, estimated_delivery } = req.body;

        const validStatuses = [
            'incomplete_order', 'pending', 'paid', 'confirmed', 'processing',
            'shipped', 'delivery_requested', 'delivered', 'cancelled'
        ];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        // Update order status
        let updateData = { status };
        let updateFields = ['status = ?'];
        let updateValues = [status];

        if (delivery_agent) {
            updateFields.push('delivery_agent = ?');
            updateValues.push(delivery_agent);
        }

        if (tracking_number) {
            updateFields.push('tracking_number = ?');
            updateValues.push(tracking_number);
        }

        if (estimated_delivery) {
            updateFields.push('estimated_delivery = ?');
            updateValues.push(estimated_delivery);
        }

        if (status === 'delivered') {
            updateFields.push('actual_delivery_date = CURRENT_TIMESTAMP');
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(orderId);

        await db.query(
            `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        // If marking as delivered, update delivery request
        if (status === 'delivered') {
            await db.query(
                'UPDATE delivery_requests SET status = ?, delivered_at = CURRENT_TIMESTAMP WHERE order_id = ?',
                ['delivered', orderId]
            );
        }

        // Send notification to user
        const NotificationService = require('../utils/notificationService');
        const [orderInfo] = await db.query(
            'SELECT user_id, total_amount FROM orders WHERE id = ?',
            [orderId]
        );

        if (orderInfo.length > 0) {
            const statusMessages = {
                'processing': 'Your order is now being processed',
                'shipped': 'Your order has been shipped',
                'delivered': 'Your order has been delivered successfully'
            };

            if (statusMessages[status]) {
                await NotificationService.sendToUser(
                    orderInfo[0].user_id,
                    `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                    statusMessages[status],
                    { type: 'order', priority: 'high' }
                );
            }
        }

        res.json({
            success: true,
            message: `Order status updated to ${status}`
        });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status'
        });
    }
});

// Get delivery requests (admin)
router.get('/delivery-requests', requireAdminAuth, async (req, res) => {
    try {
        const [deliveryRequests] = await db.query(`
            SELECT dr.*,
                   o.id as order_id,
                   o.total_amount,
                   u.name as customer_name,
                   u.email as customer_email
            FROM delivery_requests dr
            JOIN orders o ON dr.order_id = o.id
            JOIN users u ON dr.user_id = u.id
            ORDER BY dr.created_at DESC
        `);

        res.json({
            success: true,
            deliveryRequests
        });
    } catch (error) {
        console.error('Get delivery requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch delivery requests'
        });
    }
});

// Assign delivery agent
router.put('/delivery-requests/:requestId/assign', requireAdminAuth, async (req, res) => {
    try {
        const { requestId } = req.params;
        const { delivery_agent, tracking_number, estimated_delivery } = req.body;

        await db.query(`
            UPDATE delivery_requests SET
                delivery_agent = ?,
                tracking_number = ?,
                estimated_delivery = ?,
                status = 'assigned',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [delivery_agent, tracking_number, estimated_delivery, requestId]);

        // Update order status
        const [deliveryRequest] = await db.query(
            'SELECT order_id FROM delivery_requests WHERE id = ?',
            [requestId]
        );

        if (deliveryRequest.length > 0) {
            await db.query(
                'UPDATE orders SET status = ?, delivery_agent = ?, tracking_number = ?, estimated_delivery = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                ['shipped', delivery_agent, tracking_number, estimated_delivery, deliveryRequest[0].order_id]
            );
        }

        res.json({
            success: true,
            message: 'Delivery agent assigned successfully'
        });
    } catch (error) {
        console.error('Assign delivery agent error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign delivery agent'
        });
    }
});

// Admin Users & Roles
router.get('/admin-users', requireAdminAuth, (req, res) => {
    res.render('admin/admin-users', {
        title: 'Admin Users & Roles - OMUNJU SHOPPERS',
        currentPage: 'admin-users'
    });
});

// Admin Profile
router.get('/profile', async (req, res) => {
    try {
        // Fetch fresh admin data from database
        const [adminData] = await db.query(
            'SELECT id, name, email, profile_picture FROM admins WHERE id = ?',
            [req.session.adminId]
        );

        if (adminData.length === 0) {
            return res.redirect('/admin/login');
        }

        const admin = adminData[0];

        // Update session with latest data
        req.session.adminName = admin.name;
        req.session.adminEmail = admin.email;
        req.session.adminProfilePicture = admin.profile_picture;

        res.render('admin/profile', {
            title: 'Admin Profile - OMUNJU SHOPPERS',
            currentPage: 'profile',
            admin: admin
        });
    } catch (error) {
        console.error('Error fetching admin profile:', error);
        res.status(500).render('error', { message: 'Failed to load profile' });
    }
});

// Update admin profile
router.put('/profile', async (req, res) => {
    try {
        const adminId = req.session.adminId;
        const { name, currentPassword, newPassword } = req.body;

        // Basic validation
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            });
        }

        let updateData = { name };
        let passwordChanged = false;

        // Handle password change
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is required to change password'
                });
            }

            // Verify current password
            const [admins] = await db.query('SELECT password FROM admins WHERE id = ?', [adminId]);
            if (admins.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Admin not found'
                });
            }

            const bcrypt = require('bcryptjs');
            const isValidPassword = await bcrypt.compare(currentPassword, admins[0].password);
            if (!isValidPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            updateData.password = hashedPassword;
            passwordChanged = true;
        }

        // Update admin profile
        await db.query(
            'UPDATE admins SET name = ? WHERE id = ?',
            [name, adminId]
        );

        // Update password if changed
        if (passwordChanged) {
            await db.query(
                'UPDATE admins SET password = ? WHERE id = ?',
                [updateData.password, adminId]
            );
        }

        // Update session
        req.session.adminName = name;

        res.json({
            success: true,
            message: 'Profile updated successfully',
            passwordChanged: passwordChanged
        });
    } catch (error) {
        console.error('Update admin profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// Admin profile picture upload
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for admin profile picture uploads
const adminStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/uploads/admin-profiles');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'admin-profile-' + req.session.adminId + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const adminUpload = multer({
    storage: adminStorage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

router.post('/profile/picture', adminUpload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const adminId = req.session.adminId;
        const profilePicturePath = '/uploads/admin-profiles/' + req.file.filename;

        // Update admin profile picture in database
        await db.query(
            'UPDATE admins SET profile_picture = ? WHERE id = ?',
            [profilePicturePath, adminId]
        );

        // Update session
        req.session.adminProfilePicture = profilePicturePath;

        res.json({
            success: true,
            message: 'Profile picture updated successfully',
            imageUrl: profilePicturePath
        });
    } catch (error) {
        console.error('Admin profile picture upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload profile picture'
        });
    }
});

// Settings
router.get('/settings', requireAdminAuth, async (req, res) => {
    try {
        // Load current settings from database
        const [settings] = await db.query('SELECT * FROM site_settings ORDER BY category, setting_key');

        // Group settings by category
        const settingsByCategory = {};
        settings.forEach(setting => {
            if (!settingsByCategory[setting.category]) {
                settingsByCategory[setting.category] = {};
            }
            // Convert value based on type
            let value = setting.setting_value;
            if (setting.setting_type === 'boolean') {
                value = setting.setting_value === 'true';
            } else if (setting.setting_type === 'number') {
                value = parseFloat(setting.setting_value) || 0;
            } else if (setting.setting_type === 'json') {
                try {
                    value = JSON.parse(setting.setting_value);
                } catch (e) {
                    value = setting.setting_value;
                }
            }
            settingsByCategory[setting.category][setting.setting_key] = value;
        });

        res.render('admin/settings', {
            title: 'Settings - OMUNJU SHOPPERS',
            currentPage: 'settings',
            settings: settingsByCategory
        });
    } catch (error) {
        console.error('Error loading settings:', error);
        res.status(500).render('error', { message: 'Failed to load settings' });
    }
});

// API endpoints for admin functionality
// These would typically be separate API routes, but included here for completeness

// Products API
router.post('/api/products', requireAdminAuth, (req, res) => {
    // Add product logic
    res.json({ success: true, message: 'Product added successfully' });
});

router.put('/api/products/:id', requireAdminAuth, (req, res) => {
    // Update product logic
    res.json({ success: true, message: 'Product updated successfully' });
});

router.delete('/api/products/:id', requireAdminAuth, (req, res) => {
    // Delete product logic
    res.json({ success: true, message: 'Product deleted successfully' });
});

// Categories API
router.post('/api/categories', requireAdminAuth, (req, res) => {
    // Add category logic
    res.json({ success: true, message: 'Category added successfully' });
});

router.put('/api/categories/:id', requireAdminAuth, (req, res) => {
    // Update category logic
    res.json({ success: true, message: 'Category updated successfully' });
});

router.delete('/api/categories/:id', requireAdminAuth, (req, res) => {
    // Delete category logic
    res.json({ success: true, message: 'Category deleted successfully' });
});

// Orders API
router.put('/api/orders/:id/status', requireAdminAuth, (req, res) => {
    // Update order status logic
    res.json({ success: true, message: 'Order status updated successfully' });
});

// Customers API
router.put('/api/customers/:id/status', requireAdminAuth, (req, res) => {
    // Update customer status logic
    res.json({ success: true, message: 'Customer status updated successfully' });
});

router.delete('/api/customers/:id', requireAdminAuth, async (req, res) => {
    try {
        const userId = req.params.id;

        // Get user details before deletion
        const [userDetails] = await db.query(
            'SELECT name, email FROM users WHERE id = ?',
            [userId]
        );

        if (userDetails.length === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        const user = userDetails[0];

        // Delete user (consider soft delete in production)
        await db.query('DELETE FROM users WHERE id = ?', [userId]);

        // Notify admins about the deletion
        const NotificationService = require('../utils/notificationService');
        await NotificationService.notifyUserDeleted(
            userId,
            user.name,
            user.email,
            req.session.adminId // The admin who performed the deletion
        );

        res.json({ success: true, message: 'Customer deleted successfully' });
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ success: false, message: 'Failed to delete customer' });
    }
});

// Promotions API
router.post('/api/promotions', requireAdminAuth, (req, res) => {
    // Add promotion logic
    res.json({ success: true, message: 'Promotion added successfully' });
});

router.put('/api/promotions/:id', requireAdminAuth, (req, res) => {
    // Update promotion logic
    res.json({ success: true, message: 'Promotion updated successfully' });
});

router.delete('/api/promotions/:id', requireAdminAuth, (req, res) => {
    // Delete promotion logic
    res.json({ success: true, message: 'Promotion deleted successfully' });
});

// Admin Users API
router.post('/api/admin-users', requireAdminAuth, (req, res) => {
    // Add admin user logic
    res.json({ success: true, message: 'Admin user added successfully' });
});

router.put('/api/admin-users/:id', requireAdminAuth, (req, res) => {
    // Update admin user logic
    res.json({ success: true, message: 'Admin user updated successfully' });
});

router.delete('/api/admin-users/:id', requireAdminAuth, async (req, res) => {
    try {
        const adminId = req.params.id;

        // Get admin details before deletion
        const [adminDetails] = await db.query(
            'SELECT name, email FROM admins WHERE id = ?',
            [adminId]
        );

        if (adminDetails.length === 0) {
            return res.status(404).json({ success: false, message: 'Admin user not found' });
        }

        const admin = adminDetails[0];

        // Delete admin user
        await db.query('DELETE FROM admins WHERE id = ?', [adminId]);

        // Notify other admins about the deletion
        const NotificationService = require('../utils/notificationService');
        await NotificationService.notifyUserDeleted(
            adminId,
            admin.name,
            admin.email,
            req.session.adminId // The admin who performed the deletion
        );

        res.json({ success: true, message: 'Admin user deleted successfully' });
    } catch (error) {
        console.error('Error deleting admin user:', error);
        res.status(500).json({ success: false, message: 'Failed to delete admin user' });
    }
});

// Settings API
router.put('/api/settings', requireAdminAuth, async (req, res) => {
    try {
        const updates = req.body;

        // Validate input
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Invalid settings data'
            });
        }

        // Update each setting
        for (const [key, value] of Object.entries(updates)) {
            // Get setting type from database
            const [settingInfo] = await db.query(
                'SELECT setting_type FROM site_settings WHERE setting_key = ?',
                [key]
            );

            if (settingInfo.length > 0) {
                let processedValue = value;

                // Convert boolean values to strings
                if (settingInfo[0].setting_type === 'boolean') {
                    processedValue = value ? 'true' : 'false';
                } else if (settingInfo[0].setting_type === 'number') {
                    processedValue = value.toString();
                } else if (settingInfo[0].setting_type === 'json') {
                    processedValue = JSON.stringify(value);
                } else {
                    processedValue = value.toString();
                }

                await db.query(
                    'UPDATE site_settings SET setting_value = ? WHERE setting_key = ?',
                    [processedValue, key]
                );
            }
        }

        res.json({
            success: true,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update settings'
        });
    }
});

// Get specific setting
router.get('/api/settings/:key', requireAdminAuth, async (req, res) => {
    try {
        const { key } = req.params;
        const [settings] = await db.query(
            'SELECT * FROM site_settings WHERE setting_key = ?',
            [key]
        );

        if (settings.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        const setting = settings[0];
        let value = setting.setting_value;

        // Convert value based on type
        if (setting.setting_type === 'boolean') {
            value = setting.setting_value === 'true';
        } else if (setting.setting_type === 'number') {
            value = parseFloat(setting.setting_value) || 0;
        } else if (setting.setting_type === 'json') {
            try {
                value = JSON.parse(setting.setting_value);
            } catch (e) {
                value = setting.setting_value;
            }
        }

        res.json({
            success: true,
            setting: {
                key: setting.setting_key,
                value: value,
                type: setting.setting_type,
                category: setting.category,
                description: setting.description
            }
        });
    } catch (error) {
        console.error('Error getting setting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get setting'
        });
    }
});

// Report Generation Routes
const PDFDocument = require('pdfkit');

// Sales Report
router.get('/reports/sales', requireAdminAuth, async (req, res) => {
    try {
        // Get sales data for the last 12 months
        const salesData = [];
        const currentDate = new Date();

        for (let i = 11; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });

            const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
            const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const [monthSales] = await db.query(`
                SELECT
                    COUNT(*) as order_count,
                    COALESCE(SUM(total_amount), 0) as total_sales,
                    COALESCE(AVG(total_amount), 0) as avg_order_value
                FROM orders
                WHERE status = 'completed'
                AND created_at >= ? AND created_at <= ?
            `, [startDate, endDate]);

            salesData.push({
                month: monthName,
                orders: monthSales[0].order_count,
                sales: Math.round(monthSales[0].total_sales * 100) / 100,
                avgOrder: Math.round(monthSales[0].avg_order_value * 100) / 100
            });
        }

        // Create PDF
        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');
        doc.pipe(res);

        // Header
        doc.fontSize(20).text('Sales Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
        doc.moveDown(2);

        // Summary
        const totalSales = salesData.reduce((sum, month) => sum + month.sales, 0);
        const totalOrders = salesData.reduce((sum, month) => sum + month.orders, 0);
        const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

        doc.fontSize(14).text('Summary:', { underline: true });
        doc.moveDown();
        doc.fontSize(12).text(`Total Sales: $${totalSales.toFixed(2)}`);
        doc.text(`Total Orders: ${totalOrders}`);
        doc.text(`Average Order Value: $${avgOrderValue.toFixed(2)}`);
        doc.moveDown(2);

        // Monthly breakdown
        doc.fontSize(14).text('Monthly Breakdown:', { underline: true });
        doc.moveDown();

        salesData.forEach(month => {
            doc.fontSize(12).text(`${month.month}:`);
            doc.text(`  Orders: ${month.orders}`);
            doc.text(`  Sales: $${month.sales.toFixed(2)}`);
            doc.text(`  Average Order: $${month.avgOrder.toFixed(2)}`);
            doc.moveDown();
        });

        doc.end();
    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).json({ success: false, message: 'Failed to generate sales report' });
    }
});

// Revenue Report
router.get('/reports/revenue', requireAdminAuth, async (req, res) => {
    try {
        // Get revenue data by category
        const [categoryRevenue] = await db.query(`
            SELECT
                c.name as category_name,
                COUNT(oi.product_id) as products_sold,
                COALESCE(SUM(oi.quantity * oi.price), 0) as revenue
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed'
            GROUP BY c.id, c.name
            ORDER BY revenue DESC
        `);

        // Get revenue by payment method (assuming we have payment_method in orders)
        const [paymentRevenue] = await db.query(`
            SELECT
                COALESCE(payment_method, 'Unknown') as payment_method,
                COUNT(*) as transaction_count,
                COALESCE(SUM(total_amount), 0) as revenue
            FROM orders
            WHERE status = 'completed'
            GROUP BY payment_method
            ORDER BY revenue DESC
        `);

        // Create PDF
        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="revenue_report.pdf"');
        doc.pipe(res);

        // Header
        doc.fontSize(20).text('Revenue Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
        doc.moveDown(2);

        // Revenue by Category
        doc.fontSize(14).text('Revenue by Category:', { underline: true });
        doc.moveDown();

        categoryRevenue.forEach(category => {
            doc.fontSize(12).text(`${category.category_name}:`);
            doc.text(`  Products Sold: ${category.products_sold}`);
            doc.text(`  Revenue: $${category.revenue.toFixed(2)}`);
            doc.moveDown();
        });

        doc.moveDown();

        // Revenue by Payment Method
        doc.fontSize(14).text('Revenue by Payment Method:', { underline: true });
        doc.moveDown();

        paymentRevenue.forEach(payment => {
            doc.fontSize(12).text(`${payment.payment_method}:`);
            doc.text(`  Transactions: ${payment.transaction_count}`);
            doc.text(`  Revenue: $${payment.revenue.toFixed(2)}`);
            doc.moveDown();
        });

        doc.end();
    } catch (error) {
        console.error('Error generating revenue report:', error);
        res.status(500).json({ success: false, message: 'Failed to generate revenue report' });
    }
});

// Users Report
router.get('/reports/users', requireAdminAuth, async (req, res) => {
    try {
        // Get user registration data
        const [userStats] = await db.query(`
            SELECT
                COUNT(*) as total_users,
                COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as new_users_30d,
                COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as new_users_7d
            FROM users
        `);

        // Get user activity (orders placed)
        const [activeUsers] = await db.query(`
            SELECT
                COUNT(DISTINCT user_id) as users_with_orders,
                COUNT(CASE WHEN o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as active_users_30d
            FROM orders o
            WHERE o.status = 'completed'
        `);

        // Get top customers
        const [topCustomers] = await db.query(`
            SELECT
                u.name,
                u.email,
                COUNT(o.id) as order_count,
                COALESCE(SUM(o.total_amount), 0) as total_spent
            FROM users u
            JOIN orders o ON u.id = o.user_id AND o.status = 'completed'
            GROUP BY u.id, u.name, u.email
            ORDER BY total_spent DESC
            LIMIT 20
        `);

        // Create PDF
        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="users_report.pdf"');
        doc.pipe(res);

        // Header
        doc.fontSize(20).text('Users Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
        doc.moveDown(2);

        // User Statistics
        doc.fontSize(14).text('User Statistics:', { underline: true });
        doc.moveDown();
        doc.fontSize(12).text(`Total Registered Users: ${userStats[0].total_users}`);
        doc.text(`New Users (Last 30 days): ${userStats[0].new_users_30d}`);
        doc.text(`New Users (Last 7 days): ${userStats[0].new_users_7d}`);
        doc.text(`Users with Orders: ${activeUsers[0].users_with_orders}`);
        doc.text(`Active Users (Last 30 days): ${activeUsers[0].active_users_30d}`);
        doc.moveDown(2);

        // Top Customers
        doc.fontSize(14).text('Top Customers:', { underline: true });
        doc.moveDown();

        topCustomers.forEach((customer, index) => {
            doc.fontSize(12).text(`${index + 1}. ${customer.name} (${customer.email}):`);
            doc.text(`   Orders: ${customer.order_count}`);
            doc.text(`   Total Spent: $${customer.total_spent.toFixed(2)}`);
            doc.moveDown();
        });

        doc.end();
    } catch (error) {
        console.error('Error generating users report:', error);
        res.status(500).json({ success: false, message: 'Failed to generate users report' });
    }
});

// CSV Export Routes for Admin Buttons
router.get('/reports/orders', requireAdminAuth, async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT
                o.id,
                o.created_at,
                o.total_amount,
                o.status,
                o.payment_method,
                u.name as customer_name,
                u.email as customer_email,
                o.delivery_agent,
                o.tracking_number,
                o.estimated_delivery
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
        `);

        // Create CSV content
        const headers = ['Order ID', 'Date', 'Customer Name', 'Customer Email', 'Total Amount', 'Status', 'Payment Method', 'Delivery Agent', 'Tracking Number', 'Estimated Delivery'];
        const csvContent = [
            headers.join(','),
            ...orders.map(order => [
                order.id,
                new Date(order.created_at).toLocaleDateString(),
                `"${order.customer_name || ''}"`,
                `"${order.customer_email || ''}"`,
                order.total_amount,
                order.status,
                order.payment_method || '',
                `"${order.delivery_agent || ''}"`,
                `"${order.tracking_number || ''}"`,
                order.estimated_delivery ? new Date(order.estimated_delivery).toLocaleDateString() : ''
            ].join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="orders_export.csv"');
        res.send(csvContent);
    } catch (error) {
        console.error('Error exporting orders:', error);
        res.status(500).json({ success: false, message: 'Failed to export orders' });
    }
});

router.get('/reports/products', requireAdminAuth, async (req, res) => {
    try {
        const [products] = await db.query(`
            SELECT
                p.id,
                p.name,
                p.sku,
                p.price,
                p.discount,
                p.stock,
                p.is_active,
                p.is_featured,
                p.is_new,
                c.name as category_name,
                (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.id) as total_orders,
                (SELECT COUNT(*) FROM product_reviews pr WHERE pr.product_id = p.id) as total_reviews,
                (SELECT AVG(rating) FROM product_reviews pr WHERE pr.product_id = p.id) as avg_rating
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY p.created_at DESC
        `);

        // Create CSV content
        const headers = ['Product ID', 'Name', 'SKU', 'Price', 'Discount', 'Stock', 'Category', 'Active', 'Featured', 'New', 'Total Orders', 'Total Reviews', 'Average Rating'];
        const csvContent = [
            headers.join(','),
            ...products.map(product => [
                product.id,
                `"${product.name}"`,
                `"${product.sku}"`,
                product.price,
                product.discount || 0,
                product.stock,
                `"${product.category_name || ''}"`,
                product.is_active ? 'Yes' : 'No',
                product.is_featured ? 'Yes' : 'No',
                product.is_new ? 'Yes' : 'No',
                product.total_orders || 0,
                product.total_reviews || 0,
                product.avg_rating ? product.avg_rating.toFixed(1) : 'N/A'
            ].join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="products_export.csv"');
        res.send(csvContent);
    } catch (error) {
        console.error('Error exporting products:', error);
        res.status(500).json({ success: false, message: 'Failed to export products' });
    }
});

router.get('/reports/customers', requireAdminAuth, async (req, res) => {
    try {
        const [customers] = await db.query(`
            SELECT
                u.id,
                u.name,
                u.email,
                u.phone,
                u.created_at,
                COUNT(o.id) as total_orders,
                COALESCE(SUM(o.total_amount), 0) as total_spent,
                MAX(o.created_at) as last_order_date
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id AND o.status != 'cancelled'
            GROUP BY u.id, u.name, u.email, u.phone, u.created_at
            ORDER BY u.created_at DESC
        `);

        // Create CSV content
        const headers = ['Customer ID', 'Name', 'Email', 'Phone', 'Registration Date', 'Total Orders', 'Total Spent', 'Last Order Date'];
        const csvContent = [
            headers.join(','),
            ...customers.map(customer => [
                customer.id,
                `"${customer.name}"`,
                `"${customer.email}"`,
                `"${customer.phone || ''}"`,
                new Date(customer.created_at).toLocaleDateString(),
                customer.total_orders,
                customer.total_spent,
                customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString() : 'Never'
            ].join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="customers_export.csv"');
        res.send(csvContent);
    } catch (error) {
        console.error('Error exporting customers:', error);
        res.status(500).json({ success: false, message: 'Failed to export customers' });
    }
});

module.exports = router;
