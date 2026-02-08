# ShopHub - Quick Start Guide

## System Requirements
- Node.js 14.x or higher
- MySQL 8.0 or higher
- npm 6.x or yarn 1.x

## Step-by-Step Setup

### 1. Database Setup
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE ecommerce;
EXIT;

# Load database schema
mysql -u root -p ecommerce < init-db.sql
```

### 2. Backend Setup
```bash
# Install dependencies
npm install

# Configure environment
# Edit .env file with your settings
# Set: DB_HOST, DB_USER, DB_PASSWORD, JWT_SECRET, etc.

# Test database connection
node -e "const db = require('./src/config/database'); db.testConnection();"

# Start backend server
npm run dev
# Server runs on http://localhost:5000
```

### 3. Frontend Setup
```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Create environment file
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env.local

# Start frontend
npm start
# App opens at http://localhost:3000
```

## Testing the System

### 1. Register a User
```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+254712345678"
}
```

### 2. Login
```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123"
}
```

### 3. Get Products
```bash
GET http://localhost:5000/api/products?page=1&limit=10
```

### 4. Create an Order
```bash
POST http://localhost:5000/api/orders
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "items": [
    { "productId": 1, "quantity": 2 }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Nairobi",
    "country": "Kenya"
  },
  "paymentMethod": "mpesa"
}
```

## Project Structure

```
root/
├── src/
│   ├── app.js              # Express app
│   ├── server.js           # Server entry point
│   ├── config/             # Configuration
│   ├── models/             # Database models
│   ├── controllers/        # Route handlers
│   ├── services/           # Business logic
│   ├── routes/             # API routes
│   ├── middleware/         # Custom middleware
│   ├── utils/              # Helper functions
│   └── exceptions/         # Error classes
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── styles/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
├── package.json
├── .env
└── ARCHITECTURE.md
```

## Key Features Implemented

### ✅ Complete
- Authentication (Register, Login, Logout, Profile)
- Product Listing & Filtering
- Product Categories
- Order Creation & Management
- User Management
- Admin Role Support
- Error Handling & Logging
- Input Validation & Sanitization
- Password Hashing
- JWT Authentication
- CORS Security
- Pagination

### 🚀 Ready to Implement
- Payment Processing (M-Pesa, Airtel, Card)
- Admin Dashboard
- Shopping Cart
- Wishlist
- Product Reviews
- Real-time Updates (Socket.IO)
- Search Optimization

## Common Issues & Solutions

### Issue: "Cannot connect to database"
**Solution:**
1. Ensure MySQL is running: `mysql -u root -p`
2. Check credentials in .env file
3. Verify database was created: `SHOW DATABASES;`

### Issue: "Module not found"
**Solution:**
1. Reinstall dependencies: `rm -rf node_modules && npm install`
2. Check Node.js version: `node --version`

### Issue: "CORS error in frontend"
**Solution:**
1. Check CORS_ORIGIN in .env matches frontend URL
2. Ensure backend is running on correct port
3. Check Authorization header format in requests

### Issue: "Authentication fails"
**Solution:**
1. Verify JWT_SECRET is set in .env
2. Check token is being sent in Authorization header
3. Check token hasn't expired (24h default)

## Development Commands

```bash
# Backend
npm run dev              # Start with nodemon
npm start               # Production start
npm test               # Run tests
npm run lint           # Check code style

# Frontend
cd frontend
npm start              # Development server
npm run build          # Production build
npm test               # Run tests
```

## Performance Tips

1. **Database**: Add indexes on frequently queried columns
2. **Frontend**: Use React.memo for expensive components
3. **API**: Implement caching headers
4. **Images**: Optimize and compress product images
5. **Pagination**: Always limit large result sets

## Security Checklist

- [ ] Change JWT_SECRET in .env
- [ ] Change database password
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS
- [ ] Setup rate limiting
- [ ] Configure firewall
- [ ] Regular database backups
- [ ] Update dependencies regularly

## Next Steps

1. **Setup Payment Gateway**: Implement M-Pesa/Airtel/Card payments
2. **Build Admin Dashboard**: Create management interface
3. **Add Shopping Cart**: Implement full cart functionality
4. **Setup Testing**: Add Jest/Mocha tests
5. **Deploy**: Use Docker/Vercel/Heroku

## Getting Help

- Check logs in `logs/` directory
- Review API_DOCUMENTATION.md for endpoint details
- Check ARCHITECTURE.md for system design
- Read error messages in terminal

## Production Deployment Checklist

- [ ] Database backup configured
- [ ] Environment variables set securely
- [ ] Error logging setup
- [ ] Rate limiting enabled
- [ ] HTTPS configured
- [ ] Frontend built and optimized
- [ ] Database migrations completed
- [ ] Admin account created
- [ ] Payment gateway configured
- [ ] Email notifications setup

---

**Version:** 1.0.0  
**Last Updated:** January 2024
