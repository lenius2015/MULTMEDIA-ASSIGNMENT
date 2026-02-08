/**
 * Complete Checkout System Routes
 * Handles cart, orders, delivery, payments, and confirmation
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');

// Helper function to generate order number
function generateOrderNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
}

// Helper function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-TZ', {
        style: 'currency',
        currency: 'TZS',
        minimumFractionDigits: 0
    }).format(amount).replace('TZS', 'TSh ');
}

// ==================== CHECKOUT PAGE ====================

// GET checkout page
router.get('/', async (req, res) => {
    try {
        const userId = req.session.userId;
        let cartItems = [];
        let addresses = [];
        
        // Get cart items
        if (userId) {
            const [cart] = await pool.query(`
                SELECT c.*, p.name, p.price, p.image_url, p.stock, p.stock_status
                FROM cart_items c
                JOIN products p ON c.product_id = p.id
                WHERE c.user_id = ?
            `, [userId]);
            cartItems = cart;
            
            // Get saved addresses
            const [addrs] = await pool.query(`
                SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC
            `, [userId]);
            addresses = addrs;
        } else {
            // Get session cart
            const sessionId = req.session.id;
            const [cart] = await pool.query(`
                SELECT c.*, p.name, p.price, p.image_url, p.stock, p.stock_status
                FROM cart_items c
                JOIN products p ON c.product_id = p.id
                WHERE c.session_id = ?
            `, [sessionId]);
            cartItems = cart;
        }
        
        // Get delivery zones
        const [zones] = await pool.query(`
            SELECT DISTINCT city FROM delivery_zones WHERE is_active = 1 ORDER BY city
        `);
        
        // Get payment methods
        const [paymentMethods] = await pool.query(`
            SELECT * FROM payment_methods WHERE is_active = 1 ORDER BY sort_order
        `);
        
        // Calculate totals
        const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const deliveryFee = 0; // Will be calculated based on city
        const tax = (subtotal + deliveryFee) * 0.18;
        const total = subtotal + deliveryFee + tax;
        
        res.render('checkout', {
            title: 'Checkout - OMUNJU SHOPPERS',
            cartItems,
            addresses,
            zones: zones.map(z => z.city),
            paymentMethods,
            user: req.session.userId ? {
                id: req.session.userId,
                name: req.session.userName,
                email: req.session.userEmail,
                phone: req.session.userPhone
            } : null,
            totals: {
                subtotal: subtotal.toFixed(2),
                deliveryFee: deliveryFee.toFixed(2),
                tax: tax.toFixed(2),
                total: total.toFixed(2)
            }
        });
    } catch (error) {
        console.error('Checkout page error:', error);
        res.redirect('/cart');
    }
});

// ==================== API ENDPOINTS ====================

// Validate promo code
router.post('/api/validate-promo', async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.json({ valid: false, message: 'Please enter a promo code' });
        }
        
        // Get promo details
        const [promos] = await pool.query(`
            SELECT * FROM checkout_promocodes 
            WHERE code = ? AND is_active = 1 
            AND (expires_at IS NULL OR expires_at > NOW())
            AND (usage_limit IS NULL OR usage_count < usage_limit)
        `, [code.toUpperCase()]);
        
        if (promos.length === 0) {
            return res.json({ valid: false, message: 'Invalid or expired promo code' });
        }
        
        const promo = promos[0];
        
        // Check if user has already used this promo
        const userId = req.session.userId;
        if (userId) {
            const [usage] = await pool.query(`
                SELECT * FROM promocode_usage WHERE user_id = ? AND promo_code = ?
            `, [userId, code.toUpperCase()]);
            
            if (usage.length > 0 && promo.one_time_use) {
                return res.json({ valid: false, message: 'You have already used this promo code' });
            }
        }
        
        // Calculate discount
        const subtotal = parseFloat(req.body.subtotal) || 0;
        let discount = 0;
        
        if (promo.discount_type === 'percentage') {
            discount = subtotal * (promo.discount_value / 100);
            discount = Math.min(discount, promo.max_discount || Infinity);
        } else {
            discount = promo.discount_value;
        }
        
        res.json({
            valid: true,
            promo: {
                code: promo.code,
                type: promo.discount_type,
                value: promo.discount_value,
                discount_amount: discount
            },
            message: `Code applied! You saved ${formatCurrency(discount)}`
        });
    } catch (error) {
        console.error('Promo validation error:', error);
        res.json({ valid: false, message: 'Error validating promo code' });
    }
});

// Create order
router.post('/api/create-order', async (req, res) => {
    try {
        const userId = req.session.userId;
        const { 
            customer_name, customer_email, customer_phone,
            shipping_address, city, region, zip_code, country,
            delivery_method, delivery_notes, pickup_location, pickup_contact,
            payment_method, items, delivery_fee, total_amount, processing_fee,
            discount_amount, promocode_code
        } = req.body;
        
        // Validate required fields
        if (!customer_name || !customer_email || !customer_phone || !shipping_address || !city) {
            return res.json({ success: false, message: 'Please fill in all required fields' });
        }
        
        if (!items || items.length === 0) {
            return res.json({ success: false, message: 'Your cart is empty' });
        }
        
        // Generate order number
        const orderNumber = generateOrderNumber();
        
        // Calculate subtotal from items
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = (subtotal + delivery_fee) * 0.18;
        const finalTotal = subtotal + delivery_fee + tax + (processing_fee || 0) - (discount_amount || 0);
        
        // Start transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Create order
            const [orderResult] = await connection.query(`
                INSERT INTO checkout_orders (
                    order_number, user_id, session_id,
                    customer_name, customer_email, customer_phone,
                    shipping_address, city, region, zip_code, country,
                    delivery_method, delivery_notes, pickup_location, pickup_contact,
                    payment_method, payment_status,
                    subtotal, delivery_fee, tax, discount, total_amount, processing_fee,
                    status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
            `, [
                orderNumber, userId || null, req.session.id,
                customer_name, customer_email, customer_phone,
                shipping_address, city, region || '', zip_code || '', country || 'Tanzania',
                delivery_method, delivery_notes || '', pickup_location || '', pickup_contact || '',
                payment_method, payment_method,
                subtotal, delivery_fee || 0, tax, discount_amount || 0, finalTotal, processing_fee || 0
            ]);
            
            const orderId = orderResult.insertId;
            
            // Insert order items
            for (const item of items) {
                await connection.query(`
                    INSERT INTO checkout_order_items (
                        order_id, product_id, name, price, quantity, image_url
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `, [orderId, item.product_id, item.name, item.price, item.quantity, item.image_url || null]);
                
                // Update product stock
                await connection.query(`
                    UPDATE products SET stock = stock - ?, updated_at = NOW() 
                    WHERE id = ? AND stock >= ?
                `, [item.quantity, item.product_id, item.quantity]);
            }
            
            // Record payment
            await connection.query(`
                INSERT INTO checkout_payments (
                    order_id, payment_method, amount, status, created_at
                ) VALUES (?, ?, ?, 'pending', NOW())
            `, [orderId, payment_method, finalTotal]);
            
            // Record promo usage
            if (promocode_code) {
                await connection.query(`
                    INSERT INTO promocode_usage (user_id, promo_code, order_id, created_at)
                    VALUES (?, ?, ?, NOW())
                `, [userId || null, promocode_code.toUpperCase(), orderId]);
                
                // Increment promo usage count
                await connection.query(`
                    UPDATE checkout_promocodes SET usage_count = usage_count + 1 
                    WHERE code = ?
                `, [promocode_code.toUpperCase()]);
            }
            
            // Create delivery request
            await connection.query(`
                INSERT INTO checkout_delivery_requests (
                    order_id, delivery_method, pickup_location, notes, status, created_at
                ) VALUES (?, ?, ?, ?, 'pending', NOW())
            `, [orderId, delivery_method, pickup_location || '', delivery_notes || '']);
            
            // Clear cart
            if (userId) {
                await connection.query(`DELETE FROM cart_items WHERE user_id = ?`, [userId]);
            } else {
                await connection.query(`DELETE FROM cart_items WHERE session_id = ?`, [req.session.id]);
            }
            
            await connection.commit();
            connection.release();
            
            // Store order in session
            req.session.currentOrder = {
                id: orderId,
                order_number: orderNumber
            };
            
            res.json({
                success: true,
                order_id: orderId,
                order_number: orderNumber
            });
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error('Order creation error:', error);
        res.json({ success: false, message: 'Error creating order. Please try again.' });
    }
});

// ==================== ORDER CONFIRMATION ====================

// GET confirmation page
router.get('/confirmation', async (req, res) => {
    try {
        const orderId = req.query.order_id || (req.session.currentOrder?.id);
        
        if (!orderId) {
            return res.redirect('/');
        }
        
        // Get order
        const [orders] = await pool.query(`
            SELECT * FROM checkout_orders WHERE id = ? OR order_number = ?
        `, [orderId, orderId]);
        
        if (orders.length === 0) {
            return res.redirect('/');
        }
        
        const order = orders[0];
        
        // Get order items
        const [items] = await pool.query(`
            SELECT * FROM checkout_order_items WHERE order_id = ?
        `, [order.id]);
        
        res.render('checkout-confirmation', {
            title: 'Order Confirmed - OMUNJU SHOPPERS',
            order: {
                ...order,
                items,
                status: order.status.charAt(0).toUpperCase() + order.status.slice(1)
            },
            formatCurrency
        });
    } catch (error) {
        console.error('Confirmation page error:', error);
        res.redirect('/');
    }
});

// ==================== DELIVERY ZONES ====================

// GET delivery zones
router.get('/api/delivery-zones', async (req, res) => {
    try {
        const [zones] = await pool.query(`
            SELECT * FROM delivery_zones WHERE is_active = 1 ORDER BY city, zone_name
        `);
        res.json({ success: true, zones });
    } catch (error) {
        console.error('Delivery zones error:', error);
        res.json({ success: false, zones: [] });
    }
});

// Calculate delivery fee
router.post('/api/calculate-delivery', async (req, res) => {
    try {
        const { city, delivery_method } = req.body;
        
        let baseFee = 0;
        let expressMultiplier = 1;
        
        // Get zone pricing
        const [zones] = await pool.query(`
            SELECT * FROM delivery_zones WHERE city = ? AND is_active = 1
        `, [city]);
        
        if (zones.length > 0) {
            const zone = zones[0];
            baseFee = zone.standard_fee || 5000;
            
            if (delivery_method === 'express') {
                baseFee = zone.express_fee || 15000;
            } else if (delivery_method === 'pickup_point') {
                baseFee = 0;
            }
        } else {
            // Default pricing for unknown cities
            if (delivery_method === 'home_delivery') {
                baseFee = 10000;
            } else if (delivery_method === 'express') {
                baseFee = 25000;
            } else {
                baseFee = 0;
            }
        }
        
        res.json({
            success: true,
            fee: baseFee,
            method: delivery_method
        });
    } catch (error) {
        console.error('Delivery calculation error:', error);
        res.json({ success: false, fee: 5000, method: 'home_delivery' });
    }
});

// ==================== PAYMENT STATUS ====================

// Update payment status (webhook endpoint)
router.post('/api/payment-update', async (req, res) => {
    try {
        const { order_id, status, transaction_id } = req.body;
        
        await pool.query(`
            UPDATE checkout_payments SET status = ?, transaction_id = ?, updated_at = NOW()
            WHERE order_id = ?
        `, [status, transaction_id || null, order_id]);
        
        // Update order status based on payment
        if (status === 'completed') {
            await pool.query(`
                UPDATE checkout_orders SET payment_status = 'completed', status = 'processing', updated_at = NOW()
                WHERE id = ?
            `, [order_id]);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Payment update error:', error);
        res.json({ success: false });
    }
});

// ==================== ORDER HISTORY ====================

// GET user orders
router.get('/api/orders', async (req, res) => {
    try {
        const userId = req.session.userId;
        
        if (!userId) {
            return res.json({ success: false, orders: [] });
        }
        
        const [orders] = await pool.query(`
            SELECT * FROM checkout_orders 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `, [userId]);
        
        res.json({ success: true, orders });
    } catch (error) {
        console.error('Orders fetch error:', error);
        res.json({ success: false, orders: [] });
    }
});

// GET single order details
router.get('/api/orders/:orderId', async (req, res) => {
    try {
        const userId = req.session.userId;
        const { orderId } = req.params;
        
        const [orders] = await pool.query(`
            SELECT * FROM checkout_orders WHERE id = ? AND user_id = ?
        `, [orderId, userId]);
        
        if (orders.length === 0) {
            return res.json({ success: false, message: 'Order not found' });
        }
        
        const [items] = await pool.query(`
            SELECT * FROM checkout_order_items WHERE order_id = ?
        `, [orderId]);
        
        const [payment] = await pool.query(`
            SELECT * FROM checkout_payments WHERE order_id = ?
        `, [orderId]);
        
        const [delivery] = await pool.query(`
            SELECT * FROM checkout_delivery_requests WHERE order_id = ?
        `, [orderId]);
        
        res.json({
            success: true,
            order: {
                ...orders[0],
                items,
                payment: payment[0] || null,
                delivery: delivery[0] || null
            }
        });
    } catch (error) {
        console.error('Order fetch error:', error);
        res.json({ success: false, message: 'Error fetching order' });
    }
});

module.exports = router;
