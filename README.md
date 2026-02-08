# 🛒 OMUNJU SHOPPERS - E-Commerce Web Application

A complete, production-ready full-stack e-commerce platform built with Node.js, Express.js, MySQL, and EJS templates.

## 📊 Project Overview

| Attribute | Value |
|-----------|-------|
| **Version** | 1.0.0 |
| **Status** | ✅ Production Ready |
| **License** | ISC |

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Node.js v14+ 
- MySQL/MariaDB installed and running
- npm or yarn

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Setup database
mysql -u root -p < db_init.sql

# 3. Configure environment
cp .env.example .env
# Edit .env with your database credentials

# 4. Start server
npm run dev

# 5. Open browser
http://localhost:3000
```

### Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ecommerce.com | Admin@123 |
| User | (Register at /signup) | (Your choice) |

---

## ✨ Features

### User Features
- ✅ Guest browsing without account
- ✅ Secure registration and login
- ✅ Product catalog with advanced filtering
- ✅ Search by name, category, price, discounts
- ✅ Shopping cart (login required)
- ✅ Order placement and tracking
- ✅ User profile management
- ✅ Real-time notifications
- ✅ Contact form
- ✅ Chatbot assistant
- ✅ Responsive design

### Admin Panel
- ✅ Dashboard with analytics widgets
- ✅ Product management (CRUD)
- ✅ Category management
- ✅ Order management
- ✅ Customer management
- ✅ Message inbox
- ✅ Notification system
- ✅ Activity logs
- ✅ Invoice generation

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + Express.js |
| Database | MySQL/MariaDB |
| Frontend | HTML5, CSS3, JavaScript ES6+ |
| Templates | EJS |
| Auth | bcryptjs + express-session |
| Security | helmet, cors, rate-limiting |
| Real-time | Socket.io |
| File Upload | Multer |
| Config | dotenv |

---

## 📁 Project Structure

```
MULTMEDIA-ASSIGNMENT-main/
├── server.js                    # Main server entry point
├── config.js                    # Configuration
├── db.js                        # Database connection
├── .env                         # Environment variables
├── package.json                 # Dependencies
│
├── config/
│   └── security.js              # Security middleware config
│
├── controllers/
│   └── adminAuth.controller.js  # Admin authentication logic
│
├── middleware/
│   ├── auth.js                  # User authentication
│   ├── adminAuth.js             # Admin authentication
│   └── adminPermissions.js      # Role-based access control
│
├── routes/
│   ├── auth.js                  # User auth routes
│   ├── adminAuth.routes.js      # Admin login routes
│   ├── adminDashboard.routes.js  # Admin panel routes
│   ├── products.js              # Product routes
│   ├── cart.js                  # Shopping cart routes
│   ├── orders.js                # Order routes
│   ├── profile.js               # User profile routes
│   ├── notifications.js         # Notification routes
│   ├── wishlist.js              # Wishlist routes
│   ├── reviews.js               # Product reviews
│   ├── delivery.js              # Delivery tracking
│   ├── contact.js               # Contact form
│   └── invoices.js              # Invoice routes
│
├── views/
│   ├── index.ejs                # Home page
│   ├── login.ejs                # User login
│   ├── signup.ejs               # User registration
│   ├── dashboard.ejs            # User dashboard
│   ├── profile.ejs              # User profile
│   ├── products.ejs             # Product listing
│   ├── product.ejs              # Product detail
│   ├── cart.ejs                 # Shopping cart
│   ├── checkout.ejs             # Checkout
│   ├── orders.ejs               # Order history
│   ├── wishlist.ejs             # Wishlist
│   ├── notifications.ejs         # Notifications
│   ├── admin/
│   │   ├── login.ejs            # Admin login
│   │   ├── dashboard.ejs       # Admin dashboard
│   │   ├── products.ejs        # Product management
│   │   ├── categories.ejs      # Category management
│   │   ├── orders.ejs          # Order management
│   │   ├── customers.ejs       # Customer management
│   │   ├── messages-dashboard.ejs # Message management
│   │   └── analytics.ejs       # Analytics
│   └── partials/
│       ├── header.ejs
│       ├── footer.ejs
│       └── sidebar.ejs
│
├── public/
│   ├── style.css               # Main styles
│   ├── admin-enhanced.css      # Admin styles
│   ├── script.js               # Main JavaScript
│   ├── admin-enhanced.js       # Admin JavaScript
│   └── images/                 # Static images
│
├── db_init.sql                 # Main database schema
├── db_chat_init.sql            # Chat system schema
├── db_auction_init.sql         # Auction system schema
├── db_delivery_init.sql        # Delivery system schema
└── db_promotions.sql           # Promotions schema
```

---

## 🔐 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/status` | Check auth status |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products (filters) |
| GET | `/api/products/:id` | Get single product |
| GET | `/products` | Product listing page |
| GET | `/products/:id` | Product detail page |

