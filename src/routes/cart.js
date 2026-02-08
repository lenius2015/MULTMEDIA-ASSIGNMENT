/**
 * Cart Routes
 * Handles all cart-related API endpoints
 */

const express = require('express');
const router = express.Router();
const CartService = require('../services/CartService');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');

/**
 * POST /api/cart/get-or-create
 * Get or create cart for user/session
 */
router.post('/get-or-create', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const sessionId = req.session?.id || req.headers['x-session-id'];

  if (!userId && !sessionId) {
    return res.status(400).json({
      success: false,
      message: 'User ID or Session ID required'
    });
  }

  const cart = await CartService.getOrCreateCart(userId, sessionId);

  res.json({
    success: true,
    data: {
      id: cart.id,
      user_id: cart.user_id,
      session_id: cart.session_id
    }
  });
}));

/**
 * GET /api/cart/:cartId
 * Get cart with items
 */
router.get('/:cartId', asyncHandler(async (req, res) => {
  const cart = await CartService.getCart(req.params.cartId);

  if (!cart) {
    return res.status(404).json({
      success: false,
      message: 'Cart not found'
    });
  }

  res.json({
    success: true,
    data: cart
  });
}));

/**
 * POST /api/cart/:cartId/items
 * Add item to cart
 */
router.post('/:cartId/items', asyncHandler(async (req, res) => {
  const { product_id, quantity = 1 } = req.body;

  if (!product_id) {
    return res.status(400).json({
      success: false,
      message: 'Product ID required'
    });
  }

  const cart = await CartService.addToCart(
    req.params.cartId,
    product_id,
    quantity
  );

  res.json({
    success: true,
    message: 'Item added to cart',
    data: cart
  });
}));

/**
 * PATCH /api/cart/:cartId/items/:itemId
 * Update cart item quantity
 */
router.patch('/:cartId/items/:itemId', asyncHandler(async (req, res) => {
  const { quantity } = req.body;

  if (quantity === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Quantity required'
    });
  }

  const cart = await CartService.updateCartItem(
    req.params.cartId,
    req.params.itemId,
    quantity
  );

  res.json({
    success: true,
    message: 'Cart updated',
    data: cart
  });
}));

/**
 * DELETE /api/cart/:cartId/items/:itemId
 * Remove item from cart
 */
router.delete('/:cartId/items/:itemId', asyncHandler(async (req, res) => {
  const cart = await CartService.removeFromCart(
    req.params.cartId,
    req.params.itemId
  );

  res.json({
    success: true,
    message: 'Item removed from cart',
    data: cart
  });
}));

/**
 * DELETE /api/cart/:cartId
 * Clear entire cart
 */
router.delete('/:cartId', asyncHandler(async (req, res) => {
  const cart = await CartService.clearCart(req.params.cartId);

  res.json({
    success: true,
    message: 'Cart cleared',
    data: cart
  });
}));

/**
 * POST /api/cart/:cartId/coupon
 * Apply coupon to cart
 */
router.post('/:cartId/coupon', asyncHandler(async (req, res) => {
  const { coupon_code } = req.body;
  const userId = req.user?.id;

  if (!coupon_code) {
    return res.status(400).json({
      success: false,
      message: 'Coupon code required'
    });
  }

  const result = await CartService.applyCoupon(
    req.params.cartId,
    coupon_code,
    userId
  );

  res.json({
    success: true,
    message: 'Coupon applied',
    data: result
  });
}));

/**
 * DELETE /api/cart/:cartId/coupon
 * Remove coupon from cart
 */
router.delete('/:cartId/coupon', asyncHandler(async (req, res) => {
  const cart = await CartService.removeCoupon(req.params.cartId);

  res.json({
    success: true,
    message: 'Coupon removed',
    data: cart
  });
}));

/**
 * POST /api/cart/:cartId/delivery-fee
 * Calculate and set delivery fee
 */
router.post('/:cartId/delivery-fee', asyncHandler(async (req, res) => {
  const { city, delivery_type = 'home_delivery' } = req.body;

  if (!city) {
    return res.status(400).json({
      success: false,
      message: 'City required'
    });
  }

  const cart = await CartService.setDeliveryFee(
    req.params.cartId,
    city,
    delivery_type
  );

  res.json({
    success: true,
    message: 'Delivery fee calculated',
    data: cart
  });
}));

/**
 * GET /api/cart/:cartId/summary
 * Get cart summary (for mini cart)
 */
router.get('/:cartId/summary', asyncHandler(async (req, res) => {
  const summary = await CartService.getCartSummary(req.params.cartId);

  if (!summary) {
    return res.status(404).json({
      success: false,
      message: 'Cart not found'
    });
  }

  res.json({
    success: true,
    data: summary
  });
}));

module.exports = router;
