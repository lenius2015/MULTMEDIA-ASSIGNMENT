# OMUNJU SHOPPERS - E-Commerce Web Application

A complete, fully functional e-commerce web application built with Node.js, Express.js, MySQL, and vanilla JavaScript.

## 🚀 Features

### User Features
- **Guest Browsing**: Browse products without an account
- **User Authentication**: Secure registration and login system
- **Product Catalog**: Browse products by categories with advanced filtering
- **Search & Filter**: Search products by name, filter by category, price, and discounts
- **Shopping Cart**: Add products to cart (requires login)
- **Order Management**: Place orders and track order history
- **User Profile**: Edit profile information and change password
- **Notifications**: Real-time notifications for new products and discounts
- **Contact Form**: Submit inquiries and support requests
- **Chatbot**: AI-powered shopping assistant for customer support
- **Responsive Design**: Mobile-friendly interface

### Product Features
- Product categories (T-Shirts, Jackets, Jeans, Dresses, Sweaters)
- Discount badges and pricing
- New arrival indicators
- Product images and descriptions
- Stock management

### Admin Features (Backend Ready)
- User management
- Product management
- Order management
- Notification system

## 📁 Project Structure

```
e-commerce-website/
├── config.js                 # Configuration file
├── db.js                     # Database connection
├── db_init.sql              # Database schema and sample data
├── server.js                # Main server file
├── .env                     # Environment variables
├── package.json             # Dependencies
├── middleware/
│   └── auth.js              # Authentication middleware
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── products.js          # Product routes
│   ├── cart.js              # Shopping cart routes
│   ├── orders.js            # Order management routes
│   ├── profile.js           # User profile routes
│   ├── notifications.js     # Notification routes
│   └── contact.js           # Contact form routes
├── views/
│   ├── index.ejs            # Home page (guest)
│   ├── login.ejs            # Login page
│   ├── signup.ejs           # Registration page
│   ├── dashboard.ejs        # User dashboard
│   ├── profile.ejs          # User profile page
│   ├── contact.ejs          # Contact page
│   ├── about.ejs            # About page
│   └── 404.ejs              # 404 error page
└── public/
    ├── style.css            # Main stylesheet
    ├── login.css            # Login page styles
    ├── signup.css           # Signup page styles
    ├── script.js            # Main JavaScript file
    ├── login.js             # Login functionality
    └── signup.js            # Signup functionality
```

## 🛠️ Technologies Used

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MySQL/MariaDB** - Relational database
- **bcryptjs** - Password hashing
- **express-session** - Session management
- **dotenv** - Environment variable management

### Frontend
- **HTML5** - Markup language
- **CSS3** - Styling
- **Vanilla JavaScript** - Client-side functionality
- **EJS** - Template engine
- **Font Awesome** - Icons
- **Google Fonts** - Typography

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- MySQL or MariaDB
- npm or yarn package manager

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd e-commerce-website
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ecommerce

# Server Configuration
PORT=3000
NODE_ENV=development

# Session Configuration
SESSION_SECRET=your_secret_key_change_this_to_something_secure
```

### 4. Setup Database

#### Option 1: Using MySQL Command Line
```bash
mysql -u root -p < db_init.sql
```

#### Option 2: Using MySQL Workbench or phpMyAdmin
1. Open your MySQL client
2. Create a new database named `ecommerce`
3. Import the `db_init.sql` file

### 5. Start the Server

#### Development Mode (with auto-restart)
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000`

## 🗄️ Database Schema

### Tables
- **users** - User accounts and authentication
- **products** - Product catalog
- **cart** - Shopping cart items
- **wishlist** - User wishlists
- **orders** - Order records
- **order_items** - Order line items
- **notifications** - User notifications
- **contact_messages** - Contact form submissions
- **partner_links** - Partner website links

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/status` - Check authentication status

### Products
- `GET /api/products` - Get all products (with filters)
- `GET /api/products/:id` - Get single product
- `GET /api/products/filter/new` - Get new products
- `GET /api/products/filter/discounted` - Get discounted products
- `GET /api/products/categories/list` - Get product categories

### Shopping Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update/:productId` - Update cart item quantity
- `DELETE /api/cart/remove/:productId` - Remove item from cart
- `DELETE /api/cart/clear` - Clear entire cart

