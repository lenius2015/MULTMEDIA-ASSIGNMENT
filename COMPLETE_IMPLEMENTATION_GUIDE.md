# 🚀 COMPLETE E-COMMERCE WEB APPLICATION - SETUP & IMPLEMENTATION GUIDE

## Project Overview
**OMUNJU SHOPPERS** - A production-ready, full-stack e-commerce web application with complete admin panel.

### Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+), EJS Templates
- **Backend**: Node.js + Express.js
- **Database**: MySQL/MariaDB
- **Authentication**: JWT + Session-based
- **Security**: bcryptjs, helmet, cors, rate-limiting
- **Real-time**: Socket.io
- **File Upload**: Multer
- **Environment**: dotenv

---

## 📁 PROJECT STRUCTURE

```
MULTMEDIA-ASSIGNMENT-main/
├── .env                           # Environment variables
├── server.js                      # Main server entry point
├── config.js                      # Configuration
├── db.js                          # Database connection
├── config/
│   └── security.js                # Security middleware config
├── controllers/
│   └── adminAuth.controller.js    # Admin auth logic
├── middleware/
│   ├── auth.js                    # User auth middleware
│   └── adminAuth.js               # Admin auth middleware
├── routes/
│   ├── auth.js                    # User auth routes
│   ├── adminAuth.routes.js        # Admin login routes
│   ├── adminDashboard.routes.js   # Admin panel routes
│   ├── products.js                # Product routes
│   ├── cart.js                    # Shopping cart routes
│   ├── orders.js                  # Order routes
│   ├── profile.js                 # User profile routes
│   ├── notifications.js           # Notification routes
│   ├── wishlist.js                # Wishlist routes
│   ├── reviews.js                 # Product reviews
│   ├── delivery.js                # Delivery tracking
│   ├── contact.js                 # Contact form
│   └── [other-routes].js          # Additional routes
├── views/
│   ├── index.ejs                  # Home page
│   ├── login.ejs                  # User login
│   ├── signup.ejs                 # User registration
│   ├── dashboard.ejs              # User dashboard
│   ├── profile.ejs                # User profile
│   ├── product.ejs                # Product detail
│   ├── products.ejs               # Product listing
│   ├── cart.ejs                   # Shopping cart
│   ├── checkout.ejs               # Checkout page
│   ├── order-confirmation.ejs     # Order confirmation
│   ├── orders.ejs                 # Order history
│   ├── wishlist.ejs               # Wishlist page
│   ├── notifications.ejs          # Notifications
│   ├── admin/
│   │   ├── login.ejs              # Admin login
│   │   ├── dashboard.ejs          # Admin dashboard
│   │   ├── products.ejs           # Product management
│   │   ├── categories.ejs         # Category management
│   │   ├── orders.ejs             # Order management
│   │   ├── customers.ejs          # Customer management
│   │   ├── messages-dashboard.ejs # Message management
│   │   ├── notifications.ejs      # Notification settings
│   │   ├── analytics.ejs          # Analytics
│   │   └── [other-admin-pages].ejs
│   └── partials/
│       ├── header.ejs
│       ├── footer.ejs
│       ├── sidebar.ejs
│       └── [other-components].ejs
├── public/
│   ├── style.css                  # Main stylesheet
│   ├── admin.css                  # Admin panel styles
│   ├── script.js                  # Main JavaScript
│   ├── admin.js                   # Admin functionality
│   ├── images/                    # Image assets
│   ├── uploads/                   # User uploads (products, profiles)
│   └── [other-assets]/
├── utils/
│   ├── logger.js                  # Logging utility
│   ├── emailService.js            # Email functionality
│   ├── validators.js              # Input validation
│   └── [other-utilities]/
├── db_init.sql                    # Database schema
├── package.json                   # Dependencies
└── README.md                      # Documentation
```

---

## 🛠️ INSTALLATION & SETUP

### 1. Prerequisites
- Node.js v14+ installed
- MySQL 5.7+ or MariaDB installed
- npm or yarn package manager
- Git (optional)

### 2. Step-by-Step Setup

#### A. Clone/Extract Project
```bash
# Navigate to project directory
cd MULTMEDIA-ASSIGNMENT-main
```

#### B. Install Dependencies
```bash
npm install
```

#### C. Database Setup

1. **Create Database** - Open MySQL CLI:
```bash
mysql -u root -p
```

2. **Create Database & Run Schema**:
```sql
CREATE DATABASE IF NOT EXISTS ecommerce;
USE ecommerce;
```

