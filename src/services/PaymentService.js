/**
 * Payment Service
 * Handles payment processing, integrations with M-Pesa, Card payments, COD
 */

const db = require('../../db');
const crypto = require('crypto');

class PaymentService {
  /**
   * Initialize payment for an order
   */
  static async initializePayment(orderId, paymentMethod, paymentDetails = {}) {
    // Validate payment method
    const validMethods = ['mobile_money', 'card', 'bank_transfer', 'cash_on_delivery'];
    if (!validMethods.includes(paymentMethod)) {
      throw new Error('Invalid payment method');
    }

    // Get order
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE id = ? AND payment_status = "pending"',
      [orderId]
    );

    if (orders.length === 0) {
      throw new Error('Order not found or already paid');
    }

    const order = orders[0];

    // Determine payment provider
    let paymentProvider = null;
    if (paymentMethod === 'mobile_money') {
      // Detect network operator (M-Pesa, Airtel Money, Tigo Pesa)
      paymentProvider = this.detectMobileOperator(paymentDetails.phone_number);
    } else if (paymentMethod === 'card') {
      paymentProvider = 'stripe'; // or your payment gateway
    }

    // Create payment record
    const [result] = await db.query(
      `INSERT INTO payments (
        order_id, payment_method, payment_provider, amount, status,
        phone_number, network_operator, currency
      ) VALUES (?, ?, ?, ?, 'pending', ?, ?, 'KES')`,
      [
        orderId,
        paymentMethod,
        paymentProvider,
        order.total_amount,
        paymentDetails.phone_number || null,
        paymentProvider
      ]
    );

    const paymentId = result.insertId;

    // Process payment based on method
    let paymentResponse = {
      payment_id: paymentId,
      order_id: orderId,
      amount: order.total_amount,
      currency: 'KES',
      status: 'pending'
    };

    if (paymentMethod === 'mobile_money') {
      paymentResponse = await this.initializeMobileMoneyPayment(paymentId, order, paymentDetails);
    } else if (paymentMethod === 'card') {
      paymentResponse = await this.initializeCardPayment(paymentId, order, paymentDetails);
    } else if (paymentMethod === 'cash_on_delivery') {
      // COD is confirmed at delivery
      paymentResponse.status = 'pending_confirmation';
    }