### Orders
- `POST /api/orders/create` - Create new order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:orderId` - Get order details
- `PUT /api/orders/:orderId/cancel` - Cancel order

### User Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile/update` - Update profile information
- `PUT /api/profile/change-password` - Change password
- `GET /api/profile/orders` - Get user orders
- `GET /api/profile/orders/:orderId` - Get order details

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### Contact
- `POST /api/contact/submit` - Submit contact form
- `GET /api/contact/partners` - Get partner links

## 🎨 Features Walkthrough

### For Guest Users
1. Browse products on the home page
2. Use search and filters to find products
3. Click "Buy Now" to be redirected to login/register
4. View About Us and Contact pages

### For Registered Users
1. **Register**: Create an account via `/signup`
2. **Login**: Access your account via `/login`
3. **Dashboard**: View personalized dashboard with:
   - New arrivals
   - Hot deals (discounted products)
   - All products with filters
   - Quick stats (orders, cart items, notifications)
4. **Shopping**:
   - Add products to cart
   - View cart summary
   - Place orders
5. **Profile Management**:
   - Edit personal information
   - Change password
   - View order history
6. **Notifications**: Receive updates about new products and discounts
7. **Chatbot**: Get instant help with common questions
8. **Contact**: Submit inquiries via contact form

## 🤖 Chatbot Features

The integrated chatbot can help with:
- Product information
- Pricing inquiries
- Shipping and delivery details
- Return and refund policies
- Account registration
- Contact information
- General support

## 🔒 Security Features

- Password hashing with bcryptjs
- Session-based authentication
- SQL injection prevention with parameterized queries
- Input validation on both client and server
- CSRF protection via session management
- Secure password requirements (minimum 6 characters)

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

## 🚀 Deployment

### Prerequisites for Production
1. Set `NODE_ENV=production` in `.env`
2. Use a strong `SESSION_SECRET`
3. Enable HTTPS and set `cookie.secure = true` in session config
4. Use a production-grade database server
5. Set up proper error logging

### Recommended Hosting Platforms
- **Backend**: Heroku, DigitalOcean, AWS, Railway
- **Database**: AWS RDS, DigitalOcean Managed Databases, PlanetScale
- **Frontend**: Can be served from the same Node.js server

## 🐛 Troubleshooting

### Database Connection Issues
- Verify MySQL is running
- Check database credentials in `.env`
- Ensure database `ecommerce` exists

### Port Already in Use
- Change `PORT` in `.env` file
- Or kill the process using port 3000

### Session Issues
- Clear browser cookies
- Restart the server
- Check `SESSION_SECRET` is set

## 📝 Sample Credentials

After running `db_init.sql`, you can use these credentials:

**Admin Account:**
- Email: admin@omunju.com
- Password: admin123 (Note: Update the hashed password in db_init.sql)

**Note**: For security, generate proper bcrypt hashes for passwords before production use.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Support

For support, email support@omunjushoppers.com or use the contact form in the application.

## 🎯 Future Enhancements

- Payment gateway integration (Stripe, PayPal)
- Email notifications
- Product reviews and ratings
- Wishlist functionality
- Advanced admin dashboard
- Order tracking with real-time updates
- Social media authentication
- Multi-language support
- Product recommendations
- Inventory management system

## 📞 Contact

- Website: [OMUNJU SHOPPERS](#)
- Email: info@omunjushoppers.com
- Phone: +254 700 123 456

---

**Built with ❤️ by OMUNJU SHOPPERS Team**
