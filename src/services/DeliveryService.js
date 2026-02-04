/**
 * Delivery & Address Service
 * Handles shipping addresses, delivery requests, and tracking
 */

const db = require('../../db');

class DeliveryService {
  /**
   * Save address for user
   */
  static async saveAddress(userId, addressData) {
    const {
      type = 'both',
      full_name,
      phone,
      email,
      street_address,
      city,
      state_province,
      postal_code,
      country = 'Kenya',
      is_default = false
    } = addressData;

    // Validate required fields
    if (!full_name || !phone || !street_address || !city) {
      throw new Error('Missing required address fields');
    }

    // If marking as default, unmark others
    if (is_default) {
      await db.query(
        'UPDATE addresses SET is_default = FALSE WHERE user_id = ? AND type = ?',
        [userId, type]
      );
    }

    // Create address
    const [result] = await db.query(
      `INSERT INTO addresses (
        user_id, type, full_name, phone, email,
        street_address, city, state_province, postal_code, country, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        type,
        full_name,
        phone,
        email,
        street_address,
        city,
        state_province,
        postal_code,
        country,
        is_default ? 1 : 0
      ]
    );

    return {
      id: result.insertId,
      user_id: userId,
      full_name,
      city,
      is_default
    };
  }

  /**
   * Get user addresses
   */
  static async getUserAddresses(userId, type = null) {
    let query = 'SELECT * FROM addresses WHERE user_id = ?';
    const params = [userId];

    if (type) {
      query += ' AND (type = ? OR type = ?)';
      params.push(type, 'both');
    }

    query += ' ORDER BY is_default DESC, updated_at DESC';

    const [addresses] = await db.query(query, params);

    return addresses.map(addr => ({
      id: addr.id,
      type: addr.type,
      full_name: addr.full_name,
      phone: addr.phone,
      email: addr.email,
      street_address: addr.street_address,
      city: addr.city,
      state_province: addr.state_province,
      postal_code: addr.postal_code,
      country: addr.country,
      is_default: addr.is_default === 1
    }));
  }

  /**
   * Update address
   */
  static async updateAddress(addressId, userId, addressData) {
    // Verify address belongs to user
    const [addresses] = await db.query(
      'SELECT * FROM addresses WHERE id = ? AND user_id = ?',
      [addressId, userId]
    );

    if (addresses.length === 0) {
      throw new Error('Address not found');
    }

    const { is_default, ...updateData } = addressData;

    // If marking as default, unmark others
    if (is_default) {
      await db.query(
        `UPDATE addresses SET is_default = FALSE 
         WHERE user_id = ? AND type = ? AND id != ?`,
        [userId, updateData.type || addresses[0].type, addressId]
      );
    }

    // Update address
    await db.query('UPDATE addresses SET ? WHERE id = ?', [
      {
        ...updateData,
        is_default: is_default ? 1 : 0,
        updated_at: new Date()
      },
      addressId
    ]);

    return { id: addressId, ...addressData };
  }

  /**
   * Delete address
   */
  static async deleteAddress(addressId, userId) {
    // Verify address belongs to user
    const [addresses] = await db.query(
      'SELECT * FROM addresses WHERE id = ? AND user_id = ?',
      [addressId, userId]
    );

    if (addresses.length === 0) {
      throw new Error('Address not found');
    }

    await db.query('DELETE FROM addresses WHERE id = ?', [addressId]);

    return { id: addressId, deleted: true };
  }

  /**
   * Get default address for user
   */
  static async getDefaultAddress(userId, type = null) {
    let query = 'SELECT * FROM addresses WHERE user_id = ? AND is_default = TRUE';
    const params = [userId];

    if (type) {
      query += ' AND (type = ? OR type = ?)';
      params.push(type, 'both');
    }

    const [addresses] = await db.query(query, params);

    if (addresses.length === 0) return null;

    return addresses[0];
  }

  /**
   * Create delivery request for order
   */
  static async createDeliveryRequest(orderId, deliveryData) {
    const {
      delivery_type = 'home_delivery',
      pickup_point_id = null
    } = deliveryData;

    // Get order details
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      throw new Error('Order not found');
    }

    const order = orders[0];

    // Generate tracking number
    const trackingNumber = await this.generateTrackingNumber();

    // Calculate estimated delivery
    const estimatedDelivery = this.calculateEstimatedDelivery(
      order.shipping_city
    );

    // Create delivery request
    const [result] = await db.query(
      `INSERT INTO delivery_requests (
        order_id, delivery_type, pickup_point_id,
        estimated_delivery_date, estimated_delivery_time_start, estimated_delivery_time_end,
        status, tracking_number
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        orderId,
        delivery_type,
        pickup_point_id,
        estimatedDelivery.date,
        estimatedDelivery.time_start,
        estimatedDelivery.time_end,
        trackingNumber
      ]
    );

    return {
      id: result.insertId,
      order_id: orderId,
      tracking_number: trackingNumber,
      delivery_type,
      status: 'pending',
      estimated_delivery_date: estimatedDelivery.date
    };
  }

