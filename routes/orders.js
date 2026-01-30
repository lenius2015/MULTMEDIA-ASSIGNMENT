const express = require('express');
const router = express.Router();
const pool = require('../db');
const { isAuthenticated } = require('../middleware/auth');
const NotificationService = require('../utils/notificationService');
const invoiceGenerator = require('../utils/invoiceGenerator');

// Create order from cart (checkout)
router.post('/create', isAuthenticated, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const userId = req.session.userId;
        const { shippingAddress } = req.body;

        if (!shippingAddress) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Shipping address is required'
            });
        }

        // Check if there's an incomplete order for this user
        const [incompleteOrders] = await connection.query(
            'SELECT id FROM orders WHERE user_id = ? AND status = ?',
            [userId, 'incomplete_order']
        );

        if (incompleteOrders.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'No incomplete order found. Please add items to cart first.'
            });
        }

        const orderId = incompleteOrders[0].id;

        // Get order items to check stock
        const [orderItems] = await connection.query(
            `SELECT oi.*, p.stock, p.name
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?`,
            [orderId]
        );

        // Check stock for all items
        for (const item of orderItems) {
            if (item.stock < item.quantity) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${item.name}`
                });
            }
        }

        // Update order status to pending and set shipping address
        await connection.query(
            'UPDATE orders SET status = ?, shipping_address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['pending', shippingAddress, orderId]
        );

        // Update stock for all items
        for (const item of orderItems) {
            await connection.query(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }

        // Clear cart
        await connection.query('DELETE FROM cart WHERE user_id = ?', [userId]);

    // Send notifications
    await NotificationService.notifyOrderStatus(userId, orderId, 'placed', totalAmount);

    // Generate invoice
    try {
      const [userData] = await connection.query(
        'SELECT id, name, email FROM users WHERE id = ?',
        [userId]
      );

      const orderData = {
        id: orderId,
        user_id: userId,
        total_amount: totalAmount,
        shipping_address: shippingAddress,
        status: 'pending'
      };

      const invoiceData = await invoiceGenerator.generateInvoice(orderData, userData[0], cartItems);

      // Save invoice record
      await connection.query(`
        INSERT INTO invoices (order_id, user_id, invoice_number, total_amount, tax_amount, discount_amount, pdf_path)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        orderId,
        userId,
        invoiceData.invoiceNumber,
        invoiceData.total,
        invoiceData.tax,
        invoiceData.discount,
        invoiceData.filePath
      ]);

      // Send invoice notification
      await NotificationService.sendNotification(
        userId,
        'Invoice Generated',
        `Your invoice for order #${orderId} has been generated. Invoice: ${invoiceData.invoiceNumber}`,
        'order'
      );

      // Send inbox message
      try {
        await pool.query(`
          INSERT INTO inbox_messages (sender_id, recipient_id, subject, message, message_type)
          VALUES (NULL, ?, ?, ?, ?)
        `, [
          userId,
          'Order Confirmation',
          `Thank you for your order! Your order #${orderId} has been placed successfully. Your invoice ${invoiceData.invoiceNumber} has been generated and is ready for download.`,
          'order_confirmation'
        ]);
      } catch (inboxError) {
        console.error('Error sending inbox message:', inboxError);
      }

    } catch (invoiceError) {
      console.error('Error generating invoice:', invoiceError);
      // Don't fail the order if invoice generation fails
    }

    await connection.commit();

    // Redirect to order confirmation page
    res.redirect(`/order-confirmation/${orderId}`);
  } catch (error) {
    await connection.rollback();
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  } finally {
    connection.release();
  }
});

// Get all orders for user
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;

    const [orders] = await pool.query(
      `SELECT o.*, 
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// Get single order details
router.get('/:orderId', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { orderId } = req.params;

    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const [orderItems] = await pool.query(
      `SELECT oi.*, p.name, p.image_url
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    // Get delivery information
    const [deliveryRequests] = await pool.query(
      'SELECT * FROM delivery_requests WHERE order_id = ?',
      [orderId]
    );

    const deliveryRequest = deliveryRequests.length > 0 ? deliveryRequests[0] : null;

    // Get reviews for each item if order is delivered
    let itemsWithReviews = orderItems;
    if (deliveryRequest && deliveryRequest.status === 'delivered') {
      itemsWithReviews = await Promise.all(orderItems.map(async (item) => {
        const [reviews] = await pool.query(
          'SELECT * FROM product_reviews WHERE order_id = ? AND product_id = ?',
          [orderId, item.product_id]
        );
        return {
          ...item,
          review: reviews.length > 0 ? reviews[0] : null
        };
      }));
    }

    res.json({
      success: true,
      order: orders[0],
      items: itemsWithReviews,
      deliveryRequest: deliveryRequest
    });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order details'
    });
  }
});

// Cancel order
router.put('/:orderId/cancel', isAuthenticated, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const userId = req.session.userId;
    const { orderId } = req.params;

    // Get order
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

    if (orders[0].status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only pending orders can be cancelled'
      });
    }

    // Get order items to restore stock
    const [orderItems] = await connection.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
      [orderId]
    );

    // Restore stock
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

    // Create notification
    await connection.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [userId, 'Order Cancelled', `Your order #${orderId} has been cancelled`, 'order']
    );

    await connection.commit();

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

// Submit delivery request (after payment)
router.post('/:orderId/delivery-request', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { orderId } = req.params;
        const {
            delivery_address,
            delivery_phone,
            delivery_instructions,
            preferred_date
        } = req.body;

        if (!delivery_address || !delivery_phone) {
            return res.status(400).json({
                success: false,
                message: 'Delivery address and phone number are required'
            });
        }

        // Check if order exists and belongs to user
        const [orders] = await pool.query(
            'SELECT id, status FROM orders WHERE id = ? AND user_id = ?',
            [orderId, userId]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if order is paid
        if (!['paid', 'confirmed'].includes(orders[0].status)) {
            return res.status(400).json({
                success: false,
                message: 'Order must be paid before requesting delivery'
            });
        }

        // Create or update delivery request
        await pool.query(`
            INSERT INTO delivery_requests (
                order_id, user_id, delivery_address, phone_number,
                delivery_instructions, preferred_date, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                delivery_address = VALUES(delivery_address),
                phone_number = VALUES(phone_number),
                delivery_instructions = VALUES(delivery_instructions),
                preferred_date = VALUES(preferred_date),
                updated_at = CURRENT_TIMESTAMP
        `, [
            orderId, userId, delivery_address, delivery_phone,
            delivery_instructions || null, preferred_date || null, 'pending'
        ]);

        // Update order status to delivery_requested
        await pool.query(
            'UPDATE orders SET status = ?, delivery_address = ?, delivery_phone = ?, delivery_instructions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['delivery_requested', delivery_address, delivery_phone, delivery_instructions, orderId]
        );

        res.json({
            success: true,
            message: 'Delivery request submitted successfully'
        });
    } catch (error) {
        console.error('Delivery request error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit delivery request'
        });
    }
});

// Update order status (admin only)
router.put('/:orderId/status', async (req, res) => {
    // This will be implemented in admin routes
    res.status(501).json({ success: false, message: 'Not implemented' });
});

module.exports = router;
