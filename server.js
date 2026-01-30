require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const passport = require('passport');
const http = require('http');
const socketIo = require('socket.io');
const pool = require('./db');
const Logger = require('./utils/logger');
const { securityConfig, securityMiddleware } = require('./config/security');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

// Security Middleware (Order matters!)
app.use(securityMiddleware.securityHeaders); // Security headers first
app.use(securityMiddleware.cors); // CORS configuration
app.use(securityMiddleware.compression); // Compression
app.use(securityMiddleware.requestSizeLimit); // Request size limits
app.use(securityMiddleware.ipBlocker); // IP blocking
app.use(securityMiddleware.sqlInjectionPrevention); // SQL injection prevention
app.use(securityMiddleware.dataSanitization); // Data sanitization
app.use(securityMiddleware.generalRateLimit); // General rate limiting

// Auth rate limiting for specific routes
app.use('/api/auth/login', securityMiddleware.authRateLimit);
app.use('/api/auth/register', securityMiddleware.authRateLimit);
app.use('/admin/login', securityMiddleware.authRateLimit);

// Body parsing
app.use(bodyParser.json({ limit: securityConfig.api.maxRequestSize }));
app.use(bodyParser.urlencoded({ extended: true, limit: securityConfig.api.maxRequestSize }));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Security logging
app.use(securityMiddleware.securityLogger);

// Legacy logging (keeping for backward compatibility)
app.use(Logger.ipBlocker());
app.use(Logger.accessLogger());

// Secure Session Configuration
app.use(session(securityConfig.session));

// Passport Configuration
app.use(passport.initialize());
app.use(passport.session());

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const notificationRoutes = require('./routes/notifications');
const contactRoutes = require('./routes/contact');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');
const auctionRoutes = require('./routes/auctions');
const countdownRoutes = require('./routes/countdowns');
const auctionPublicRoutes = require('./routes/auction-public');
const adminNotificationsRoutes = require('./routes/admin-notifications');

// Separate admin authentication system
const adminAuthRoutes = require('./routes/adminAuth.routes');
const adminDashboardRoutes = require('./routes/adminDashboard.routes');
const adminManagementRoutes = require('./routes/adminManagement');
const inboxRoutes = require('./routes/inbox');
const invoiceRoutes = require('./routes/invoices');
const onboardingRoutes = require('./routes/onboarding');
const deliveryRoutes = require('./routes/delivery');
const conversationsRoutes = require('./routes/conversations');
const { addAdminData } = require('./middleware/adminAuth');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/notifications', notificationRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/conversations', conversationsRoutes);

// Admin routes - Order matters: more specific routes first
app.use('/admin', addAdminData); // Add admin data to all admin routes
app.use('/admin/management', adminManagementRoutes);
app.use('/admin/auctions', auctionRoutes);
app.use('/admin/countdowns', countdownRoutes);
app.use('/admin/notifications', adminNotificationsRoutes);
app.use('/admin', adminRoutes);

// Public auction routes
app.use('/auctions', auctionPublicRoutes);

// Separate Admin Authentication System
app.use('/admin', adminAuthRoutes);
app.use('/admin', adminDashboardRoutes);

// Socket.IO Configuration
io.use((socket, next) => {
  // Add session to socket
  const req = socket.request;
  const res = {};
  session({
    secret: process.env.SESSION_SECRET || 'fallback_secret_key_change_this',
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000
    }
  })(req, res, next);
});