3. **Run all SQL files** (execute in order):
```bash
mysql -u root -p ecommerce < db_init.sql
mysql -u root -p ecommerce < db_chat_init.sql
mysql -u root -p ecommerce < db_auction_init.sql
mysql -u root -p ecommerce < db_delivery_init.sql
```

#### D. Configure Environment Variables

Edit `.env` file:
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=ecommerce

# Server
PORT=3000
NODE_ENV=development

# Security
SESSION_SECRET=your-secret-key-change-in-production
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_EXPIRE=7d

# Admin
ADMIN_DEFAULT_EMAIL=admin@ecommerce.com
ADMIN_DEFAULT_PASSWORD=Admin@123

# Payment
PAYMENT_CURRENCY=KES
PAYMENT_TAX_RATE=0.16
```

#### E. Seed Initial Data (Optional)
```bash
node seed_categories.js
node seed_messages.js
node seed_notifications.js
node seed_orders.js
```

#### F. Start Server
```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

Server runs on: **http://localhost:3000**

---

## 👤 USER FEATURES

### Authentication Flow
1. **Registration** (`/signup`)
   - Email, password, name, phone
   - Password hashing with bcryptjs
   - Email uniqueness validation
   - Auto-login after registration

2. **Login** (`/login`)
   - Email/password authentication
   - Session-based authentication
   - "Remember me" functionality
   - Social login (Google, Facebook, Microsoft)

3. **Password Reset** (`/auth/forgot-password`)
   - Email verification
   - Reset link generation
   - New password setup

### User Dashboard (`/dashboard`)
- Quick stats: cart items, wishlist, orders
- Recent orders
- Quick action buttons
- Profile shortcuts

### Profile Management (`/profile`)
- View/edit personal information
- Change password
- Profile picture upload
- Address management
- Notification preferences

### Product Browsing
- **Home Page** (`/`)
  - Featured products
  - New arrivals
  - Promotions
  - Category navigation

- **Product Listing** (`/products`)
  - Grid/list view toggle
  - Search functionality
  - Multi-filter (category, price, discount, rating)
  - Sort options (name, price, newest, rating)
  - Pagination

- **Product Detail** (`/products/:id`)
  - Product images gallery
  - Description & specifications
  - Price & discount info
  - Stock status
  - Customer reviews & ratings
  - Related products
  - Add to cart/wishlist buttons

### Shopping Cart (`/cart`)
- View all cart items
- Quantity adjustment
- Item removal
- Cart total calculation (subtotal, tax, discount)
- Continue shopping button
- Proceed to checkout button
- Empty cart functionality
- Persistent storage (localStorage + database)

### Wishlist (`/wishlist`)
- Add/remove products
- View saved items
- Move to cart functionality
- Share wishlist (optional)
- Clear wishlist

### Checkout (`/checkout`)
1. **Cart Review**
   - Items verification
   - Quantity confirmation

2. **Shipping Information**
   - Address entry
   - Delivery method selection (Standard/Express)
   - Delivery date preference

3. **Payment Method**
   - Mobile Money (simulated)
   - Card payment (simulated)
   - Payment processing

4. **Order Confirmation**
   - Order number
   - Invoice download
   - Email confirmation
   - Tracking info

### Order Management (`/orders`)
- Order history listing
- Order detail view
- Order status tracking
- Invoice download (PDF)
- Reorder functionality
- Review submission

### Notifications
- Real-time notifications (Socket.io)
- Email notifications
- In-app notification center
- Notification preferences
- Mark as read/unread

### Wishlist Features
- Add/remove items
- Move to cart
- Share wishlist
- Clear list

### Reviews & Ratings
- Submit product reviews
- Rate products (1-5 stars)
- Upload review images
- View other reviews
- Helpful vote system

---

## 🔧 ADMIN PANEL FEATURES

### Admin Access
- **URL**: `/admin/login` or `/admin`
- **Default Credentials**:
  - Email: `admin@ecommerce.com`
  - Password: `Admin@123` (change immediately in production)

### 1. Dashboard (`/admin/dashboard`)
**Statistics Cards**:
- Total Users
- Total Products
- Total Orders
- Total Revenue
- Active Orders
- New Messages

**Charts & Analytics**:
- Daily/Weekly/Monthly sales graph
- Order status pie chart
- Top selling products
- Customer growth trends

**Quick Actions**:
- View recent orders
- View recent messages
- Quick product add
- View latest customers

### 2. Product Management (`/admin/products`)

**Features**:
- ✅ Add product
  - Name, description, price
  - Category selection
  - Discount settings
  - Stock quantity
  - Image upload (multiple)
  - SEO fields

- ✅ Edit product
  - Modify all fields
  - Update images
  - Change status

