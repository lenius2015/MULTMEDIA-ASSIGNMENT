const express = require('express');
const router = express.Router();
const pool = require('../db');
const { isAuthenticated } = require('../middleware/auth');
const NotificationService = require('../utils/notificationService');

// Create delivery request
router.post('/request/:orderId', isAuthenticated, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session.userId;
    const {
      deliveryAddress,
      phoneNumber,
      deliveryInstructions,
      deliveryMethod,
      preferredDate
    } = req.body;

    // Validate required fields
    if (!deliveryAddress || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Delivery address and phone number are required'
      });
    }

    // Check if order exists and belongs to user
    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = "paid"',
      [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not eligible for delivery'
      });
    }

    // Check if delivery request already exists
    const [existingRequests] = await pool.query(
      'SELECT * FROM delivery_requests WHERE order_id = ?',
      [orderId]
    );

    if (existingRequests.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Delivery request already exists for this order'
      });
    }

    // Generate tracking number
    const trackingNumber = `DLV-${orderId}-${Date.now()}`;

    // Calculate estimated delivery date
    const estimatedDelivery = new Date();
    if (deliveryMethod === 'express') {
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 2); // 2 days for express
    } else {
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 5); // 5 days for standard
    }

    // Create delivery request
    const [result] = await pool.query(`
      INSERT INTO delivery_requests
      (order_id, user_id, delivery_address, phone_number, delivery_instructions,
       delivery_method, preferred_date, tracking_number, estimated_delivery)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderId,
      userId,
      deliveryAddress,
      phoneNumber,
      deliveryInstructions || null,
      deliveryMethod || 'standard',
      preferredDate || null,
      trackingNumber,
      estimatedDelivery
    ]);

    // Update order status to processing
    await pool.query(
      'UPDATE orders SET status = "processing" WHERE id = ?',
      [orderId]
    );

    // Send notification
    await NotificationService.sendNotification(
      userId,
      'Delivery Request Submitted',
      `Your delivery request for order #${orderId} has been submitted. Tracking: ${trackingNumber}`,
      'order'
    );

    res.json({
      success: true,
      message: 'Delivery request submitted successfully',
      deliveryRequest: {
        id: result.insertId,
        trackingNumber,
        estimatedDelivery: estimatedDelivery.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('Create delivery request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create delivery request'
    });
  }
});

// Get delivery request for an order
router.get('/order/:orderId', isAuthenticated, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session.userId;

    // Check if order belongs to user or user is admin
    let query = 'SELECT * FROM delivery_requests WHERE order_id = ?';
    let params = [orderId];

    if (req.session.role !== 'admin') {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    const [deliveryRequests] = await pool.query(query, params);

    if (deliveryRequests.length === 0) {
      return res.json({
        success: true,
        deliveryRequest: null
      });
    }

    res.json({
      success: true,
      deliveryRequest: deliveryRequests[0]
    });

  } catch (error) {
    console.error('Get delivery request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery request'
    });
  }
});

// Get user's delivery requests
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;

    let query = `
      SELECT dr.*, o.total_amount, o.created_at as order_date
      FROM delivery_requests dr
      JOIN orders o ON dr.order_id = o.id
    `;
    let params = [];

    if (req.session.role !== 'admin') {
      query += ' WHERE dr.user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY dr.created_at DESC';

    const [deliveryRequests] = await pool.query(query, params);

    res.json({
      success: true,
      deliveryRequests
    });

  } catch (error) {
    console.error('Get delivery requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery requests'
    });
  }
});

