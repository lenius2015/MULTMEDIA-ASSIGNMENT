const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAdminAuth } = require('../middleware/adminAuth');

// ======================
// API Routes
// ======================

// Search users for compose message
router.get('/users/search', requireAdminAuth, async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.length < 2) {
            return res.json({ success: true, users: [] });
        }

        const [users] = await pool.query(`
            SELECT id, name, email, profile_picture
            FROM users
            WHERE (name LIKE ? OR email LIKE ?)
            AND status = 'active'
            ORDER BY name ASC
            LIMIT 10
        `, [`%${q}%`, `%${q}%`]);

        res.json({ success: true, users: users || [] });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ success: false, message: 'Failed to search users' });
    }
});

// Get all conversations for admin dashboard
router.get('/conversations', requireAdminAuth, async (req, res) => {
    try {
        // First get all conversations
        const [conversations] = await pool.query(`
            SELECT 
                c.id,
                c.user_id,
                c.session_id,
                c.status,
                c.chat_mode,
                c.admin_id,
                c.created_at,
                c.updated_at,
                c.last_message_at,
                u.name as user_name,
                u.email as user_email,
                u.profile_picture as user_avatar,
                u.last_login as user_last_login
            FROM conversations c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.status != 'deleted'
            ORDER BY c.last_message_at DESC
        `);

        // Then get last message and unread count for each conversation
        const conversationsWithDetails = await Promise.all(
            conversations.map(async (conv) => {
                try {
                    // Get last message
                    const [lastMsg] = await pool.query(`
                        SELECT content, created_at, sender_type, sender_name
                        FROM messages
                        WHERE conversation_id = ?
                        ORDER BY created_at DESC
                        LIMIT 1
                    `, [conv.id]);

                    // Get unread count
                    const [unreadResult] = await pool.query(`
                        SELECT COUNT(*) as count
                        FROM messages
                        WHERE conversation_id = ? AND sender_type = 'user' AND is_read = FALSE
                    `, [conv.id]);

                    // Get user online status
                    let userOnline = 0;
                    if (conv.user_last_login) {
                        const [onlineResult] = await pool.query(`
                            SELECT CASE 
                                WHEN ? > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 1
                                ELSE 0
                            END as is_online
                        `, [conv.user_last_login]);
                        userOnline = onlineResult[0]?.is_online || 0;
                    }

                    return {
                        ...conv,
                        last_message: lastMsg[0]?.content || lastMsg[0]?.sender_name + ': No message',
                        last_message_at: lastMsg[0]?.created_at || conv.last_message_at,
                        unread_count: unreadResult[0]?.count || 0,
                        user_online: userOnline
                    };
                } catch (err) {
                    console.error('Error getting conversation details:', err);
                    return {
                        ...conv,
                        last_message: 'Error loading message',
                        last_message_at: conv.last_message_at,
                        unread_count: 0,
                        user_online: 0
                    };
                }
            })
        );

        res.json({
            success: true,
            conversations: conversationsWithDetails
        });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversations',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get single conversation with messages
router.get('/conversations/:id', requireAdminAuth, async (req, res) => {
    try {
        const conversationId = req.params.id;

        // Get conversation with user details
        const [conversations] = await pool.query(`
            SELECT 
                c.*,
                u.name as user_name,
                u.email as user_email,
                u.profile_picture as user_avatar,
                u.last_login as user_last_login,
                u.phone as user_phone,
                u.address as user_address
            FROM conversations c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `, [conversationId]);

        if (conversations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }

        // Get messages
        const [messages] = await pool.query(`
            SELECT 
                m.id,
                m.conversation_id,
                m.sender_id,
                m.sender_type,
                m.sender_name,
                COALESCE(m.content, m.message) as message,
                m.message_type,
                m.status,
                m.is_read,
                m.created_at,
                u.name as sender_name,
                u.profile_picture as sender_avatar
            FROM messages m
            LEFT JOIN users u ON m.sender_id = u.id AND m.sender_type = 'user'
            WHERE m.conversation_id = ?
            ORDER BY m.created_at ASC
        `, [conversationId]);

        // Mark user messages as read
        await pool.query(`
            UPDATE messages
            SET is_read = TRUE, seen_at = NOW()
            WHERE conversation_id = ? AND sender_type = 'user' AND is_read = FALSE
        `, [conversationId]);

        res.json({
            success: true,
            conversation: conversations[0],
            messages: messages
        });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversation',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Reply to conversation
router.post('/conversations/:id/reply', requireAdminAuth, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { message, messageType = 'text' } = req.body;
        const adminId = req.session.adminId;
        const adminName = req.session.adminName || 'Admin';

        if (!message || message.trim() === '') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Message cannot be empty'
            });
        }

        // Check if conversation exists
        const [convCheck] = await connection.query(
            'SELECT * FROM conversations WHERE id = ?',
            [id]
        );

        if (convCheck.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }

        // Update conversation
        await connection.query(`
            UPDATE conversations 
            SET status = 'open', 
                admin_id = ?,
                last_message_at = NOW(),
                last_activity_at = NOW()
            WHERE id = ?
        `, [adminId, id]);

        // Insert message
        const [result] = await connection.query(`
            INSERT INTO messages (conversation_id, sender_type, sender_id, sender_name, content, message_type, status)
            VALUES (?, 'admin', ?, ?, ?, ?, 'sent')
        `, [id, adminId, adminName, message, messageType]);

        await connection.commit();

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`conversation-${id}`).emit('new-message', {
                id: result.insertId,
                conversation_id: id,
                sender_type: 'admin',
                sender_id: adminId,
                sender_name: adminName,
                content: message,
                message_type: messageType,
                status: 'sent',
                created_at: new Date()
            });
        }

        res.json({
            success: true,
            message: {
                id: result.insertId,
                conversation_id: id,
                sender_type: 'admin',
                sender_id: adminId,
                sender_name: adminName,
                content: message,
                message_type: messageType,
                status: 'sent',
                created_at: new Date()
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Reply error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send reply',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        connection.release();
    }
});

// Mark messages as read
router.post('/conversations/:id/read', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(`
            UPDATE messages
            SET is_read = TRUE, seen_at = NOW()
            WHERE conversation_id = ? AND sender_type = 'user' AND is_read = FALSE
        `, [id]);

        res.json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ success: false, message: 'Failed to mark messages as read' });
    }
});

