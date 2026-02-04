/**
 * Order Service
 * Handles order creation, processing, and management with transactions
 */

const db = require('../../db');

class OrderService {
  /**
   * Create order from cart (with database transaction)
   */
  static async createOrder(cartId, userId, orderData) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Get cart
      const [carts] = await connection.query(
        'SELECT * FROM carts WHERE id = ?',
        [cartId]
      );

      if (carts.length === 0) {
        throw new Error('Cart not found');
      }

      const cart = carts[0];
      const [items] = await connection.query(
        'SELECT ci.*, p.name FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.cart_id = ?',
        [cartId]
      );

      if (items.length === 0) {
        throw new Error('Cart is empty');
      }

      // Generate order number
      const orderNumber = await this.generateOrderNumber(connection);

      // Reserve stock and create order items
      const orderItems = [];
      for (const item of items) {
        // Reserve stock
        await connection.query(
          `UPDATE product_stock 
           SET quantity_reserved = quantity_reserved + ?
           WHERE product_id = ?`,
          [item.quantity, item.product_id]
        );

        // Log stock history
        await connection.query(
          `INSERT INTO stock_history (product_id, quantity_change, reason, related_order_id)
           VALUES (?, ?, 'purchase', NULL)`,
          [item.product_id, -item.quantity]
        );

        orderItems.push({
          product_id: item.product_id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal
        });
      }

      // Create order record
      const [orderResult] = await connection.query(
        `INSERT INTO orders (
          order_number, user_id, guest_email,
          subtotal, tax, delivery_fee, discount, total_amount,
          shipping_address_id,
          shipping_first_name, shipping_last_name, shipping_phone, shipping_email,
          shipping_street, shipping_city, shipping_state, shipping_postal_code, shipping_country,
          coupon_code, status, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderNumber,
          userId,
          orderData.guest_email,
          cart.subtotal,
          cart.tax,
          cart.delivery_fee,
          cart.discount,
          cart.total,
          orderData.shipping_address_id,
          orderData.shipping_first_name,
          orderData.shipping_last_name,
          orderData.shipping_phone,
          orderData.shipping_email,
          orderData.shipping_street,
          orderData.shipping_city,
          orderData.shipping_state,
          orderData.shipping_postal_code,
          orderData.shipping_country,
          cart.coupon_code,
          'pending',
          'pending'
        ]
      );

      const orderId = orderResult.insertId;

      // Insert order items
      for (const item of orderItems) {
        await connection.query(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orderId, item.product_id, item.product_name, item.quantity, item.unit_price, item.subtotal]
        );
      }

      // Log order activity
      await connection.query(
        `INSERT INTO order_activities (order_id, activity_type, description, performed_by_type)
         VALUES (?, 'order_created', 'Order created successfully', 'system')`,
        [orderId]
      );

      // Clear cart
      await connection.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
      await connection.query(
        `UPDATE carts SET subtotal = 0, tax = 0, delivery_fee = 0, discount = 0, total = 0 WHERE id = ?`,
        [cartId]
      );

      await connection.commit();

      return {
        id: orderId,
        order_number: orderNumber,
        total_amount: cart.total,
        status: 'pending',
        payment_status: 'pending'
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Generate unique order number
   */
  static async generateOrderNumber(connection = null) {
    const useConnection = connection || db;
    const [results] = await useConnection.query(
      "SELECT COUNT(*) + 1 as count FROM orders WHERE DATE(created_at) = CURDATE()"
    );

    const count = results[0].count;
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `ORD-${dateStr}-${String(count).padStart(5, '0')}`;
  }

  /**
   * Get order details
   */
  static async getOrder(orderId) {
    const [orders] = await db.query(
      `SELECT * FROM orders WHERE id = ?`,
      [orderId]
    );

    if (orders.length === 0) return null;

    const order = orders[0];

    // Get items
    const [items] = await db.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [orderId]
    );

    // Get payment info
    const [payments] = await db.query(
      'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
      [orderId]
    );

    // Get delivery info
    const [deliveries] = await db.query(
      'SELECT * FROM delivery_requests WHERE order_id = ?',
      [orderId]
    );

    // Get invoice
    const [invoices] = await db.query(
      'SELECT * FROM invoices WHERE order_id = ?',
      [orderId]
    );

    order.items = items;
    order.payment = payments.length > 0 ? payments[0] : null;
    order.delivery = deliveries.length > 0 ? deliveries[0] : null;
    order.invoice = invoices.length > 0 ? invoices[0] : null;

    return order;
  }

  /**
   * Get user's orders
   */
  static async getUserOrders(userId, limit = 50, offset = 0) {
    const [orders] = await db.query(
      `SELECT o.*, 
              COUNT(DISTINCT oi.id) as item_count,
              dr.status as delivery_status,
              dr.tracking_number,
              p.status as payment_status_latest
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN delivery_requests dr ON o.id = dr.order_id
       LEFT JOIN payments p ON o.id = p.order_id
       WHERE o.user_id = ?
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [totalCount] = await db.query(
      'SELECT COUNT(*) as count FROM orders WHERE user_id = ?',
      [userId]
    );

    return {
      orders: orders,
      total: totalCount[0].count,
      limit,
      offset
    };
  }

