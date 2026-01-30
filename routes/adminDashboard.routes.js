// Admin Dashboard Routes
// Protected admin routes

const express = require('express');
const router = express.Router();
const { requireAdminAuth } = require('../middleware/adminAuth');

// Admin dashboard
router.get('/dashboard', requireAdminAuth, async (req, res) => {
  try {
    const pool = require('../db');

    // Get dashboard statistics
    const [userStats] = await pool.query('SELECT COUNT(*) as total_users FROM users');
    const [productStats] = await pool.query('SELECT COUNT(*) as total_products FROM products');
    const [orderStats] = await pool.query('SELECT COUNT(*) as total_orders FROM orders');
    const [messageStats] = await pool.query('SELECT COUNT(*) as total_messages FROM contact_messages');

    // Get recent orders
    const [recentOrders] = await pool.query(`
      SELECT o.id, o.total_amount, o.status, o.created_at,
             u.name as customer_name, u.email as customer_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC LIMIT 5
    `);

    // Get recent messages
    const [recentMessages] = await pool.query(`
      SELECT id, name, email, subject, created_at
      FROM contact_messages
      ORDER BY created_at DESC LIMIT 5
    `);

    // Get top selling products
    const [topProducts] = await pool.query(`
      SELECT p.name, p.price, p.image_url,
             COUNT(oi.id) as sales_count,
             SUM(oi.quantity * oi.price) as total_revenue
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.id
      ORDER BY sales_count DESC LIMIT 5
    `);

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
        totalUsers: userStats[0].total_users,
        totalProducts: productStats[0].total_products,
        totalOrders: orderStats[0].total_orders,
        totalMessages: messageStats[0].total_messages
      },
      recentOrders,
      recentMessages,
      topProducts
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('admin/dashboard', {
      title: 'Admin Dashboard - OMUNJU SHOPPERS',
      currentPage: 'dashboard',
      admin: {
        id: req.session.adminId,
        name: req.session.adminName,
        email: req.session.adminEmail,
        profile_picture: req.session.adminProfilePicture
      },
      stats: { totalUsers: 0, totalProducts: 0, totalOrders: 0, totalMessages: 0 },
      recentOrders: [],
      recentMessages: [],
      topProducts: []
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

    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);

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

// Placeholder routes for the admin panel sections
router.get('/products', requireAdminAuth, (req, res) => {
  res.render('admin/products', {
    title: 'Product Management - OMUNJU SHOPPERS',
    currentPage: 'products'
  });
});

router.get('/categories', requireAdminAuth, (req, res) => {
  res.render('admin/categories', {
    title: 'Category Management - OMUNJU SHOPPERS',
    currentPage: 'categories'
  });
});

router.get('/orders', requireAdminAuth, (req, res) => {
  res.render('admin/orders', {
    title: 'Order Management - OMUNJU SHOPPERS',
    currentPage: 'orders'
  });
});

router.get('/customers', requireAdminAuth, (req, res) => {
  res.render('admin/customers', {
    title: 'Customer Management - OMUNJU SHOPPERS',
    currentPage: 'customers'
  });
});

router.get('/promotions', requireAdminAuth, (req, res) => {
  res.render('admin/promotions', {
    title: 'Promotions & Deals - OMUNJU SHOPPERS',
    currentPage: 'promotions'
  });
});

router.get('/messages', requireAdminAuth, (req, res) => {
  res.render('admin/messages', {
    title: 'Messages & Support - OMUNJU SHOPPERS',
    currentPage: 'messages'
  });
});

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