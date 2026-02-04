/**
 * Cart Service
 * Handles all cart-related business logic
 */

const db = require('../../db');

class CartService {
  /**
   * Get or create cart for user/session
   */
  static async getOrCreateCart(userId, sessionId) {
    let cart;

    if (userId) {
      // Try to get existing user cart
      const [carts] = await db.query(
        'SELECT * FROM carts WHERE user_id = ? AND (expires_at IS NULL OR expires_at > NOW())',
        [userId]
      );

      if (carts.length > 0) {
        cart = carts[0];
      } else {
        // Create new cart for user
        const [result] = await db.query(
          'INSERT INTO carts (user_id) VALUES (?)',
          [userId]
        );
        cart = { id: result.insertId, user_id: userId };
      }
    } else if (sessionId) {
      // Try to get session cart
      const [carts] = await db.query(
        'SELECT * FROM carts WHERE session_id = ? AND (expires_at IS NULL OR expires_at > NOW())',
        [sessionId]
      );

      if (carts.length > 0) {
        cart = carts[0];
      } else {
        // Create new session cart (expires in 30 days)
        const [result] = await db.query(
          `INSERT INTO carts (session_id, expires_at) 
           VALUES (?, DATE_ADD(NOW(), INTERVAL 30 DAY))`,
          [sessionId]
        );
        cart = { id: result.insertId, session_id: sessionId };
      }
    }

    return cart;
  }

  /**
   * Get cart with items
   */
  static async getCart(cartId) {
    const [carts] = await db.query(
      `SELECT c.*, COUNT(ci.id) as item_count, SUM(ci.quantity) as total_items
       FROM carts c
       LEFT JOIN cart_items ci ON c.id = ci.cart_id
       WHERE c.id = ? AND (c.expires_at IS NULL OR c.expires_at > NOW())
       GROUP BY c.id`,
      [cartId]
    );

    if (carts.length === 0) return null;

    const cart = carts[0];

    // Get cart items with product details
    const [items] = await db.query(
      `SELECT ci.id, ci.product_id, p.name, p.image, p.price as unit_price, 
              ci.quantity, ci.subtotal, ps.quantity_available
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       LEFT JOIN product_stock ps ON p.id = ps.product_id
       WHERE ci.cart_id = ?
       ORDER BY ci.created_at DESC`,
      [cartId]
    );

    cart.items = items;
    return cart;
  }