// Update delivery status (Admin only)
router.put('/:id/status', isAuthenticated, async (req, res) => {
  try {
    if (req.session.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { id } = req.params;
    const { status, assignedAgent, actualDeliveryDate } = req.body;

    const validStatuses = ['pending', 'assigned', 'in_transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Update delivery request
    let updateData = { status };
    let updateFields = ['status = ?'];
    let params = [status];

    if (assignedAgent) {
      updateFields.push('assigned_agent = ?');
      params.push(assignedAgent);
    }

    if (status === 'delivered' && actualDeliveryDate) {
      updateFields.push('actual_delivery_date = ?');
      params.push(new Date(actualDeliveryDate));
    }

    params.push(id);

    await pool.query(`
      UPDATE delivery_requests
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, params);

    // Get delivery request details for notification
    const [deliveryRequests] = await pool.query(
      'SELECT * FROM delivery_requests WHERE id = ?',
      [id]
    );

    if (deliveryRequests.length > 0) {
      const delivery = deliveryRequests[0];

      // Send WhatsApp notification
      await sendWhatsAppDeliveryUpdate(delivery, status);

      // Send in-app notification
      await NotificationService.sendNotification(
        delivery.user_id,
        `Delivery Update: ${status.replace('_', ' ').toUpperCase()}`,
        `Your order #${delivery.order_id} delivery status: ${status.replace('_', ' ')}`,
        'order'
      );
    }

    res.json({
      success: true,
      message: 'Delivery status updated successfully'
    });

  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update delivery status'
    });
  }
});

// Get all delivery requests (Admin only)
router.get('/admin/all', isAuthenticated, async (req, res) => {
  try {
    if (req.session.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const [deliveryRequests] = await pool.query(`
      SELECT dr.*, u.name as customer_name, u.email as customer_email,
             o.total_amount, o.created_at as order_date
      FROM delivery_requests dr
      JOIN users u ON dr.user_id = u.id
      JOIN orders o ON dr.order_id = o.id
      ORDER BY dr.created_at DESC
    `);

    res.json({
      success: true,
      deliveryRequests
    });

  } catch (error) {
    console.error('Get all delivery requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery requests'
    });
  }
});

// Submit product review
router.post('/review/:orderId/:productId', isAuthenticated, async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    const userId = req.session.userId;
    const { rating, reviewText } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if order belongs to user and is delivered
    const [orders] = await pool.query(`
      SELECT o.*, dr.status as delivery_status
      FROM orders o
      JOIN delivery_requests dr ON o.id = dr.order_id
      WHERE o.id = ? AND o.user_id = ? AND dr.status = 'delivered'
    `, [orderId, userId]);

    if (orders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order not found or not eligible for review'
      });
    }

    // Check if product was in the order
    const [orderItems] = await pool.query(
      'SELECT * FROM order_items WHERE order_id = ? AND product_id = ?',
      [orderId, productId]
    );

    if (orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product not found in this order'
      });
    }

    // Check if review already exists
    const [existingReviews] = await pool.query(
      'SELECT * FROM product_reviews WHERE order_id = ? AND product_id = ?',
      [orderId, productId]
    );

    if (existingReviews.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Review already submitted for this product'
      });
    }

    // Create review
    await pool.query(`
      INSERT INTO product_reviews
      (order_id, user_id, product_id, rating, review_text)
      VALUES (?, ?, ?, ?, ?)
    `, [orderId, userId, productId, rating, reviewText || null]);

    res.json({
      success: true,
      message: 'Review submitted successfully'
    });

  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit review'
    });
  }
});

// Get product reviews
router.get('/reviews/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const [reviews] = await pool.query(`
      SELECT pr.*, u.name as reviewer_name
      FROM product_reviews pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.product_id = ?
      ORDER BY pr.review_date DESC
    `, [productId]);

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;

    res.json({
      success: true,
      reviews,
      averageRating: parseFloat(averageRating),
      totalReviews: reviews.length
    });

  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews'
    });
  }
});

// WhatsApp delivery update function
async function sendWhatsAppDeliveryUpdate(delivery, status) {
  try {
    // This would integrate with WhatsApp Business API
    // For now, we'll log the notification
    const statusMessages = {
      assigned: `Your delivery has been assigned. Tracking: ${delivery.tracking_number}`,
      in_transit: `Your order is now in transit. Tracking: ${delivery.tracking_number}`,
      delivered: `Your order has been delivered successfully! Thank you for shopping with us.`
    };

    const message = statusMessages[status];
    if (message) {
      console.log(`WhatsApp to ${delivery.phone_number}: ${message}`);
      // Here you would integrate with WhatsApp Business API
    }
  } catch (error) {
    console.error('WhatsApp notification error:', error);
  }
}

module.exports = router;