- ✅ Delete product
  - Soft delete option
  - Hard delete

- ✅ Bulk actions
  - Bulk discount application
  - Bulk delete
  - Bulk category update

**Filters & Search**:
- Search by name/SKU
- Filter by category
- Filter by stock status
- Sort by price/name/date

### 3. Category Management (`/admin/categories`)
- Create categories
- Edit categories
- Delete categories
- Organize hierarchy
- Upload category images

### 4. Order Management (`/admin/orders`)

**Order Listing**:
- All orders with status
- Search by order ID/customer
- Filter by status (Pending, Processing, Shipped, Delivered, Cancelled)
- Sort by date/amount

**Order Details**:
- Customer information
- Order items breakdown
- Shipping address
- Payment method
- Order timeline

**Status Management**:
- Update order status
- Add order notes
- Generate invoice
- Send customer notification

**Actions**:
- Refund order (mark as cancelled)
- Print order
- Download invoice
- Send shipment notification

### 5. Customer Management (`/admin/customers`)

**Customer List**:
- All users listing
- Search by name/email
- Sort by signup date/last purchase

**Customer Details**:
- Account information
- Purchase history
- Total spent
- Last login
- Contact information

**Actions**:
- View customer profile
- Edit customer details
- Block/Unblock account
- Delete account
- View order history
- Send message

### 6. Message Management (`/admin/messages`)

**Contact Messages**:
- All contact form submissions
- Search by name/email
- Filter by status (New, Replied, Closed)

**View Message**:
- Full message content
- Customer details
- Attachment preview
- Reply interface

**Actions**:
- Mark as read/unread
- Reply to message
- Mark as resolved/closed
- Delete message
- Export messages

### 7. Notification System (`/admin/notifications`)

**Send Notifications**:
- Target audience selection (all users, specific user, role-based)
- Notification type (promotional, order, system)
- Message content
- Scheduled sending

**Notification History**:
- Sent notifications listing
- Delivery status
- Open rate statistics

### 8. Analytics & Reporting (`/admin/analytics`)

**Sales Analytics**:
- Daily/Weekly/Monthly sales
- Revenue trend
- Orders trend
- Average order value

**Customer Analytics**:
- New customers count
- Customer retention rate
- Most active customers
- Geographic distribution

**Product Analytics**:
- Top selling products
- Low stock alerts
- Inventory value

**Reports**:
- Generate custom reports
- Export to CSV/PDF
- Date range filtering

### 9. Admin Settings (`/admin/settings`)

**General Settings**:
- Store name/description
- Contact information
- Business hours
- Tax configuration

**Payment Settings**:
- Payment methods configuration
- Tax rates
- Shipping costs

**Email Settings**:
- SMTP configuration
- Email templates
- Notification settings

**Security Settings**:
- Password policy
- Session timeout
- IP whitelist
- API keys management

### 10. Admin Users Management (`/admin/admin-users`)

**Admin List**:
- All admin accounts
- Admin roles
- Last login info
- Activity status

**Add Admin**:
- Email
- Password
- Role assignment
- Permissions

**Edit Admin**:
- Update details
- Change password
- Modify permissions
- Deactivate account

---

## 🔐 SECURITY FEATURES

### Authentication & Authorization
- ✅ JWT tokens for API authentication
- ✅ Session-based authentication for web
- ✅ Role-based access control (User/Admin)
- ✅ Protected routes middleware
- ✅ Secure password hashing (bcryptjs)

### Data Protection
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (input sanitization)
- ✅ CSRF protection (token validation)
- ✅ Rate limiting on auth endpoints
- ✅ Request size limiting

### Security Headers
- ✅ Content Security Policy (CSP)
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options
- ✅ Strict-Transport-Security (HTTPS)

### Middleware Stack
```javascript
1. Security Headers (Helmet)
2. CORS Configuration
3. Request Compression
4. Request Size Limits
5. SQL Injection Prevention
6. Data Sanitization
7. Rate Limiting
8. Body Parsing
9. Session Management
10. Authentication Check
```

---

## 📊 DATABASE SCHEMA

### Core Tables
- **users** - User accounts
- **admins** - Admin accounts (separate)
- **products** - Product catalog
- **categories** - Product categories
- **cart** - User shopping carts
- **cart_items** - Items in cart
- **orders** - User orders
- **order_items** - Items in orders
- **wishlist** - Saved products
- **notifications** - System notifications

### Additional Tables
- **invoices** - Generated invoices
- **delivery_requests** - Delivery tracking
- **product_reviews** - Customer reviews
- **contact_messages** - Contact form submissions
- **inbox_messages** - Private messages
- **user_onboarding** - Onboarding status
- **delivery_agents** - Delivery personnel

