const express = require('express');
const router = express.Router();
const pool = require('../db');
const { isAuthenticated } = require('../middleware/auth');

// Helper function to create/update incomplete order from cart
async function updateIncompleteOrder(connection, userId) {
    // Get cart items
    const [cartItems] = await connection.query(`
        SELECT c.product_id, c.quantity, p.price, p.discount
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
    `, [userId]);

    if (cartItems.length === 0) {
        // No items in cart, delete any existing incomplete order
        await connection.query(
            'DELETE FROM orders WHERE user_id = ? AND status = ?',
            [userId, 'incomplete_order']
        );
        return;
    }

    // Calculate total
    let totalAmount = 0;
    for (const item of cartItems) {
        const itemPrice = item.price * item.quantity;
        const itemDiscount = (itemPrice * item.discount) / 100;
        totalAmount += itemPrice - itemDiscount;
    }

    // Check if incomplete order exists
    const [existingOrders] = await connection.query(
        'SELECT id FROM orders WHERE user_id = ? AND status = ?',
        [userId, 'incomplete_order']
    );

    if (existingOrders.length > 0) {
        // Update existing incomplete order
        const orderId = existingOrders[0].id;

        // Delete existing order items
        await connection.query('DELETE FROM order_items WHERE order_id = ?', [orderId]);

        // Update order total
        await connection.query(
            'UPDATE orders SET total_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [totalAmount, orderId]
        );

        // Add new order items
        for (const item of cartItems) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price, discount) VALUES (?, ?, ?, ?, ?)',
                [orderId, item.product_id, item.quantity, item.price, item.discount]
            );
        }
    } else {
        // Create new incomplete order
        const [orderResult] = await connection.query(
            'INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)',
            [userId, totalAmount, 'incomplete_order']
        );

        const orderId = orderResult.insertId;

        // Add order items
        for (const item of cartItems) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price, discount) VALUES (?, ?, ?, ?, ?)',
                [orderId, item.product_id, item.quantity, item.price, item.discount]
            );
        }
    }
}

// Get user's cart items
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;

    const [cartItems] = await pool.query(`
      SELECT
        c.id,
        c.quantity,
        c.created_at,
        p.id as product_id,
        p.name,
        p.price,
        p.discount,
        p.image_url,
        p.stock,
        (p.price - (p.price * COALESCE(p.discount, 0) / 100)) as discounted_price
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `, [userId]);

    // Calculate total
    const total = cartItems.reduce((sum, item) => {
      const price = parseFloat(item.discounted_price) || item.price;
      return sum + (price * item.quantity);
    }, 0);

    res.json({
      success: true,
      cart: cartItems,
      total: total.toFixed(2),
      itemCount: cartItems.length
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart'
    });
  }
});

// Add item to cart
router.post('/', isAuthenticated, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const userId = req.session.userId;
        const { productId, quantity = 1 } = req.body;

        if (!productId || quantity < 1) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Invalid product ID or quantity'
            });
        }

        // Check if product exists and has stock
        const [products] = await connection.query(
            'SELECT id, name, stock, price, discount FROM products WHERE id = ?',
            [productId]
        );

        if (products.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        if (products[0].stock < quantity) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Insufficient stock'
            });
        }

        // Add or update cart item
        await connection.query(`
            INSERT INTO cart (user_id, product_id, quantity)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
        `, [userId, productId, quantity]);

        // Create or update incomplete order
        await updateIncompleteOrder(connection, userId);

        await connection.commit();

        res.json({
            success: true,
            message: 'Item added to cart'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Add to cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add item to cart'
        });
    } finally {
        connection.release();
    }
});

// Update cart item quantity
router.put('/:productId', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    // Check if product exists and has stock
    const [products] = await pool.query(
      'SELECT stock FROM products WHERE id = ?',
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (products[0].stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock'
      });
    }

    // Update cart item
    const [result] = await pool.query(
      'UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?',
      [quantity, userId, productId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    res.json({
      success: true,
      message: 'Cart item updated'
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart item'
    });
  }
});

// Remove item from cart
router.delete('/:productId', isAuthenticated, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const userId = req.session.userId;
        const { productId } = req.params;

        const [result] = await connection.query(
            'DELETE FROM cart WHERE user_id = ? AND product_id = ?',
            [userId, productId]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        // Update incomplete order
        await updateIncompleteOrder(connection, userId);

        await connection.commit();

        res.json({
            success: true,
            message: 'Item removed from cart'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Remove from cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove item from cart'
        });
    } finally {
        connection.release();
    }
});

// Clear entire cart
router.delete('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;

    await pool.query(
      'DELETE FROM cart WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Cart cleared'
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart'
    });
  }
});

module.exports = router;