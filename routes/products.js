const express = require('express');
const router = express.Router();
const pool = require('../db');
const { isAdmin } = require('../middleware/auth');
const Logger = require('../utils/logger');

// Admin routes for promotions management
router.get('/admin/promotions', isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Get all products with discount information
        const [products] = await pool.query(`
            SELECT
                p.*,
                ROUND(p.price * (1 - p.discount/100), 2) as discounted_price,
                ROUND(p.price * (p.discount/100), 2) as discount_amount
            FROM products p
            ORDER BY p.discount DESC, p.created_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        // Get total count
        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM products');

        const totalProducts = countResult[0].total;
        const totalPages = Math.ceil(totalProducts / limit);

        res.render('admin/promotions', {
            title: 'Promotions Management - OMUNJU SHOPPERS',
            currentPage: 'promotions',
            products,
            page,
            totalPages,
            totalProducts,
            limit
        });
    } catch (error) {
        console.error('Error fetching admin promotions:', error);
        res.status(500).render('error', { message: 'Failed to load promotions management' });
    }
});

// Update product discount (admin)
router.put('/:id/discount', isAdmin, async (req, res) => {
    try {
        const productId = req.params.id;
        const { discount } = req.body;
        const adminId = req.session.adminId;

        // Validate discount
        const discountValue = parseFloat(discount);
        if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
            return res.status(400).json({
                success: false,
                message: 'Discount must be between 0 and 100'
            });
        }

        // Update product discount
        await pool.query(
            'UPDATE products SET discount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [discountValue, productId]
        );

        // Log the action
        await Logger.activity(adminId, 'product_discount_updated',
            `Updated discount for product ID ${productId} to ${discountValue}%`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: 'Product discount updated successfully',
            newDiscount: discountValue
        });
    } catch (error) {
        console.error('Error updating product discount:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update product discount'
        });
    }
});

// Get all products with filters
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      search, 
      minPrice, 
      maxPrice, 
      sortBy, 
      isNew, 
      hasDiscount 
    } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    // Apply filters
    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (minPrice) {
      query += ' AND price >= ?';
      params.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      query += ' AND price <= ?';
      params.push(parseFloat(maxPrice));
    }

    if (isNew === 'true') {
      query += ' AND is_new = TRUE';
    }

    if (hasDiscount === 'true') {
      query += ' AND discount > 0';
    }

    // Apply sorting
    switch (sortBy) {
      case 'price-low':
        query += ' ORDER BY price ASC';
        break;
      case 'price-high':
        query += ' ORDER BY price DESC';
        break;
      case 'newest':
        query += ' ORDER BY created_at DESC';
        break;
      case 'discount':
        query += ' ORDER BY discount DESC';
        break;
      default:
        query += ' ORDER BY created_at DESC';
    }

    const [products] = await pool.query(query, params);

    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
});

// Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [products] = await pool.query(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      product: products[0]
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
});

// Get new products
router.get('/filter/new', async (req, res) => {
  try {
    const [products] = await pool.query(
      'SELECT * FROM products WHERE is_new = TRUE ORDER BY created_at DESC LIMIT 12'
    );

    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Get new products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch new products'
    });
  }
});

// Get discounted products
router.get('/filter/discounted', async (req, res) => {
  try {
    const [products] = await pool.query(
      'SELECT * FROM products WHERE discount > 0 ORDER BY discount DESC LIMIT 12'
    );

    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Get discounted products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch discounted products'
    });
  }
});

// Get product categories with counts
router.get('/categories/list', async (req, res) => {
  try {
    const [categories] = await pool.query(
      'SELECT category, COUNT(*) as count FROM products GROUP BY category'
    );

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// Category page - shows all products in a category
router.get('/category/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    // Convert slug back to category name (replace - with space)
    const categoryName = slug.replace(/-/g, ' ');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const sort = req.query.sort || 'newest';
    const offset = (page - 1) * limit;

    // Get products in this category
    let orderBy = 'p.created_at DESC';
    switch(sort) {
      case 'price_low':
        orderBy = 'p.price ASC';
        break;
      case 'price_high':
        orderBy = 'p.price DESC';
        break;
      case 'name':
        orderBy = 'p.name ASC';
        break;
    }

    const [products] = await pool.query(
      `SELECT p.*, 
              ROUND(p.price * (1 - p.discount/100), 2) as discounted_price
       FROM products p 
       WHERE p.category LIKE ? AND p.is_active = TRUE
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [`%${categoryName}%`, limit, offset]
    );

    // Get total count for pagination
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM products WHERE category LIKE ? AND is_active = TRUE',
      [`%${categoryName}%`]
    );

    // Get all categories for sidebar
    const [allCategories] = await pool.query(
      'SELECT category, COUNT(*) as count FROM products WHERE is_active = TRUE GROUP BY category'
    );

    const totalProducts = countResult[0].total;
    const totalPages = Math.ceil(totalProducts / limit);

    res.render('category', {
      title: `${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} - OMUNJU SHOPPERS`,
      category: categoryName,
      products,
      page,
      totalPages,
      totalProducts,
      limit,
      sort,
      categories: allCategories,
      user: req.session.userId ? { id: req.session.userId, name: req.session.userName } : null
    });
  } catch (error) {
    console.error('Category page error:', error);
    res.status(500).render('error', { message: 'Failed to load category page' });
  }
});

