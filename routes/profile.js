const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { isAuthenticated } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/uploads/profiles');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + req.session.userId + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Profile page view
router.get('/view', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;

        // Get user basic info
        const [users] = await pool.query(
            'SELECT id, name, email, phone, address, role, profile_picture, created_at FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.redirect('/login');
        }

        // Get user's order history
        const [orders] = await pool.query(`
            SELECT
                o.id,
                o.total_amount,
                o.status,
                o.created_at,
                COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT 10
        `, [userId]);

        // Get user's cart count
        const [cartCount] = await pool.query(
            'SELECT COUNT(*) as count FROM cart WHERE user_id = ?',
            [userId]
        );

        res.render('profile', {
            title: 'My Profile - OMUNJU SHOPPERS',
            user: users[0],
            orders: orders,
            cartCount: cartCount[0].count
        });
    } catch (error) {
        console.error('Profile view error:', error);
        res.status(500).render('error', { message: 'Failed to load profile' });
    }
});

// Profile picture upload
router.post('/picture', isAuthenticated, upload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const userId = req.session.userId;
        const profilePicturePath = '/uploads/profiles/' + req.file.filename;

        // Update user profile picture in database
        await pool.query(
            'UPDATE users SET profile_picture = ? WHERE id = ?',
            [profilePicturePath, userId]
        );

        // Update session so header avatar reflects immediately
        req.session.userProfilePicture = profilePicturePath;

        res.json({
            success: true,
            message: 'Profile picture updated successfully',
            imageUrl: profilePicturePath
        });
    } catch (error) {
        console.error('Profile picture upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload profile picture'
        });
    }
});

// Get user profile data
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get user basic info
    const [users] = await pool.query(
      'SELECT id, name, email, phone, address, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's order history
    const [orders] = await pool.query(`
      SELECT
        o.id,
        o.total_amount,
        o.status,
        o.created_at,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `, [userId]);

    // Get user's cart count
    const [cartCount] = await pool.query(
      'SELECT COUNT(*) as count FROM cart WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      user: users[0],
      orders: orders,
      cartCount: cartCount[0].count
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile data'
    });
  }
});

// Update user profile
router.put('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { name, phone, address, currentPassword, newPassword } = req.body;

    // Basic validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    let updateData = { name, phone, address };
    let passwordChanged = false;

    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to change password'
        });
      }

      // Verify current password
      const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateData.password = hashedPassword;
      passwordChanged = true;
    }

    // Update user profile
    await pool.query(
      'UPDATE users SET name = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, phone || null, address || null, userId]
    );

    // Update password if changed
    if (passwordChanged) {
      await pool.query(
        'UPDATE users SET password = ? WHERE id = ?',
        [updateData.password, userId]
      );
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      passwordChanged: passwordChanged
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Get user's cart items
router.get('/cart', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;

    const [cartItems] = await pool.query(`
      SELECT
        c.id,
        c.quantity,
        c.created_at,
        p.id as product_id,
        p.name,
        p.price,
        p.discount,
        p.image_url,
        p.stock,
        (p.price - (p.price * p.discount / 100)) as discounted_price,
        (c.quantity * (p.price - (p.price * p.discount / 100))) as total
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `, [userId]);

    // Calculate total
    const total = cartItems.reduce((sum, item) => sum + item.total, 0);

    res.json({
      success: true,
      cart: cartItems,
      total: total.toFixed(2),
      itemCount: cartItems.length
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart'
    });
  }
});

// Update cart item quantity
router.put('/cart/:productId', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    // Check if product exists and has stock
    const [products] = await pool.query(
      'SELECT stock FROM products WHERE id = ?',
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (products[0].stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock'
      });
    }

    // Update cart item
    const [result] = await pool.query(
      'UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?',
      [quantity, userId, productId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    res.json({
      success: true,
      message: 'Cart item updated'
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart item'
    });
  }
});

// Remove item from cart
router.delete('/cart/:productId', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { productId } = req.params;

    const [result] = await pool.query(
      'DELETE FROM cart WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    res.json({
      success: true,
      message: 'Item removed from cart'
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart'
    });
  }
});

// Clear entire cart
router.delete('/cart', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;

    await pool.query(
      'DELETE FROM cart WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Cart cleared'
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart'
    });
  }
});

module.exports = router;