    return paymentResponse;
  }

  /**
   * Initialize mobile money payment (M-Pesa, Airtel Money, etc.)
   */
  static async initializeMobileMoneyPayment(paymentId, order, details) {
    const { phone_number } = details;

    if (!phone_number || !/^\+?254\d{9}$/.test(phone_number.replace(/\s/g, ''))) {
      throw new Error('Invalid phone number');
    }

    // Format phone number
    const formattedPhone = phone_number.replace(/^0/, '254').replace(/^\+/, '');

    // Determine network operator
    const operator = this.detectMobileOperator(formattedPhone);

    if (!operator) {
      throw new Error('Unsupported mobile network');
    }

    // Here you would integrate with actual payment gateway
    // For now, returning mock response that would be replaced with real API calls

    const paymentResponse = {
      payment_id: paymentId,
      order_id: order.id,
      status: 'processing',
      network: operator,
      phone_number: phone_number,
      amount: order.total_amount,
      currency: 'KES',
      message: `Please enter your ${operator} PIN to complete the payment`
    };

    // Update payment record with network operator
    await db.query(
      'UPDATE payments SET network_operator = ?, phone_number = ? WHERE id = ?',
      [operator, formattedPhone, paymentId]
    );

    return paymentResponse;
  }

  /**
   * Initialize card payment
   */
  static async initializeCardPayment(paymentId, order, details) {
    const { card_token, card_last_four, card_brand } = details;

    if (!card_token) {
      throw new Error('Card token required');
    }

    // Update payment record with card info (never store full card numbers)
    await db.query(
      'UPDATE payments SET card_last_four = ?, card_brand = ? WHERE id = ?',
      [card_last_four, card_brand, paymentId]
    );

    // Here you would call your payment gateway API (Stripe, etc.)
    // This is a placeholder

    return {
      payment_id: paymentId,
      order_id: order.id,
      status: 'processing',
      amount: order.total_amount,
      currency: 'KES',
      card_brand: card_brand,
      card_last_four: card_last_four,
      message: 'Processing your card payment...'
    };
  }

  /**
   * Confirm mobile money payment
   */
  static async confirmMobileMoneyPayment(paymentId, confirmationCode, transactionId) {
    // Verify the payment exists
    const [payments] = await db.query(
      'SELECT * FROM payments WHERE id = ? AND payment_method = "mobile_money"',
      [paymentId]
    );

    if (payments.length === 0) {
      throw new Error('Payment not found');
    }

    const payment = payments[0];

    // In production, verify with the payment provider's API
    // For now, we'll assume verification is successful

    // Update payment status
    await db.query(
      `UPDATE payments 
       SET status = 'completed', transaction_id = ?, payment_date = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [transactionId, paymentId]
    );

    // Update order payment status
    await db.query(
      `UPDATE orders 
       SET payment_status = 'paid', status = 'processing', updated_at = NOW()
       WHERE id = ?`,
      [payment.order_id]
    );

    // Log activity
    await db.query(
      `INSERT INTO order_activities (order_id, activity_type, description, performed_by_type)
       VALUES (?, 'payment_received', ?, 'system')`,
      [payment.order_id, `Payment received via ${payment.network_operator}. Transaction ID: ${transactionId}`]
    );

    return {
      payment_id: paymentId,
      order_id: payment.order_id,
      status: 'completed',
      transaction_id: transactionId,
      amount: payment.amount,
      message: 'Payment successful'
    };
  }

  /**
   * Handle payment webhook (from payment provider)
   */
  static async handlePaymentWebhook(webhookData) {
    const { transaction_id, status, order_reference } = webhookData;

    // Find payment by transaction ID
    const [payments] = await db.query(
      'SELECT * FROM payments WHERE transaction_id = ?',
      [transaction_id]
    );

    if (payments.length === 0) {
      throw new Error('Payment not found');
    }

    const payment = payments[0];

    // Verify status
    const paymentStatus = status === 'success' || status === 'completed' ? 'completed' : 'failed';

    // Update payment with webhook response
    await db.query(
      `UPDATE payments 
       SET status = ?, webhook_response = ?, webhook_received_at = NOW(), 
           updated_at = NOW()
       WHERE id = ?`,
      [paymentStatus, JSON.stringify(webhookData), payment.id]
    );

    // If payment successful, update order
    if (paymentStatus === 'completed') {
      await db.query(
        `UPDATE orders 
         SET payment_status = 'paid', status = 'processing', updated_at = NOW()
         WHERE id = ?`,
        [payment.order_id]
      );

      // Log activity
      await db.query(
        `INSERT INTO order_activities (order_id, activity_type, description, performed_by_type)
         VALUES (?, 'payment_confirmed', 'Payment confirmed by webhook', 'system')`,
        [payment.order_id]
      );
    }

    return {
      payment_id: payment.id,
      order_id: payment.order_id,
      status: paymentStatus,
      processed_at: new Date()
    };
  }

  /**
   * Verify webhook signature (security)
   */
  static verifyWebhookSignature(payload, signature, secret) {
    const hash = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return hash === signature;
  }

  /**
   * Get payment details
   */
  static async getPayment(paymentId) {
    const [payments] = await db.query(
      'SELECT * FROM payments WHERE id = ?',
      [paymentId]
    );

    if (payments.length === 0) return null;

    const payment = payments[0];
    // Mask sensitive data
    if (payment.card_last_four) {
      payment.card_display = `**** **** **** ${payment.card_last_four}`;
    }

    return payment;
  }

  /**
   * Get payment by order
   */
  static async getPaymentByOrder(orderId) {
    const [payments] = await db.query(
      'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
      [orderId]
    );

    if (payments.length === 0) return null;
    return payments[0];
  }

  /**
   * Refund payment
   */
  static async refundPayment(paymentId, reason = '') {
    const [payments] = await db.query(
      'SELECT * FROM payments WHERE id = ? AND status = "completed"',
      [paymentId]
    );

    if (payments.length === 0) {
      throw new Error('Payment not found or cannot be refunded');
    }

    const payment = payments[0];

    // Process refund with payment gateway
    // This is a placeholder - implement with actual gateway

    // Update payment status
    await db.query(
      `UPDATE payments 
       SET status = 'refunded', updated_at = NOW()
       WHERE id = ?`,
      [paymentId]
    );

    // Update order
    await db.query(
      `UPDATE orders 
       SET payment_status = 'refunded', updated_at = NOW()
       WHERE id = ?`,
      [payment.order_id]
    );

    // Log activity
    await db.query(
      `INSERT INTO order_activities (order_id, activity_type, description, performed_by_type)
       VALUES (?, 'refund_issued', ?, 'system')`,
      [payment.order_id, `Refund issued for payment. Reason: ${reason}`]
    );

    return {
      payment_id: paymentId,
      order_id: payment.order_id,
      status: 'refunded',
      amount: payment.amount
    };
  }

  /**
   * Detect mobile network operator
   */
  static detectMobileOperator(phoneNumber) {
    // Remove any formatting
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const lastPart = cleanNumber.slice(-10);

    // Kenyan mobile network prefixes
    if (/^254(7[0-1])/.test(cleanNumber)) {
      return 'mpesa'; // Safaricom
    } else if (/^254(7[4-6])/.test(cleanNumber)) {
      return 'airtel'; // Airtel
    } else if (/^254(75)/.test(cleanNumber)) {
      return 'tigo'; // Tigo
    } else if (/^254(76-78)/.test(cleanNumber)) {
      return 'equitel'; // Equitel
    }

    return null;
  }

  /**
   * Get payment status
   */
  static async checkPaymentStatus(paymentId) {
    const payment = await this.getPayment(paymentId);

    if (!payment) {
      throw new Error('Payment not found');
    }

    return {
      payment_id: payment.id,
      order_id: payment.order_id,
      status: payment.status,
      amount: payment.amount,
      payment_method: payment.payment_method,
      created_at: payment.created_at,
      payment_date: payment.payment_date
    };
  }

  /**
   * Get payments for admin dashboard
   */
  static async getPaymentsReport(filters = {}) {
    let query = `
      SELECT p.*, o.order_number, o.total_amount,
             COALESCE(u.first_name, 'Guest') as customer_name
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (filters.status) {
      query += ' AND p.status = ?';
      params.push(filters.status);
    }

    if (filters.payment_method) {
      query += ' AND p.payment_method = ?';
      params.push(filters.payment_method);
    }

    if (filters.date_from) {
      query += ' AND DATE(p.created_at) >= ?';
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      query += ' AND DATE(p.created_at) <= ?';
      params.push(filters.date_to);
    }

    query += ' ORDER BY p.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(filters.limit, filters.offset || 0);
    }

    const [payments] = await db.query(query, params);

    return payments;
  }
}

module.exports = PaymentService;
