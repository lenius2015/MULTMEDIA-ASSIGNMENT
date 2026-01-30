// Admin Dashboard Routes
// Protected admin routes

const express = require('express');
const router = express.Router();
const { requireAdminAuth } = require('../middleware/adminAuth');

// Admin dashboard
router.get('/dashboard', requireAdminAuth, async (req, res) => {
  try {
    const pool = require('../db');

    // Get dashboard statistics with error handling
    let userStats = [{ total_users: 0 }];
    let productStats = [{ total_products: 0 }];
    let orderStats = [{ total_orders: 0 }];
    let messageStats = [{ total_messages: 0 }];
    let recentOrders = [];
    let recentMessages = [];
    let topProducts = [];
    let dailySales = [];
    let weeklySales = [];
    let monthlySales = [];
    let orderStatus = [];
    let auctionStats = [{ active_auctions: 0 }];
    let countdownStats = [{ active_countdowns: 0 }];

    try {
      [userStats] = await pool.query('SELECT COUNT(*) as total_users FROM users');
    } catch (e) { console.error('Error fetching user stats:', e); }

    try {
      [productStats] = await pool.query('SELECT COUNT(*) as total_products FROM products');
    } catch (e) { console.error('Error fetching product stats:', e); }

    try {
      [orderStats] = await pool.query('SELECT COUNT(*) as total_orders FROM orders');
    } catch (e) { console.error('Error fetching order stats:', e); }

    try {
      [messageStats] = await pool.query('SELECT COUNT(*) as total_messages FROM contact_messages');
    } catch (e) { console.error('Error fetching message stats:', e); }

    // Get recent orders
    try {
      [recentOrders] = await pool.query(`
        SELECT o.id, o.total_amount, o.status, o.created_at,
               u.name as customer_name, u.email as customer_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC LIMIT 5
      `);
    } catch (e) { console.error('Error fetching recent orders:', e); }

    // Get recent messages
    try {
      [recentMessages] = await pool.query(`
        SELECT id, name, email, subject, message, created_at, status
        FROM contact_messages
        ORDER BY created_at DESC LIMIT 5
      `);
    } catch (e) { console.error('Error fetching recent messages:', e); }

    // Get top selling products
    try {
      [topProducts] = await pool.query(`
        SELECT p.id, p.name, p.price, p.image_url,
               COALESCE(SUM(oi.quantity), 0) as sales_count,
               COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue
        FROM products p
        LEFT JOIN order_items oi ON p.id = oi.product_id
        GROUP BY p.id
        ORDER BY sales_count DESC, total_revenue DESC
        LIMIT 5
      `);
    } catch (e) { console.error('Error fetching top products:', e); }

    // Get sales analytics - daily for last 7 days
    try {
      [dailySales] = await pool.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as orders,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM orders
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);
    } catch (e) { console.error('Error fetching daily sales:', e); }

    // Get sales analytics - weekly for last 4 weeks
    try {
      [weeklySales] = await pool.query(`
        SELECT 
          DATE(DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY)) as week_start,
          COUNT(*) as orders,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM orders
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 4 WEEK)
        GROUP BY WEEK(DATE(created_at)), YEAR(DATE(created_at))
        ORDER BY week_start ASC
      `);
    } catch (e) { console.error('Error fetching weekly sales:', e); }

    // Get sales analytics - monthly for last 6 months
    try {
      [monthlySales] = await pool.query(`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as month,
          COUNT(*) as orders,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM orders
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month ASC
      `);
    } catch (e) { console.error('Error fetching monthly sales:', e); }

    // Get order status distribution
    try {
      [orderStatus] = await pool.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM orders
        GROUP BY status
      `);
    } catch (e) { console.error('Error fetching order status:', e); }

    // Get active auctions count
    try {
      [auctionStats] = await pool.query(`
        SELECT COUNT(*) as active_auctions FROM auctions WHERE status = 'active' AND end_date > NOW()
      `);
    } catch (e) { console.error('Error fetching auction stats:', e); }

    // Get active countdowns (try both table names)
    try {
      try {
        [countdownStats] = await pool.query(`
          SELECT COUNT(*) as active_countdowns FROM countdowns WHERE end_time > NOW()
        `);
      } catch (tableError) {
        // Try countdown_events table
        [countdownStats] = await pool.query(`
          SELECT COUNT(*) as active_countdowns FROM countdown_events WHERE end_date > NOW() AND is_active = 1
        `);
      }
    } catch (e) { console.error('Error fetching countdown stats:', e); }

    res.render('admin/dashboard', {
      title: 'Admin Dashboard - OMUNJU SHOPPERS',
      currentPage: 'dashboard',
      admin: {
        id: req.session.adminId,
        name: req.session.adminName,
        email: req.session.adminEmail,
        profile_picture: req.session.adminProfilePicture
      },
      stats: {
        totalUsers: userStats[0]?.total_users || 0,
        totalProducts: productStats[0]?.total_products || 0,
        totalOrders: orderStats[0]?.total_orders || 0,
        totalMessages: messageStats[0]?.total_messages || 0,
        activeAuctions: auctionStats[0]?.active_auctions || 0,
        activeCountdowns: countdownStats[0]?.active_countdowns || 0
      },
      recentOrders,
      recentMessages,
      topProducts,
      analytics: {
        daily: dailySales,
        weekly: weeklySales,
        monthly: monthlySales,
        orderStatus: orderStatus
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    // Render dashboard with empty data on error
    res.render('admin/dashboard', {
      title: 'Admin Dashboard - OMUNJU SHOPPERS',
      currentPage: 'dashboard',
      admin: {
        id: req.session.adminId,
        name: req.session.adminName,
        email: req.session.adminEmail,
        profile_picture: req.session.adminProfilePicture
      },
      stats: { 
        totalUsers: 0, totalProducts: 0, totalOrders: 0, 
        totalMessages: 0, activeAuctions: 0, activeCountdowns: 0 
      },
      recentOrders: [],
      recentMessages: [],
      topProducts: [],
      analytics: {
        daily: [],
        weekly: [],
        monthly: [],
        orderStatus: []
      }
    });
  }
});

// Products management
router.get('/products', requireAdminAuth, async (req, res) => {
  try {
    const pool = require('../db');
    const [products] = await pool.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category = c.id
      ORDER BY p.created_at DESC
    `);

    // Get categories for the form
    const [categories] = await pool.query('SELECT * FROM categories ORDER BY name');

    res.render('admin/products', {
      title: 'Product Management - OMUNJU SHOPPERS',
      currentPage: 'products',
      products,
      categories
    });
  } catch (error) {
    console.error('Products error:', error);
    res.render('admin/products', {
      title: 'Product Management - OMUNJU SHOPPERS',
      currentPage: 'products',
      products: [],
      categories: []
    });
  }
});

