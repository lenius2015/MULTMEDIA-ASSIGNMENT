# Development Notes & Implementation Details

## System Overview

ShopHub is a production-ready e-commerce platform built with:
- **Backend**: Node.js + Express (Clean Architecture pattern)
- **Frontend**: React 18 with React Router v6
- **Database**: MySQL with connection pooling
- **Authentication**: JWT with access/refresh tokens
- **API**: RESTful with 16+ endpoints

---

## Backend Architecture

### Directory Structure
```
src/
├── exceptions/AppError.js      # Custom error classes (7 types)
├── utils/                      # Utilities for business logic
│   ├── validators.js          # Input validation & sanitization
│   ├── jwt.js                 # Token generation & verification
│   ├── response.js            # Standardized API responses
│   └── logger.js              # File-based activity logging
├── config/database.js          # MySQL connection pool & queries
├── models/                     # Database layer (3 models)
│   ├── User.js                # User CRUD + auth operations
│   ├── Product.js             # Product CRUD + filtering
│   └── Order.js               # Order CRUD + transactions
├── services/                   # Business logic (3 services)
│   ├── AuthService.js         # Auth logic (register/login)
│   ├── ProductService.js      # Product operations
│   └── OrderService.js        # Order operations
├── controllers/                # HTTP handlers (3 controllers)
│   ├── AuthController.js      # Auth routes
│   ├── ProductController.js   # Product routes
│   └── OrderController.js     # Order routes
├── routes/                     # API endpoint definitions
│   ├── auth.js                # 5 auth endpoints
│   ├── products.js            # 7 product endpoints
│   └── orders.js              # 4 order endpoints
├── middleware/                 # Cross-cutting concerns
│   ├── auth.js                # JWT verification & role checks
│   ├── errorHandler.js        # Centralized error handling
│   └── validators.js          # Request validation
├── app.js                      # Express app configuration
└── server.js                   # HTTP server startup
```

### Clean Architecture Pattern

**Request Flow**:
```
HTTP Request
    ↓
Route Handler
    ↓
Middleware (auth, validation)
    ↓
Controller (asyncHandler wrapper)
    ↓
Service (business logic)
    ↓
Model (database operations)
    ↓
Database
    ↓
Response (formatted)
```

**Example: Create Product**
```javascript
// Route: POST /api/products
// Middleware: authMiddleware, isVendor, validateBody(['name', 'price', 'stock'])
// Controller: ProductController.create()
// Service: ProductService.createProduct(vendorId, data)
// Model: Product.create(productData)
// Database: INSERT INTO products
```

### Key Design Decisions

1. **asyncHandler Wrapper**
   - All controllers wrapped to catch async errors
   - Prevents unhandled promise rejections
   - Routes errors to error middleware

2. **Service Layer Formatting**
   - Data transformation happens in services
   - Controllers simply call sendSuccess/sendError
   - Ensures consistent API responses

3. **Whitelisted Field Updates**
   - Models only update explicitly allowed fields
   - Prevents accidental field injection
   - Example: User.update only allows name, phone, address fields

4. **Transactional Orders**
   - Order.create is transactional
   - Creates order + items in single transaction
   - Rolls back if any step fails

5. **Connection Pooling**
   - 10 connection limit prevents resource exhaustion
   - Keep-alive enabled for persistent connections
   - Automatic connection recycling

---

## Frontend Architecture

### Component Hierarchy
```
App (useAuth context)
├── Navigation (user, logout)
├── ProtectedRoute wrapper
├── Routes
│   ├── HomePage
│   │   ├── Hero section
│   │   ├── Categories grid
│   │   └── Products grid (ProductCard)
│   ├── ProductsPage
│   │   ├── Filters sidebar
│   │   ├── Products grid (ProductCard)
│   │   └── Pagination
│   ├── LoginPage
│   ├── RegisterPage
│   ├── OrdersPage
│   ├── CartPage
│   └── ProfilePage
└── Footer
```

### State Management

**Global State (useAuth Hook)**
- user (object with id, email, firstName, role)
- loading (boolean)
- error (error message)
- isAuthenticated (boolean)

**Page-level State (useState)**
- Products: products[], filters, page, loading
- Orders: orders[], pagination, loading
- Form: formData, errors, loading

### Styling Approach

**CSS Variables** (defined in App.css)
```css
--primary: #007bff
--primary-dark: #0056b3
--secondary: #6c757d
--success: #28a745
--danger: #dc3545
--radius: 8px
--shadow: 0 2px 8px rgba(0,0,0,0.1)
```

**Component-scoped CSS**
- Each component has its own .css file
- Prevents style conflicts
- Easy to maintain

**Responsive Design**
- Mobile-first approach
- Breakpoints: 768px (tablet), 1024px (desktop)
- Flexbox and Grid layout

### API Integration

