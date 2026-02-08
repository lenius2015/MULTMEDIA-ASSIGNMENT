# 🚀 Quick Start Guide - Cart & Order System APIs

## 📦 Database Setup

```bash
# 1. Run migration
mysql -u root -p your_database < db_cart_order_system.sql

# 2. Verify tables created
mysql> SHOW TABLES LIKE '%cart%';
mysql> SHOW TABLES LIKE '%order%';
mysql> SHOW TABLES LIKE '%payment%';
```

---

## 🔧 Environment Variables

Add to `.env`:
```env
# Payment
PAYMENT_GATEWAY_KEY=your_stripe_key
PAYMENT_WEBHOOK_SECRET=your_webhook_secret

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM=noreply@yourdomain.com

# JWT
JWT_SECRET=your_jwt_secret_here
```

---

## 📱 API Usage Examples

### 1. **Create Cart**
```javascript
// POST /api/cart/get-or-create
const response = await fetch('/api/cart/get-or-create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});
const { data } = await response.json();
console.log('Cart ID:', data.id);
```

### 2. **Add Item to Cart**
```javascript
// POST /api/cart/:cartId/items
const response = await fetch(`/api/cart/${cartId}/items`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_id: 123,
    quantity: 2
  })
});
```

### 3. **Get Cart Summary**
```javascript
// GET /api/cart/:cartId/summary
const response = await fetch(`/api/cart/${cartId}/summary`);
const { data } = await response.json();
console.log(`Total: KES ${data.total}`);
console.log(`Items: ${data.item_count}`);
```

### 4. **Apply Coupon**
```javascript
// POST /api/cart/:cartId/coupon
const response = await fetch(`/api/cart/${cartId}/coupon`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    coupon_code: 'WELCOME10'
  })
});
const { data } = await response.json();
console.log(`Discount: KES ${data.discount}`);
```

### 5. **Calculate Delivery Fee**
```javascript
// POST /api/cart/:cartId/delivery-fee
const response = await fetch(`/api/cart/${cartId}/delivery-fee`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    city: 'Nairobi',
    delivery_type: 'home_delivery'
  })
});
```

### 6. **Create Order**
```javascript
// POST /api/orders
const response = await fetch('/api/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    cart_id: cartId,
    shipping_first_name: 'John',
    shipping_last_name: 'Doe',
    shipping_phone: '+254712345678',
    shipping_email: 'john@example.com',
    shipping_street: '123 Main St',
    shipping_city: 'Nairobi',
    shipping_postal_code: '00100',
    shipping_country: 'Kenya',
    delivery_type: 'home_delivery'
  })
});
const { data } = await response.json();
console.log('Order Number:', data.order.order_number);
```

### 7. **Initialize Mobile Money Payment**
```javascript
// POST /api/payments/initialize
const response = await fetch('/api/payments/initialize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    order_id: orderId,
    payment_method: 'mobile_money',
    phone_number: '+254712345678'
  })
});
const { data } = await response.json();
console.log('Payment Status:', data.status);
console.log('Message:', data.message); // "Please enter your M-Pesa PIN..."
```

### 8. **Confirm Mobile Money Payment**
```javascript
// POST /api/payments/confirm-mobile-money
const response = await fetch('/api/payments/confirm-mobile-money', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    payment_id: paymentId,
    confirmation_code: 'user_entered_pin',
    transaction_id: 'MPESA_TRANSACTION_ID'
  })
});
```

### 9. **Track Order**
```javascript
// GET /api/orders/:orderId
const response = await fetch(`/api/orders/${orderId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await response.json();
console.log('Status:', data.status);
console.log('Tracking:', data.delivery.tracking_number);
```

### 10. **Get Invoice**
```javascript
// GET /api/invoices/order/:orderId
const response = await fetch(`/api/invoices/order/${orderId}`);
const { data } = await response.json();

// Download as HTML
window.open(`/api/invoices/${data.id}/html`);
```

---

## 🛡️ Error Handling

```javascript
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const json = await response.json();

    if (!response.ok) {
      // Handle error responses
      console.error('API Error:', json.message);
      throw new Error(json.message || 'API request failed');
    }

    return json.data;
  } catch (error) {
    console.error('Request Error:', error.message);
    // Handle network/parsing errors
    throw error;
  }
}