// Add product
router.post('/products', requireAdminAuth, async (req, res) => {
  try {
    const pool = require('../db');
    const { name, description, price, discount, category, stock, image_url } = req.body;

    const [result] = await pool.query(
      'INSERT INTO products (name, description, price, discount, category, stock, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, description || '', price, discount || 0, category, stock, image_url || '']
    );

    res.json({ success: true, message: 'Product added successfully', productId: result.insertId });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ success: false, message: 'Failed to add product' });
  }
});

// Update product
router.put('/products/:id', requireAdminAuth, async (req, res) => {
  try {
    const pool = require('../db');
    const { id } = req.params;
    const { name, description, price, discount, category, stock, image_url } = req.body;

    await pool.query(
      'UPDATE products SET name = ?, description = ?, price = ?, discount = ?, category = ?, stock = ?, image_url = ? WHERE id = ?',
      [name, description || '', price, discount || 0, category, stock, image_url || '', id]
    );

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
});

// Delete product
router.delete('/products/:id', requireAdminAuth, async (req, res) => {
  try {
    const pool = require('../db');
    const { id } = req.params;

    await pool.query('DELETE FROM products WHERE id = ?', [id]);

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
});

// Categories management
router.get('/categories', requireAdminAuth, async (req, res) => {
  try {
    const pool = require('../db');
    const [categories] = await pool.query('SELECT * FROM categories ORDER BY name');

    res.render('admin/categories', {
      title: 'Category Management - OMUNJU SHOPPERS',
      currentPage: 'categories',
      categories
    });
  } catch (error) {
    console.error('Categories error:', error);
    res.render('admin/categories', {
      title: 'Category Management - OMUNJU SHOPPERS',
      currentPage: 'categories',
      categories: []
    });
  }
});

// Orders management
router.get('/orders', requireAdminAuth, async (req, res) => {
  try {
    const pool = require('../db');
    const [orders] = await pool.query(`
      SELECT o.*, u.name as customer_name, u.email as customer_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);

    res.render('admin/orders', {
      title: 'Order Management - OMUNJU SHOPPERS',
      currentPage: 'orders',
      orders
    });
  } catch (error) {
    console.error('Orders error:', error);
    res.render('admin/orders', {
      title: 'Order Management - OMUNJU SHOPPERS',
      currentPage: 'orders',
      orders: []
    });
  }
});

// Update order status
router.put('/orders/:id/status', requireAdminAuth, async (req, res) => {
  try {
    const pool = require('../db');
    const { id } = req.params;
    const { status } = req.body;

    // Get order details first
    const [orderResult] = await pool.query('SELECT user_id, total_amount FROM orders WHERE id = ?', [id]);
    
    if (orderResult.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);

    // Create notification for the user
    try {
      const NotificationService = require('../utils/notificationService');
      await NotificationService.notifyOrderStatus(orderResult[0].user_id, id, status, orderResult[0].total_amount);
    } catch (notifError) {
      console.error('Error sending order notification:', notifError);
    }

    res.json({ success: true, message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

// Customers management
router.get('/customers', requireAdminAuth, async (req, res) => {
  try {
    const pool = require('../db');
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM users');
    const totalCustomers = countResult[0].total;
    const totalPages = Math.ceil(totalCustomers / limit);

    // Get customers with pagination
    const [customers] = await pool.query(
      'SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    res.render('admin/customers', {
      title: 'Customer Management - OMUNJU SHOPPERS',
      currentPage: 'customers',
      customers,
      page,
      totalPages,
      totalCustomers,
      limit
    });
  } catch (error) {
    console.error('Customers error:', error);
    res.render('admin/customers', {
      title: 'Customer Management - OMUNJU SHOPPERS',
      currentPage: 'customers',
      customers: [],
      page: 1,
      totalPages: 0,
      totalCustomers: 0,
      limit: 10
    });
  }
});

// Messages management - Real-time Chat System
router.get('/messages', requireAdminAuth, async (req, res) => {
  res.render('admin/messages', {
    title: 'Messages & Chat - OMUNJU SHOPPERS',
    currentPage: 'messages',
    admin: {
      id: req.session.adminId,
      name: req.session.adminName,
      email: req.session.adminEmail,
      profile_picture: req.session.adminProfilePicture
    }
  });
});

// Update message status
router.put('/messages/:id/status', requireAdminAuth, async (req, res) => {
  try {
    const pool = require('../db');
    const { status } = req.body;
    const { id } = req.params;

    await pool.query('UPDATE contact_messages SET status = ? WHERE id = ?', [status, id]);

    res.json({ success: true, message: 'Message status updated successfully' });
  } catch (error) {
    console.error('Update message status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update message status' });
  }
});

// Delete message
router.delete('/messages/:id', requireAdminAuth, async (req, res) => {
  try {
    const pool = require('../db');
    const { id } = req.params;

    await pool.query('DELETE FROM contact_messages WHERE id = ?', [id]);

    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete message' });
  }
});

// API: Get sales analytics
router.get('/api/analytics/sales', requireAdminAuth, async (req, res) => {
  try {
    const pool = require('../db');
    const period = req.query.period || 'daily';
    let data;

    if (period === 'daily') {
      data = await pool.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as orders,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM orders
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);
    } else if (period === 'weekly') {
      data = await pool.query(`
        SELECT 
          DATE(DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY)) as date,
          COUNT(*) as orders,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM orders
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 4 WEEK)
        GROUP BY WEEK(DATE(created_at)), YEAR(DATE(created_at))
        ORDER BY date ASC
      `);
    } else {
      data = await pool.query(`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as date,
          COUNT(*) as orders,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM orders
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY date ASC
      `);
    }

    res.json({ success: true, data: data[0], period });
  } catch (error) {
    console.error('Sales analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sales analytics' });
  }
});

// API: Get order status distribution
router.get('/api/analytics/order-status', requireAdminAuth, async (req, res) => {
  try {
    const pool = require('../db');

    const [data] = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders
      GROUP BY status
    `);

    res.json({ success: true, data });
  } catch (error) {
    console.error('Order status analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order status data' });
  }
});

