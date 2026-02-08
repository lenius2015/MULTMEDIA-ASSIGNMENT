/**
 * Categories API Routes
 * Production-level category management with filtering, sorting, and pagination
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/categories
 * Get all categories with optional filters
 */
router.get('/', async (req, res) => {
    try {
        const { 
            active = 'true',
            featured,
            parent_id,
            limit = 50,
            offset = 0 
        } = req.query;

        let query = `
            SELECT c.*, 
                   (SELECT COUNT(*) FROM categories WHERE parent_id = c.id) as subcategory_count
            FROM categories c
            WHERE 1=1
        `;
        
        const params = [];

        if (active === 'true') {
            query += ' AND c.is_active = TRUE';
        }
        
        if (featured === 'true') {
            query += ' AND c.is_featured = TRUE';
        }
        
        if (parent_id) {
            query += ' AND c.parent_id = ?';
            params.push(parseInt(parent_id));
        }

        query += ' ORDER BY c.sort_order ASC, c.name ASC';
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [categories] = await db.query(query, params);

        res.json({
            success: true,
            categories,
            meta: {
                count: categories.length,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories'
        });
    }
});

/**
 * GET /api/categories/:slug
 * Get single category by slug with breadcrumb
 */
router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        // Get category
        const [categories] = await db.query(
            'SELECT * FROM categories WHERE slug = ? AND is_active = TRUE',
            [slug]
        );

        if (categories.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        const category = categories[0];

        // Get breadcrumb path
        const breadcrumb = await getBreadcrumb(category.id);

        // Get subcategories
        const [subcategories] = await db.query(
            'SELECT * FROM categories WHERE parent_id = ? AND is_active = TRUE ORDER BY sort_order ASC',
            [category.id]
        );

        // Get parent category
        let parent = null;
        if (category.parent_id) {
            const [parents] = await db.query(
                'SELECT id, name, slug FROM categories WHERE id = ?',
                [category.parent_id]
            );
            parent = parents[0] || null;
        }

        res.json({
            success: true,
            category: {
                ...category,
                breadcrumb,
                parent
            },
            subcategories
        });
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category'
        });
    }
});

/**
 * GET /api/categories/:slug/products
 * Get products in a category with filtering, sorting, pagination
 */