// Usage
try {
  const cart = await apiCall(`/api/cart/${cartId}`);
} catch (error) {
  // Show error to user
  alert(error.message);
}
```

---

## 📊 Admin APIs

### Get All Orders
```javascript
// GET /api/orders?status=pending&payment_status=paid&limit=50&offset=0
const response = await fetch(
  '/api/orders?status=processing&limit=20',
  {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }
);
```

### Update Order Status
```javascript
// PATCH /api/orders/:orderId/status
const response = await fetch(`/api/orders/${orderId}/status`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    status: 'shipped',
    notes: 'Shipped via DHL'
  })
});
```

### Assign Delivery Partner
```javascript
// PATCH /api/delivery/:deliveryId/assign
const response = await fetch(`/api/delivery/${deliveryId}/assign`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    partner_id: deliveryPartnerId
  })
});
```

### Get Payments Report
```javascript
// GET /api/payments/admin/report?status=completed&date_from=2024-01-01&date_to=2024-01-31
const response = await fetch(
  '/api/payments/admin/report?status=completed',
  {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }
);
```

---

## 🧪 Testing Checklist

### Cart Flow
- [ ] Get/create cart
- [ ] Add product to cart
- [ ] Update quantity
- [ ] Remove item
- [ ] Apply valid coupon
- [ ] Apply invalid coupon
- [ ] Get cart summary

### Order Flow
- [ ] Create order from cart
- [ ] Get order details
- [ ] Get user's orders
- [ ] Cancel pending order
- [ ] Cannot cancel delivered order

### Payment Flow
- [ ] Initialize mobile money
- [ ] Confirm mobile money
- [ ] Initialize card payment
- [ ] Initialize COD
- [ ] Check payment status

### Admin Flow
- [ ] Get all orders (filtered)
- [ ] Update order status
- [ ] Assign delivery partner
- [ ] Get payments report
- [ ] Get invoices list

---

## 📚 Common Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* actual data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

---

## 🔑 Required Headers

```javascript
// Authenticated requests
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}

// Admin requests
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ADMIN_JWT_TOKEN'
}

// Session-based requests (optional, can use Bearer token)
{
  'Content-Type': 'application/json',
  'x-session-id': 'guest-session-id-for-guests'
}
```

---

## 🚨 Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 500 | Server Error |

---

## 💡 Tips

1. **Always validate stock before adding to cart** - System does this automatically
2. **Generate coupons before using** - Test with `WELCOME10` (pre-loaded)
3. **Use real phone numbers for mobile money** - Format: `+254712345678`
4. **Save addresses for faster checkout** - Reduces form friction
5. **Check order status changes** - Use WebSocket for real-time updates
6. **Store order numbers** - Essential for customer support
7. **Implement idempotency** - Use request IDs to prevent double submissions

---

## 🆘 Troubleshooting

**"Cart not found"**
- Verify cartId is correct
- Check if cart has expired (30 days)
- Create new cart if needed

**"Insufficient stock"**
- Check available quantity
- Reduce order quantity
- Wait for restock

**"Invalid coupon"**
- Check coupon code spelling
- Verify minimum order amount
- Check coupon expiration date

**"Unauthorized"**
- Check JWT token validity
- Verify token not expired
- Ensure correct authorization header

**"Payment failed"**
- Check phone number format
- Verify payment provider availability
- Check order amount > 0

---

## 📞 Support

For detailed documentation, see:
- `CART_ORDER_SYSTEM_GUIDE.md` - Complete system guide
- Service files for method documentation
- Database schema file for table structure

---

**Version**: 1.0.0  
**Last Updated**: February 4, 2026
