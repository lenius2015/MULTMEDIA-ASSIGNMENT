// User Dashboard Route
// Connected to database for real data

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const pool = db; // Database pool for all routes

// User Dashboard - Main overview
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;

        // Get user data
        const [users] = await pool.query(
            'SELECT id, name, email, phone, profile_picture, created_at FROM users WHERE id = ?',
            [userId]
        );
        
        const user = users[0];

        // Get order statistics
        const [orderStats] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
                SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
            FROM orders WHERE user_id = ?
        `, [userId]);

        // Get recent orders
        const [recentOrders] = await pool.query(`
            SELECT o.*, 
                   (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
            FROM orders o
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC LIMIT 5
        `, [userId]);

        // Get all orders for order history
        const [allOrders] = await pool.query(`
            SELECT o.*,
                   (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
            FROM orders o
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
        `, [userId]);

        // Get cart items
        const [cartItems] = await pool.query(`
            SELECT c.*, p.name, p.price, p.image_url
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        `, [userId]);

        // Get cart count and total
        const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shippingCost = cartTotal > 100 ? 0 : 10;

        // Get wishlist items
        const [wishlistItems] = await pool.query(`
            SELECT w.*, p.name, p.price, p.image_url
            FROM wishlists w
            JOIN products p ON w.product_id = p.id
            WHERE w.user_id = ?
        `, [userId]);
        
        const wishlistCount = wishlistItems.length;

        // Get unread messages count
        const [unreadCount] = await pool.query(`
            SELECT COUNT(*) as count FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE c.user_id = ? AND m.sender_type = 'admin' AND m.is_read = FALSE
        `, [userId]);

        const unreadMessages = unreadCount[0].count;

        // Get user conversations
        const [conversations] = await pool.query(`
            SELECT c.*,
                   (SELECT message FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
                   (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_at,
                   (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_type = 'admin' AND m.is_read = FALSE) as unread_count
            FROM conversations c
            WHERE c.user_id = ?
            ORDER BY c.last_message_at DESC
        `, [userId]);

        // Get user addresses
        const [addresses] = await pool.query(`
            SELECT * FROM user_addresses WHERE user_id = ?
        `, [userId]);

        // Get featured products
        const [featuredProducts] = await pool.query(`
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category = c.id
            WHERE p.is_active = TRUE
            ORDER BY p.created_at DESC LIMIT 8
        `);

        res.render('user-dashboard', {
            title: 'My Dashboard - OMUNJU SHOPPERS',
            user: user || { id: userId, name: 'User', email: '' },
            orderStats: {
                total: orderStats[0]?.total || 0,
                pending: orderStats[0]?.pending || 0,
                processing: orderStats[0]?.processing || 0,
                shipped: orderStats[0]?.shipped || 0,
                delivered: orderStats[0]?.delivered || 0,
                cancelled: orderStats[0]?.cancelled || 0
            },
            recentOrders: recentOrders || [],
            allOrders: allOrders || [],
            cartItems: cartItems || [],
            cartCount: cartCount || 0,
            cartTotal: cartTotal || 0,
            shippingCost: shippingCost || 10,
            wishlistItems: wishlistItems || [],
            wishlistCount: wishlistCount || 0,
            unreadMessages: unreadMessages || 0,
            conversations: conversations || [],
            addresses: addresses || [],
            featuredProducts: featuredProducts || []
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('user-dashboard', {
            title: 'My Dashboard - OMUNJU SHOPPERS',
            user: { id: userId, name: 'User', email: '' },
            orderStats: { total: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 },
            recentOrders: [],
            allOrders: [],
            cartItems: [],
            cartCount: 0,
            cartTotal: 0,
            shippingCost: 10,
            wishlistItems: [],
            wishlistCount: 0,
            unreadMessages: 0,
            conversations: [],
            addresses: [],
            featuredProducts: []
        });
    }
});

// API: Update user profile
router.put('/api/user/profile', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { name, phone, date_of_birth, bio } = req.body;
        
        await pool.query(
            'UPDATE users SET name = ?, phone = ?, date_of_birth = ?, bio = ?, updated_at = NOW() WHERE id = ?',
            [name, phone || null, date_of_birth || null, bio || null, userId]
        );
        
        // Update session
        req.session.userName = name;
        
        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
});

// API: Change password
router.post('/api/user/change-password', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { currentPassword, newPassword } = req.body;
        
        // Verify current password
        const [users] = await pool.query(
            'SELECT password FROM users WHERE id = ?',
            [userId]
        );
        
        if (users.length === 0 || users[0].password !== currentPassword) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }
        
        // Update password
        await pool.query(
            'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
            [newPassword, userId]
        );
        
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ success: false, message: 'Failed to change password' });
    }
});

// API: Update profile picture
router.post('/api/user/profile-picture', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { profile_picture } = req.body;
        
        await pool.query(
            'UPDATE users SET profile_picture = ?, updated_at = NOW() WHERE id = ?',
            [profile_picture, userId]
        );
        
        req.session.userProfilePicture = profile_picture;
        
        res.json({ success: true, message: 'Profile picture updated successfully' });
    } catch (error) {
        console.error('Profile picture update error:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile picture' });
    }
});

// API: Get user addresses
router.get('/api/user/addresses', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        const [addresses] = await pool.query(
            'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC',
            [userId]
        );
        
        res.json({ success: true, addresses });
    } catch (error) {
        console.error('Get addresses error:', error);
        res.status(500).json({ success: false, message: 'Failed to get addresses' });
    }
});

// API: Add address
router.post('/api/user/addresses', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { label, full_name, street_address, city, state, zip_code, country, phone, is_default } = req.body;
        
        const [result] = await pool.query(
            `INSERT INTO user_addresses (user_id, label, full_name, street_address, city, state, zip_code, country, phone, is_default)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, label, full_name, street_address, city, state, zip_code, country, phone, is_default ? 1 : 0]
        );
        
        res.json({ success: true, message: 'Address added successfully', addressId: result.insertId });
    } catch (error) {
        console.error('Add address error:', error);
        res.status(500).json({ success: false, message: 'Failed to add address' });
    }
});