---

## 🔌 API ENDPOINTS

### Authentication
```
POST   /api/auth/register          - User registration
POST   /api/auth/login             - User login
POST   /api/auth/logout            - User logout
POST   /api/auth/forgot-password   - Request password reset
POST   /api/auth/reset-password    - Reset password
GET    /api/auth/status            - Check auth status
```

### Products
```
GET    /api/products               - Get all products
GET    /api/products/:id           - Get product details
GET    /api/products/search        - Search products
GET    /api/products/category/:id  - Get by category
POST   /api/products/filter        - Filter products
```

### Shopping Cart
```
GET    /api/cart                   - Get cart items
POST   /api/cart                   - Add to cart
PUT    /api/cart/:id               - Update cart item
DELETE /api/cart/:id               - Remove from cart
DELETE /api/cart                   - Clear cart
GET    /api/cart/count             - Get cart count
```

### Orders
```
POST   /api/orders                 - Create order
GET    /api/orders                 - Get user orders
GET    /api/orders/:id             - Get order details
PUT    /api/orders/:id             - Update order
GET    /api/orders/:id/invoice     - Download invoice
```

### User Profile
```
GET    /api/profile                - Get profile
PUT    /api/profile                - Update profile
POST   /api/profile/picture        - Upload profile picture
POST   /api/profile/change-password - Change password
```

### Wishlist
```
GET    /api/wishlist               - Get wishlist
POST   /api/wishlist               - Add to wishlist
DELETE /api/wishlist/:productId    - Remove from wishlist
POST   /api/wishlist/:productId/move-to-cart
```

### Admin Routes (Protected)
```
GET    /admin/dashboard            - Dashboard
GET    /admin/products             - Product management
POST   /admin/products             - Add product
PUT    /admin/products/:id         - Edit product
DELETE /admin/products/:id         - Delete product
GET    /admin/orders               - Order management
PUT    /admin/orders/:id/status    - Update order status
GET    /admin/customers            - Customer list
GET    /admin/messages             - Message inbox
```

---

## 🎨 FRONTEND PAGES

### User Pages
1. **Home** (`/`) - Featured products, promotions
2. **Products** (`/products`) - Full product catalog
3. **Product Detail** (`/products/:id`) - Product info, reviews
4. **Search Results** (`/search`) - Search results
5. **Login** (`/login`) - User authentication
6. **Register** (`/signup`) - New user registration
7. **Dashboard** (`/dashboard`) - User home
8. **Profile** (`/profile`) - User profile management
9. **Cart** (`/cart`) - Shopping cart page
10. **Checkout** (`/checkout`) - Order placement
11. **Order Confirmation** (`/order-confirmation`) - Order placed
12. **Orders** (`/orders`) - Order history
13. **Order Details** (`/orders/:id`) - Single order view
14. **Wishlist** (`/wishlist`) - Saved products
15. **Notifications** (`/notifications`) - User notifications
16. **Contact** (`/contact`) - Contact form

### Admin Pages
1. **Admin Login** (`/admin/login`) - Admin authentication
2. **Dashboard** (`/admin/dashboard`) - Main dashboard
3. **Products** (`/admin/products`) - Product management
4. **Categories** (`/admin/categories`) - Category management
5. **Orders** (`/admin/orders`) - Order management
6. **Customers** (`/admin/customers`) - Customer management
7. **Messages** (`/admin/messages`) - Contact messages
8. **Notifications** (`/admin/notifications`) - Notification settings
9. **Analytics** (`/admin/analytics`) - Reports & analytics
10. **Settings** (`/admin/settings`) - Admin settings
11. **Admin Users** (`/admin/admin-users`) - Admin account management

---

## 🚀 RUNNING THE APPLICATION

### Development Mode
```bash
npm run dev
```
Runs with **nodemon** - auto-restarts on file changes.

### Production Mode
```bash
npm start
```
Standard Node.js server startup.

### Test APIs
```bash
node test-api-endpoint.js
node test-cart-functionality.html
node test-messaging-routes.js
```

---

## 📋 CHECKLIST - WHAT'S WORKING

### ✅ Core Features Implemented
- [x] User registration & login
- [x] Admin authentication (separate system)
- [x] Product catalog & search
- [x] Shopping cart system
- [x] Order management
- [x] User profiles
- [x] Wishlist functionality
- [x] Admin dashboard with statistics
- [x] Product management (CRUD)
- [x] Order status management
- [x] Customer management
- [x] Message/Contact system
- [x] Notifications
- [x] Invoice generation
- [x] Delivery tracking
- [x] Product reviews
- [x] Real-time chat (Socket.io ready)