// Get all categories page
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await pool.query(
      'SELECT c.*, COUNT(p.id) as product_count FROM categories c LEFT JOIN products p ON c.id = p.category_id GROUP BY c.id ORDER BY c.name'
    );

    // Also get category counts from products table for any categories not in categories table
    const [productCategories] = await pool.query(
      'SELECT category as name, COUNT(*) as product_count FROM products WHERE category IS NOT NULL AND category != "" GROUP BY category'
    );

    res.render('categories', {
      title: 'Categories - OMUNJU SHOPPERS',
      categories,
      productCategories,
      user: req.session.userId ? { id: req.session.userId, name: req.session.userName } : null
    });
  } catch (error) {
    console.error('Categories page error:', error);
    res.status(500).render('error', { message: 'Failed to load categories page' });
  }
});

// Category page - shows all products in a category (direct route /category/:slug)
router.get('/category/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    // Convert slug back to category name (replace - with space)
    const categoryName = slug.replace(/-/g, ' ');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const sort = req.query.sort || 'newest';
    const offset = (page - 1) * limit;

    // Get products in this category
    let orderBy = 'p.created_at DESC';
    switch(sort) {
      case 'price_low':
        orderBy = 'p.price ASC';
        break;
      case 'price_high':
        orderBy = 'p.price DESC';
        break;
      case 'name':
        orderBy = 'p.name ASC';
        break;
    }

    const [products] = await pool.query(
      `SELECT p.*, 
              ROUND(p.price * (1 - p.discount/100), 2) as discounted_price
       FROM products p 
       WHERE p.category LIKE ? AND p.is_active = TRUE
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [`%${categoryName}%`, limit, offset]
    );

    // Get total count for pagination
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM products WHERE category LIKE ? AND is_active = TRUE',
      [`%${categoryName}%`]
    );

    // Get all categories for sidebar
    const [allCategories] = await pool.query(
      'SELECT category, COUNT(*) as count FROM products WHERE is_active = TRUE GROUP BY category'
    );

    const totalProducts = countResult[0].total;
    const totalPages = Math.ceil(totalProducts / limit);

    res.render('category', {
      title: `${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} - OMUNJU SHOPPERS`,
      category: categoryName,
      products,
      page,
      totalPages,
      totalProducts,
      limit,
      sort,
      categories: allCategories,
      user: req.session.userId ? { id: req.session.userId, name: req.session.userName } : null
    });
  } catch (error) {
    console.error('Category page error:', error);
    res.status(500).render('error', { message: 'Failed to load category page' });
  }
});

// Get promotions/deals page (discounted products)
router.get('/promotions', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const sort = req.query.sort || 'newest';
        const offset = (page - 1) * limit;

        let orderBy = 'p.created_at DESC';
        switch(sort) {
            case 'price_low':
                orderBy = 'p.price ASC';
                break;
            case 'price_high':
                orderBy = 'p.price DESC';
                break;
            case 'discount_high':
                orderBy = 'p.discount DESC';
                break;
            case 'name':
                orderBy = 'p.name ASC';
                break;
        }

        // Get discounted products
        const [products] = await db.query(`
            SELECT
                p.*,
                ROUND(p.price * (1 - p.discount/100), 2) as discounted_price,
                ROUND(p.price * (p.discount/100), 2) as discount_amount
            FROM products p
            WHERE p.discount > 0 AND p.stock > 0
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        // Get total count
        const [countResult] = await db.query(`
            SELECT COUNT(*) as total FROM products WHERE discount > 0 AND stock > 0
        `);

        const totalProducts = countResult[0].total;
        const totalPages = Math.ceil(totalProducts / limit);

        res.render('promotions', {
            title: 'Promotions & Deals - OMUNJU SHOPPERS',
            products,
            page,
            totalPages,
            totalProducts,
            limit,
            sort,
            user: req.session.userId ? {
                id: req.session.userId,
                name: req.session.userName,
                email: req.session.userEmail
            } : null
        });
    } catch (error) {
        console.error('Error fetching promotions:', error);
        res.status(500).render('error', { message: 'Failed to load promotions' });
    }
});

// Get deals page (alias for promotions)
router.get('/deals', (req, res) => {
    res.redirect('/promotions');
});

module.exports = router;