// Close conversation
router.post('/conversations/:id/close', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.session.adminId;

        await pool.query(`
            UPDATE conversations 
            SET status = 'closed', 
                closed_by = ?,
                closed_at = NOW(),
                last_activity_at = NOW()
            WHERE id = ?
        `, [adminId, id]);

        res.json({ success: true, message: 'Conversation closed' });
    } catch (error) {
        console.error('Error closing conversation:', error);
        res.status(500).json({ success: false, message: 'Failed to close conversation' });
    }
});

// Reopen conversation
router.post('/conversations/:id/reopen', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(`
            UPDATE conversations 
            SET status = 'open',
                reopened_at = NOW(),
                last_activity_at = NOW()
            WHERE id = ?
        `, [id]);

        res.json({ success: true, message: 'Conversation reopened' });
    } catch (error) {
        console.error('Error reopening conversation:', error);
        res.status(500).json({ success: false, message: 'Failed to reopen conversation' });
    }
});

// ======================
// Page Routes
// ======================

// Render messages dashboard page
router.get('/', requireAdminAuth, (req, res) => {
    res.render('admin/messages-dashboard', {
        title: 'Messages - OMUNJU SHOPPERS Admin',
        currentPage: 'messages'
    });
});

// Render chat view page
router.get('/chat/:id', requireAdminAuth, (req, res) => {
    res.render('admin/chat-view', {
        title: 'Chat - OMUNJU SHOPPERS Admin',
        currentPage: 'messages',
        conversationId: req.params.id
    });
});

// Render compose new message page
router.get('/compose', requireAdminAuth, (req, res) => {
    res.render('admin/compose-message', {
        title: 'Compose Message - OMUNJU SHOPPERS Admin',
        currentPage: 'messages'
    });
});

module.exports = router;
