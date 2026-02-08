const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAuthenticated } = require('../middleware/auth');

// Get wishlist for authenticated user
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const [rows] = await db.query(
      `SELECT w.id, w.product_id, p.name, p.price, p.discount, p.image_url
       FROM wishlist w
       JOIN products p ON p.id = w.product_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [userId]
    );

    res.json({ success: true, wishlist: rows });
  } catch (err) {
    console.error('Get wishlist error:', err);
    res.status(500).json({ success: false, message: 'Failed to load wishlist' });
  }
});

// Get wishlist count
router.get('/count', async (req, res) => {
  try {
    if (!(req.session && req.session.userId)) {
      return res.json({ success: true, count: 0 });
    }
    const userId = req.session.userId;
    const [rows] = await db.query('SELECT COUNT(*) AS cnt FROM wishlist WHERE user_id = ?', [userId]);
    res.json({ success: true, count: rows[0].cnt });
  } catch (err) {
    console.error('Wishlist count error:', err);
    res.status(500).json({ success: false, message: 'Failed to get wishlist count' });
  }
});

// Add to wishlist
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: 'productId required' });

    await db.query('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE created_at = NOW()', [userId, productId]);

    // return new count
    const [countRows] = await db.query('SELECT COUNT(*) AS cnt FROM wishlist WHERE user_id = ?', [userId]);
    res.json({ success: true, message: 'Added to wishlist', count: countRows[0].cnt });
  } catch (err) {
    console.error('Add wishlist error:', err);
    res.status(500).json({ success: false, message: 'Failed to add to wishlist' });
  }
});

// Remove from wishlist
router.delete('/:productId', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const productId = req.params.productId;
    await db.query('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', [userId, productId]);

    const [countRows] = await db.query('SELECT COUNT(*) AS cnt FROM wishlist WHERE user_id = ?', [userId]);
    res.json({ success: true, message: 'Removed from wishlist', count: countRows[0].cnt });
  } catch (err) {
    console.error('Remove wishlist error:', err);
    res.status(500).json({ success: false, message: 'Failed to remove from wishlist' });
  }
});

// Move wishlist item to cart
router.post('/move-to-cart/:productId', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const productId = req.params.productId;
    const quantity = parseInt(req.body.quantity, 10) || 1;

    // Insert into cart (or update quantity)
    await db.query(
      `INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
      [userId, productId, quantity]
    );

    // Remove from wishlist
    await db.query('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', [userId, productId]);

    res.json({ success: true, message: 'Moved to cart' });
  } catch (err) {
    console.error('Move wishlist to cart error:', err);
    res.status(500).json({ success: false, message: 'Failed to move item to cart' });
  }
});

module.exports = router;
