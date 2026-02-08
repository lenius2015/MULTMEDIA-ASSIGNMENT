const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAdminAuth } = require('../middleware/adminAuth');

// Get all active chats for admin
router.get('/chats', requireAdminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const filter = req.query.filter || 'all'; // all, unread, active, closed

    let query = `
      SELECT 
        c.*,
        u.name as user_name,
        u.email as user_email,
        u.profile_picture as user_avatar,
        a.name as admin_name,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_type = 'user' AND status = 'sent') as unread_count,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
      FROM conversations c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN admins a ON c.admin_id = a.id
      WHERE 1=1
    `;

    const params = [];

    // Apply filters
    if (filter === 'unread') {
      query += ` AND (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_type = 'user' AND status = 'sent') > 0`;
    } else if (filter === 'active') {
      query += ` AND c.status = 'active'`;
    } else if (filter === 'closed') {
      query += ` AND c.status = 'closed'`;
    }

    // Search
    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR c.session_id LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Count
    let countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
    const [countResult] = await pool.query(countQuery, params);
    const totalChats = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalChats / limit);

    // Get chats with pagination
    query += ' ORDER BY last_message_time DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [chats] = await pool.query(query, params);

    res.json({
      success: true,
      chats: chats || [],
      pagination: {
        total: totalChats,
        page,
        limit,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch chats' });
  }
});

// Get specific chat conversation
router.get('/chat/:conversationId', requireAdminAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Get conversation info
    const [conversations] = await pool.query(`
      SELECT 
        c.*,
        u.name as user_name,
        u.email as user_email,
        u.profile_picture as user_avatar,
        u.phone as user_phone
      FROM conversations c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [conversationId]);

    if (conversations.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Get messages
    const [messages] = await pool.query(`
      SELECT 
        m.*,
        u.name as sender_name,
        u.profile_picture as sender_avatar
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id AND m.sender_type = 'user'
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
    `, [conversationId]);

    // Mark unread messages as read
    await pool.query(`
      UPDATE messages 
      SET status = 'read' 
      WHERE conversation_id = ? AND sender_type = 'user' AND status = 'sent'
    `, [conversationId]);

    res.json({
      success: true,
      conversation: conversations[0],
      messages: messages || []
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch chat' });
  }
});

// Send message in chat
router.post('/chat/:conversationId/message', requireAdminAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;
    const adminId = req.session.adminId;

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    // Verify conversation exists
    const [conversations] = await pool.query(
      'SELECT * FROM conversations WHERE id = ?',
      [conversationId]
    );

    if (conversations.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Insert message
    const [result] = await pool.query(`
      INSERT INTO messages (conversation_id, sender_id, sender_type, message_type, content, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [conversationId, adminId, 'admin', 'text', message, 'delivered']);

    // Update conversation
    await pool.query(`
      UPDATE conversations
      SET last_message_at = NOW(), admin_id = ?
      WHERE id = ?
    `, [adminId, conversationId]);

    // Get the inserted message
    const [messages] = await pool.query(`
      SELECT m.*,
             a.name as sender_name,
             a.profile_picture as sender_avatar
      FROM messages m
      LEFT JOIN admins a ON m.sender_id = a.id
      WHERE m.id = ?
    `, [result.insertId]);

    res.json({
      success: true,
      message: messages[0],
      messageId: result.insertId
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

// Update conversation status
router.put('/chat/:conversationId/status', requireAdminAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'closed', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    await pool.query(
      'UPDATE conversations SET status = ? WHERE id = ?',
      [status, conversationId]
    );

    res.json({ success: true, message: 'Chat status updated' });
  } catch (error) {
    console.error('Update chat status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// Get chat statistics
router.get('/stats', requireAdminAuth, async (req, res) => {
  try {
    // Total conversations
    const [totalChats] = await pool.query(
      'SELECT COUNT(*) as count FROM conversations'
    );

    // Unread messages count
    const [unreadCount] = await pool.query(`
      SELECT COUNT(*) as count FROM messages 
      WHERE sender_type = 'user' AND status = 'sent'
    `);

    // Active conversations
    const [activeChats] = await pool.query(
      'SELECT COUNT(*) as count FROM conversations WHERE status = "active"'
    );

    // Closed conversations
    const [closedChats] = await pool.query(
      'SELECT COUNT(*) as count FROM conversations WHERE status = "closed"'
    );

    // Average response time (in minutes)
    const [avgResponse] = await pool.query(`
      SELECT AVG(TIMESTAMPDIFF(MINUTE, user_message_time, admin_message_time)) as avg_time
      FROM (
        SELECT 
          c.id,
          MAX(CASE WHEN m.sender_type = 'user' THEN m.created_at END) as user_message_time,
          MAX(CASE WHEN m.sender_type = 'admin' THEN m.created_at END) as admin_message_time
        FROM conversations c
        LEFT JOIN messages m ON c.id = m.conversation_id
        GROUP BY c.id
      ) as response_data
    `);

    res.json({
      success: true,
      stats: {
        totalChats: totalChats[0]?.count || 0,
        unreadMessages: unreadCount[0]?.count || 0,
        activeChats: activeChats[0]?.count || 0,
        closedChats: closedChats[0]?.count || 0,
        averageResponseTime: Math.round(avgResponse[0]?.avg_time || 0)
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

module.exports = router;
