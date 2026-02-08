# Testing Guide - ShopHub E-Commerce Platform

## API Testing with cURL

### 1. Authentication Tests

#### Register New User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPass123",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+254712345678"
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPass123"
  }'
```

#### Get Current User (Requires Authentication)
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer {accessToken}"
```

#### Update Profile
```bash
curl -X PUT http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "city": "Nairobi"
  }'
```

#### Logout
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer {accessToken}"
```

---

### 2. Products Tests

#### Get All Products
```bash
# Simple request
curl -X GET http://localhost:5000/api/products

# With pagination
curl -X GET "http://localhost:5000/api/products?page=1&limit=10"

# With filters
curl -X GET "http://localhost:5000/api/products?category=electronics&minPrice=100&maxPrice=500"

# With search
curl -X GET "http://localhost:5000/api/products?search=phone"
```

#### Get Featured Products
```bash
curl -X GET http://localhost:5000/api/products/featured
```

#### Get All Categories
```bash
curl -X GET http://localhost:5000/api/products/categories
```

#### Get Products by Category
```bash
curl -X GET "http://localhost:5000/api/products/category/electronics?page=1"
```

#### Get Single Product
```bash
curl -X GET http://localhost:5000/api/products/1
```

#### Create Product (Vendor/Admin)
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer {vendorToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Smartphone",
    "description": "Latest model",
    "price": 299.99,
    "stock": 50,
    "category": "electronics",
    "image": "https://example.com/product.jpg"
  }'
```

#### Update Product
```bash
curl -X PUT http://localhost:5000/api/products/1 \
  -H "Authorization: Bearer {vendorToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 279.99,
    "stock": 45
  }'
```

---

### 3. Orders Tests

#### Create Order
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "productId": 1, "quantity": 2 },
      { "productId": 2, "quantity": 1 }
    ],
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Nairobi",
      "zipCode": "00100",
      "country": "Kenya"
    },
    "paymentMethod": "mpesa"
  }'
```

#### Get User Orders
```bash
curl -X GET "http://localhost:5000/api/orders?page=1&limit=10" \
  -H "Authorization: Bearer {accessToken}"
```

#### Get Order Details
```bash
curl -X GET http://localhost:5000/api/orders/1 \
  -H "Authorization: Bearer {accessToken}"
```

#### Update Order Status (Admin)
```bash
curl -X PATCH http://localhost:5000/api/orders/1/status \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{ "status": "shipped" }'
```

---

## Testing Scenarios

### Scenario 1: Complete Purchase Flow

1. **Register User**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@example.com",
    "password": "BuyerPass123",
    "firstName": "Alice",
    "lastName": "Smith"
  }'
# Copy accessToken from response
```

2. **Browse Products**
```bash
curl -X GET "http://localhost:5000/api/products?page=1&limit=10"
# Note product IDs you want to purchase
```

3. **Create Order**
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{ "productId": 1, "quantity": 1 }],
    "shippingAddress": {
      "street": "100 Mahatma Gandhi Rd",
      "city": "Nairobi",
      "zipCode": "00100",
      "country": "Kenya"
    },
    "paymentMethod": "mpesa"
  }'
# Note orderId from response
```

4. **Verify Order**
```bash
curl -X GET http://localhost:5000/api/orders/1 \
  -H "Authorization: Bearer {accessToken}"
```

### Scenario 2: Vendor Product Management

1. **Vendor Login**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vendor@example.com",
    "password": "VendorPass123"
  }'
# Copy vendorToken
```

2. **Create Product**
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer {vendorToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Laptop",
    "description": "High-performance laptop",
    "price": 1299.99,
    "stock": 20,
    "category": "electronics",
    "image": "https://example.com/laptop.jpg"
  }'
```

3. **Update Product Stock**
```bash
curl -X PUT http://localhost:5000/api/products/1 \
  -H "Authorization: Bearer {vendorToken}" \
  -H "Content-Type: application/json" \
  -d '{ "stock": 18 }'
