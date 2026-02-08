# 📚 DATABASE & API REFERENCE GUIDE

## Database Schema Overview

### Core Tables

#### 1. **users** - User Accounts
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    profile_picture VARCHAR(500),
    oauth_provider VARCHAR(50),
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```
**Key Fields**: id, email (unique), password (hashed), role, timestamps
**Indexes**: email (UNIQUE), role

#### 2. **products** - Product Catalog
```sql
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(5,2) DEFAULT 0,
    category VARCHAR(100),
    image_url VARCHAR(500),
    stock INT DEFAULT 0,
    is_new BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```
**Key Fields**: id, name, price, discount, stock, category
**Indexes**: category, name, created_at

#### 3. **cart** - Shopping Cart
```sql
CREATE TABLE cart (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product (user_id, product_id)
);
```
**Key Fields**: user_id (FK), product_id (FK), quantity
**Constraint**: One cart entry per user per product

#### 4. **orders** - User Orders
```sql
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    shipping_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```
**Key Fields**: user_id (FK), total_amount, status, timestamps
**Statuses**: pending, processing, shipped, delivered, cancelled
**Indexes**: user_id, created_at, status

#### 5. **order_items** - Items in Orders
```sql
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(5,2) DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
```
**Key Fields**: order_id (FK), product_id (FK), quantity, price

#### 6. **wishlist** - Saved Products
```sql
CREATE TABLE wishlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product (user_id, product_id)
);
```
**Key Fields**: user_id (FK), product_id (FK)
**Constraint**: One wishlist entry per user per product

#### 7. **notifications** - System Notifications
```sql
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('new_product', 'discount', 'order', 'general') DEFAULT 'general',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```
**Types**: new_product, discount, order, general
**Indexes**: user_id, is_read, created_at

#### 8. **contact_messages** - Contact Form Submissions
```sql
CREATE TABLE contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status ENUM('pending', 'replied', 'closed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```
**Statuses**: pending, replied, closed

#### 9. **invoices** - Generated Invoices
```sql
CREATE TABLE invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    user_id INT NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    pdf_path VARCHAR(500),
    status ENUM('generated', 'sent', 'viewed') DEFAULT 'generated',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 10. **product_reviews** - Customer Reviews
```sql
CREATE TABLE product_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT TRUE,
    helpful_votes INT DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_order_product_review (order_id, product_id)
);
```

#### 11. **delivery_requests** - Delivery Tracking
```sql
CREATE TABLE delivery_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    user_id INT NOT NULL,
    delivery_address TEXT NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    delivery_instructions TEXT,
    delivery_method ENUM('standard', 'express') DEFAULT 'standard',
    preferred_date DATE,
    status ENUM('pending', 'assigned', 'in_transit', 'delivered', 'cancelled') DEFAULT 'pending',
    assigned_agent VARCHAR(100),
    tracking_number VARCHAR(50) UNIQUE,
    estimated_delivery DATE,
    actual_delivery_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 12. **user_onboarding** - Onboarding Status
```sql
CREATE TABLE user_onboarding (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    completed BOOLEAN DEFAULT FALSE,
    skipped BOOLEAN DEFAULT FALSE,
    language VARCHAR(5) DEFAULT 'en',
    sections_viewed INT DEFAULT 0,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 🔌 Complete API Reference

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123",
  "phone": "+255123456789"
}

Response (201):
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

#### User Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123",
  "rememberMe": true
}

Response (200):
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

#### User Logout
```http
POST /api/auth/logout
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "message": "Logout successful"
}
```

#### Check Auth Status
```http
GET /api/auth/status
Authorization: Bearer {token}

Response (200):
{
  "authenticated": true,
  "user": {
    "id": 1,
    "email": "john@example.com",
    "role": "user"
  }
}
```

---

### Product Endpoints

#### Get All Products
```http
GET /api/products?page=1&limit=20
Response (200):
{
  "success": true,
  "products": [...],
  "total": 120,
  "page": 1,
  "pages": 6
}
```

#### Get Product by ID
```http
GET /api/products/5
Response (200):
{
  "success": true,
  "product": {
    "id": 5,
    "name": "T-Shirt",
    "price": 5000,
    "discount": 10,
    "description": "...",
    "stock": 50,
    "category": "T-Shirts",
    "image_url": "/images/tshirt.jpg"
  }
}
```

#### Search Products
```http
GET /api/products/search?q=shirt&category=T-Shirts&minPrice=1000&maxPrice=10000
Query Parameters:
- q: search keyword
- category: category filter
- minPrice: minimum price
- maxPrice: maximum price
- sort: price_asc, price_desc, newest, rating
- page: page number
- limit: items per page