  /**
   * Update order status (for admin)
   */
  static async updateOrderStatus(orderId, newStatus, adminId = null, notes = '') {
    // Validate status
    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Invalid order status');
    }

    // Get current status
    const [orders] = await db.query(
      'SELECT status FROM orders WHERE id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      throw new Error('Order not found');
    }

    const oldStatus = orders[0].status;

    // Update status
    const updateFields = {
      status: newStatus,
      updated_at: new Date()
    };

    if (newStatus === 'shipped') {
      updateFields.shipped_at = new Date();
    } else if (newStatus === 'delivered') {
      updateFields.delivered_at = new Date();
    }

    await db.query(
      'UPDATE orders SET ? WHERE id = ?',
      [updateFields, orderId]
    );

    // Log activity
    await db.query(
      `INSERT INTO order_activities (order_id, activity_type, description, performed_by, performed_by_type)
       VALUES (?, 'status_change', ?, ?, 'admin')`,
      [orderId, `Status changed from ${oldStatus} to ${newStatus}. Notes: ${notes}`, adminId]
    );

    return {
      id: orderId,
      old_status: oldStatus,
      new_status: newStatus
    };
  }

  /**
   * Update payment status
   */
  static async updatePaymentStatus(orderId, paymentStatus, transactionId = null) {
    const validStatuses = ['pending', 'paid', 'failed', 'refunded'];
    if (!validStatuses.includes(paymentStatus)) {
      throw new Error('Invalid payment status');
    }

    // Update order payment status
    await db.query(
      `UPDATE orders SET payment_status = ?, updated_at = NOW()
       WHERE id = ?`,
      [paymentStatus, orderId]
    );

    // Update order status if payment successful
    if (paymentStatus === 'paid') {
      await db.query(
        `UPDATE orders SET status = 'processing', updated_at = NOW()
         WHERE id = ? AND status = 'pending'`,
        [orderId]
      );

      // Log activity
      await db.query(
        `INSERT INTO order_activities (order_id, activity_type, description, performed_by_type)
         VALUES (?, 'payment_received', 'Payment received successfully', 'system')`,
        [orderId]
      );
    }

    return { id: orderId, payment_status: paymentStatus };
  }

  /**
   * Cancel order (with stock reversal)
   */
  static async cancelOrder(orderId, reason = '') {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Get order
      const [orders] = await connection.query(
        'SELECT * FROM orders WHERE id = ?',
        [orderId]
      );

      if (orders.length === 0) {
        throw new Error('Order not found');
      }

      const order = orders[0];

      if (order.status === 'delivered' || order.status === 'cancelled') {
        throw new Error('Cannot cancel ' + order.status + ' order');
      }

      // Get order items
      const [items] = await connection.query(
        'SELECT * FROM order_items WHERE order_id = ?',
        [orderId]
      );

      // Reverse stock
      for (const item of items) {
        await connection.query(
          `UPDATE product_stock 
           SET quantity_reserved = GREATEST(0, quantity_reserved - ?)
           WHERE product_id = ?`,
          [item.quantity, item.product_id]
        );

        await connection.query(
          `INSERT INTO stock_history (product_id, quantity_change, reason, related_order_id)
           VALUES (?, ?, 'return', ?)`,
          [item.product_id, item.quantity, orderId]
        );
      }

      // Update order status
      await connection.query(
        `UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = ?`,
        [orderId]
      );

      // Log activity
      await connection.query(
        `INSERT INTO order_activities (order_id, activity_type, description, performed_by_type)
         VALUES (?, 'order_cancelled', ?, 'system')`,
        [orderId, reason]
      );

      await connection.commit();

      return { id: orderId, status: 'cancelled' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get admin orders list with filtering
   */
  static async getAdminOrders(filters = {}) {
    let query = `
      SELECT o.*, 
             COUNT(DISTINCT oi.id) as item_count,
             dr.status as delivery_status,
             p.status as payment_status_latest
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN delivery_requests dr ON o.id = dr.order_id
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE 1=1
    `;

    const params = [];

    // Add filters
    if (filters.status) {
      query += ' AND o.status = ?';
      params.push(filters.status);
    }

    if (filters.payment_status) {
      query += ' AND o.payment_status = ?';
      params.push(filters.payment_status);
    }

    if (filters.search) {
      query += ' AND (o.order_number LIKE ? OR o.shipping_email LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (filters.date_from) {
      query += ' AND DATE(o.created_at) >= ?';
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      query += ' AND DATE(o.created_at) <= ?';
      params.push(filters.date_to);
    }

    query += ' GROUP BY o.id ORDER BY o.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(filters.limit, filters.offset || 0);
    }

    const [orders] = await db.query(query, params);

    return orders;
  }

  /**
   * Get order activity log
   */
  static async getOrderActivities(orderId) {
    const [activities] = await db.query(
      `SELECT oa.*, 
              CASE WHEN oa.performed_by IS NOT NULL THEN u.first_name ELSE NULL END as performed_by_name
       FROM order_activities oa
       LEFT JOIN users u ON oa.performed_by = u.id
       WHERE oa.order_id = ?
       ORDER BY oa.created_at ASC`,
      [orderId]
    );

    return activities;
  }
}

module.exports = OrderService;