### Shopping Cart
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cart` | Get user's cart |
| POST | `/api/cart/add` | Add item to cart |
| PUT | `/api/cart/update/:productId` | Update quantity |
| DELETE | `/api/cart/remove/:productId` | Remove item |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders/create` | Create new order |
| GET | `/api/orders` | Get user's orders |
| GET | `/api/orders/:id` | Get order details |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/login` | Admin login page |
| POST | `/admin/login` | Admin login submit |
| GET | `/admin/dashboard` | Admin dashboard |
| GET | `/admin/products` | Product management |
| GET | `/admin/orders` | Order management |
| GET | `/admin/customers` | Customer management |
| GET | `/admin/messages` | Message inbox |

---

## 🗄️ Database Schema

### Main Tables
- **users** - User accounts and authentication
- **products** - Product catalog
- **categories** - Product categories
- **cart** - Shopping cart items
- **orders** - Order records
- **order_items** - Order line items
- **wishlist** - User wishlists
- **notifications** - User notifications
- **contact_messages** - Contact form submissions

### Extended Tables
- **conversations** - Chat conversations
- **messages** - Chat messages
- **invoices** - Invoice records
- **delivery_requests** - Delivery tracking
- **promotions** - Promotions and deals
- **activity_logs** - Admin activity logging

---

## 🔒 Security Features

- ✅ Password hashing with bcryptjs
- ✅ Session-based authentication
- ✅ SQL injection prevention (parameterized queries)
- ✅ Input validation (client & server)
- ✅ XSS protection
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Security headers (Helmet)
- ✅ Role-based access control
- ✅ Admin route protection
- ✅ Access logging

---

## 📱 Pages

### User Pages
| Route | Description |
|-------|-------------|
| `/` | Home page |
| `/products` | Product listing |
| `/products/:id` | Product detail |
| `/login` | User login |
| `/signup` | User registration |
| `/dashboard` | User dashboard |
| `/cart` | Shopping cart |
| `/checkout` | Checkout |
| `/orders` | Order history |
| `/profile` | User profile |
| `/wishlist` | Wishlist |
| `/notifications` | Notifications |
| `/contact` | Contact form |
| `/about` | About page |

### Admin Pages
| Route | Description |
|-------|-------------|
| `/admin/login` | Admin login |
| `/admin/dashboard` | Admin dashboard |
| `/admin/products` | Product management |
| `/admin/categories` | Category management |
| `/admin/orders` | Order management |
| `/admin/customers` | Customer management |
| `/admin/messages` | Message inbox |
| `/admin/analytics` | Analytics |
| `/admin/notifications` | Notification system |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test
node test-admin-panel.js
node test-api-endpoint.js
```

---

## 🚀 Deployment

### Production Setup

```bash
# Set environment variables
NODE_ENV=production
SESSION_SECRET=your-secure-secret
DB_HOST=your-db-host
```

### Recommended Platforms
- **Backend**: Heroku, DigitalOcean, AWS, Railway
- **Database**: AWS RDS, DigitalOcean Managed Databases
- **Static Files**: Can be served from same Node.js server

---

## 📖 Documentation

| File | Description |
|------|-------------|
| `QUICK_START.md` | 5-minute setup guide |
| `SETUP_GUIDE.md` | Detailed installation guide |
| `COMPLETE_IMPLEMENTATION_GUIDE.md` | Full implementation guide |
| `API_DATABASE_REFERENCE.md` | Complete API reference |
| `CART_ORDER_SYSTEM_GUIDE.md` | Cart & orders documentation |
| `FINAL_MESSAGING_SYSTEM_SUMMARY.md` | Messaging system docs |
| `ADMIN_PANEL_FIXES_SUMMARY.md` | Admin panel fixes |

---

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check MySQL is running
net start MySQL80  # Windows
sudo systemctl start mysql  # Linux/Mac
```

### Port Already in Use
Change `PORT` in `.env` file to a different value.

### Module Not Found
```bash
rm -rf node_modules
npm install
```

---

## 📞 Support

- Email: support@omunjushoppers.com
- Issues: Open a GitHub issue

---

## 📝 License

This project is licensed under the ISC License.

---

## 🙏 Acknowledgments

Built with ❤️ by OMUNJU SHOPPERS Development Team

---

**Questions? Check the documentation files or open an issue!**