Response (200):
{
  "success": true,
  "products": [...],
  "total": 15
}
```

#### Get Products by Category
```http
GET /api/products?category=T-Shirts

Response (200):
{
  "success": true,
  "products": [...]
}
```

---

### Shopping Cart Endpoints

#### Get Cart
```http
GET /api/cart
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "cart": [
    {
      "id": 1,
      "product_id": 5,
      "name": "T-Shirt",
      "quantity": 2,
      "price": 5000,
      "discounted_price": 4500,
      "image_url": "/images/tshirt.jpg"
    }
  ],
  "total": 9000,
  "itemCount": 1
}
```

#### Add to Cart
```http
POST /api/cart
Authorization: Bearer {token}
Content-Type: application/json

{
  "productId": 5,
  "quantity": 2
}

Response (201):
{
  "success": true,
  "message": "Product added to cart",
  "cart": {...}
}
```

#### Update Cart Item
```http
PUT /api/cart/5
Authorization: Bearer {token}
Content-Type: application/json

{
  "quantity": 3
}

Response (200):
{
  "success": true,
  "message": "Cart updated",
  "cart": {...}
}
```

#### Remove from Cart
```http
DELETE /api/cart/5
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "message": "Item removed from cart"
}
```

#### Clear Cart
```http
DELETE /api/cart
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "message": "Cart cleared"
}
```

#### Get Cart Count
```http
GET /api/cart/count
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "count": 5
}
```

---

### Order Endpoints

#### Create Order
```http
POST /api/orders/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "shipping": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+255123456789",
    "address": "Main Street 123",
    "city": "Dar es Salaam",
    "region": "Dar es Salaam"
  },
  "paymentMethod": "mobile_money"
}

Response (201):
{
  "success": true,
  "message": "Order placed successfully",
  "orderId": 42
}
```

#### Get User Orders
```http
GET /api/orders?page=1&limit=10
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "orders": [
    {
      "id": 42,
      "total_amount": 45000,
      "status": "pending",
      "created_at": "2024-02-01T10:00:00Z"
    }
  ],
  "total": 5
}
```

#### Get Order Details
```http
GET /api/orders/42
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "order": {
    "id": 42,
    "total_amount": 45000,
    "status": "pending",
    "items": [
      {
        "product_id": 5,
        "name": "T-Shirt",
        "quantity": 2,
        "price": 5000
      }
    ],
    "shipping_address": "Main Street 123",
    "created_at": "2024-02-01T10:00:00Z"
  }
}
```

#### Download Invoice
```http
GET /api/orders/42/invoice
Authorization: Bearer {token}

Response (200): PDF file download
```

---

### Wishlist Endpoints

#### Get Wishlist
```http
GET /api/wishlist
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "wishlist": [
    {
      "id": 1,
      "product_id": 5,
      "name": "T-Shirt",
      "price": 5000,
      "image_url": "/images/tshirt.jpg"
    }
  ]
}
```

#### Add to Wishlist
```http
POST /api/wishlist
Authorization: Bearer {token}
Content-Type: application/json

{
  "productId": 5
}

Response (201):
{
  "success": true,
  "message": "Product added to wishlist"
}
```

#### Remove from Wishlist
```http
DELETE /api/wishlist/5
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "message": "Product removed from wishlist"
}
```

#### Move to Cart
```http
POST /api/wishlist/5/move-to-cart
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "message": "Product moved to cart"
}
```

---

### Profile Endpoints

#### Get Profile
```http
GET /api/profile
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "profile": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+255123456789",
    "address": "Main Street 123",
    "profile_picture": "/uploads/profile.jpg"
  }
}
```

#### Update Profile
```http
PUT /api/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "John Doe",
  "phone": "+255123456789",
  "address": "New Address"
}

Response (200):
{
  "success": true,
  "message": "Profile updated successfully"
}
```

#### Upload Profile Picture
```http
POST /api/profile/picture
Authorization: Bearer {token}
Content-Type: multipart/form-data

FormData:
- profilePicture: <file>

Response (200):
{
  "success": true,
  "message": "Profile picture updated",
  "imageUrl": "/uploads/profile.jpg"
}
```

#### Change Password
```http
POST /api/profile/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "oldPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}

Response (200):
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### Review Endpoints