// Socket.IO Event Handlers
io.on('connection', (socket) => {
   console.log('User connected:', socket.id);

   // Join user-specific room for personalized updates
   if (socket.request.session && socket.request.session.userId) {
      socket.join(`user_${socket.request.session.userId}`);
   }

   // Join admin room if user is admin
   if (socket.request.session && socket.request.session.role === 'admin') {
      socket.join('admin_room');
   }

   // Join conversation rooms
   socket.on('join_conversation', (conversationId) => {
      if (socket.request.session && socket.request.session.userId) {
         socket.join(`conversation_${conversationId}`);
         console.log(`User ${socket.request.session.userId} joined conversation ${conversationId}`);
      }
   });

   // Leave conversation room
   socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
      console.log(`User left conversation ${conversationId}`);
   });

   // Handle new message
   socket.on('send_message', async (data) => {
      try {
         const { conversationId, message, messageType = 'text' } = data;
         const session = socket.request.session;

         if (!session || !session.userId) {
            socket.emit('error', { message: 'Authentication required' });
            return;
         }

         const userId = session.userId;
         const userType = session.role === 'admin' ? 'admin' : 'user';

         // Verify user has access to conversation
         const [conversations] = await pool.query(
            'SELECT * FROM conversations WHERE id = ?',
            [conversationId]
         );

         if (conversations.length === 0) {
            socket.emit('error', { message: 'Conversation not found' });
            return;
         }

         const conversation = conversations[0];

         // Check permissions
         if (userType !== 'admin' && conversation.user_id !== userId) {
            socket.emit('error', { message: 'Access denied' });
            return;
         }

         // Insert message
         const [messageResult] = await pool.query(`
            INSERT INTO messages (conversation_id, sender_id, sender_type, message_type, content)
            VALUES (?, ?, ?, ?, ?)
         `, [conversationId, userId, userType, messageType, message]);

         // Update conversation
         await pool.query(`
            UPDATE conversations
            SET last_message_at = NOW(),
                status = CASE WHEN status = 'closed' THEN 'active' ELSE status END
            WHERE id = ?
         `, [conversationId]);

         // Get the inserted message with user info
         const [messages] = await pool.query(`
            SELECT m.*,
                   u.name as sender_name,
                   u.profile_picture as sender_avatar
            FROM messages m
            LEFT JOIN users u ON m.sender_id = u.id
            WHERE m.id = ?
         `, [messageResult.insertId]);

         const messageData = messages[0];

         // Emit to conversation room
         io.to(`conversation_${conversationId}`).emit('new_message', {
            conversationId,
            message: messageData
         });

         // Also emit to admin room if sender is user
         if (userType === 'user') {
            io.to('admin_room').emit('user_message', {
               conversationId,
               message: messageData,
               userName: messageData.sender_name
            });
         }

         // Confirm message sent to sender
         socket.emit('message_sent', { messageId: messageResult.insertId });

      } catch (error) {
         console.error('Error sending message:', error);
         socket.emit('error', { message: 'Failed to send message' });
      }
   });

   // Handle typing indicators
   socket.on('typing_start', (conversationId) => {
      const session = socket.request.session;
      if (session && session.userId) {
         socket.to(`conversation_${conversationId}`).emit('user_typing', {
            userId: session.userId,
            userName: session.userName,
            isTyping: true
         });
      }
   });

   socket.on('typing_stop', (conversationId) => {
      const session = socket.request.session;
      if (session && session.userId) {
         socket.to(`conversation_${conversationId}`).emit('user_typing', {
            userId: session.userId,
            userName: session.userName,
            isTyping: false
         });
      }
   });

  // Handle countdown events
  socket.on('start_countdown', async (data) => {
    try {
      const { eventId } = data;
      const adminId = socket.request.session.adminId;

      if (!adminId) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      // Update countdown to active
      await pool.query(
        'UPDATE countdown_events SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [eventId]
      );

      // Broadcast to all users
      io.emit('countdown_started', { eventId });

      socket.emit('countdown_updated', { eventId, action: 'started' });
    } catch (error) {
      console.error('Error starting countdown:', error);
      socket.emit('error', { message: 'Failed to start countdown' });
    }
  });

  socket.on('stop_countdown', async (data) => {
    try {
      const { eventId } = data;
      const adminId = socket.request.session.adminId;

      if (!adminId) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      // Update countdown to inactive
      await pool.query(
        'UPDATE countdown_events SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [eventId]
      );

      // Broadcast to all users
      io.emit('countdown_stopped', { eventId });

      socket.emit('countdown_updated', { eventId, action: 'stopped' });
    } catch (error) {
      console.error('Error stopping countdown:', error);
      socket.emit('error', { message: 'Failed to stop countdown' });
    }
  });

  socket.on('update_countdown', async (data) => {
    try {
      const { eventId, updates } = data;
      const adminId = socket.request.session.adminId;

      if (!adminId) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      // Build update query
      const fields = [];
      const values = [];

      if (updates.title) {
        fields.push('title = ?');
        values.push(updates.title);
      }
      if (updates.description) {
        fields.push('description = ?');
        values.push(updates.description);
      }
      if (updates.end_date) {
        fields.push('end_date = ?');
        values.push(updates.end_date);
      }
      if (updates.is_active !== undefined) {
        fields.push('is_active = ?');
        values.push(updates.is_active ? 1 : 0);
      }

      if (fields.length > 0) {
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(eventId);

        await pool.query(
          `UPDATE countdown_events SET ${fields.join(', ')} WHERE id = ?`,
          values
        );

        // Broadcast update to all users
        io.emit('countdown_updated', { eventId, updates });

        socket.emit('countdown_updated', { eventId, action: 'updated' });
      }
    } catch (error) {
      console.error('Error updating countdown:', error);
      socket.emit('error', { message: 'Failed to update countdown' });
    }
  });

  socket.on('delete_countdown', async (data) => {
    try {
      const { eventId } = data;
      const adminId = socket.request.session.adminId;

      if (!adminId) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      // Delete countdown
      await pool.query('DELETE FROM countdown_events WHERE id = ?', [eventId]);

      // Broadcast deletion to all users
      io.emit('countdown_deleted', { eventId });

      socket.emit('countdown_updated', { eventId, action: 'deleted' });
    } catch (error) {
      console.error('Error deleting countdown:', error);
      socket.emit('error', { message: 'Failed to delete countdown' });
    }
  });

  socket.on('get_active_countdowns', async () => {
    try {
      const [events] = await pool.query(`
        SELECT id, title, description, event_type, start_date, end_date,
               display_on_homepage, display_on_product
        FROM countdown_events
        WHERE is_active = 1 AND end_date > NOW()
        ORDER BY end_date ASC
      `);

      socket.emit('active_countdowns', { events });
    } catch (error) {
      console.error('Error fetching active countdowns:', error);
      socket.emit('error', { message: 'Failed to fetch countdowns' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Temporary test route for admin access
app.get('/test-admin', (req, res) => {
  req.session.role = 'admin';
  req.session.userId = 1;
  req.session.userName = 'Test Admin';
  req.session.userEmail = 'test@admin.com';
  res.redirect('/admin/dashboard');
});

// Test admin dashboard without auth
app.get('/admin-test', (req, res) => {
  res.render('admin/dashboard', {
    title: 'Admin Dashboard - OMUNJU SHOPPERS',
    currentPage: 'dashboard'
  });
});

// Page Routes
app.get('/', (req, res) => {
  res.render('index', { 
    user: req.session.userId ? {
      id: req.session.userId,
      name: req.session.userName,
      email: req.session.userEmail,
      profile_picture: req.session.userProfilePicture
    } : null
  });
});

app.get('/login', (req, res) => {
  if (req.session.userId) {
    const redirectUrl = req.session.role === 'admin' ? '/admin/dashboard' : '/dashboard';
    return res.redirect(redirectUrl);
  }
  res.render('login', {
    user: req.session.userId ? {
      id: req.session.userId,
      name: req.session.userName,
      email: req.session.userEmail,
      profile_picture: req.session.userProfilePicture
    } : null
  });
});

app.get('/signup', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('signup', {
    user: req.session.userId ? {
      id: req.session.userId,
      name: req.session.userName,
      email: req.session.userEmail,
      profile_picture: req.session.userProfilePicture
    } : null
  });
});

app.get('/admin-login', (req, res) => {
  // If already logged in as admin, redirect to dashboard
  if (req.session.userId && req.session.role === 'admin') {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin-login', {
    user: req.session.userId ? {
      id: req.session.userId,
      name: req.session.userName,
      email: req.session.userEmail,
      profile_picture: req.session.userProfilePicture
    } : null
  });
});

app.get('/dashboard', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  // Check onboarding status for regular users (not admins)
  if (req.session.role !== 'admin') {
    try {
      const [onboardingRecords] = await pool.query(
        'SELECT completed FROM user_onboarding WHERE user_id = ?',
        [req.session.userId]
      );

      // If no onboarding record or not completed, redirect to onboarding
      if (onboardingRecords.length === 0 || !onboardingRecords[0].completed) {
        return res.redirect('/onboarding');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // Continue to dashboard if there's an error
    }
  }

  res.render('dashboard', {
    user: {
      id: req.session.userId,
      name: req.session.userName,
      email: req.session.userEmail,
      phone: req.session.userPhone,
      address: req.session.userAddress,
      profile_picture: req.session.userProfilePicture
    }
  });
});

app.get('/onboarding', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  // Skip onboarding for admin users
  if (req.session.role === 'admin') {
    return res.redirect('/admin/dashboard');
  }

  res.render('onboarding', {
    user: {
      id: req.session.userId,
      name: req.session.userName,
      email: req.session.userEmail
    }
  });
});

app.get('/delivery-request', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const orderId = req.query.orderId;
  if (!orderId) {
    return res.redirect('/dashboard');
  }

  res.render('delivery-request', {
    user: {
      id: req.session.userId,
      name: req.session.userName,
      email: req.session.userEmail
    },
    orderId: orderId
  });
});

app.get('/order-confirmation/:orderId', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const { orderId } = req.params;

  try {
    // Get order details
    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, req.session.userId]
    );

    if (orders.length === 0) {
      return res.redirect('/dashboard');
    }

    // Get order items
    const [orderItems] = await pool.query(`
      SELECT oi.*, p.name, p.image_url
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    res.render('order-confirmation', {
      user: {
        id: req.session.userId,
        name: req.session.userName,
        email: req.session.userEmail,
        profile_picture: req.session.userProfilePicture
      },
      order: orders[0],
      items: orderItems
    });
  } catch (error) {
    console.error('Error loading order confirmation:', error);
    res.redirect('/dashboard');
  }
});

app.get('/about', (req, res) => {
  res.render('about', {
    user: req.session.userId ? {
      id: req.session.userId,
      name: req.session.userName,
      email: req.session.userEmail,
      profile_picture: req.session.userProfilePicture
    } : null
  });
});

app.get('/contact', (req, res) => {
  res.render('contact', {
    user: req.session.userId ? {
      id: req.session.userId,
      name: req.session.userName,
      email: req.session.userEmail,
      profile_picture: req.session.userProfilePicture
    } : null
  });
});

app.get('/categories', async (req, res) => {
  try {
    // Get active categories with product counts
    const [categories] = await pool.query(`
      SELECT c.*,
             COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
      WHERE c.is_active = 1
      GROUP BY c.id
      ORDER BY c.sort_order, c.name
    `);

    res.render('categories', {
      title: 'Categories - OMUNJU SHOPPERS',
      user: req.session.userId ? {
        id: req.session.userId,
        name: req.session.userName,
        email: req.session.userEmail,
        profile_picture: req.session.userProfilePicture
      } : null,
      categories: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).render('404', {
      user: req.session.userId ? {
        id: req.session.userId,
        name: req.session.userName,
        email: req.session.userEmail,
        profile_picture: req.session.userProfilePicture
      } : null
    });
  }
});

app.get('/deals', (req, res) => {
  res.render('deals', {
    user: req.session.userId ? {
      id: req.session.userId,
      name: req.session.userName,
      email: req.session.userEmail,
      profile_picture: req.session.userProfilePicture
    } : null
  });
});

app.get('/cart', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  res.render('cart', {
    user: {
      id: req.session.userId,
      name: req.session.userName,
      email: req.session.userEmail,
      profile_picture: req.session.userProfilePicture
    }
  });
});

app.get('/category/:type', async (req, res) => {
  const { type } = req.params;
  try {
    const [products] = await pool.query('SELECT * FROM products WHERE category = ?', [type]);
    res.render('category', {
      user: req.session.userId ? {
        id: req.session.userId,
        name: req.session.userName,
        email: req.session.userEmail,
        phone: req.session.userPhone,
        address: req.session.userAddress,
        profile_picture: req.session.userProfilePicture
      } : null,
      type: type,
      products: products
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('404', {
      user: req.session.userId ? {
        id: req.session.userId,
        name: req.session.userName,
        email: req.session.userEmail,
        profile_picture: req.session.userProfilePicture
      } : null
    });
  }
});

app.get('/search', (req, res) => {
   res.render('search', {
       user: req.session.userId ? {
           id: req.session.userId,
           name: req.session.userName,
           email: req.session.userEmail,
           phone: req.session.userPhone,
           address: req.session.userAddress,
           profile_picture: req.session.userProfilePicture
       } : null
   });
});

app.get('/profile', (req, res) => {
   if (!req.session.userId) {
       return res.redirect('/login');
   }

   // Redirect to profile view
   res.redirect('/api/profile/view');
});

app.get('/product/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [products] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);

    if (products.length === 0) {
      return res.status(404).render('404', {
        user: req.session.userId ? {
          id: req.session.userId,
          name: req.session.userName,
          email: req.session.userEmail,
          profile_picture: req.session.userProfilePicture
        } : null
      });
    }

    const product = products[0];
    res.render('product', {
      product,
      user: req.session.userId ? {
        id: req.session.userId,
        name: req.session.userName,
        email: req.session.userEmail
      } : null
    });
  } catch (error) {
    console.error('Product page error:', error);
    res.status(500).render('404', {
      user: req.session.userId ? {
        id: req.session.userId,
        name: req.session.userName,
        email: req.session.userEmail,
        profile_picture: req.session.userProfilePicture
      } : null
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', {
    user: req.session.userId ? {
      id: req.session.userId,
      name: req.session.userName,
      email: req.session.userEmail,
      profile_picture: req.session.userProfilePicture
    } : null
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
