const express = require('express');
const router = express.Router();
const pool = require('../db');
const { isAuthenticated } = require('../middleware/auth');

// Generate unique order number
function generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-4);
    return `ORD-${year}${month}${day}-${timestamp}`;
}

// Submit checkout
router.post('/create-order', isAuthenticated, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const userId = req.session.userId;
        const {
            fullName,
            phone,
            email,
            streetAddress,
            city,
            state,
            postalCode,
            country,
            deliveryNotes,
            deliveryType,
            paymentMethod
        } = req.body;

        // Validate required fields
        if (!fullName || !phone || !email || !streetAddress || !city) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Please fill in all required fields'
            });
        }

        // Get cart items
        const [cartItems] = await connection.query(`
            SELECT
                c.product_id,
                c.quantity,
                p.price,
                p.discount,
                p.stock,
                p.name,
                (p.price - (p.price * COALESCE(p.discount, 0) / 100)) as discounted_price
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
        `, [userId]);

        if (cartItems.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Your cart is empty'
            });
        }

        // Check stock availability
        for (const item of cartItems) {
            if (item.quantity > item.stock) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${item.name}`
                });
            }
        }

        // Calculate totals
        const subtotal = cartItems.reduce((sum, item) => {
            return sum + (parseFloat(item.discounted_price) * item.quantity);
        }, 0);

        const deliveryFee = subtotal > 50000 ? 0 : 5000; // Free delivery over 50k
        const tax = subtotal * 0.16; // 16% VAT
        const total = subtotal + deliveryFee + tax;

        // Generate order number
        const orderNumber = generateOrderNumber();

        // Create order
        const [orderResult] = await connection.query(`
            INSERT INTO orders (
                order_number, user_id, guest_email, subtotal, tax, delivery_fee,
                total_amount, shipping_first_name, shipping_last_name, shipping_phone,
                shipping_email, shipping_street, shipping_city, shipping_state,
                shipping_postal_code, shipping_country, notes, status, payment_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')
        `, [
            orderNumber,
            userId,
            email,
            subtotal,
            tax,
            deliveryFee,
            total,
            fullName.split(' ')[0],
            fullName.split(' ').slice(1).join(' ') || '',
            phone,
            email,
            streetAddress,
            city,
            state || '',
            postalCode || '',
            country || 'Kenya',
            deliveryNotes || '',
        ]);

        const orderId = orderResult.insertId;

        // Create order items
        for (const item of cartItems) {
            await connection.query(`
                INSERT INTO order_items (
                    order_id, product_id, product_name, quantity,
                    unit_price, subtotal
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                orderId,
                item.product_id,
                item.name,
                item.quantity,
                item.discounted_price,
                item.discounted_price * item.quantity
            ]);

            // Update product stock
            await connection.query(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }

        // Create delivery request
        await connection.query(`
            INSERT INTO delivery_requests (
                order_id, delivery_type, status
            ) VALUES (?, ?, 'pending')
        `, [orderId, deliveryType || 'home_delivery']);

        // Clear cart
        await connection.query('DELETE FROM cart WHERE user_id = ?', [userId]);

        await connection.commit();

        // Handle payment based on method
        let redirectUrl = `/order-confirmation/${orderId}`;

        if (paymentMethod === 'mobile_money') {
            // For mobile money, redirect to payment processing
            redirectUrl = `/payment/mobile-money/${orderId}`;
        } else if (paymentMethod === 'card') {
            // For card payments, redirect to payment gateway
            redirectUrl = `/payment/card/${orderId}`;
        } else if (paymentMethod === 'cash_on_delivery') {
            // For COD, mark as pending payment
            await pool.query(
                'UPDATE orders SET payment_status = ? WHERE id = ?',
                ['pending', orderId]
            );
        }

        res.json({
            success: true,
            message: 'Order created successfully',
            order_id: orderId,
            order_number: orderNumber,
            redirectUrl: redirectUrl
        });

    } catch (error) {
        await connection.rollback();
        console.error('Checkout error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process order. Please try again.'
        });
    } finally {
        connection.release();
    }
});

// Submit checkout (alias for create-order)
router.post('/submit', isAuthenticated, async (req, res) => {
    // Redirect to create-order handler
    req.url = '/create-order';
    router.handle(req, res, next);
});

// Get order details for confirmation
router.get('/order/:orderId', isAuthenticated, async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.session.userId;

        // Get order details
        const [orders] = await pool.query(`
            SELECT * FROM orders WHERE id = ? AND user_id = ?
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
            SELECT oi.*, p.image_url
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [orderId]);

        // Get payment details
        const [payments] = await pool.query(
            'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
            [orderId]
        );

        res.json({
            success: true,
            order: order,
            items: orderItems,
            payment: payments[0] || null
        });

    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load order details'
        });
    }
});

// Update order status (admin only)
router.put('/order/:orderId/status', async (req, res) => {
    // This would be protected by admin middleware
    try {
        const { orderId } = req.params;
        const { status, paymentStatus } = req.body;

        if (status) {
            await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
        }

        if (paymentStatus) {
            await pool.query('UPDATE orders SET payment_status = ? WHERE id = ?', [paymentStatus, orderId]);
        }

        res.json({
            success: true,
            message: 'Order status updated'
        });

    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status'
        });
    }
});

module.exports = router;