#### Get Product Reviews
```http
GET /api/reviews/5?page=1&limit=10

Response (200):
{
  "success": true,
  "reviews": [
    {
      "id": 1,
      "user": "John Doe",
      "rating": 5,
      "review": "Great product!",
      "helpful_votes": 10,
      "created_at": "2024-02-01"
    }
  ],
  "average_rating": 4.5,
  "total": 20
}
```

#### Submit Review
```http
POST /api/reviews
Authorization: Bearer {token}
Content-Type: application/json

{
  "order_id": 42,
  "product_id": 5,
  "rating": 5,
  "review": "Excellent product, highly recommended!"
}

Response (201):
{
  "success": true,
  "message": "Review submitted successfully"
}
```

#### Mark Review Helpful
```http
POST /api/reviews/1/helpful
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "helpful_votes": 11
}
```

---

### Admin Endpoints

#### Admin Login
```http
POST /admin/login
Content-Type: application/json

{
  "email": "admin@ecommerce.com",
  "password": "Admin@123"
}

Response (200):
{
  "success": true,
  "message": "Admin login successful"
}
```

#### Get Dashboard Stats
```http
GET /admin/api/dashboard/stats
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "stats": {
    "total_users": 150,
    "total_products": 200,
    "total_orders": 500,
    "total_revenue": 5000000,
    "pending_orders": 25
  }
}
```

#### Get Products (Admin)
```http
GET /admin/dashboard/products
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "products": [...]
}
```

#### Add Product (Admin)
```http
POST /admin/dashboard/products
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Product",
  "description": "Product description",
  "price": 10000,
  "discount": 10,
  "category": "T-Shirts",
  "stock": 100
}

Response (201):
{
  "success": true,
  "product": {...}
}
```

#### Update Product (Admin)
```http
PUT /admin/dashboard/products/5
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Product",
  "price": 12000,
  "stock": 150
}

Response (200):
{
  "success": true,
  "message": "Product updated"
}
```

#### Delete Product (Admin)
```http
DELETE /admin/dashboard/products/5
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "message": "Product deleted"
}
```

#### Get Orders (Admin)
```http
GET /admin/dashboard/orders?status=pending
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "orders": [...]
}
```

#### Update Order Status (Admin)
```http
PUT /admin/dashboard/orders/42/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "shipped"
}

Response (200):
{
  "success": true,
  "message": "Order status updated"
}
```

#### Get Customers (Admin)
```http
GET /admin/dashboard/customers
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "customers": [...]
}
```

---

## 📊 Database Relationships

### Entity Relationship Diagram (Simplified)

```
users
  ├── 1:N → orders
  ├── 1:N → cart
  ├── 1:N → wishlist
  ├── 1:N → notifications
  └── 1:N → product_reviews

orders
  ├── 1:N → order_items
  ├── 1:1 → invoices
  └── 1:1 → delivery_requests

products
  ├── N:M → cart (through cart table)
  ├── N:M → wishlist (through wishlist table)
  ├── 1:N → order_items
  └── 1:N → product_reviews
```

---

## 🔐 Query Examples

### Get User's Cart with Product Details
```sql
SELECT c.id, c.quantity, p.id, p.name, p.price, p.discount, p.image_url
FROM cart c
JOIN products p ON c.product_id = p.id
WHERE c.user_id = ?
ORDER BY c.created_at DESC;
```

### Get User's Order History with Item Count
```sql
SELECT o.id, o.total_amount, o.status, o.created_at, COUNT(oi.id) as item_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.user_id = ?
GROUP BY o.id
ORDER BY o.created_at DESC;
```

### Get Top Selling Products
```sql
SELECT p.id, p.name, p.price, SUM(oi.quantity) as total_sold, SUM(oi.quantity * oi.price) as revenue
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id
ORDER BY total_sold DESC
LIMIT 10;
```

### Get Average Product Rating
```sql
SELECT p.id, p.name, AVG(pr.rating) as avg_rating, COUNT(pr.id) as review_count
FROM products p
LEFT JOIN product_reviews pr ON p.id = pr.product_id
GROUP BY p.id
ORDER BY avg_rating DESC;
```

---

## ✅ Best Practices

### API Response Format
All API responses follow consistent format:
```json
{
  "success": true|false,
  "message": "Human readable message",
  "data": {...}
}
```

### Error Responses
```json
{
  "success": false,
  "message": "Error description",
  "errorCode": "ERROR_CODE"
}
```

### Pagination
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### Date Format
All dates are in ISO 8601 format: `YYYY-MM-DDTHH:MM:SSZ`

### Currency
All prices in cents (e.g., 10000 = 100.00 KES)

---

**Documentation Version**: 1.0  
**Last Updated**: February 2, 2026
