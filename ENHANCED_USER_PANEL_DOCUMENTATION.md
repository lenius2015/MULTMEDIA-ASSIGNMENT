# Enhanced User Panel Documentation

## Overview

This document provides comprehensive documentation for the enhanced user panel implementation for the OMUNJU SHOPPERS e-commerce website. The enhanced user panel includes full CRUD operations, real-time features, and a modern, bland color scheme design.

## Features Implemented

### 1. Complete User Dashboard
- **Smart Navigation Sidebar**: Fixed sidebar with user profile, navigation links, and logout functionality
- **Overview Section**: Dashboard with statistics, recent activity, recent orders, and product recommendations
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

### 2. Order Management
- **Order History**: Complete list of all orders with filtering by status
- **Order Tracking**: Real-time order status updates
- **Order Actions**: Cancel orders, buy again, write reviews, request refunds
- **Order Details**: View detailed order information

### 3. Shopping Cart
- **Real-time Cart**: Live updates of cart contents and totals
- **Quantity Management**: Increase/decrease item quantities
- **Cart Actions**: Remove items, move to wishlist, clear cart
- **Cart Summary**: Automatic calculation of subtotal, shipping, tax, and total

### 4. Wishlist Management
- **Save Items**: Add/remove products from wishlist
- **Quick Actions**: Move items to cart directly from wishlist
- **Wishlist Display**: Grid layout with product information

### 5. Messaging System
- **Compose Messages**: Send messages to support team
- **Conversation List**: View all conversations with unread indicators
- **Message Management**: Open conversations, mark as read

### 6. Address Management
- **Multiple Addresses**: Support for home, work, and other addresses
- **Address CRUD**: Create, read, update, delete addresses
- **Default Address**: Set primary shipping address
- **Address Validation**: Form validation and error handling

### 7. Profile Management
- **Profile Editing**: Update name, phone, date of birth, bio
- **Profile Picture**: Upload and manage profile photo
- **Password Security**: Change password with validation

### 8. Notifications System
- **Notification Preferences**: Configure email and SMS notifications
- **Notification Management**: View, mark as read, delete notifications
- **Real-time Updates**: Live notification updates

### 9. Review System
- **Product Reviews**: View and manage user reviews
- **Review Actions**: Edit and delete reviews
- **Review Integration**: Link reviews to orders

### 10. Activity Log
- **Account Activity**: Track login attempts, profile changes, orders
- **Security Monitoring**: IP address and location tracking
- **Activity Timeline**: Chronological display of user actions

## Technical Implementation

### Frontend Architecture

#### Files Structure
```
public/
├── user-dashboard-enhanced.css     # Enhanced CSS with bland color scheme
├── user-dashboard-enhanced.js      # Complete JavaScript functionality
└── user-dashboard-enhanced.ejs     # Enhanced EJS template

views/
└── user-dashboard-enhanced.ejs     # Main dashboard template
```

#### CSS Features
- **Bland Color Scheme**: Uses gray-based palette with subtle accents
- **Modern Design**: Clean, minimalistic interface with proper spacing
- **Responsive Layout**: Grid and flexbox for optimal display
- **Accessibility**: High contrast, keyboard navigation, screen reader support
- **Dark Mode Support**: Automatic dark theme detection

#### JavaScript Features
- **Modular Architecture**: Organized into logical modules
- **API Integration**: RESTful API calls with error handling
- **Real-time Updates**: Periodic data refresh and visibility change detection
- **Toast Notifications**: User feedback system
- **Form Validation**: Client-side validation with user feedback

### Database Integration

#### Required Database Tables
The enhanced user panel requires the following database tables:

1. **users** - User account information
2. **user_profiles** - Extended user profile data
3. **user_addresses** - Shipping and billing addresses
4. **user_preferences** - Notification and display preferences
5. **user_activity** - Activity logging
6. **user_reviews** - Product reviews
7. **cart_items** - Shopping cart data
8. **wishlist_items** - Wishlist data
9. **orders** - Order history
10. **order_items** - Order line items
11. **conversations** - Messaging system
12. **messages** - Message content
13. **notifications** - User notifications

