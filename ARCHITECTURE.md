# ShopHub E-Commerce Platform

A production-ready, university-level e-commerce system built with Node.js, Express, React, and MySQL.

## Features

### Authentication & Security
- JWT-based authentication
- Password hashing with bcryptjs
- Role-based access control (Admin, Vendor, User)
- Input validation and sanitization
- Security headers with Helmet
- CORS protection

### Products Management
- Product listing with filtering and search
- Category management
- Stock tracking
- Product images and descriptions
- Featured products
- Pagination support

### Orders System
- Shopping cart functionality
- Order creation and tracking
- Order status management
- Order history
- Pagination for orders

### Admin Panel
- User management
- Product management
- Order management
- Revenue statistics
- Activity logs

### Payment Integration
- M-Pesa integration ready
- Card payment support
- Payment status tracking
- Invoice generation

### Real-time Features
- Socket.IO ready for live updates
- Real-time product stock updates
- Live countdown timers
- Notifications

## Project Structure

```
project-root/
├── src/                          # Backend source
│   ├── app.js                   # Express app setup
│   ├── server.js                # Server entry point
│   ├── config/
│   │   └── database.js          # Database configuration
│   ├── models/                  # Database models
│   │   ├── User.js
│   │   ├── Product.js
│   │   └── Order.js
│   ├── controllers/             # Route controllers
│   │   ├── AuthController.js
│   │   ├── ProductController.js
│   │   └── OrderController.js
│   ├── services/                # Business logic
│   │   ├── AuthService.js
│   │   ├── ProductService.js
│   │   └── OrderService.js
│   ├── routes/                  # API routes
│   │   ├── auth.js
│   │   ├── products.js
│   │   └── orders.js
│   ├── middleware/              # Custom middleware
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── validators.js
│   ├── utils/                   # Utility functions
│   │   ├── jwt.js
│   │   ├── response.js
│   │   ├── logger.js
│   │   └── validators.js
│   └── exceptions/              # Custom error classes
│       └── AppError.js
│
├── frontend/                    # React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js              # Main app component
│   │   ├── index.js            # Entry point
│   │   ├── components/         # Reusable components
│   │   │   ├── Button.js
│   │   │   ├── ProductCard.js
│   │   │   └── Navigation.js
│   │   ├── pages/              # Page components
│   │   │   ├── HomePage.js
│   │   │   ├── ProductsPage.js
│   │   │   ├── LoginPage.js
│   │   │   └── RegisterPage.js
│   │   ├── services/           # API services
│   │   │   └── api.js
│   │   ├── hooks/              # Custom hooks
│   │   │   └── useAuth.js
│   │   ├── styles/             # CSS files
│   │   │   ├── App.css
│   │   │   ├── index.css
│   │   │   ├── Navigation.css
│   │   │   ├── Button.css
│   │   │   ├── ProductCard.css
│   │   │   └── pages/
│   │   └── utils/              # Frontend utilities
│   └── package.json
│
├── package.json                # Backend dependencies
├── .env.example               # Environment variables template
└── README.md
```

## Installation

### Prerequisites
- Node.js 14+
- MySQL 8.0+
- npm or yarn

### Backend Setup

```bash
# Install dependencies
npm install

# Create .env file from template
cp .env.example .env

# Update .env with your configuration
# nano .env

# Run database migrations
npm run migrate

# Start development server
npm run dev

# Or production server
npm start
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local if needed
cp .env.example .env.local

# Start development server
npm start

# Or build for production
npm run build
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/logout` - User logout

### Products
- `GET /api/products` - Get all products with filters
- `GET /api/products/featured` - Get featured products
- `GET /api/products/categories` - Get all categories
- `GET /api/products/category/:name` - Get products by category
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (vendor/admin)
- `PUT /api/products/:id` - Update product (vendor/admin)

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get order details
- `PATCH /api/orders/:id/status` - Update order status

## Error Handling

All errors are standardized with the following format:

```json
{
  "success": false,
  "message": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Security

- All passwords are hashed with bcryptjs
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS enabled
- Rate limiting ready
- JWT token-based auth
- Role-based access control

## Database Schema

The system uses the following tables:
- `users` - User accounts
- `products` - Product catalog
- `orders` - Customer orders
- `order_items` - Order line items
- `categories` - Product categories

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Build Frontend
```bash
cd frontend
npm run build
```

## Deployment

### Backend Deployment (Production)
```bash
# Build
npm install --production

# Environment variables
# Create .env with production values

# Run
node src/server.js
```

### Frontend Deployment
```bash
cd frontend
npm run build
# Deploy dist folder to web server
```

## Performance Optimization

- Pagination for large datasets
- Database connection pooling
- Response compression
- Frontend code splitting
- Lazy loading of components
- Caching strategy ready

## Future Enhancements

- [ ] Advanced search with Elasticsearch
- [ ] Product reviews and ratings
- [ ] Wishlist functionality
- [ ] Shopping cart persistence
- [ ] Advanced analytics
- [ ] Mobile app
- [ ] Marketplace features
- [ ] Invoice generation
- [ ] Shipping integration
- [ ] Refund management

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## License

MIT License - see LICENSE file for details

## Support

For support, email support@shophub.com or create an issue in the repository.

## Author

ShopHub Development Team
