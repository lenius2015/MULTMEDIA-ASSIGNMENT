# ShopHub System Architecture Diagram

## High-Level System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WEB BROWSER (Client)                         │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                   React Frontend (Port 3000)                │  │
│  │                                                             │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │ HomePage     │  │ ProductsPage │  │ OrdersPage      │  │  │
│  │  │ LoginPage    │  │ CartPage     │  │ ProfilePage     │  │  │
│  │  │ RegisterPage │  │              │  │                 │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │  │
│  │         ↓                  ↓                    ↓             │  │
│  │  ┌─────────────────────────────────────────────────────┐   │  │
│  │  │            React Router (Navigation)                │   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  │         ↓                                                    │  │
│  │  ┌─────────────────────────────────────────────────────┐   │  │
│  │  │         useAuth Hook (Authentication State)        │   │  │
│  │  │  • user, loading, error, isAuthenticated           │   │  │
│  │  │  • register, login, logout, updateProfile          │   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  │         ↓                                                    │  │
│  │  ┌─────────────────────────────────────────────────────┐   │  │
│  │  │       axios API Client (with Interceptors)         │   │  │
│  │  │  • Auto-attach Bearer token                        │   │  │
│  │  │  • Handle 401 → Redirect to login                  │   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────┬──────────────────────────────────────────────────┘
                  │
                  │ HTTP/REST Requests
                  │ (JSON over HTTPS)
                  │
                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│              Express Backend Server (Port 5000)                    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │         Express App Setup & Security Middleware            │  │