  /**
   * Add item to cart
   */
  static async addToCart(cartId, productId, quantity = 1) {
    // Get product details & stock
    const [products] = await db.query(
      `SELECT p.*, ps.quantity_available
       FROM products p
       LEFT JOIN product_stock ps ON p.id = ps.product_id
       WHERE p.id = ? AND p.status = 'active'`,
      [productId]
    );

    if (products.length === 0) {
      throw new Error('Product not found or inactive');
    }

    const product = products[0];
    const availableStock = product.quantity_available || 0;

    // Validate stock
    if (quantity > availableStock) {
      throw new Error(
        `Only ${availableStock} items available in stock`
      );
    }

    // Check if item already in cart
    const [existing] = await db.query(
      'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?',
      [cartId, productId]
    );

    if (existing.length > 0) {
      // Update quantity
      const newQuantity = existing[0].quantity + quantity;
      if (newQuantity > availableStock) {
        throw new Error(
          `Cannot add. Only ${availableStock} items available.`
        );
      }

      const subtotal = product.price * newQuantity;
      await db.query(
        `UPDATE cart_items 
         SET quantity = ?, subtotal = ?, updated_at = NOW()
         WHERE id = ?`,
        [newQuantity, subtotal, existing[0].id]
      );
    } else {
      // Add new item
      const subtotal = product.price * quantity;
      await db.query(
        `INSERT INTO cart_items (cart_id, product_id, quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [cartId, productId, quantity, product.price, subtotal]
      );
    }

    // Recalculate cart totals
    await this.recalculateCartTotals(cartId);

    return this.getCart(cartId);
  }

  /**
   * Update cart item quantity
   */
  static async updateCartItem(cartId, itemId, quantity) {
    // Get item details
    const [items] = await db.query(
      'SELECT * FROM cart_items WHERE id = ? AND cart_id = ?',
      [itemId, cartId]
    );

    if (items.length === 0) {
      throw new Error('Cart item not found');
    }

    const item = items[0];

    // Check stock
    const [products] = await db.query(
      `SELECT ps.quantity_available FROM products p
       LEFT JOIN product_stock ps ON p.id = ps.product_id
       WHERE p.id = ?`,
      [item.product_id]
    );

    const availableStock = products[0]?.quantity_available || 0;

    if (quantity > availableStock) {
      throw new Error(
        `Only ${availableStock} items available in stock`
      );
    }

    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      await db.query('DELETE FROM cart_items WHERE id = ?', [itemId]);
    } else {
      // Update quantity and subtotal
      const subtotal = item.unit_price * quantity;
      await db.query(
        `UPDATE cart_items 
         SET quantity = ?, subtotal = ?, updated_at = NOW()
         WHERE id = ?`,
        [quantity, subtotal, itemId]
      );
    }

    // Recalculate totals
    await this.recalculateCartTotals(cartId);

    return this.getCart(cartId);
  }

  /**
   * Remove item from cart
   */
  static async removeFromCart(cartId, itemId) {
    // Verify item belongs to cart
    const [items] = await db.query(
      'SELECT * FROM cart_items WHERE id = ? AND cart_id = ?',
      [itemId, cartId]
    );

    if (items.length === 0) {
      throw new Error('Cart item not found');
    }

    await db.query('DELETE FROM cart_items WHERE id = ?', [itemId]);

    // Recalculate totals
    await this.recalculateCartTotals(cartId);

    return this.getCart(cartId);
  }

  /**
   * Clear entire cart
   */
  static async clearCart(cartId) {
    await db.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
    await db.query(
      'UPDATE carts SET subtotal = 0, tax = 0, delivery_fee = 0, discount = 0, total = 0 WHERE id = ?',
      [cartId]
    );
    return this.getCart(cartId);
  }

  /**
   * Recalculate cart totals
   */
  static async recalculateCartTotals(cartId) {
    // Get cart items subtotal
    const [totals] = await db.query(
      `SELECT COALESCE(SUM(subtotal), 0) as subtotal, COUNT(*) as item_count
       FROM cart_items WHERE cart_id = ?`,
      [cartId]
    );

    const subtotal = totals[0].subtotal || 0;
    const tax = subtotal * 0.16; // 16% VAT
    const discount = 0; // Will be calculated with coupon

    // Update cart
    await db.query(
      `UPDATE carts 
       SET subtotal = ?, tax = ?, 
           total = ? + ? + COALESCE(delivery_fee, 0) - COALESCE(discount, 0),
           updated_at = NOW()
       WHERE id = ?`,
      [subtotal, tax, subtotal, tax, cartId]
    );
  }

  /**
   * Apply coupon/discount to cart
   */
  static async applyCoupon(cartId, couponCode, userId) {
    // Get coupon
    const [coupons] = await db.query(
      `SELECT * FROM coupons 
       WHERE code = ? AND is_active = TRUE 
       AND valid_from <= NOW() AND valid_until > NOW()`,
      [couponCode.toUpperCase()]
    );

    if (coupons.length === 0) {
      throw new Error('Invalid or expired coupon code');
    }

    const coupon = coupons[0];

    // Check usage limits
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      throw new Error('Coupon usage limit exceeded');
    }

    if (userId && coupon.per_user_limit) {
      const [usage] = await db.query(
        `SELECT COUNT(*) as count FROM coupon_usage 
         WHERE coupon_id = ? AND user_id = ?`,
        [coupon.id, userId]
      );

      if (usage[0].count >= coupon.per_user_limit) {
        throw new Error('You have already used this coupon');
      }
    }

    // Get cart
    const cart = await this.getCart(cartId);
    if (!cart || cart.subtotal < (coupon.min_order_amount || 0)) {
      throw new Error(
        `Minimum order amount of ${coupon.min_order_amount} required for this coupon`
      );
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (cart.subtotal * coupon.value) / 100;
      if (coupon.max_discount) {
        discount = Math.min(discount, coupon.max_discount);
      }
    } else {
      discount = coupon.value;
    }

    // Update cart with coupon and discount
    await db.query(
      `UPDATE carts 
       SET coupon_code = ?, discount = ?,
           total = subtotal + tax + COALESCE(delivery_fee, 0) - ?,
           updated_at = NOW()
       WHERE id = ?`,
      [couponCode.toUpperCase(), discount, discount, cartId]
    );

    return {
      coupon: coupon.code,
      discount: discount,
      cart: await this.getCart(cartId)
    };
  }

  /**
   * Remove coupon from cart
   */
  static async removeCoupon(cartId) {
    await db.query(
      `UPDATE carts 
       SET coupon_code = NULL, discount = 0,
           total = subtotal + tax + COALESCE(delivery_fee, 0),
           updated_at = NOW()
       WHERE id = ?`,
      [cartId]
    );

    return this.getCart(cartId);
  }

  /**
   * Calculate and set delivery fee
   */
  static async setDeliveryFee(cartId, city, deliveryType = 'home_delivery') {
    let deliveryFee = 0;

    if (deliveryType === 'home_delivery') {
      // Get delivery fee for city
      const [fees] = await db.query(
        `SELECT base_fee FROM delivery_fees 
         WHERE city = ? AND is_active = TRUE`,
        [city]
      );

      deliveryFee = fees.length > 0 ? fees[0].base_fee : 200; // Default fee
    } else if (deliveryType === 'pickup_point') {
      deliveryFee = 0; // No delivery fee for pickup
    }

    await db.query(
      `UPDATE carts 
       SET delivery_fee = ?,
           total = subtotal + tax + ? - COALESCE(discount, 0),
           updated_at = NOW()
       WHERE id = ?`,
      [deliveryFee, deliveryFee, cartId]
    );

    return this.getCart(cartId);
  }

  /**
   * Merge guest cart to user cart when logging in
   */
  static async mergeCartOnLogin(userId, guestSessionId) {
    // Get guest cart
    const guestCart = await this.getOrCreateCart(null, guestSessionId);
    if (!guestCart || !guestCart.items || guestCart.items.length === 0) {
      return;
    }

    // Get or create user cart
    const userCart = await this.getOrCreateCart(userId, null);

    // Merge items
    for (const item of guestCart.items) {
      try {
        await this.addToCart(userCart.id, item.product_id, item.quantity);
      } catch (error) {
        console.error(`Failed to merge item ${item.product_id}:`, error.message);
      }
    }

    // Clear guest cart
    await this.clearCart(guestCart.id);
  }

  /**
   * Check cart item availability before checkout
   */
  static async validateCartForCheckout(cartId) {
    const cart = await this.getCart(cartId);

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    const unavailableItems = [];

    for (const item of cart.items) {
      if (item.quantity > (item.quantity_available || 0)) {
        unavailableItems.push({
          product_id: item.product_id,
          name: item.name,
          requested: item.quantity,
          available: item.quantity_available || 0
        });
      }
    }

    if (unavailableItems.length > 0) {
      throw new Error(
        `Some items are out of stock: ${unavailableItems
          .map(i => `${i.name} (${i.available} available)`)
          .join(', ')}`
      );
    }

    return true;
  }

  /**
   * Get cart item count
   */
  static async getCartItemCount(cartId) {
    const [results] = await db.query(
      'SELECT COALESCE(SUM(quantity), 0) as count FROM cart_items WHERE cart_id = ?',
      [cartId]
    );

    return results[0].count;
  }

  /**
   * Get user's cart summary for mini cart
   */
  static async getCartSummary(cartId) {
    const cart = await this.getCart(cartId);

    if (!cart) return null;

    return {
      id: cart.id,
      item_count: cart.total_items || 0,
      subtotal: cart.subtotal,
      tax: cart.tax,
      delivery_fee: cart.delivery_fee,
      discount: cart.discount,
      total: cart.total,
      items: (cart.items || []).map(item => ({
        id: item.id,
        product_id: item.product_id,
        name: item.name,
        image: item.image,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal
      }))
    };
  }
}

module.exports = CartService;