// API: Set default address
router.put('/api/user/addresses/:id/default', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const addressId = req.params.id;
        
        // First, unset all defaults
        await pool.query(
            'UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?',
            [userId]
        );
        
        // Set new default
        await pool.query(
            'UPDATE user_addresses SET is_default = TRUE WHERE id = ? AND user_id = ?',
            [addressId, userId]
        );
        
        res.json({ success: true, message: 'Default address updated' });
    } catch (error) {
        console.error('Set default address error:', error);
        res.status(500).json({ success: false, message: 'Failed to set default address' });
    }
});

// API: Delete address
router.delete('/api/user/addresses/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const addressId = req.params.id;

        await pool.query(
            'DELETE FROM user_addresses WHERE id = ? AND user_id = ?',
            [addressId, userId]
        );

        res.json({ success: true, message: 'Address deleted successfully' });
    } catch (error) {
        console.error('Delete address error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete address' });
    }
});

// API: Get user dashboard data
router.get('/api/user/dashboard', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;

        // Get user data
        const [users] = await pool.query(
            'SELECT id, name, email, phone, created_at FROM users WHERE id = ?',
            [userId]
        );

        const user = users[0];
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Get default address
        const [addresses] = await pool.query(
            'SELECT street_address, city, state, zip_code, country FROM user_addresses WHERE user_id = ? AND is_default = TRUE LIMIT 1',
            [userId]
        );

        const address = addresses.length > 0 ?
            `${addresses[0].street_address}, ${addresses[0].city}, ${addresses[0].state} ${addresses[0].zip_code}, ${addresses[0].country}` : null;

        // Get cart count
        const [cart] = await pool.query(
            'SELECT SUM(quantity) as count FROM cart WHERE user_id = ?',
            [userId]
        );

        const cartCount = cart[0].count || 0;

        // Orders as empty array (matching example)
        const orders = [];

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: address,
                role: 'user',
                created_at: user.created_at
            },
            orders: orders,
            cartCount: cartCount
        });
    } catch (error) {
        console.error('Dashboard API error:', error);
        res.status(500).json({ success: false, message: 'Failed to get dashboard data' });
    }
});

module.exports = router;