**axios Instance** (src/services/api.js)
```javascript
// Request interceptor: Adds Bearer token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: Handles 401
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**API Methods**
- authAPI (register, login, getCurrentUser, updateProfile, logout)
- productAPI (getAll, getOne, getByCategory, getFeatured, getCategories, create, update)
- orderAPI (create, getOne, getAll, updateStatus)

---

## Database Schema

### Tables

**users**
- id (PK)
- email (UNIQUE)
- password (hashed)
- first_name, last_name
- phone, address, city, country
- role (enum: user, vendor, admin)
- is_active (boolean)
- timestamps

**products**
- id (PK)
- name, description
- price (decimal 10,2)
- stock (int)
- category (string with index)
- image_url
- vendor_id (FK → users.id)
- discount
- is_active
- timestamps

**orders**
- id (PK)
- user_id (FK → users.id)
- total_amount (decimal 12,2)
- status (enum: pending, processing, shipped, delivered, cancelled)
- shipping_address (JSON)
- payment_method, payment_status
- timestamps

**order_items**
- id (PK)
- order_id (FK → orders.id, cascade delete)
- product_id (FK → products.id)
- quantity
- price (snapshot at purchase time)

**Additional Tables**
- categories (for product categories)
- reviews (product reviews/ratings)
- payment_logs (payment transaction history)
- activity_logs (user activity tracking)

### Indexes
```sql
-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_vendor ON products(vendor_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
```

---

## Authentication Flow

### Registration
```
1. User submits: email, password, firstName, lastName, phone
2. Service validates: email format, password strength, email not exists
3. Service hashes password with bcryptjs
4. Service creates user in DB
5. Service generates JWT pair: accessToken (24h) + refreshToken (7d)
6. Response: user object + tokens
7. Frontend stores tokens in localStorage
```

### Login
```
1. User submits: email, password
2. Service finds user by email
3. Service verifies password (bcryptjs compare)
4. Service checks is_active status
5. Service generates token pair
6. Response: user object + tokens
7. Frontend stores tokens in localStorage
8. axios interceptor attaches token to all requests
```

### Protected Routes
```
1. Client makes request with Authorization header
2. authMiddleware extracts token
3. authMiddleware verifies JWT signature & expiry
4. authMiddleware extracts claims (id, role, etc.)
5. authMiddleware populates req.user
6. Route handler accesses req.user
7. roleMiddleware checks permission (if required)
8. If unauthorized → 401 response
```

### Token Refresh (Ready to implement)
```
1. Access token expires (24h)
2. Frontend catches 401 error
3. Frontend calls refreshToken endpoint with refreshToken
4. Backend verifies refreshToken (7d expiry)
5. Backend issues new accessToken
6. Frontend retries original request with new token
```

---

## Error Handling

### Exception Hierarchy
```
AppError (base)
├── ValidationError (400)
├── UnauthorizedError (401)
├── ForbiddenError (403)
├── NotFoundError (404)
└── ConflictError (409)
```

### Error Response Format
```json
{
  "success": false,
  "message": "User-friendly error message",
  "code": "ERROR_CODE",
  "errors": { "field": "specific error" },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Error Handling Pipeline
```
Throw error in service
    ↓
asyncHandler catches
    ↓
next(error) → error middleware
    ↓
errorHandler logs to file
    ↓
errorHandler formats response
    ↓
sendError returns to client
```

---

## Validation Strategy

### Input Validation (3 layers)

**Layer 1: Middleware Validators**
```javascript
validateBody(['email', 'password']) // Check required fields
validatePagination() // Check page/limit
validateQuery(schema) // Check query params
```

**Layer 2: Service Validators**
```javascript
validateEmail(email) // Format validation
validatePassword(password) // Strength check
validateRequired(data, fields) // Required fields
```

**Layer 3: Model Validators**
```javascript
// Whitelisted field updates
User.update(id, {first_name: '...', last_name: '...', phone: '...'})
// Other fields silently ignored
```

### Sanitization
```javascript
// Remove <, > characters
sanitizeInput(string)

// Recursively sanitize all strings in object
sanitizeObject(object)

// Parameterized queries prevent SQL injection
db.query('SELECT * FROM users WHERE email = ?', [email])
```

---

## Security Features

1. **Password Hashing**
   - bcryptjs with salt rounds = 10
   - Never stored in plain text

2. **JWT Tokens**
   - Signed with SECRET key
   - Tamper-proof claims
   - Expiring tokens (24h access, 7d refresh)

3. **Input Validation**
   - Email regex validation
   - Password strength requirements
   - Numeric field type checking

4. **SQL Injection Prevention**
   - Parameterized queries
   - All variables bound to query placeholders

5. **XSS Prevention**
   - Input sanitization (remove <, >)
   - Content escaping

6. **CORS**
   - Configured origins
   - Credentials allowed
   - Preflight enabled

7. **Security Headers**
   - Helmet middleware
   - X-Frame-Options, X-Content-Type-Options, etc.

8. **Rate Limiting** (Ready to implement)
   - Prevent brute force attacks
   - IP-based or user-based limits

---

## Performance Considerations

### Database
- Connection pooling (10 connections)
- Indexes on frequently queried columns
- Pagination limits (1-100 items)

### API
- Response compression (gzip)
- Pagination for large datasets
- Efficient database queries

### Frontend
- Code splitting by route
- Lazy loading of components
- CSS-in-JS for scoped styles
- Component memoization ready

### Caching (Ready to implement)
- HTTP cache headers
- Redis caching layer
- Local storage for user data

---

## Logging System

### Log Files
```
logs/
├── error-2024-01-01.log
├── warn-2024-01-01.log
├── info-2024-01-01.log
└── activity-2024-01-01.log
```

### Log Levels
- ERROR: System errors, exceptions
- WARN: Deprecated features, potential issues
- INFO: Normal operations, important events
- DEBUG: Detailed debugging (dev only)
- ACTIVITY: User actions (register, login, order)

### Log Format
```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "level": "ERROR",
  "message": "Database connection failed",
  "userId": 123,
  "path": "/api/orders",
  "method": "POST",
  "statusCode": 500
}
```

---

## Pagination Implementation

### API Query String
```
GET /api/products?page=2&limit=10
```

### Response Format
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 10,
    "total": 100,
    "pages": 10,
    "hasNextPage": true,
    "hasPrevPage": true
  }
}
```

### Database Implementation
```javascript
const limit = Math.min(limit || 10, 100); // Max 100
const page = Math.max(page || 1, 1); // Min 1
const offset = (page - 1) * limit;