```

### Scenario 3: Error Handling

#### Invalid Email Format
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "TestPass123",
    "firstName": "John"
  }'
# Returns: 400 VALIDATION_ERROR
```

#### Weak Password
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "123",
    "firstName": "John"
  }'
# Returns: 400 VALIDATION_ERROR
```

#### Duplicate Email
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "existing@example.com",
    "password": "TestPass123",
    "firstName": "John"
  }'
# Returns: 409 CONFLICT
```

#### Unauthorized Access
```bash
curl -X GET http://localhost:5000/api/orders
# Returns: 401 UNAUTHORIZED (no token)
```

#### Product Not Found
```bash
curl -X GET http://localhost:5000/api/products/99999
# Returns: 404 NOT_FOUND
```

---

## Frontend Testing

### Test Authentication Flow
1. Open http://localhost:3000
2. Click "Sign Up"
3. Fill registration form with valid data
4. Verify redirect to home page
5. Check localStorage has accessToken

### Test Product Browsing
1. Navigate to Products page
2. Apply filters (category, price range)
3. Search for products
4. Click product to view details
5. Verify pagination works

### Test Order Placement
1. Login to account
2. Browse products
3. Add products to cart
4. Proceed to checkout
5. Fill shipping address
6. Complete payment

### Test Admin Functions
1. Login with admin account
2. Access admin dashboard
3. View all orders
4. Update order statuses
5. Add new products
6. Manage users

---

## Performance Testing

### Load Testing with Apache Bench
```bash
# Test products endpoint
ab -n 100 -c 10 http://localhost:5000/api/products

# Expected results
# - Response time < 200ms for filtered queries
# - Response time < 500ms for complex searches
```

### Database Query Performance
```bash
# Check slow query log
mysql -u root -p ecommerce -e "SHOW VARIABLES LIKE 'slow_query_log%';"

# Run slow query analysis
EXPLAIN SELECT * FROM products WHERE category = 'electronics';
```

---

## Security Testing

### SQL Injection Test
```bash
curl -X GET "http://localhost:5000/api/products?search=test' OR '1'='1"
# Should be safe due to parameterized queries
```

### XSS Prevention Test
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<script>alert(\"XSS\")</script>",
    "description": "Test",
    "price": 100,
    "stock": 10,
    "category": "test"
  }'
# Should be sanitized
```

### Token Expiration Test
1. Register user
2. Get accessToken
3. Wait for token to expire (24h default)
4. Try API request with expired token
5. Should receive 401 UNAUTHORIZED

---

## Continuous Integration Tests

### Run Tests
```bash
npm test
```

### Coverage Report
```bash
npm run test:coverage
```

### Linting
```bash
npm run lint
```

---

## Debugging

### Backend Logs
```bash
# Check error logs
tail -f logs/error-*.log

# Check all logs
tail -f logs/*.log

# Search for specific error
grep "VALIDATION_ERROR" logs/*.log
```

### Frontend Debug
1. Open Chrome DevTools (F12)
2. Check Network tab for API calls
3. Check Console for errors
4. Check Application tab for localStorage tokens

### Database Debugging
```bash
# Check database logs
mysql -u root -p -e "SHOW ENGINE INNODB STATUS\G"

# List current connections
SHOW PROCESSLIST;

# Check table stats
SELECT TABLE_NAME, TABLE_ROWS FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'ecommerce';
```

---

## Test Data Seeding

### Seed Sample Data
```bash
node seed_data.js
```

This creates:
- 5 sample users (1 admin, 1 vendor, 3 customers)
- 20 sample products (electronics, clothing, books)
- 10 sample orders with items

---

## Reporting Issues

When reporting bugs, include:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Error message/screenshot
5. System info (OS, Node.js version, etc.)
6. Relevant logs from `logs/` directory

---

**Last Updated:** January 2024