// API: Get dashboard summary stats
router.get('/api/dashboard/stats', requireAdminAuth, async (req, res) => {
  try {
    const pool = require('../db');

    const [userStats] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [productStats] = await pool.query('SELECT COUNT(*) as count FROM products');
    const [orderStats] = await pool.query('SELECT COUNT(*) as count FROM orders');
    const [messageStats] = await pool.query('SELECT COUNT(*) as count FROM contact_messages WHERE status = "unread"');
    
    // Get total revenue
    const [revenueStats] = await pool.query('SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM orders WHERE status != "cancelled"');

    // Get today's revenue
    const [todayRevenue] = await pool.query('SELECT COALESCE(SUM(total_amount), 0) as today_revenue FROM orders WHERE DATE(created_at) = CURDATE() AND status != "cancelled"');

    // Get monthly revenue
    const [monthlyRevenue] = await pool.query('SELECT COALESCE(SUM(total_amount), 0) as monthly_revenue FROM orders WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) AND status != "cancelled"');

    res.json({
      success: true,
      stats: {
        totalUsers: userStats[0].count,
        totalProducts: productStats[0].count,
        totalOrders: orderStats[0].count,
        unreadMessages: messageStats[0].count,
        totalRevenue: revenueStats[0].total_revenue,
        todayRevenue: todayRevenue[0].today_revenue,
        monthlyRevenue: monthlyRevenue[0].monthly_revenue
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// Placeholder routes for the admin panel sections
// Note: These are fallback routes. The main CRUD routes are defined above.

router.get('/admin-users', requireAdminAuth, (req, res) => {
  res.render('admin/admin-users', {
    title: 'Admin Users & Roles - OMUNJU SHOPPERS',
    currentPage: 'admin-users'
  });
});

router.get('/settings', requireAdminAuth, (req, res) => {
  res.render('admin/settings', {
    title: 'Settings - OMUNJU SHOPPERS',
    currentPage: 'settings'
  });
});

module.exports = router;