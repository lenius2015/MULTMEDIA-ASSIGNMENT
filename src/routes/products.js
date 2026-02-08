/**
 * Product Routes
 * API endpoints for products
 */

const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const { authMiddleware, isVendor } = require('../middleware/auth');
const { validatePagination, validateBody } = require('../middleware/validators');

/**
 * GET /api/products
 * Get all products with filters and pagination
 */
router.get('/', validatePagination, ProductController.getAll);

/**
 * GET /api/products/featured
 * Get featured products
 */
router.get('/featured', ProductController.getFeatured);

/**
 * GET /api/products/categories
 * Get all product categories
 */
router.get('/categories', ProductController.getCategories);

/**
 * GET /api/products/category/:name
 * Get products by category
 */
router.get('/category/:name', validatePagination, ProductController.getByCategory);

/**
 * POST /api/products
 * Create new product (vendor/admin only)
 */
router.post('/', authMiddleware, isVendor, validateBody(['name', 'price', 'stock']), ProductController.create);

/**
 * GET /api/products/:id
 * Get single product
 */
router.get('/:id', ProductController.getOne);

/**
 * PUT /api/products/:id
 * Update product (vendor/admin only)
 */
router.put('/:id', authMiddleware, isVendor, ProductController.update);

module.exports = router;