router.get('/:slug/products', async (req, res) => {
    try {
        const { slug } = req.params;
        const {
            page = 1,
            limit = 12,
            sortBy = 'newest',
            minPrice,
            maxPrice,
            brand,
            rating,
            inStock,
            search
        } = req.query;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        // Get category
        const [categories] = await db.query(
            'SELECT id, name FROM categories WHERE slug = ? AND is_active = TRUE',
            [slug]
        );

        if (categories.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        const category = categories[0];

        // Get all subcategory IDs for this category
        const [allCategories] = await db.query(
            `WITH RECURSIVE subcats AS (
                SELECT id FROM categories WHERE id = ?
                UNION ALL
                SELECT c.id FROM categories c
                INNER JOIN subcats s ON c.parent_id = s.id
            ) SELECT id FROM subcats`,
            [category.id]
        );
        const categoryIds = allCategories.map(c => c.id);

        // Build products query with filters
        let whereClause = 'WHERE p.is_active = TRUE AND p.category IN (?)';
        const queryParams = [categoryIds];

        // Price filter
        if (minPrice) {
            whereClause += ' AND p.price >= ?';
            queryParams.push(parseFloat(minPrice));
        }
        if (maxPrice) {
            whereClause += ' AND p.price <= ?';
            queryParams.push(parseFloat(maxPrice));
        }

        // Brand filter
        if (brand) {
            whereClause += ' AND b.slug = ?';
            queryParams.push(brand);
        }

        // Rating filter
        if (rating) {
            whereClause += ' AND p.rating >= ?';
            queryParams.push(parseFloat(rating));
        }

        // Stock filter
        if (inStock === 'true') {
            whereClause += ' AND p.stock > 0';
        }

        // Search filter
        if (search) {
            whereClause += ' AND (p.name LIKE ? OR p.description LIKE ?)';
            queryParams.push(`%${search}%`, `%${search}%`);
        }

        // Sorting
        let orderBy = 'p.created_at DESC';
        switch (sortBy) {
            case 'price-low':
                orderBy = 'p.price ASC';
                break;
            case 'price-high':
                orderBy = 'p.price DESC';
                break;
            case 'rating':
                orderBy = 'p.rating DESC, p.review_count DESC';
                break;
            case 'popularity':
                orderBy = 'p.review_count DESC, p.rating DESC';
                break;
            case 'newest':
            default:
                orderBy = 'p.created_at DESC';
                break;
        }

        // Count total products
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM products p 
            LEFT JOIN brands b ON p.brand_id = b.id
            ${whereClause}
        `;
        const [countResult] = await db.query(countQuery, queryParams);
        const totalProducts = countResult[0].total;
        const totalPages = Math.ceil(totalProducts / limitNum);

        // Get products
        const productsQuery = `
            SELECT p.*, 
                   b.name as brand_name,
                   b.slug as brand_slug,
                   ROUND(p.price * (1 - p.discount/100), 2) as discounted_price,
                   ROUND(p.price * (p.discount/100), 2) as discount_amount
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            ${whereClause}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `;
        
        const productsParams = [...queryParams, limitNum, offset];
        const [products] = await db.query(productsQuery, productsParams);

        // Get available filters
        const filters = await getFilters(categoryIds);

        res.json({
            success: true,
            category: { id: category.id, name: category.name, slug },
            products,
            filters,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalProducts,
                totalPages,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1
            },
            sortOptions: [
                { value: 'newest', label: 'Newest Arrivals' },
                { value: 'price-low', label: 'Price: Low to High' },
                { value: 'price-high', label: 'Price: High to Low' },
                { value: 'rating', label: 'Highest Rated' },
                { value: 'popularity', label: 'Most Popular' }
            ]
        });
    } catch (error) {
        console.error('Error fetching category products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products'
        });
    }
});

/**
 * GET /api/categories/brands/list
 * Get all brands for filter sidebar
 */
router.get('/brands/list', async (req, res) => {
    try {
        const [brands] = await db.query(`
            SELECT b.*, 
                   COUNT(p.id) as product_count
            FROM brands b
            LEFT JOIN products p ON p.brand_id = b.id AND p.is_active = TRUE
            WHERE b.is_active = TRUE
            GROUP BY b.id
            ORDER BY b.name ASC
        `);

        res.json({
            success: true,
            brands
        });
    } catch (error) {
        console.error('Error fetching brands:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch brands'
        });
    }
});

/**
 * GET /api/categories/breadcrumb/:categoryId
 * Get breadcrumb for a category
 */
router.get('/breadcrumb/:categoryId', async (req, res) => {
    try {
        const { categoryId } = req.params;
        const breadcrumb = await getBreadcrumb(parseInt(categoryId));

        res.json({
            success: true,
            breadcrumb
        });
    } catch (error) {
        console.error('Error fetching breadcrumb:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch breadcrumb'
        });
    }
});

/**
 * GET /api/categories/tree
 * Get full category tree structure
 */
router.get('/tree/all', async (req, res) => {
    try {
        const [categories] = await db.query(`
            SELECT c.*, 
                   (SELECT COUNT(*) FROM categories WHERE parent_id = c.id) as subcategory_count,
                   (SELECT COUNT(*) FROM products p WHERE p.category = c.name AND p.is_active = TRUE) as product_count
            FROM categories c
            WHERE c.is_active = TRUE AND c.parent_id IS NULL
            ORDER BY c.sort_order ASC
        `);

        // Get subcategories for each main category
        for (const cat of categories) {
            const [subcats] = await db.query(`
                SELECT c.*,
                       (SELECT COUNT(*) FROM products p WHERE p.category = c.name AND p.is_active = TRUE) as product_count
                FROM categories c
                WHERE c.parent_id = ? AND c.is_active = TRUE
                ORDER BY c.sort_order ASC
            `, [cat.id]);
            cat.subcategories = subcats;
        }

        res.json({
            success: true,
            tree: categories
        });
    } catch (error) {
        console.error('Error fetching category tree:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category tree'
        });
    }
});

// Helper function: Get breadcrumb path
async function getBreadcrumb(categoryId) {
    const breadcrumb = [];
    let currentId = categoryId;

    while (currentId) {
        const [cats] = await db.query(
            'SELECT id, name, slug, parent_id FROM categories WHERE id = ?',
            [currentId]
        );
        
        if (cats.length === 0) break;
        
        const cat = cats[0];
        breadcrumb.unshift({
            id: cat.id,
            name: cat.name,
            slug: cat.slug
        });
        
        currentId = cat.parent_id;
    }

    return breadcrumb;
}

// Helper function: Get available filters for category
async function getFilters(categoryIds) {
    try {
        // Price range
        const [priceRange] = await db.query(
            `SELECT MIN(price) as min_price, MAX(price) as max_price 
             FROM products 
             WHERE category IN (?) AND is_active = TRUE`,
            [categoryIds]
        );

        // Available brands
        const [brands] = await db.query(`
            SELECT DISTINCT b.id, b.name, b.slug
            FROM brands b
            INNER JOIN products p ON p.brand_id = b.id
            WHERE p.category IN (?) AND p.is_active = TRUE AND b.is_active = TRUE
            ORDER BY b.name ASC
        `, [categoryIds]);

        // Available ratings
        const [ratings] = await db.query(`
            SELECT DISTINCT ROUND(rating, 0) as rating
            FROM products
            WHERE category IN (?) AND is_active = TRUE AND rating > 0
            ORDER BY rating DESC
        `, [categoryIds]);

        return {
            priceRange: priceRange[0] || { min_price: 0, max_price: 1000 },
            brands: brands,
            ratings: ratings.map(r => r.rating),
            availability: [
                { value: 'true', label: 'In Stock' }
            ]
        };
    } catch (error) {
        console.error('Error getting filters:', error);
        return { priceRange: { min_price: 0, max_price: 1000 }, brands: [], ratings: [] };
    }
}

module.exports = router;