#### Database Schema
```sql
-- User Profiles Table
CREATE TABLE user_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    bio TEXT,
    date_of_birth DATE,
    profile_picture VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User Addresses Table
CREATE TABLE user_addresses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    label VARCHAR(50),
    full_name VARCHAR(100),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    delivery_instructions TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User Preferences Table
CREATE TABLE user_preferences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    order_updates BOOLEAN DEFAULT TRUE,
    promotional_emails BOOLEAN DEFAULT FALSE,
    price_alerts BOOLEAN DEFAULT FALSE,
    newsletter BOOLEAN DEFAULT FALSE,
    account_security BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User Activity Table
CREATE TABLE user_activity (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(100),
    description TEXT,
    ip_address VARCHAR(45),
    location VARCHAR(255),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User Reviews Table
CREATE TABLE user_reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    product_id INT,
    order_id INT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Cart Items Table
CREATE TABLE cart_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    product_id INT,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Wishlist Items Table
CREATE TABLE wishlist_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    product_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Conversations Table
CREATE TABLE conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    subject VARCHAR(255),
    status VARCHAR(50) DEFAULT 'open',
    last_message_at TIMESTAMP,
    unread_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Messages Table
CREATE TABLE messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT,
    sender_id INT,
    sender_type ENUM('user', 'admin'),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Notifications Table
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    title VARCHAR(255),
    message TEXT,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### API Endpoints Required

The enhanced user panel requires the following API endpoints:

#### User Profile Endpoints
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `DELETE /api/user/profile-picture` - Remove profile picture

#### Password Endpoints
- `POST /api/user/change-password` - Change user password

#### Address Endpoints
- `GET /api/user/addresses` - Get user addresses
- `POST /api/user/addresses` - Create new address
- `PUT /api/user/addresses/:id` - Update address
- `DELETE /api/user/addresses/:id` - Delete address
- `PUT /api/user/addresses/:id/default` - Set default address

#### Cart Endpoints
- `GET /api/user/cart` - Get cart contents
- `POST /api/cart/add` - Add item to cart
- `POST /api/cart/update` - Update item quantity
- `DELETE /api/cart/:id` - Remove item from cart
- `DELETE /api/cart/clear` - Clear cart
- `POST /api/wishlist/move` - Move item to wishlist

#### Wishlist Endpoints
- `GET /api/user/wishlist` - Get wishlist items
- `POST /api/wishlist/toggle` - Toggle wishlist item
- `DELETE /api/wishlist/:id` - Remove from wishlist

#### Order Endpoints
- `GET /api/user/orders` - Get order history
- `PUT /api/orders/:id/cancel` - Cancel order
- `POST /api/orders/:id/buy-again` - Buy order again
- `POST /api/orders/:id/refund` - Request refund

#### Message Endpoints
- `GET /api/user/conversations` - Get conversations
- `POST /api/inbox/send` - Send message
- `GET /api/inbox/:id` - Get conversation details

#### Notification Endpoints
- `GET /api/user/notifications` - Get notifications
- `PUT /api/user/notifications/preferences` - Update preferences
- `PUT /api/user/notifications/mark-all-read` - Mark all as read
- `PUT /api/user/notifications/:id/read` - Mark as read
- `DELETE /api/user/notifications/:id` - Delete notification

#### Review Endpoints
- `GET /api/user/reviews` - Get user reviews
- `DELETE /api/user/reviews/:id` - Delete review

#### Activity Endpoints
- `GET /api/user/activity` - Get activity log

## Installation and Setup

### 1. Database Setup
1. Run the database schema SQL to create required tables
2. Ensure foreign key relationships are properly established
3. Set up any necessary indexes for performance

### 2. File Placement
1. Place `user-dashboard-enhanced.ejs` in the `views/` directory
2. Place `user-dashboard-enhanced.css` in the `public/` directory
3. Place `user-dashboard-enhanced.js` in the `public/` directory

### 3. Route Integration
Add routes to handle the enhanced user panel:

```javascript
// User Dashboard Route
app.get('/user-dashboard', ensureAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const orderStats = await Order.getOrderStats(req.user.id);
        const cartCount = await Cart.getCartCount(req.user.id);
        const wishlistCount = await Wishlist.getWishlistCount(req.user.id);
        const unreadMessages = await Conversation.getUnreadCount(req.user.id);
        const unreadNotifications = await Notification.getUnreadCount(req.user.id);
        const userPreferences = await UserPreference.findByUserId(req.user.id);
        const recentActivity = await UserActivity.getRecentActivity(req.user.id);
        const recentOrders = await Order.getRecentOrders(req.user.id);
        const featuredProducts = await Product.getFeaturedProducts();
        
        res.render('user-dashboard-enhanced', {
            user,
            orderStats,
            cartCount,
            wishlistCount,
            unreadMessages,
            unreadNotifications,
            userPreferences,
            recentActivity,
            recentOrders,
            featuredProducts
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.redirect('/login');
    }
});
```

### 4. API Routes
Implement all required API endpoints with proper authentication and validation.

### 5. Middleware Integration
Ensure proper middleware for:
- Authentication
- Authorization
- Input validation
- Error handling
- Rate limiting

## Usage Instructions

### For Users
1. **Access Dashboard**: Navigate to `/user-dashboard` after logging in
2. **Navigation**: Use the sidebar to navigate between sections
3. **Profile Management**: Edit profile, change password, manage addresses
4. **Order Management**: View orders, track status, perform actions
5. **Cart Management**: Add/remove items, update quantities
6. **Wishlist**: Save favorite products for later
7. **Messages**: Contact support, view conversations
8. **Notifications**: Configure preferences, view notifications

### For Developers
1. **Customization**: Modify CSS variables for brand colors
2. **Features**: Add new sections following the existing pattern
3. **APIs**: Extend functionality with additional endpoints
4. **Integration**: Connect with existing systems

## Security Considerations

### Authentication
- All routes require user authentication
- Use secure session management
- Implement proper logout functionality

### Authorization
- Users can only access their own data
- Implement proper access controls
- Validate user permissions for each action

### Input Validation
- Validate all user inputs on server side
- Use parameterized queries to prevent SQL injection
- Sanitize user content to prevent XSS

### Data Protection
- Encrypt sensitive data
- Use HTTPS for all communications
- Implement proper error handling without exposing sensitive information

## Performance Optimization

### Database Optimization
- Use proper indexing on frequently queried fields
- Implement pagination for long lists
- Use efficient queries with proper joins

### Frontend Optimization
- Minimize CSS and JavaScript files
- Use lazy loading for images
- Implement caching strategies

### Caching
- Cache frequently accessed data
- Use Redis or similar for session storage
- Implement browser caching for static assets

## Troubleshooting

### Common Issues
1. **Database Connection**: Ensure database is running and accessible
2. **File Permissions**: Check file permissions for uploaded assets
3. **API Endpoints**: Verify all required endpoints are implemented
4. **Authentication**: Ensure middleware is properly configured

### Debugging
1. Check browser console for JavaScript errors
2. Monitor network requests for API issues
3. Review server logs for backend errors
4. Use development tools to inspect elements

## Future Enhancements

### Potential Features
1. **Two-Factor Authentication**: Enhanced security
2. **Dark Mode Toggle**: User preference for theme
3. **Export Data**: Allow users to export their data
4. **Bulk Actions**: Perform actions on multiple items
5. **Advanced Search**: Filter and search functionality
6. **Mobile App**: Native mobile application

### Integration Opportunities
1. **Payment Methods**: Add more payment options
2. **Shipping Providers**: Integrate with multiple carriers
3. **Analytics**: User behavior tracking
4. **Recommendations**: AI-powered product suggestions

## Support and Maintenance

### Regular Tasks
1. Monitor performance and fix bottlenecks
2. Update dependencies and security patches
3. Review and optimize database queries
4. Test with different browsers and devices

### Monitoring
1. Set up error tracking and logging
2. Monitor API response times
3. Track user engagement and usage patterns
4. Watch for security vulnerabilities

## Conclusion

The enhanced user panel provides a comprehensive, modern, and user-friendly interface for managing all aspects of the user experience. With proper implementation and maintenance, it will significantly improve user satisfaction and engagement with the OMUNJU SHOPPERS platform.

For questions or support, refer to the development team or consult the technical documentation.