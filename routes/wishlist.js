const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/wishlist - Get user's wishlist
router.get('/', async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: 'Please login to view wishlist' });
        }

        const userId = req.session.user.id;

        const [wishlistItems] = await db.query(`
            SELECT w.id, w.product_id, w.created_at, p.name, p.price, p.image_url, p.category
            FROM wishlist w
            JOIN products p ON w.product_id = p.id
            WHERE w.user_id = ?
            ORDER BY w.created_at DESC
        `, [userId]);

        res.json({ success: true, wishlist: wishlistItems });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json({ success: false, message: 'Error fetching wishlist' });
    }
});

// POST /api/wishlist - Add item to wishlist
router.post('/', async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: 'Please login to add to wishlist' });
        }

        const userId = req.session.user.id;
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({ success: false, message: 'Product ID is required' });
        }

        // Check if product exists
        const [products] = await db.query('SELECT id, name FROM products WHERE id = ?', [productId]);
        if (products.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Check if already in wishlist
        const [existing] = await db.query('SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?', [userId, productId]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Product already in wishlist' });
        }

        // Add to wishlist
        await db.query('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)', [userId, productId]);

        res.json({ success: true, message: 'Added to wishlist' });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ success: false, message: 'Error adding to wishlist' });
    }
});

// DELETE /api/wishlist/:productId - Remove item from wishlist
router.delete('/:productId', async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: 'Please login to remove from wishlist' });
        }

        const userId = req.session.user.id;
        const productId = req.params.productId;

        const [result] = await db.query('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', [userId, productId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Item not found in wishlist' });
        }

        res.json({ success: true, message: 'Removed from wishlist' });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ success: false, message: 'Error removing from wishlist' });
    }
});

// GET /api/wishlist/count - Get wishlist count
router.get('/count', async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.session || !req.session.user) {
            return res.json({ success: true, count: 0 });
        }

        const userId = req.session.user.id;

        const [result] = await db.query('SELECT COUNT(*) as count FROM wishlist WHERE user_id = ?', [userId]);

        res.json({ success: true, count: result[0].count });
    } catch (error) {
        console.error('Error fetching wishlist count:', error);
        res.status(500).json({ success: true, count: 0 });
    }
});

// POST /api/wishlist/move-to-cart/:productId - Move item from wishlist to cart
router.post('/move-to-cart/:productId', async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: 'Please login' });
        }

        const userId = req.session.user.id;
        const productId = req.params.productId;
        const quantity = parseInt(req.body.quantity) || 1;

        // Check if product exists and has stock
        const [products] = await db.query('SELECT id, price, stock FROM products WHERE id = ?', [productId]);
        if (products.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const product = products[0];
        if (product.stock < quantity) {
            return res.status(400).json({ success: false, message: 'Insufficient stock' });
        }

        // Check if already in cart
        const [cartItems] = await db.query('SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?', [userId, productId]);
        if (cartItems.length > 0) {
            // Update quantity
            const newQuantity = cartItems[0].quantity + quantity;
            if (product.stock < newQuantity) {
                return res.status(400).json({ success: false, message: 'Insufficient stock' });
            }
            await db.query('UPDATE cart SET quantity = ? WHERE id = ?', [newQuantity, cartItems[0].id]);
        } else {
            // Add to cart
            await db.query('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)', [userId, productId, quantity]);
        }

        // Remove from wishlist
        await db.query('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', [userId, productId]);

        res.json({ success: true, message: 'Moved to cart' });
    } catch (error) {
        console.error('Error moving to cart:', error);
        res.status(500).json({ success: false, message: 'Error moving to cart' });
    }
});

module.exports = router;