const results = await db.query(
  'SELECT * FROM products LIMIT ? OFFSET ?',
  [limit, offset]
);
```

---

## Testing Strategy

### Unit Tests
- Service layer: business logic
- Utility functions: validation, jwt, response formatting
- Model methods: database operations

### Integration Tests
- Auth flow: register → login → logout
- Product operations: list → filter → get details
- Order flow: create → update status → get history

### End-to-End Tests
- Complete user journey
- Browser interactions
- API testing with real database

### Performance Tests
- Load testing with Apache Bench
- Database query optimization
- Response time monitoring

---

## Deployment Considerations

### Environment Variables
- Never commit .env file
- Use .env.example as template
- Different values for dev/staging/production

### Database Migrations
- Version control schema changes
- Run migrations before deployment
- Test rollback procedures

### Monitoring
- Error tracking (Sentry)
- Performance monitoring (New Relic)
- Uptime monitoring (StatusPage)
- Log aggregation (ELK Stack)

### Backup Strategy
- Daily database backups
- Weekly full backups
- Test restore procedures
- Off-site backup storage

---

## Future Enhancements

### Short-term (Next Sprint)
- [ ] Shopping cart backend + frontend
- [ ] Payment gateway integration (M-Pesa)
- [ ] Admin dashboard
- [ ] Email notifications
- [ ] Product reviews & ratings

### Medium-term (Next Quarter)
- [ ] Search optimization (Elasticsearch)
- [ ] Wishlist functionality
- [ ] User avatar uploads
- [ ] Product image uploads
- [ ] SMS notifications
- [ ] Real-time stock updates (Socket.IO)

### Long-term (Next Year)
- [ ] Mobile app (React Native)
- [ ] Marketplace features (multi-vendor)
- [ ] Advanced analytics
- [ ] Recommendation engine
- [ ] A/B testing framework
- [ ] GraphQL API

---

## Common Pitfalls & Solutions

### Pitfall: Token Not Sent in Request
**Solution**: Check axios interceptor is configured, token in localStorage

### Pitfall: CORS Errors
**Solution**: Verify CORS_ORIGIN env var, backend CORS middleware enabled

### Pitfall: Database Connection Fails
**Solution**: Check DB credentials in .env, verify MySQL running, check firewall

### Pitfall: Validation Errors Not Shown
**Solution**: Check response error.errors object, display field-specific errors

### Pitfall: Stale Data After Update
**Solution**: Refetch from server after mutations, don't rely on local state

### Pitfall: Race Conditions in Orders
**Solution**: Use transactions, lock inventory during checkout, atomic updates

---

## Useful Commands

```bash
# Backend
npm run dev              # Start with nodemon
npm test                 # Run tests
npm run lint             # Linting
node src/server.js       # Direct start

# Frontend
cd frontend && npm start  # Dev server
npm run build            # Production build
npm test                 # Run tests

# Database
mysql -u root -p ecommerce < init-db.sql  # Initialize
mysql -u root -p ecommerce                 # Connect
SHOW TABLES;             # List tables
DESCRIBE products;       # Show schema
```

---

## Code Style

### Naming Conventions
- **Classes**: PascalCase (UserModel, AuthService)
- **Functions**: camelCase (createUser, validateEmail)
- **Variables**: camelCase (userData, isActive)
- **Constants**: UPPER_SNAKE_CASE (JWT_SECRET, MAX_LIMIT)

### File Organization
- One class per file
- Group related utilities in folders
- Keep files under 300 lines

### Comments
- Document why, not what
- Add JSDoc for public methods
- Update comments with code changes

---

**Last Updated:** January 2024  
**Maintainers**: ShopHub Dev Team