### ✅ Security Features
- [x] JWT authentication
- [x] Password hashing (bcryptjs)
- [x] Role-based access control
- [x] SQL injection prevention
- [x] XSS prevention
- [x] CSRF tokens
- [x] Rate limiting
- [x] Security headers
- [x] Secure session management

### ✅ Database Features
- [x] MySQL schema with relationships
- [x] Foreign key constraints
- [x] Proper indexing
- [x] Timestamp tracking
- [x] Status enums
- [x] Cascading deletes

### ✅ Frontend Features
- [x] Responsive design
- [x] Modern UI components
- [x] Real-time updates (Socket.io)
- [x] Form validation
- [x] Error handling
- [x] Loading states
- [x] Modal dialogs
- [x] Pagination
- [x] Filters & search

### ✅ API Features
- [x] RESTful endpoints
- [x] JSON responses
- [x] Error handling
- [x] Input validation
- [x] Pagination
- [x] Filtering & sorting
- [x] Authentication middleware
- [x] Authorization middleware

---

## 🔧 TROUBLESHOOTING

### Issue: Port 3000 already in use
**Solution**: Change PORT in `.env` or kill the process:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

### Issue: Database connection failed
**Solution**: Check `.env` database credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=ecommerce
```

### Issue: Admin login fails
**Solution**: Create admin user manually:
```sql
INSERT INTO users (name, email, password, role) 
VALUES ('Admin', 'admin@ecommerce.com', 'hashed_password', 'admin');
```

### Issue: File upload not working
**Solution**: Ensure `/public/uploads` directory exists and is writable:
```bash
mkdir -p public/uploads
chmod 755 public/uploads
```

### Issue: Socket.io not connecting
**Solution**: Check if Socket.io is enabled in `.env`:
```env
ENABLE_SOCKET=true
```

---

## 📝 TESTING THE APPLICATION

### 1. User Registration & Login
1. Navigate to `/signup`
2. Enter name, email, password
3. Submit form
4. Should redirect to dashboard

### 2. Browse Products
1. Go to `/products`
2. Use filters (category, price)
3. Click on product for details

### 3. Shopping Cart
1. Click "Add to Cart" on any product
2. View cart at `/cart`
3. Adjust quantities
4. Verify totals

### 4. Checkout & Order
1. Click "Checkout"
2. Enter shipping address
3. Select payment method
4. Place order
5. Download invoice

### 5. Admin Features
1. Login at `/admin/login` (email: admin@ecommerce.com)
2. View dashboard statistics
3. Add/edit/delete products
4. Manage orders
5. View customer list

---

## 🎓 KEY LEARNINGS & BEST PRACTICES

### Code Organization
- Separated admin and user authentication
- MVC architecture for maintainability
- Reusable middleware components
- Consistent error handling

### Security
- Never store passwords in plain text
- Always validate user input
- Use HTTPS in production
- Implement rate limiting
- Sanitize database queries

### Performance
- Database indexing on frequently queried fields
- Pagination for large datasets
- Caching for static assets
- Compression middleware
- Optimized SQL queries

### Scalability
- Separated admin and user tables
- Proper foreign key relationships
- Transaction support for critical operations
- Async/await for non-blocking operations

---

## 📞 SUPPORT & DOCUMENTATION

### Additional Resources
- Express.js Docs: https://expressjs.com
- MySQL Docs: https://dev.mysql.com
- Socket.io Docs: https://socket.io
- EJS Docs: https://ejs.co

### File Upload Support
- Max file size: 10MB (configurable in `.env`)
- Allowed types: jpg, jpeg, png, gif
- Upload directory: `/public/uploads`

### Email Configuration (Optional)
To enable email notifications, configure SMTP in `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## 🎉 DEPLOYMENT CHECKLIST

### Before Production
- [ ] Change all default passwords
- [ ] Update `.env` with production values
- [ ] Enable HTTPS
- [ ] Configure email service
- [ ] Set up backup system
- [ ] Enable logging
- [ ] Test all critical flows
- [ ] Set up monitoring
- [ ] Create admin accounts
- [ ] Review security settings

### Production Environment Variables
```env
NODE_ENV=production
PORT=3000
DB_HOST=production-db-server
DB_USER=prod_user
DB_PASSWORD=secure_password
SESSION_SECRET=long-random-string
JWT_SECRET=another-long-random-string
```

---

**Version**: 1.0.0  
**Last Updated**: February 2, 2026  
**Status**: Production Ready ✅
