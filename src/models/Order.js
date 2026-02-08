/**
 * Order Model
 * Handles order-related database operations
 */

const { query, queryOne, transaction } = require('../config/database');

class Order {
  /**
   * Create new order with items
   */
  static async create(orderData) {
    return transaction(async (connection) => {
      const {
        userId, items, totalAmount, status, shippingAddress, paymentMethod
      } = orderData;

      // Insert order
      const orderSql = `
        INSERT INTO orders (user_id, total_amount, status, shipping_address, payment_method, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `;

      const [orderResult] = await connection.execute(orderSql, [
        userId, totalAmount, status, JSON.stringify(shippingAddress), paymentMethod
      ]);

      const orderId = orderResult.insertId;

      // Insert order items
      const itemSql = `
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES (?, ?, ?, ?)
      `;

      for (const item of items) {
        await connection.execute(itemSql, [orderId, item.productId, item.quantity, item.price]);
      }

      return { id: orderId, ...orderData };
    });
  }

  /**
   * Find order by ID
   */
  static async findById(id) {
    const sql = `
      SELECT o.*, u.email, u.first_name, u.last_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
      LIMIT 1
    `;
    return queryOne(sql, [id]);
  }

  /**
   * Get user orders
   */
  static async getUserOrders(userId, pagination) {
    const sql = `
      SELECT * FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    return query(sql, [userId, pagination.limit, pagination.offset]);
  }

  /**
   * Get order items
   */
  static async getItems(orderId) {
    const sql = `
      SELECT oi.*, p.name, p.image_url
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `;
    return query(sql, [orderId]);
  }

  /**
   * Update order status
   */
  static async updateStatus(orderId, status) {
    const sql = 'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?';
    const result = await query(sql, [status, orderId]);
    return result.affectedRows > 0;
  }

  /**
   * Get all orders (admin)
   */
  static async getAll(pagination, filters = {}) {
    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pagination.limit, pagination.offset);

    return query(sql, params);
  }

  /**
   * Get total orders count
   */
  static async count() {
    const result = await queryOne('SELECT COUNT(*) as total FROM orders');
    return result.total;
  }

  /**
   * Get revenue statistics
   */
  static async getRevenue(startDate, endDate) {
    const sql = `
      SELECT
        SUM(total_amount) as total_revenue,
        COUNT(*) as order_count,
        AVG(total_amount) as average_order
      FROM orders
      WHERE created_at BETWEEN ? AND ? AND status IN ('completed', 'shipped')
    `;
    return queryOne(sql, [startDate, endDate]);
  }
}

module.exports = Order;
