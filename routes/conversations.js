const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAdminAuth } = require('../middleware/adminAuth');
const { v4: uuidv4 } = require('uuid');

// User sends a message (public endpoint - creates conversation if needed)
router.post('/message', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const { message, messageType = 'text', conversationId } = req.body;
        const userId = req.session.userId || null;
        const sessionId = req.session.id || uuidv4();

        if (!message || message.trim() === '') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Message cannot be empty'
            });
        }

        let convId = conversationId;

        // If no conversation ID provided, find existing or create new
        if (!convId) {
            if (userId) {
                // Check for existing open conversation for logged-in user
                const [existing] = await connection.query(`
                    SELECT id FROM conversations 
                    WHERE user_id = ? AND status = 'open'
                    ORDER BY last_message_at DESC LIMIT 1
                `, [userId]);

                if (existing.length > 0) {
                    convId = existing[0].id;
                }
            } else {
                // Check for existing conversation by session
                const [existing] = await connection.query(`
                    SELECT id FROM conversations 
                    WHERE session_id = ? AND user_id IS NULL AND status = 'open'
                    ORDER BY last_message_at DESC LIMIT 1
                `, [sessionId]);

                if (existing.length > 0) {
                    convId = existing[0].id;
                }
            }
        }

        // Create new conversation if needed
        if (!convId) {
            const [result] = await connection.query(`
                INSERT INTO conversations (user_id, session_id, status, chat_mode, last_message_at, created_at)
                VALUES (?, ?, 'open', 'chatbot', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [userId, sessionId]);
            convId = result.insertId;
        }

        // Get user info for sender name
        let senderName = 'Visitor';
        if (userId) {
            const [users] = await connection.query('SELECT name FROM users WHERE id = ?', [userId]);
            if (users.length > 0) {
                senderName = users[0].name;
            }
        }

        // Insert message
        const [msgResult] = await connection.query(`
            INSERT INTO messages (conversation_id, sender_type, sender_id, sender_name, message, message_type, status, created_at)
            VALUES (?, 'user', ?, ?, ?, ?, 'sent', CURRENT_TIMESTAMP)
        `, [convId, userId, senderName, message, messageType]);

        // Update conversation
        await connection.query(`
            UPDATE conversations 
            SET last_message_at = CURRENT_TIMESTAMP,
                last_activity_at = CURRENT_TIMESTAMP,
                status = CASE WHEN status = 'closed' THEN 'open' ELSE status END
            WHERE id = ?
        `, [convId]);

        await connection.commit();

        // Emit socket event for real-time notification to admin
        const io = req.app.get('io');
        if (io) {
            io.to('admin_room').emit('user_message', {
                conversationId: convId,
                message: {
                    id: msgResult.insertId,
                    conversation_id: convId,
                    sender_type: 'user',
                    sender_id: userId,
                    sender_name: senderName,
                    message: message,
                    message_type: messageType,
                    status: 'sent',
                    created_at: new Date()
                }
            });
        }

        res.json({
            success: true,
            conversationId: convId,
            messageId: msgResult.insertId
        });
    } catch (error) {
        await connection.rollback();
        console.error('Send message error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        connection.release();
    }
});

// User submits offline message
router.post('/offline-message', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const { name, contact, message } = req.body;
        const sessionId = req.session.id || uuidv4();

        if (!name || !contact || !message) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Create conversation with offline status
        const [result] = await connection.query(`
            INSERT INTO conversations (user_id, session_id, status, chat_mode, admin_id, last_message_at, created_at)
            VALUES (NULL, ?, 'open', 'offline_message', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [sessionId]);

        const convId = result.insertId;

        // Insert offline message
        await connection.query(`
            INSERT INTO messages (conversation_id, sender_type, sender_id, sender_name, message, message_type, status, created_at)
            VALUES (?, 'user', NULL, ?, ?, ?, 'sent', CURRENT_TIMESTAMP)
        `, [convId, name, `Offline: ${contact} - ${message}`, 'offline']);

        await connection.commit();

        // Notify admin
        const io = req.app.get('io');
        if (io) {
            io.to('admin_room').emit('offline_message', {
                conversationId: convId,
                name,
                contact,
                message
            });
        }

        res.json({
            success: true,
            message: 'Message sent successfully. We will get back to you within 24 hours.'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Offline message error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        connection.release();
    }
});

// Get all conversations for admin
router.get('/', requireAdminAuth, async (req, res) => {
    try {
        const { status, page = 1, limit = 20, search = '' } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                c.*,
                u.name as user_name,
                u.email as user_email,
                u.profile_picture as user_avatar,
                a.name as admin_name,
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND status = 'sent' AND sender_type = 'user') as unread_count,
                (SELECT message FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
            FROM conversations c
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN admins a ON c.admin_id = a.id
            WHERE 1=1
        `;

        const params = [];

        if (status && status !== 'all') {
            query += ' AND c.status = ?';
            params.push(status);
        }

        if (search) {
            query += ' AND (u.name LIKE ? OR u.email LIKE ? OR c.session_id LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY c.last_message_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [conversations] = await pool.query(query, params);

        // Get total count
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM conversations c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE 1=1
        `;
        const countParams = [];
        if (status && status !== 'all') {
            countQuery += ' AND c.status = ?';
            countParams.push(status);
        }
        const [countResult] = await pool.query(countQuery, countParams);

        res.json({
            success: true,
            conversations: conversations.map(conv => ({
                ...conv,
                session_id: conv.session_id || `visitor-${conv.id}`,
                user_avatar: conv.user_avatar || '/images/default-avatar.png'
            })),
            pagination: {
                total: countResult[0].total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversations',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get single conversation with messages
router.get('/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.session.adminId;

        // Get conversation
        const [conversations] = await pool.query(`
            SELECT 
                c.*,
                u.name as user_name,
                u.email as user_email,
                u.profile_picture as user_avatar,
                a.name as admin_name
            FROM conversations c
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN admins a ON c.admin_id = a.id
            WHERE c.id = ?
        `, [id]);

        if (conversations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }

        const conversation = conversations[0];

        // Get messages
        const [messages] = await pool.query(`
            SELECT * FROM messages 
            WHERE conversation_id = ?
            ORDER BY created_at ASC
        `, [id]);

        // Mark messages as seen
        await pool.query(`
            UPDATE messages 
            SET status = 'seen', seen_at = CURRENT_TIMESTAMP 
            WHERE conversation_id = ? AND sender_type = 'user' AND status = 'sent'
        `, [id]);

        res.json({
            success: true,
            conversation: {
                ...conversation,
                session_id: conversation.session_id || `visitor-${conversation.id}`,
                user_avatar: conversation.user_avatar || '/images/default-avatar.png'
            },
            messages
        });
    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversation',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Reply to conversation
router.post('/:id/reply', requireAdminAuth, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { message, messageType = 'text' } = req.body;
        const adminId = req.session.adminId;
        const adminName = req.session.adminName;

        if (!message || message.trim() === '') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Message cannot be empty'
            });
        }

        // Check if conversation exists
        const [conversations] = await connection.query(
            'SELECT * FROM conversations WHERE id = ?',
            [id]
        );

        if (conversations.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }

        // Update conversation status
        await connection.query(`
            UPDATE conversations 
            SET status = 'open', 
                admin_id = ?,
                last_message_at = CURRENT_TIMESTAMP,
                last_activity_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [adminId, id]);

        // Insert message
        const [result] = await connection.query(`
            INSERT INTO messages (conversation_id, sender_type, sender_id, sender_name, message, message_type, status)
            VALUES (?, 'admin', ?, ?, ?, ?, 'sent')
        `, [id, adminId, adminName, message, messageType]);

        await connection.commit();

        // Emit socket event for real-time update
        const io = req.app.get('io');
        if (io) {
            io.to(`conversation-${id}`).emit('new-message', {
                id: result.insertId,
                conversation_id: id,
                sender_type: 'admin',
                sender_id: adminId,
                sender_name: adminName,
                message,
                message_type: messageType,
                status: 'sent',
                created_at: new Date()
            });

            // Notify user if they're online
            io.emit(`user-notification-${id}`, {
                type: 'admin_reply',
                conversation_id: id
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
                message,
                message_type: messageType,
                status: 'sent',
                created_at: new Date()
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Reply to conversation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send reply',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        connection.release();
    }
});

// Close conversation
router.post('/:id/close', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.session.adminId;

        await pool.query(`
            UPDATE conversations 
            SET status = 'closed', 
                closed_at = CURRENT_TIMESTAMP,
                last_activity_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [id]);

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`conversation-${id}`).emit('conversation-closed', {
                conversation_id: id,
                closed_by: 'admin'
            });
        }

        res.json({
            success: true,
            message: 'Conversation closed successfully'
        });
    } catch (error) {
        console.error('Close conversation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to close conversation',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Reopen conversation
router.post('/:id/reopen', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.session.adminId;

        await pool.query(`
            UPDATE conversations 
            SET status = 'open', 
                admin_id = ?,
                closed_at = NULL,
                last_activity_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [adminId, id]);

        res.json({
            success: true,
            message: 'Conversation reopened successfully'
        });
    } catch (error) {
        console.error('Reopen conversation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reopen conversation',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get unread count
router.get('/stats/unread', requireAdminAuth, async (req, res) => {
    try {
        const adminId = req.session.adminId;

        // Get unread count for assigned conversations
        const [unreadResult] = await pool.query(`
            SELECT COUNT(*) as count
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE m.status = 'sent' 
            AND m.sender_type = 'user'
            AND (c.admin_id = ? OR c.admin_id IS NULL)
            AND c.status = 'open'
        `, [adminId]);

        // Get total active conversations
        const [activeResult] = await pool.query(`
            SELECT COUNT(*) as count
            FROM conversations
            WHERE status = 'open'
        `);

        res.json({
            success: true,
            unread_count: unreadResult[0].count,
            active_conversations: activeResult[0].count
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get unread count',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get admin workload
router.get('/stats/workload', requireAdminAuth, async (req, res) => {
    try {
        const adminId = req.session.adminId;

        const [workload] = await pool.query(`
            SELECT 
                COUNT(*) as active_chats,
                (SELECT COUNT(*) FROM conversations WHERE admin_id = ? AND status = 'open') as my_chats
        `, [adminId]);

        res.json({
            success: true,
            workload: workload[0]
        });
    } catch (error) {
        console.error('Get workload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get workload',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
