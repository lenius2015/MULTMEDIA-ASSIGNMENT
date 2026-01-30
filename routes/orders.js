const express = require('express');
const router = express.Router();
const pool = require('../db');
const { isAuthenticated } = require('../middleware/auth');
const NotificationService = require('../utils/notificationService');
const Logger = require('../utils/logger');

// Create new order from cart
router.post('/create', isAuthenticated, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const userId = req.session.userId;
        const { shipping, paymentMethod } = req.body;

        // Validate required fields
        if (!shipping || !shipping.firstName || !shipping.lastName || 
            !shipping.email || !shipping.phone || !shipping.address || 
            !shipping.city || !shipping.region) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Please fill in all required shipping information'
            });
        }

        // Get cart items
        const [cartItems] = await connection.query(`
            SELECT c.product_id, c.quantity, p.price, p.discount, p.stock
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        `, [userId]);

        if (cartItems.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Your cart is empty'
            });
        }

        // Calculate total
        let totalAmount = 0;
        for (const item of cartItems) {
            if (item.stock < item.quantity) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for product ID ${item.product_id}`
                });
            }
            const itemPrice = item.price * item.quantity;
            const itemDiscount = item.discount ? (itemPrice * item.discount) / 100 : 0;
            totalAmount += itemPrice - itemDiscount;
        }

        const shippingCost = 5000; // Fixed shipping cost
        totalAmount += shippingCost;

        // Create order
        const [orderResult] = await connection.query(`
            INSERT INTO orders (
                user_id, 
                total_amount, 
                status, 
                payment_method,
                shipping_name,
                shipping_email,
                shipping_phone,
                shipping_address,
                shipping_city,
                shipping_region,
                shipping_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            userId,
            totalAmount,
            'pending',
            paymentMethod || 'cash_on_delivery',
            `${shipping.firstName} ${shipping.lastName}`,
            shipping.email,
            shipping.phone,
            shipping.address,
            shipping.city,
            shipping.region,
            shipping.notes || null
        ]);

        const orderId = orderResult.insertId;

        // Create order items
        for (const item of cartItems) {
            const itemPrice = item.price * item.quantity;
            const itemDiscount = item.discount ? (itemPrice * item.discount) / 100 : 0;
            
            await connection.query(`
                INSERT INTO order_items (order_id, product_id, quantity, price, discount)
                VALUES (?, ?, ?, ?, ?)
            `, [orderId, item.product_id, item.quantity, item.price, item.discount || 0]);

            // Update product stock
            await connection.query(`
                UPDATE products SET stock = stock - ? WHERE id = ?
            `, [item.quantity, item.product_id]);
        }

        // Clear cart
        await connection.query('DELETE FROM cart WHERE user_id = ?', [userId]);

        // Delete incomplete orders
        await connection.query(
            'DELETE FROM orders WHERE user_id = ? AND status = ? AND id != ?',
            [userId, 'incomplete_order', orderId]
        );

        await connection.commit();

        // Log order creation
        await Logger.activity(userId, 'order_created', `Order ${orderId} created successfully`, {
            orderId,
            totalAmount,
            paymentMethod
        });

        // Send notifications
        try {
            // Notify user
            await NotificationService.sendToUser(userId,
                'Order Placed Successfully!',
                `Your order #${orderId} has been received. Total: TSH ${totalAmount.toLocaleString()}`,
                { type: 'order', priority: 'high', orderId }
            );

            // Notify admin
            await NotificationService.notifyNewOrder(orderId, totalAmount, userId);
        } catch (notificationError) {
            console.error('Error sending notifications:', notificationError);
        }

        res.json({
            success: true,
            message: 'Order placed successfully!',
            orderId: orderId
        });
    } catch (error) {
        await connection.rollback();
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to place order. Please try again.'
        });
    } finally {
        connection.release();
    }
});

// Get user's orders
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;

        const [orders] = await pool.query(`
            SELECT o.*, 
                   GROUP_CONCAT(oi.product_id) as product_ids,
                   GROUP_CONCAT(p.name) as product_names
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `, [userId]);

        res.json({ success: true, orders });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    }
});

// Get single order
router.get('/:orderId', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { orderId } = req.params;

        const [orders] = await pool.query(`
            SELECT o.*, 
                   GROUP_CONCAT(oi.product_id) as product_ids
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.id = ? AND o.user_id = ?
            GROUP BY o.id
        `, [orderId, userId]);

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const order = orders[0];

        // Get order items
        const [orderItems] = await pool.query(`
            SELECT oi.*, p.name, p.image_url
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [orderId]);

        res.json({
            success: true,
            order: {
                ...order,
                items: orderItems
            }
        });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order'
        });
    }
});

// Cancel order
router.post('/:orderId/cancel', isAuthenticated, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const userId = req.session.userId;
        const { orderId } = req.params;

        // Check order exists and belongs to user
        const [orders] = await connection.query(
            'SELECT * FROM orders WHERE id = ? AND user_id = ?',
            [orderId, userId]
        );

        if (orders.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const order = orders[0];

        // Only allow cancellation of pending orders
        if (order.status !== 'pending') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel order that has been processed'
            });
        }

        // Restore stock
        const [orderItems] = await connection.query(
            'SELECT * FROM order_items WHERE order_id = ?',
            [orderId]
        );

        for (const item of orderItems) {
            await connection.query(
                'UPDATE products SET stock = stock + ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }

        // Update order status
        await connection.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            ['cancelled', orderId]
        );

        await connection.commit();

        // Log cancellation
        await Logger.activity(userId, 'order_cancelled', `Order ${orderId} cancelled`, { orderId });

        res.json({
            success: true,
            message: 'Order cancelled successfully'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order'
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
