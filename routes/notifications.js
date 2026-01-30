const express = require('express');
const router = express.Router();
const pool = require('../db');
const { isAuthenticated } = require('../middleware/auth');
const NotificationService = require('../utils/notificationService');

// Get user notifications page
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    // Get user notifications
    const notifications = await NotificationService.getUserNotifications(userId, {
      limit,
      offset,
      unreadOnly: req.query.filter === 'unread'
    });

    // Get notification counts
    const counts = await NotificationService.getNotificationCounts('user', userId);

    res.render('notifications', {
      title: 'My Notifications - OMUNJU SHOPPERS',
      notifications,
      counts,
      currentPage: page,
      hasNextPage: notifications.length === limit,
      user: {
        id: userId,
        name: req.session.userName,
        email: req.session.userEmail
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).render('error', { message: 'Failed to load notifications' });
  }
});

// API: Get user notifications (JSON)
router.get('/api', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const notifications = await NotificationService.getUserNotifications(userId, {
      limit: 50,
      unreadOnly: req.query.unread === 'true'
    });

    const counts = await NotificationService.getNotificationCounts('user', userId);

    res.json({
      success: true,
      notifications,
      counts
    });
  } catch (error) {
    console.error('Get notifications API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// Mark notification as read
router.put('/:id/read', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
      [id, userId]
    );

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read
router.put('/read-all', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE (user_id = ? OR user_id IS NULL) AND is_read = FALSE',
      [userId]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

// Delete notification
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    await pool.query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

module.exports = router;