  /**
   * Generate unique tracking number
   */
  static async generateTrackingNumber() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let trackingNumber = 'TRK-';

    for (let i = 0; i < 10; i++) {
      trackingNumber += chars.charAt(
        Math.floor(Math.random() * chars.length)
      );
    }

    // Check uniqueness
    const [existing] = await db.query(
      'SELECT * FROM delivery_requests WHERE tracking_number = ?',
      [trackingNumber]
    );

    if (existing.length > 0) {
      return this.generateTrackingNumber(); // Recursive fallback
    }

    return trackingNumber;
  }

  /**
   * Calculate estimated delivery time based on city
   */
  static calculateEstimatedDelivery(city) {
    const deliveryFees = {
      'Nairobi': { min: 1, max: 2 },
      'Mombasa': { min: 2, max: 3 },
      'Kisumu': { min: 3, max: 4 },
      'Nakuru': { min: 2, max: 3 }
    };

    const delivery = deliveryFees[city] || { min: 3, max: 5 };

    const today = new Date();
    const estimatedDate = new Date(
      today.getTime() + delivery.min * 24 * 60 * 60 * 1000
    );

    return {
      date: estimatedDate.toISOString().split('T')[0],
      time_start: '09:00:00',
      time_end: '17:00:00',
      min_days: delivery.min,
      max_days: delivery.max
    };
  }

  /**
   * Get delivery request
   */
  static async getDeliveryRequest(orderId) {
    const [deliveries] = await db.query(
      `SELECT * FROM delivery_requests WHERE order_id = ?`,
      [orderId]
    );

    if (deliveries.length === 0) return null;

    return deliveries[0];
  }

  /**
   * Update delivery status
   */
  static async updateDeliveryStatus(deliveryId, newStatus) {
    const validStatuses = [
      'pending',
      'assigned',
      'in_transit',
      'delivered',
      'failed',
      'returned'
    ];

    if (!validStatuses.includes(newStatus)) {
      throw new Error('Invalid delivery status');
    }

    // Get delivery
    const [deliveries] = await db.query(
      'SELECT * FROM delivery_requests WHERE id = ?',
      [deliveryId]
    );

    if (deliveries.length === 0) {
      throw new Error('Delivery request not found');
    }

    const delivery = deliveries[0];

    // Update status
    await db.query(
      `UPDATE delivery_requests 
       SET status = ?, updated_at = NOW()
       WHERE id = ?`,
      [newStatus, deliveryId]
    );

    // If delivered, update order status
    if (newStatus === 'delivered') {
      await db.query(
        `UPDATE delivery_requests 
         SET actual_delivery_date = NOW()
         WHERE id = ?`,
        [deliveryId]
      );

      await db.query(
        `UPDATE orders 
         SET status = 'delivered', delivered_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [delivery.order_id]
      );

      // Log activity
      await db.query(
        `INSERT INTO order_activities (order_id, activity_type, description, performed_by_type)
         VALUES (?, 'delivery_complete', 'Order delivered successfully', 'system')`,
        [delivery.order_id]
      );
    }

    return { id: deliveryId, status: newStatus };
  }

  /**
   * Assign delivery partner
   */
  static async assignDeliveryPartner(deliveryId, partnerId) {
    // Get partner details
    const [partners] = await db.query(
      'SELECT id, first_name, phone FROM users WHERE id = ? AND role = "delivery_partner"',
      [partnerId]
    );

    if (partners.length === 0) {
      throw new Error('Delivery partner not found');
    }

    const partner = partners[0];

    // Assign partner
    await db.query(
      `UPDATE delivery_requests 
       SET delivery_partner_id = ?, delivery_partner_name = ?, 
           delivery_partner_phone = ?, status = 'assigned', updated_at = NOW()
       WHERE id = ?`,
      [partnerId, partner.first_name, partner.phone, deliveryId]
    );

    return {
      delivery_id: deliveryId,
      partner_id: partnerId,
      partner_name: partner.first_name,
      status: 'assigned'
    };
  }

  /**
   * Upload proof of delivery
   */
  static async uploadProofOfDelivery(deliveryId, signatureUrl, photoUrl, deliveredBy) {
    await db.query(
      `UPDATE delivery_requests 
       SET signature_url = ?, photo_url = ?, delivered_by = ?, updated_at = NOW()
       WHERE id = ?`,
      [signatureUrl, photoUrl, deliveredBy, deliveryId]
    );

    return { delivery_id: deliveryId, proof_uploaded: true };
  }

  /**
   * Update delivery location (real-time tracking)
   */
  static async updateDeliveryLocation(deliveryId, latitude, longitude) {
    await db.query(
      `UPDATE delivery_requests 
       SET latitude = ?, longitude = ?, last_location_update = NOW()
       WHERE id = ?`,
      [latitude, longitude, deliveryId]
    );

    return {
      delivery_id: deliveryId,
      latitude,
      longitude,
      updated_at: new Date()
    };
  }

  /**
   * Get all pickup points
   */
  static async getPickupPoints(city = null) {
    let query = 'SELECT * FROM pickup_points WHERE is_active = TRUE';
    const params = [];

    if (city) {
      query += ' AND city = ?';
      params.push(city);
    }

    query += ' ORDER BY name';

    const [points] = await db.query(query, params);

    return points;
  }

  /**
   * Get pickup point details
   */
  static async getPickupPoint(pointId) {
    const [points] = await db.query(
      'SELECT * FROM pickup_points WHERE id = ? AND is_active = TRUE',
      [pointId]
    );

    if (points.length === 0) return null;

    return points[0];
  }

  /**
   * Get delivery fees for location
   */
  static async getDeliveryFee(city) {
    const [fees] = await db.query(
      `SELECT * FROM delivery_fees 
       WHERE city = ? AND is_active = TRUE`,
      [city]
    );

    if (fees.length === 0) {
      // Return default fee if city not configured
      return {
        city,
        base_fee: 200,
        per_km_fee: 5,
        estimated_days_min: 3,
        estimated_days_max: 5
      };
    }

    return fees[0];
  }

  /**
   * Get admin delivery requests with filtering
   */
  static async getAdminDeliveries(filters = {}) {
    let query = `
      SELECT dr.*, o.order_number, o.shipping_city,
             COALESCE(u.first_name, 'Unassigned') as partner_name
      FROM delivery_requests dr
      LEFT JOIN orders o ON dr.order_id = o.id
      LEFT JOIN users u ON dr.delivery_partner_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (filters.status) {
      query += ' AND dr.status = ?';
      params.push(filters.status);
    }

    if (filters.partner_id) {
      query += ' AND dr.delivery_partner_id = ?';
      params.push(filters.partner_id);
    }

    if (filters.tracking_number) {
      query += ' AND dr.tracking_number = ?';
      params.push(filters.tracking_number);
    }

    query += ' ORDER BY dr.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(filters.limit, filters.offset || 0);
    }

    const [deliveries] = await db.query(query, params);

    return deliveries;
  }
}

module.exports = DeliveryService;
