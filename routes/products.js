/**
 * Products API Route
 * Handles product listing with filtering, sorting, and pagination
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

// ============================================
// GET /api/products
// Query Parameters:
//   - category: Filter by category slug
//   - minPrice: Minimum price filter
//   - maxPrice: Maximum price filter
//   - brand: Filter by brand name
//   - rating: Minimum rating filter (1-5)
//   - sort: Sort order (newest, price_low, price_high, bestselling, rating)
//   - page: Page number (default: 1)
//   - limit: Items per page (default: 12)
// ============================================
router.get('/', async (req, res) => {
    try {
        // Extract query parameters
        const {
            category,
            minPrice,
            maxPrice,
            sort = 'newest',
            page = 1,
            limit = 12
        } = req.query;

        // Build SQL query with conditions
        let query = `
            SELECT 
                p.id,
                p.name,
                p.slug,
                p.description,
                p.price,
                p.discount,
                p.image_url as image,
                p.category,
                p.stock as stockQuantity,
                COALESCE(p.is_new, 0) as isNew,
                p.created_at as createdAt,
                p.updated_at as updatedAt
            FROM products p
            WHERE p.id IS NOT NULL
        `;

        const params = [];

        // Category filter
        if (category && category !== 'all') {
            if (category === 'deals') {
                query += ` AND p.discount > 0`;
            } else if (category === 'new_arrivals') {
                query += ` AND p.is_new = 1`;
            } else {
                query += ` AND p.category = ?`;
                params.push(category);
            }
        }

        // Price range filter
        if (minPrice) {
            query += ` AND p.price >= ?`;
            params.push(parseFloat(minPrice));
        }

        if (maxPrice) {
            query += ` AND p.price <= ?`;
            params.push(parseFloat(maxPrice));
        }

        // Brand filter (remove as column doesn't exist)
        // if (brand) {
        //     query += ` AND p.brand = ?`;
        //     params.push(brand);
        // }

        // Rating filter (remove as column doesn't exist)
        // if (rating) {
        //     query += ` AND p.rating >= ?`;
        //     params.push(parseFloat(rating));
        // }

        // Get total count
        const countQuery = query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as total FROM');
        const [countResult] = await db.query(countQuery, params);
        const total = countResult[0]?.total || 0;

        // Sorting
        switch (sort) {
            case 'price_low':
                query += ` ORDER BY p.price ASC`;
                break;
            case 'price_high':
                query += ` ORDER BY p.price DESC`;
                break;
            case 'bestselling':
                query += ` ORDER BY p.review_count DESC`;
                break;
            case 'rating':
                query += ` ORDER BY p.rating DESC`;
                break;
            case 'newest':
            default:
                query += ` ORDER BY p.created_at DESC`;
                break;
        }

        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        // Execute query
        const [products] = await db.query(query, params);

        // Calculate total pages
        const totalPages = Math.ceil(total / parseInt(limit));

        // Format response
        res.json({
            success: true,
            products: products.map(formatProduct),
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems: total,
                itemsPerPage: parseInt(limit),
                hasNextPage: parseInt(page) < totalPages,
                hasPrevPage: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Products API Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================
// GET /api/products/:id
// Get single product by ID
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                p.*,
                c.name as category,
                c.slug as categorySlug
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ? AND p.is_active = 1
        `;

        const [products] = await db.query(query, [id]);

        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            product: formatProduct(products[0])
        });

    } catch (error) {
        console.error('Product Details API Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================
// GET /api/categories
// Get all categories
// ============================================
router.get('/categories/list', async (req, res) => {
    try {
        const query = `
            SELECT 
                id,
                name,
                slug,
                description,
                image,
                parent_id as parentId,
                sort_order as sortOrder,
                is_active as isActive
            FROM categories
            WHERE is_active = 1
            ORDER BY sort_order ASC, name ASC
        `;

        const [categories] = await db.query(query);

        res.json({
            success: true,
            categories
        });

    } catch (error) {
        console.error('Categories API Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================
// GET /api/brands
// Get all brands
// ============================================
router.get('/brands/list', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT brand,
                COUNT(*) as productCount
            FROM products
            WHERE is_active = 1 AND brand IS NOT NULL
            GROUP BY brand
            ORDER BY productCount DESC
        `;

        const [brands] = await db.query(query);

        res.json({
            success: true,
            brands: brands.map(b => b.brand)
        });

    } catch (error) {
        console.error('Brands API Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch brands',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================
// Helper: Format product for response
// ============================================
function formatProduct(product) {
    return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: parseFloat(product.price) || 0,
        oldPrice: product.oldPrice ? parseFloat(product.oldPrice) : null,
        image: product.image,
        images: product.images ? JSON.parse(product.images) : [],
        category: product.category,
        categorySlug: product.categorySlug,
        brand: product.brand,
        rating: parseFloat(product.rating) || 0,
        reviews: product.reviewCount || 0,
        stockQuantity: product.stockQuantity || 0,
        inStock: (product.stockQuantity || 0) > 0,
        isDeal: product.isDeal === 1,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
    };
}

// ============================================
// GET /api/brands
// Get all brands (shortcut endpoint)
// ============================================
router.get('/brands', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT brand,
                COUNT(*) as productCount
            FROM products
            WHERE is_active = 1 AND brand IS NOT NULL
            GROUP BY brand
            ORDER BY productCount DESC
        `;

        const [brands] = await db.query(query);

        res.json({
            success: true,
            brands: brands.map(b => b.brand)
        });

    } catch (error) {
        console.error('Brands API Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch brands',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
