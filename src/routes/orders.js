/**
 * Orders Routes
 * Handles order creation, retrieval, and management
 */

const express = require('express');
const router = express.Router();
const OrderService = require('../services/OrderService');
const CartService = require('../services/CartService');
const DeliveryService = require('../services/DeliveryService');
const InvoiceService = require('../services/InvoiceService');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * POST /api/orders
 * Create order from cart
 */
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const {
    cart_id,
    shipping_address_id,
    delivery_type = 'home_delivery',
    ...orderData
  } = req.body;

  if (!cart_id) {
    return res.status(400).json({
      success: false,
      message: 'Cart ID required'
    });
  }

  // Validate cart for checkout
  await CartService.validateCartForCheckout(cart_id);

  // If using saved address, fetch it
  let addressData = orderData;
  if (shipping_address_id) {
    const addresses = await DeliveryService.getUserAddresses(req.user.id);
    const address = addresses.find(a => a.id === shipping_address_id);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    addressData = {
      shipping_address_id,
      shipping_first_name: address.full_name.split(' ')[0],
      shipping_last_name: address.full_name.split(' ').slice(1).join(' '),
      shipping_phone: address.phone,
      shipping_email: address.email,
      shipping_street: address.street_address,
      shipping_city: address.city,
      shipping_state: address.state_province,
      shipping_postal_code: address.postal_code,
      shipping_country: address.country
    };
  }

  // Create order
  const order = await OrderService.createOrder(cart_id, req.user.id, addressData);

  // Create delivery request
  const delivery = await DeliveryService.createDeliveryRequest(order.id, {
    delivery_type
  });

  // Calculate delivery fee if home delivery
  if (delivery_type === 'home_delivery') {
    const fee = await DeliveryService.getDeliveryFee(addressData.shipping_city);
    // Update delivery fee in order (already in cart total)
  }

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: {
      order,
      delivery: {
        id: delivery.id,
        tracking_number: delivery.tracking_number,
        type: delivery.delivery_type,
        estimated_delivery: delivery.estimated_delivery_date
      }
    }
  });
}));

/**
 * GET /api/orders/:orderId
 * Get order details
 */
router.get('/:orderId', asyncHandler(async (req, res) => {
  const order = await OrderService.getOrder(req.params.orderId);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  // Check authorization (user can only see their own orders)
  if (req.user && order.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized'
    });
  }

  res.json({
    success: true,
    data: order
  });
}));

/**
 * GET /api/orders/user/me
 * Get current user's orders
 */
router.get('/user/me', authenticate, asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  const result = await OrderService.getUserOrders(
    req.user.id,
    parseInt(limit),
    parseInt(offset)
  );

  res.json({
    success: true,
    data: result.orders,
    pagination: {
      total: result.total,
      limit: result.limit,
      offset: result.offset
    }
  });
}));

/**
 * GET /api/orders
 * Get all orders (admin only)
 */
router.get('/', authorize(['admin']), asyncHandler(async (req, res) => {
  const {
    status,
    payment_status,
    search,
    date_from,
    date_to,
    limit = 50,
    offset = 0
  } = req.query;

  const orders = await OrderService.getAdminOrders({
    status,
    payment_status,
    search,
    date_from,
    date_to,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  res.json({
    success: true,
    data: orders
  });
}));

/**
 * PATCH /api/orders/:orderId/status
 * Update order status (admin only)
 */
router.patch(
  '/:orderId/status',
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status required'
      });
    }

    const result = await OrderService.updateOrderStatus(
      req.params.orderId,
      status,
      req.user.id,
      notes
    );

    res.json({
      success: true,
      message: 'Order status updated',
      data: result
    });
  })
);

/**
 * PATCH /api/orders/:orderId/cancel
 * Cancel order
 */
router.patch('/:orderId/cancel', asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const order = await OrderService.getOrder(req.params.orderId);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  // Check authorization
  if (req.user && order.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized'
    });
  }

  const result = await OrderService.cancelOrder(req.params.orderId, reason);

  res.json({
    success: true,
    message: 'Order cancelled',
    data: result
  });
}));

/**
 * GET /api/orders/:orderId/activities
 * Get order activity log
 */
router.get('/:orderId/activities', asyncHandler(async (req, res) => {
  const activities = await OrderService.getOrderActivities(req.params.orderId);

  res.json({
    success: true,
    data: activities
  });
}));

module.exports = router;
