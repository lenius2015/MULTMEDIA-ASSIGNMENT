const express = require('express');
const router = express.Router();
const pool = require('../db');
const NotificationService = require('../utils/notificationService');

// Get user's inbox messages
router.get('/', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const [messages] = await pool.query(`
      SELECT im.*, u.name as sender_name, u.email as sender_email
      FROM inbox_messages im
      LEFT JOIN users u ON im.sender_id = u.id
      WHERE im.recipient_id = ?
      ORDER BY im.created_at DESC
    `, [req.session.userId]);

    res.json({
      success: true,
      messages: messages
    });
  } catch (error) {
    console.error('Error fetching inbox messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

// Get unread message count
router.get('/unread-count', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const [result] = await pool.query(`
      SELECT COUNT(*) as unread_count
      FROM inbox_messages
      WHERE recipient_id = ? AND is_read = FALSE
    `, [req.session.userId]);

    res.json({
      success: true,
      unreadCount: result[0].unread_count
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
  }
});

// Mark message as read
router.put('/:id/read', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const [result] = await pool.query(`
      UPDATE inbox_messages
      SET is_read = TRUE
      WHERE id = ? AND recipient_id = ?
    `, [req.params.id, req.session.userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.json({ success: true, message: 'Message marked as read' });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ success: false, message: 'Failed to mark message as read' });
  }
});

// Send message (admin to user or user to admin)
router.post('/send', async (req, res) => {
  try {
    const { recipient_id, subject, message, message_type } = req.body;

    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!recipient_id || !subject || !message) {
      return res.status(400).json({ success: false, message: 'Recipient, subject, and message are required' });
    }

    // Insert message
    const [result] = await pool.query(`
      INSERT INTO inbox_messages (sender_id, recipient_id, subject, message, message_type)
      VALUES (?, ?, ?, ?, ?)
    `, [req.session.userId, recipient_id, subject, message, message_type || 'general']);

    // Send notification to recipient
    try {
      await NotificationService.sendNotification(
        recipient_id,
        `New message: ${subject}`,
        `You have received a new message from ${req.session.userName}`,
        'general'
      );
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
    }

    res.json({
      success: true,
      message: 'Message sent successfully',
      messageId: result.insertId
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

// Delete message
router.delete('/:id', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const [result] = await pool.query(`
      DELETE FROM inbox_messages
      WHERE id = ? AND recipient_id = ?
    `, [req.params.id, req.session.userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, message: 'Failed to delete message' });
  }
});

module.exports = router;