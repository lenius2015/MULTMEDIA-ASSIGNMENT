/**
 * ============================================
 * USER ACCOUNT API ROUTES
 * ============================================
 * Comprehensive API for user account management
 * - Profile management
 * - Orders & tracking
 * - Invoices & payments
 * - Wishlist
 * - Messages & notifications
 * - Addresses management
 * ============================================
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { isAuthenticated, generateToken, generateRefreshToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ============================================
// FILE UPLOAD CONFIGURATION
// ============================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../public/uploads/profiles');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + req.session?.userId + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed!'), false);
    }
});

// ============================================
// HELPER FUNCTIONS
// ============================================
const generateOrderNumber = () => {
    return 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
};

const generateInvoiceNumber = () => {
    return 'INV-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
};

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email and password are required' });
        }

        // Check if user exists
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, phone || null]
        );

        const userId = result.insertId;

        // Create default wishlist
        await pool.query('INSERT INTO wishlist (user_id, name) VALUES (?, ?)', [userId, 'My Wishlist']);

        // Create preferences
        await pool.query('INSERT INTO user_preferences (user_id) VALUES (?)', [userId]);

        // Generate tokens
        const token = generateToken({ userId, email, role: 'user' });
        const refreshToken = generateRefreshToken({ userId });

        // Save session
        req.session.userId = userId;
        req.session.userEmail = email;
        req.session.userName = name;
        req.session.token = token;

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: { userId, email, name, token }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        // Find user
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = users[0];

        // Check password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check if active
        if (user.role !== 'user' && user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Account is disabled' });
        }

        // Generate tokens
        const token = generateToken({ userId: user.id, email: user.email, role: user.role });
        const refreshToken = generateRefreshToken({ userId: user.id });

        // Save session
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        req.session.userName = user.name;
        req.session.userRole = user.role;
        req.session.token = token;

        // Log login activity
        await pool.query(
            'INSERT INTO user_login_activity (user_id, session_token, ip_address, user_agent, device_type) VALUES (?, ?, ?, ?, ?)',
            [user.id, token, req.ip, req.get('user-agent'), getDeviceType(req)]
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: { id: user.id, name: user.name, email: user.email, role: user.role },
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

// Logout user
router.post('/logout', isAuthenticated, async (req, res) => {
    try {
        // Update login activity
        await pool.query(
            'UPDATE user_login_activity SET is_active = FALSE, logout_time = NOW() WHERE user_id = ? AND session_token = ?',
            [req.session.userId, req.session.token]
        );

        // Destroy session
        req.session.destroy();

        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, message: 'Logout failed' });
    }
});

// Get current user
router.get('/me', isAuthenticated, async (req, res) => {
    try {
        const [users] = await pool.query(
            `SELECT u.id, u.name, u.email, u.phone, u.address, u.profile_picture, u.role, u.created_at,
                    up.email_notifications, up.sms_notifications, up.preferred_language, up.preferred_currency
             FROM users u
             LEFT JOIN user_preferences up ON u.id = up.user_id
             WHERE u.id = ?`,
            [req.session.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, data: users[0] });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'Failed to get user' });
    }
});

// ============================================
// PROFILE MANAGEMENT
// ============================================

// Update profile
router.put('/profile', isAuthenticated, async (req, res) => {
    try {
        const { name, phone, address } = req.body;

        await pool.query(
            'UPDATE users SET name = ?, phone = ?, address = ?, updated_at = NOW() WHERE id = ?',
            [name || req.session.userName, phone, address, req.session.userId]
        );

        if (name) req.session.userName = name;

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
});

// Upload profile picture
router.post('/profile/picture', isAuthenticated, upload.single('profile_picture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const profilePicture = '/uploads/profiles/' + req.file.filename;

        await pool.query(
            'UPDATE users SET profile_picture = ?, updated_at = NOW() WHERE id = ?',
            [profilePicture, req.session.userId]
        );

        res.json({ success: true, message: 'Profile picture updated', data: { profilePicture } });
    } catch (error) {
        console.error('Upload picture error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload picture' });
    }
});

// Change password
router.put('/password', isAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current and new password required' });
        }

        // Get user
        const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.session.userId]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, users[0].password);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        await pool.query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [hashedPassword, req.session.userId]);

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'Failed to change password' });
    }
});

// Get login activity
router.get('/activity', isAuthenticated, async (req, res) => {
    try {
        const [activity] = await pool.query(
            'SELECT * FROM user_login_activity WHERE user_id = ? ORDER BY login_time DESC LIMIT 20',
            [req.session.userId]
        );

        res.json({ success: true, data: activity });
    } catch (error) {
        console.error('Get activity error:', error);
        res.status(500).json({ success: false, message: 'Failed to get activity' });
    }
});

// ============================================
// ORDERS
// ============================================

// Get all orders
router.get('/orders', isAuthenticated, async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM orders WHERE user_id = ?';
        const params = [req.session.userId];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [orders] = await pool.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE user_id = ?';
        const countParams = [req.session.userId];
        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }
        const [count] = await pool.query(countQuery, countParams);

        res.json({
            success: true,
            data: orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count[0].total,
                pages: Math.ceil(count[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ success: false, message: 'Failed to get orders' });
    }
});

// Get single order with details
router.get('/orders/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;

        // Get order
        const [orders] = await pool.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [id, req.session.userId]);
        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Get order items
        const [items] = await pool.query(
            `SELECT oi.*, p.name as product_name, p.image_url, p.category
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = ?`,
            [id]
        );

        // Get status history
        const [history] = await pool.query(
            'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC',
            [id]
        );

        // Get invoice
        const [invoices] = await pool.query('SELECT * FROM invoices WHERE order_id = ?', [id]);

        res.json({
            success: true,
            data: { ...orders[0], items, history, invoices }
        });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ success: false, message: 'Failed to get order' });
    }
});

// Cancel order
router.post('/orders/:id/cancel', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        // Check order
        const [orders] = await pool.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [id, req.session.userId]);
        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const order = orders[0];
        if (!['pending', 'confirmed'].includes(order.status)) {
            return res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage' });
        }

        // Update order
        await pool.query(
            'UPDATE orders SET status = ?, cancel_reason = ?, cancelled_at = NOW(), updated_at = NOW() WHERE id = ?',
            ['cancelled', reason, id]
        );

        // Add status history
        await pool.query(
            'INSERT INTO order_status_history (order_id, status, description) VALUES (?, ?, ?)',
            [id, 'cancelled', 'Order cancelled by customer: ' + reason]
        );

        // Restore stock
        const [items] = await pool.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);
        for (const item of items) {
            await pool.query('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
        }

        // Create notification
        await pool.query(
            'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
            [req.session.userId, 'order_cancelled', 'Order Cancelled', `Your order #${order.order_number} has been cancelled`, `/orders/${id}`]
        );

        res.json({ success: true, message: 'Order cancelled successfully' });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel order' });
    }
});

// ============================================
// INVOICES
// ============================================

router.get('/invoices', isAuthenticated, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const [invoices] = await pool.query(
            `SELECT * FROM invoices WHERE user_id = ? ORDER BY invoice_date DESC LIMIT ? OFFSET ?`,
            [req.session.userId, parseInt(limit), offset]
        );

        const [count] = await pool.query('SELECT COUNT(*) as total FROM invoices WHERE user_id = ?', [req.session.userId]);

        res.json({
            success: true,
            data: invoices,
            pagination: { page: parseInt(page), limit: parseInt(limit), total: count[0].total }
        });
    } catch (error) {
        console.error('Get invoices error:', error);
        res.status(500).json({ success: false, message: 'Failed to get invoices' });
    }
});

router.get('/invoices/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;

        const [invoices] = await pool.query(
            'SELECT * FROM invoices WHERE id = ? AND user_id = ?',
            [id, req.session.userId]
        );

        if (invoices.length === 0) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }

        // Get order details
        const [order] = await pool.query(
            `SELECT o.*, u.name as user_name, u.email as user_email
             FROM orders o
             JOIN users u ON o.user_id = u.id
             WHERE o.id = ?`,
            [invoices[0].order_id]
        );

        res.json({ success: true, data: { ...invoices[0], order: order[0] } });
    } catch (error) {
        console.error('Get invoice error:', error);
        res.status(500).json({ success: false, message: 'Failed to get invoice' });
    }
});

// ============================================
// WISHLIST
// ============================================

router.get('/wishlist', isAuthenticated, async (req, res) => {
    try {
        const [wishlist] = await pool.query(
            `SELECT w.*, GROUP_CONCAT(wi.id) as item_ids
             FROM wishlist w
             LEFT JOIN wishlist_items wi ON w.id = wi.wishlist_id
             WHERE w.user_id = ?
             GROUP BY w.id`,
            [req.session.userId]
        );

        // Get items for each wishlist
        for (const list of wishlist) {
            const [items] = await pool.query(
                `SELECT wi.*, p.name, p.price, p.discount, p.image_url, p.stock, p.category
                 FROM wishlist_items wi
                 JOIN products p ON wi.product_id = p.id
                 WHERE wi.wishlist_id = ?
                 ORDER BY wi.added_at DESC`,
                [list.id]
            );
            list.items = items;
        }

        res.json({ success: true, data: wishlist });
    } catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json({ success: false, message: 'Failed to get wishlist' });
    }
});

router.post('/wishlist/add/:productId', isAuthenticated, async (req, res) => {
    try {
        const { productId } = req.params;

        // Get user's default wishlist
        const [wishlists] = await pool.query('SELECT id FROM wishlist WHERE user_id = ? LIMIT 1', [req.session.userId]);
        
        if (wishlists.length === 0) {
            // Create wishlist
            const [result] = await pool.query('INSERT INTO wishlist (user_id, name) VALUES (?, ?)', [req.session.userId, 'My Wishlist']);
            var wishlistId = result.insertId;
        } else {
            var wishlistId = wishlists[0].id;
        }

        // Add item
        await pool.query(
            'INSERT IGNORE INTO wishlist_items (wishlist_id, product_id) VALUES (?, ?)',
            [wishlistId, productId]
        );

        res.json({ success: true, message: 'Added to wishlist' });
    } catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({ success: false, message: 'Failed to add to wishlist' });
    }
});

router.delete('/wishlist/remove/:productId', isAuthenticated, async (req, res) => {
    try {
        const { productId } = req.params;

        const [wishlists] = await pool.query('SELECT id FROM wishlist WHERE user_id = ? LIMIT 1', [req.session.userId]);
        
        if (wishlists.length > 0) {
            await pool.query(
                'DELETE FROM wishlist_items WHERE wishlist_id = ? AND product_id = ?',
                [wishlists[0].id, productId]
            );
        }

        res.json({ success: true, message: 'Removed from wishlist' });
    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove from wishlist' });
    }
});

// ============================================
// MESSAGES / CONVERSATIONS
// ============================================

router.get('/conversations', isAuthenticated, async (req, res) => {
    try {
        const [conversations] = await pool.query(
            `SELECT c.*, 
                    (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                    (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at
             FROM conversations c
             WHERE c.user_id = ?
             ORDER BY last_message_at DESC`,
            [req.session.userId]
        );

        res.json({ success: true, data: conversations });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ success: false, message: 'Failed to get conversations' });
    }
});

router.get('/conversations/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;

        const [conversations] = await pool.query(
            'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
            [id, req.session.userId]
        );

        if (conversations.length === 0) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        const [messages] = await pool.query(
            'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
            [id]
        );

        // Mark as read
        await pool.query(
            'UPDATE messages SET is_read = TRUE, read_at = NOW() WHERE conversation_id = ? AND sender_type = ? AND is_read = FALSE',
            [id, 'admin']
        );

        res.json({ success: true, data: { ...conversations[0], messages } });
    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ success: false, message: 'Failed to get conversation' });
    }
});

router.post('/conversations', isAuthenticated, async (req, res) => {
    try {
        const { subject, message, orderId } = req.body;

        // Create conversation
        const [result] = await pool.query(
            'INSERT INTO conversations (user_id, order_id, subject, status) VALUES (?, ?, ?, ?)',
            [req.session.userId, orderId || null, subject, 'open']
        );

        const conversationId = result.insertId;

        // Add first message
        await pool.query(
            'INSERT INTO messages (conversation_id, sender_id, sender_type, message_type, content) VALUES (?, ?, ?, ?, ?)',
            [conversationId, req.session.userId, 'user', 'text', message]
        );

        res.json({ success: true, message: 'Conversation created', data: { conversationId } });
    } catch (error) {
        console.error('Create conversation error:', error);
        res.status(500).json({ success: false, message: 'Failed to create conversation' });
    }
});

router.post('/conversations/:id/messages', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { message, messageType = 'text' } = req.body;

        // Verify ownership
        const [conversations] = await pool.query(
            'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
            [id, req.session.userId]
        );

        if (conversations.length === 0) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        // Add message
        const [result] = await pool.query(
            'INSERT INTO messages (conversation_id, sender_id, sender_type, message_type, content) VALUES (?, ?, ?, ?, ?)',
            [id, req.session.userId, 'user', messageType, message]
        );

        // Update conversation
        await pool.query(
            'UPDATE conversations SET last_message_at = NOW() WHERE id = ?',
            [id]
        );

        res.json({ success: true, message: 'Message sent', data: { messageId: result.insertId } });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
});

// ============================================
// NOTIFICATIONS
// ============================================

router.get('/notifications', isAuthenticated, async (req, res) => {
    try {
        const { page = 1, limit = 20, unread_only } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM notifications WHERE user_id = ?';
        const params = [req.session.userId];

        if (unread_only === 'true') {
            query += ' AND is_read = FALSE';
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [notifications] = await pool.query(query, params);

        // Get unread count
        const [count] = await pool.query(
            'SELECT COUNT(*) as total FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [req.session.userId]
        );

        res.json({
            success: true,
            data: notifications,
            unreadCount: count[0].total
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Failed to get notifications' });
    }
});

router.put('/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ? AND user_id = ?',
            [req.params.id, req.session.userId]
        );

        res.json({ success: true, message: 'Marked as read' });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark as read' });
    }
});

router.put('/notifications/read-all', isAuthenticated, async (req, res) => {
    try {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE',
            [req.session.userId]
        );

        res.json({ success: true, message: 'All marked as read' });
    } catch (error) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark all as read' });
    }
});

// ============================================
// ADDRESSES
// ============================================

router.get('/addresses', isAuthenticated, async (req, res) => {
    try {
        const [addresses] = await pool.query(
            'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
            [req.session.userId]
        );

        res.json({ success: true, data: addresses });
    } catch (error) {
        console.error('Get addresses error:', error);
        res.status(500).json({ success: false, message: 'Failed to get addresses' });
    }
});

router.post('/addresses', isAuthenticated, async (req, res) => {
    try {
        const { label, fullName, phone, alternatePhone, addressLine1, addressLine2, city, state, postalCode, country, isDefault, deliveryInstructions } = req.body;

        // If setting as default, unset other defaults
        if (isDefault) {
            await pool.query('UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?', [req.session.userId]);
        }

        const [result] = await pool.query(
            `INSERT INTO user_addresses 
             (user_id, label, full_name, phone, alternate_phone, address_line1, address_line2, city, state, postal_code, country, is_default, delivery_instructions)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.session.userId, label || 'other', fullName, phone, alternatePhone, addressLine1, addressLine2, city, state, postalCode, country || 'Kenya', isDefault || false, deliveryInstructions]
        );

        res.json({ success: true, message: 'Address added', data: { id: result.insertId } });
    } catch (error) {
        console.error('Add address error:', error);
        res.status(500).json({ success: false, message: 'Failed to add address' });
    }
});

router.put('/addresses/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { label, fullName, phone, alternatePhone, addressLine1, addressLine2, city, state, postalCode, country, isDefault, deliveryInstructions } = req.body;

        // If setting as default, unset other defaults
        if (isDefault) {
            await pool.query('UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?', [req.session.userId]);
        }

        await pool.query(
            `UPDATE user_addresses 
             SET label = ?, full_name = ?, phone = ?, alternate_phone = ?, address_line1 = ?, address_line2 = ?, 
                 city = ?, state = ?, postal_code = ?, country = ?, is_default = ?, delivery_instructions = ?
             WHERE id = ? AND user_id = ?`,
            [label, fullName, phone, alternatePhone, addressLine1, addressLine2, city, state, postalCode, country, isDefault, deliveryInstructions, id, req.session.userId]
        );

        res.json({ success: true, message: 'Address updated' });
    } catch (error) {
        console.error('Update address error:', error);
        res.status(500).json({ success: false, message: 'Failed to update address' });
    }
});

router.delete('/addresses/:id', isAuthenticated, async (req, res) => {
    try {
        await pool.query('DELETE FROM user_addresses WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);

        res.json({ success: true, message: 'Address deleted' });
    } catch (error) {
        console.error('Delete address error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete address' });
    }
});

router.post('/addresses/:id/default', isAuthenticated, async (req, res) => {
    try {
        // Unset all defaults
        await pool.query('UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?', [req.session.userId]);

        // Set new default
        await pool.query('UPDATE user_addresses SET is_default = TRUE WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);

        res.json({ success: true, message: 'Default address updated' });
    } catch (error) {
        console.error('Set default address error:', error);
        res.status(500).json({ success: false, message: 'Failed to set default address' });
    }
});

// ============================================
// DASHBOARD
// ============================================

router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;

        // Get user data
        const [users] = await pool.query(
            'SELECT id, name, email, phone, profile_picture, address, role, created_at FROM users WHERE id = ?',
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

        // Get orders
        const [orders] = await pool.query(
            'SELECT id, order_number, status, final_amount as total, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: address,
                role: user.role,
                created_at: user.created_at
            },
            orders: orders,
            cartCount: cartCount
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Failed to get dashboard data' });
    }
});

// Dashboard stats (extended)
router.get('/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;

        // Get user info
        const [users] = await pool.query('SELECT name, profile_picture FROM users WHERE id = ?', [userId]);

        // Get order stats
        const [orderStats] = await pool.query(
            `SELECT 
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
                SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped_orders,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders
             FROM orders WHERE user_id = ?`,
            [userId]
        );

        // Get wishlist count
        const [wishlistCount] = await pool.query(
            'SELECT COUNT(*) as total FROM wishlist_items wi JOIN wishlist w ON wi.wishlist_id = w.id WHERE w.user_id = ?',
            [userId]
        );

        // Get unread messages count
        const [messageCount] = await pool.query(
            `SELECT COUNT(*) as total FROM messages m
             JOIN conversations c ON m.conversation_id = c.id
             WHERE c.user_id = ? AND m.sender_type = 'admin' AND m.is_read = FALSE`,
            [userId]
        );

        // Get unread notifications count
        const [notificationCount] = await pool.query(
            'SELECT COUNT(*) as total FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );

        // Get recent orders
        const [recentOrders] = await pool.query(
            'SELECT id, order_number, status, final_amount, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
            [userId]
        );

        res.json({
            success: true,
            data: {
                user: users[0],
                orders: orderStats[0],
                wishlistCount: wishlistCount[0].total,
                unreadMessages: messageCount[0].total,
                unreadNotifications: notificationCount[0].total,
                recentOrders
            }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to get dashboard stats' });
    }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDeviceType(req) {
    const ua = req.get('user-agent') || '';
    if (ua.includes('Mobile')) return 'mobile';
    if (ua.includes('Tablet')) return 'tablet';
    return 'desktop';
}

module.exports = router;