│  │                                                             │  │
│  │  • Helmet (security headers)                               │  │
│  │  • CORS (cross-origin requests)                            │  │
│  │  • Body Parser (JSON requests)                             │  │
│  │  • Compression (response gzip)                             │  │
│  │  • Request Logger (activity tracking)                      │  │
│  └─────────────────────────────────────────────────────────────┘  │
│         ↓                                                           │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    API Routes (16 endpoints)               │  │
│  │                                                             │  │
│  │  /api/auth/*          → AuthController                     │  │
│  │  /api/products/*      → ProductController                  │  │
│  │  /api/orders/*        → OrderController                    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│         ↓                                                           │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    Middleware Pipeline                      │  │
│  │                                                             │  │
│  │  1. authMiddleware      (JWT verification)                 │  │
│  │  2. roleMiddleware      (Permission checking)              │  │
│  │  3. validateBody        (Request validation)               │  │
│  │  4. validatePagination  (Pagination limits)                │  │
│  └─────────────────────────────────────────────────────────────┘  │
│         ↓                                                           │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Controllers (Request Handlers)                │  │
│  │                                                             │  │
│  │  • AuthController    → 5 endpoints                         │  │
│  │  • ProductController → 7 endpoints                         │  │
│  │  • OrderController   → 4 endpoints                         │  │
│  │                                                             │  │
│  │  All wrapped with asyncHandler for error catching          │  │
│  └─────────────────────────────────────────────────────────────┘  │
│         ↓                                                           │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │            Services (Business Logic Layer)                 │  │
│  │                                                             │  │
│  │  • AuthService      → Register, Login, Profile             │  │
│  │  • ProductService   → Catalog, Filtering, Search           │  │
│  │  • OrderService     → Checkout, Tracking, Status           │  │
│  │                                                             │  │
│  │  Validation, Formatting, Error Handling                    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│         ↓                                                           │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │             Models (Data Access Layer)                     │  │
│  │                                                             │  │
│  │  • User.js          → CRUD + Authentication                │  │
│  │  • Product.js       → CRUD + Filtering + Stock             │  │
│  │  • Order.js         → CRUD + Transactions                  │  │
│  │                                                             │  │
│  │  All queries parameterized (SQL injection safe)            │  │
│  └─────────────────────────────────────────────────────────────┘  │
│         ↓                                                           │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │            Utilities & Exceptions                          │  │
│  │                                                             │  │
│  │  • validators.js     → Input validation                    │  │
│  │  • jwt.js            → Token operations                    │  │
│  │  • response.js       → Response formatting                 │  │
│  │  • logger.js         → Activity logging                    │  │
│  │  • AppError.js       → Custom exceptions                   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│         ↓                                                           │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │         Error Handler Middleware (Last Middleware)         │  │
│  │                                                             │  │
│  │  • Catches all errors                                      │  │
│  │  • Logs to file with context                               │  │
│  │  • Formats error response                                  │  │
│  │  • Returns to client                                       │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────┬──────────────────────────────────────────────────┘
                  │
                  │ SQL Queries
                  │ (Parameterized)
                  │
                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    MySQL Database (Port 3306)                      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │           Connection Pool (10 connections max)             │  │
│  │                                                             │  │
│  │  • Keep-alive enabled                                      │  │
│  │  • Automatic connection recycling                          │  │
│  │  • Connection queue if all busy                            │  │
│  └─────────────────────────────────────────────────────────────┘  │
│         ↓                                                           │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    Database Tables                         │  │
│  │                                                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ users (8 cols)                                      │  │  │
│  │  │ ├─ id, email, password, name, phone                │  │  │
│  │  │ ├─ address, city, country                           │  │  │
│  │  │ └─ role, is_active, timestamps                      │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ products (12 cols)                                  │  │  │
│  │  │ ├─ id, name, description, price, stock             │  │  │
│  │  │ ├─ category, image_url, vendor_id                  │  │  │
│  │  │ ├─ discount, sku, is_active                        │  │  │
│  │  │ └─ timestamps                                      │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ orders (9 cols)                                     │  │  │
│  │  │ ├─ id, user_id, total_amount, status               │  │  │
│  │  │ ├─ shipping_address, payment_method                │  │  │
│  │  │ ├─ payment_status, timestamps                      │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ order_items (5 cols)                               │  │  │
│  │  │ ├─ id, order_id, product_id, quantity             │  │  │
│  │  │ ├─ price, timestamp                               │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ categories, reviews, payments, activity_logs       │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│         ↓                                                           │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    Database Indexes                        │  │
│  │                                                             │  │
│  │  • users.email             (fast login)                    │  │
│  │  • products.category       (fast filtering)                │  │
│  │  • products.vendor_id      (vendor products)               │  │
│  │  • orders.user_id          (order history)                 │  │
│  │  • orders.status           (order filtering)               │  │
│  │  • order_items.order_id    (order items)                   │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

```

---

## Request Flow Diagram

### Authentication Flow (Register/Login)

```
User Input
    ↓
[RegisterPage / LoginPage Component]
    ↓
useAuth Hook Method (register/login)
    ↓
axios POST request
    ↓
[Request Interceptor: Add Bearer token]
    ↓
/api/auth/register or /api/auth/login
    ↓
Route → AuthController
    ↓
asyncHandler wrapper
    ↓
AuthController.register or .login
    ↓
AuthService.register or .login
    ↓
User.findByEmail / User.create / User.verifyPassword
    ↓
Database Query
    ↓
Service: Generate JWT tokens
    ↓
Response: {user, accessToken, refreshToken}
    ↓
[Response Interceptor: Store in localStorage]
    ↓
useAuth Hook updates state
    ↓
Component re-renders with user data
```

---

### Product Listing Flow (with Filters)

```
User: Browse Products & Set Filters
    ↓
ProductsPage: setFilters({category, search, minPrice, maxPrice})
    ↓
useEffect: onChange filters/page
    ↓
productAPI.getAll(filters, page, limit)
    ↓
axios GET /api/products?category=...&search=...&minPrice=...&maxPrice=...&page=1&limit=10
    ↓
[Request Interceptor: Add token if auth'd]
    ↓
Route → ProductController.getAll
    ↓
asyncHandler wrapper
    ↓
validatePagination Middleware
    ↓
ProductController.getAll
    ↓
ProductService.getProducts(filters, pagination)
    ↓
Product.findAll(filters, pagination)
    ↓
Database: SELECT * FROM products WHERE category = ? AND name LIKE ? AND price BETWEEN ? AND ? LIMIT ? OFFSET ?
    ↓
Parameterized query executes
    ↓
Return results + total count
    ↓
Service: Format products
    ↓
Response: {data: [...products], pagination: {page, limit, total, hasNextPage, hasPrevPage}}
    ↓
Frontend: sendPaginated() formats response
    ↓
ProductsPage: Update state with products
    ↓
Component: Re-render ProductCard components
    ↓
User sees filtered product list with pagination
```

---

### Order Creation Flow (Checkout)

```
User: Submit Order with Items
    ↓
OrderPage / CartPage Component
    ↓
POST /api/orders
Body: {items: [{productId, quantity}], shippingAddress, paymentMethod}
    ↓
[Request Interceptor: Add Authorization Bearer token]
    ↓
Route → authMiddleware (check token)
    ↓
authMiddleware: Extract user from token → req.user
    ↓
Route → validateBody Middleware
    ↓
validateBody: Check required fields, sanitize input
    ↓
Route → OrderController.create
    ↓
asyncHandler wrapper
    ↓
OrderController.create(req.user.id, req.body)
    ↓
OrderService.createOrder(userId, data)
    ↓
Validate items non-empty
    ↓
Loop each item:
    ├─ Product.checkStock(productId, quantity)
    ├─ If stock < quantity → ValidationError
    └─ Calculate totalAmount
    ↓
Database: BEGIN TRANSACTION
    ↓
Order.create(orderData)
    ├─ INSERT INTO orders (user_id, total_amount, status, shipping_address, payment_method)
    ↓
Loop each item:
    ├─ INSERT INTO order_items (order_id, product_id, quantity, price)
    ├─ UPDATE products SET stock = stock - quantity WHERE id = product_id
    ↓
Database: COMMIT TRANSACTION
    ↓
Service: Format order with items
    ↓
Response: {orderId, totalAmount, status: 'pending', items: [...]}
    ↓
Frontend: Store order ID, navigate to payment
    ↓
User sees order confirmation
    ↓
Ready for payment processing
```

---

## Data Flow Diagram

### Single Product View

```
┌──────────────────┐
│  Frontend State  │
│  product: null   │
│  loading: true   │
└──────────────────┘
        ↓ setState
┌──────────────────────────────────────────────────┐
│ useEffect(() => {                                │
│   productAPI.getOne(productId)                   │
│ }, [productId])                                  │
└──────────────────────────────────────────────────┘
        ↓ axios GET
┌──────────────────────────────────────────────────┐
│ /api/products/1                                  │
└──────────────────────────────────────────────────┘
        ↓ Express Route
┌──────────────────────────────────────────────────┐
│ ProductController.getOne(req, res)               │
│ ├─ productId = req.params.id                    │
│ ├─ ProductService.getProduct(productId)         │
└──────────────────────────────────────────────────┘
        ↓ Service
┌──────────────────────────────────────────────────┐
│ ProductService.getProduct(1)                     │
│ ├─ Product.findById(1)                          │
│ ├─ formatProduct(result)                        │
│ └─ return {id, name, price, ...vendor info}    │
└──────────────────────────────────────────────────┘
        ↓ Model
┌──────────────────────────────────────────────────┐
│ SELECT p.*, u.name as vendor_name               │
│ FROM products p                                 │
│ LEFT JOIN users u ON p.vendor_id = u.id        │
│ WHERE p.id = 1 AND p.is_active = 1              │
└──────────────────────────────────────────────────┘
        ↓ Database
┌──────────────────────────────────────────────────┐
│ MySQL Response:                                 │
│ {                                               │
│   id: 1,                                        │
│   name: "Smartphone",                           │
│   price: 299.99,                                │
│   stock: 50,                                    │
│   vendor_name: "TechVendor",                    │
│   ...                                           │
│ }                                               │
└──────────────────────────────────────────────────┘
        ↓ Response
┌──────────────────────────────────────────────────┐
│ {                                               │
│   success: true,                                │
│   message: "Product retrieved",                 │
│   data: {                                       │
│     id: 1,                                      │
│     name: "Smartphone",                         │
│     price: 299.99,                              │
│     vendor: {name: "TechVendor", ...}           │
│   }                                             │
│ }                                               │
└──────────────────────────────────────────────────┘
        ↓ Frontend
┌──────────────────────────────────────────────────┐
│ setProduct(data)                                │
│ setLoading(false)                               │
└──────────────────────────────────────────────────┘
        ↓ Re-render
┌──────────────────────────────────────────────────┐
│ <ProductCard product={product} />               │
│ Display:                                        │
│ ├─ Image                                        │
│ ├─ Name: Smartphone                             │
│ ├─ Price: $299.99                               │
│ ├─ Stock: 50 available                          │
│ ├─ Vendor: TechVendor                           │
│ └─ Buttons: [Add to Cart] [Buy Now]            │
└──────────────────────────────────────────────────┘
```

---

## Error Handling Flow

```
Service throws AppError:
    ↓
┌──────────────────────────────────────────┐
│ throw new NotFoundError('Product')       │
│ • statusCode: 404                        │
│ • code: 'NOT_FOUND'                      │
│ • message: 'Product not found'           │
└──────────────────────────────────────────┘
    ↓
Controller asyncHandler catches:
    ↓
┌──────────────────────────────────────────┐
│ asyncHandler(async (req, res, next) => {│
│   try {                                  │
│     await service.operation()            │
│   } catch(error) {                       │
│     next(error) // Pass to error handler│
│   }                                      │
│ })                                       │
└──────────────────────────────────────────┘
    ↓
Error Middleware catches:
    ↓
┌──────────────────────────────────────────┐
│ errorHandler(err, req, res, next) {     │
│   logger.error(err.message, {           │
│     userId: req.user?.id,               │
│     path: req.path,                      │
│     statusCode: err.statusCode           │
│   })                                     │
│                                          │
│   sendError(res, err, statusCode)       │
│ }                                        │
└──────────────────────────────────────────┘
    ↓
Response to Client:
    ↓
┌──────────────────────────────────────────┐
│ {                                        │
│   success: false,                        │
│   message: "Product not found",         │
│   code: "NOT_FOUND",                     │
│   timestamp: "2024-01-01T00:00:00Z"     │
│ }                                        │
│ Status: 404                              │
└──────────────────────────────────────────┘
    ↓
Frontend Interceptor catches 404:
    ↓
┌──────────────────────────────────────────┐
│ if (error.response?.status === 404) {  │
│   showError("Product not found")        │
│ }                                        │
└──────────────────────────────────────────┘
```

---

## Security Layers

```
Client Request
    ↓
┌─────────────────────────────────────┐
│ HTTPS/TLS Transport Security        │
│ (Prevents man-in-middle attacks)   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ CORS Middleware                     │
│ (Validates origin)                  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Helmet Security Headers             │
│ (X-Frame-Options, etc.)             │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Body Parser + Size Limit            │
│ (Prevents large payload attacks)   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Input Sanitization                  │
│ (Remove <, > characters)            │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Input Validation                    │
│ (Email, password, phone format)     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Authentication (JWT)                │
│ (Verify token, extract user)        │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Authorization (Role Checking)       │
│ (user/vendor/admin permissions)     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Parameterized Database Queries      │
│ (SQL injection prevention)          │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Business Logic Validation           │
│ (Stock checks, amount verification) │
└─────────────────────────────────────┘
    ↓
Trusted Database Operation
```

---

## Component Tree

```
App
├── Navigation
│   └── User Menu (Conditional)
│       ├─ [Products]
│       ├─ [Categories]
│       ├─ [Deals]
│       ├─ [Cart] (if auth'd)
│       ├─ [Orders] (if auth'd)
│       ├─ [Profile] (if auth'd)
│       └─ [Logout] (if auth'd)
│
├── Routes
│   │
│   ├── Public Routes
│   │   ├─ HomePage
│   │   │  ├─ HeroSection
│   │   │  ├─ CategoriesGrid
│   │   │  └─ FeaturedProducts
│   │   │      └─ ProductCard[]
│   │   │
│   │   └─ ProductsPage
│   │      ├─ FiltersSidebar
│   │      │  ├─ SearchInput
│   │      │  ├─ CategorySelect
│   │      │  └─ PriceRangeSlider
│   │      ├─ ProductsGrid
│   │      │  └─ ProductCard[]
│   │      └─ Pagination
│   │
│   ├── Auth Routes
│   │   ├─ LoginPage
│   │   │  ├─ EmailInput
│   │   │  ├─ PasswordInput
│   │   │  └─ [Login Button]
│   │   │
│   │   └─ RegisterPage
│   │      ├─ EmailInput
│   │      ├─ FirstNameInput
│   │      ├─ LastNameInput
│   │      ├─ PhoneInput
│   │      ├─ PasswordInput
│   │      └─ [Register Button]
│   │
│   └── Protected Routes
│       ├─ OrdersPage
│       │  ├─ OrdersList
│       │  │  └─ OrderCard[]
│       │  └─ Pagination
│       │
│       ├─ CartPage
│       │  ├─ CartItems
│       │  │  └─ CartItem[]
│       │  ├─ CartSummary
│       │  └─ [Checkout Button]
│       │
│       └─ ProfilePage
│          ├─ ProfileForm
│          ├─ AddressForm
│          └─ [Save Button]
│
└── Footer
    └─ Copyright Text
```

---

## Technology Stack Visualization

```
                Frontend Layer
    ┌───────────────────────────────────┐
    │  React 18 + React Router v6       │
    │  ├─ Components (Functional)       │
    │  ├─ Hooks (useState, useEffect)   │
    │  ├─ Custom Hooks (useAuth)        │
    │  └─ Routing (SPA)                 │
    └───────────────────────────────────┘
                    ↓
    ┌───────────────────────────────────┐
    │  axios HTTP Client                │
    │  ├─ Request Interceptors          │
    │  └─ Response Interceptors         │
    └───────────────────────────────────┘
                    ↓
    ┌───────────────────────────────────┐
    │  CSS3 Styling                     │
    │  ├─ CSS Variables (Theming)       │
    │  ├─ Flexbox & Grid               │
    │  └─ Responsive (Mobile-First)    │
    └───────────────────────────────────┘
                    ↓
    ┌───────────────────────────────────┐
    │   REST API (JSON over HTTPS)      │
    └───────────────────────────────────┘
                    ↓
                Backend Layer
    ┌───────────────────────────────────┐
    │  Node.js Runtime                  │
    │  Express 5.2.1 Framework          │
    │                                   │
    │  ├─ Security Middleware           │
    │  │  ├─ Helmet                    │
    │  │  ├─ CORS                      │
    │  │  ├─ Body Parser               │
    │  │  └─ Compression               │
    │  │                                │
    │  ├─ Authentication                │
    │  │  ├─ JWT Tokens                │
    │  │  ├─ bcryptjs Hashing          │
    │  │  └─ Role-Based Access         │
    │  │                                │
    │  ├─ Validation                    │
    │  │  ├─ Input Sanitization        │
    │  │  ├─ Format Validation         │
    │  │  └─ Business Rules            │
    │  │                                │
    │  ├─ Logging                       │
    │  │  ├─ File-Based Logs           │
    │  │  ├─ Activity Tracking         │
    │  │  └─ Error Reporting           │
    │  │                                │
    │  └─ Error Handling                │
    │     ├─ Custom Exceptions         │
    │     ├─ Centralized Handler       │
    │     └─ User Messaging            │
    │                                   │
    └───────────────────────────────────┘
                    ↓
    ┌───────────────────────────────────┐
    │  mysql2/promise Driver            │
    │  Connection Pool (10 max)         │
    │  Parameterized Queries            │
    │  Transaction Support             │
    └───────────────────────────────────┘
                    ↓
                Database Layer
    ┌───────────────────────────────────┐
    │  MySQL 8.0+                       │
    │                                   │
    │  Tables:                          │
    │  ├─ users (8 columns)             │
    │  ├─ products (12 columns)         │
    │  ├─ orders (9 columns)            │
    │  ├─ order_items (5 columns)       │
    │  ├─ categories                    │
    │  ├─ reviews                       │
    │  ├─ payment_logs                  │
    │  └─ activity_logs                 │
    │                                   │
    │  Indexes: 8+ indexes              │
    │  Foreign Keys: Referential        │
    │  Constraints: Integrity           │
    └───────────────────────────────────┘
                    ↓
    ┌───────────────────────────────────┐
    │  File System                      │
    │  ├─ logs/ (date-based files)      │
    │  ├─ uploads/ (future)             │
    │  └─ backups/ (future)             │
    └───────────────────────────────────┘
```

---

## Deployment Architecture (Ready)

```
                        End User
                            ↓
    ┌─────────────────────────────────────┐
    │     CDN (Optional)                  │
    │  Serve static assets globally       │
    └─────────────────────────────────────┘
                            ↓
    ┌─────────────────────────────────────┐
    │  Web Server (Nginx/Apache)          │
    │  Reverse Proxy                      │
    │  SSL Termination (HTTPS)            │
    │  Load Balancer Ready                │
    └─────────────────────────────────────┘
                            ↓
    ┌─────────────────────────────────────┐
    │  Application Servers (Node.js)      │
    │  Multiple instances                 │
    │  PM2 Process Manager                │
    │  Auto-restart on failure            │
    └─────────────────────────────────────┘
                            ↓
    ┌─────────────────────────────────────┐
    │  Database Server (MySQL)            │
    │  Read Replicas (Optional)           │
    │  Automated Backups                  │
    │  Replication Ready                  │
    └─────────────────────────────────────┘
                            ↓
    ┌─────────────────────────────────────┐
    │  File Storage                       │
    │  Uploads (S3/MinIO)                 │
    │  Backups (Redundant)                │
    │  Archives                          │
    └─────────────────────────────────────┘
                            ↓
    ┌─────────────────────────────────────┐
    │  Monitoring & Logging               │
    │  Application Logs (ELK Stack)       │
    │  Performance Metrics (Prometheus)   │
    │  Error Tracking (Sentry)            │
    │  Uptime Monitoring                  │
    └─────────────────────────────────────┘
```

---

**Diagram Last Updated**: January 2024
