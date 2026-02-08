/**
 * Home Page API Routes
 * Provides all data needed for the e-commerce home page
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAuthenticated } = require('../middleware/auth');

// GET /api/home - Get all home page data
router.get('/', async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.session?.userId;

        // Get featured products (top 8 with discounts or new arrivals)
        const [featuredProducts] = await db.query(`
            SELECT p.*, 
                   ROUND(p.price * (1 - p.discount/100), 2) as discounted_price,
                   v.name as vendor_name
            FROM products p
            LEFT JOIN users v ON p.vendor_id = v.id
            WHERE p.is_active = TRUE AND p.stock > 0
            ORDER BY p.created_at DESC
            LIMIT 8
        `);

        // Get categories with product counts
        const [categories] = await db.query(`
            SELECT c.*, COUNT(p.id) as product_count 
            FROM categories c 
            LEFT JOIN products p ON c.name = p.category AND p.is_active = TRUE
            WHERE c.is_active = TRUE
            GROUP BY c.id
            ORDER BY c.sort_order ASC
            LIMIT 6
        `);

        // Get deals of the day (products with discounts)
        const [deals] = await db.query(`
            SELECT p.*, 
                   ROUND(p.price * (1 - p.discount/100), 2) as discounted_price
            FROM products p
            WHERE p.is_active = TRUE AND p.discount > 0 AND p.stock > 0
            ORDER BY p.discount DESC
            LIMIT 6
        `);

        // Get active promotions
        const [promotions] = await db.query(`
            SELECT * FROM promotions 
            WHERE is_active = TRUE AND start_date <= NOW() AND end_date >= NOW()
            ORDER BY sort_order ASC
            LIMIT 6
        `);

        // Get hero banner
        const [banners] = await db.query(`
            SELECT * FROM hero_banners 
            WHERE is_active = TRUE AND (start_date IS NULL OR start_date <= NOW()) 
            AND (end_date IS NULL OR end_date >= NOW())
            ORDER BY sort_order ASC
            LIMIT 1
        `);
        const heroBanner = banners[0] || null;

        // Get active auctions
        const [auctions] = await db.query(`
            SELECT a.*, p.name as product_name, p.image_url as product_image,
                   (SELECT MAX(bid_amount) FROM auction_bids WHERE auction_id = a.id) as current_bid
            FROM auctions a
            LEFT JOIN products p ON a.product_id = p.id
            WHERE a.status = 'active' AND a.end_date > NOW()
            ORDER BY a.end_date ASC
            LIMIT 4
        `);

        // Get active countdown event for homepage
        const [countdownEvents] = await db.query(`
            SELECT * FROM countdown_events 
            WHERE is_active = TRUE AND display_on_homepage = TRUE 
            AND start_date <= NOW() AND end_date >= NOW()
            ORDER BY end_date ASC
            LIMIT 1
        `);
        const countdown = countdownEvents[0] || null;

        // Get wishlist items for authenticated user
        let wishlistIds = [];
        if (userId) {
            const [wishlist] = await db.query(
                'SELECT product_id FROM wishlist WHERE user_id = ?',
                [userId]
            );
            wishlistIds = wishlist.map(item => item.product_id);
        }

        res.json({
            success: true,
            data: {
                hero: heroBanner,
                featured: featuredProducts,
                categories: categories.length > 0 ? categories : getDefaultCategories(),
                deals,
                promotions,
                auctions,
                countdown,
                wishlistIds
            }
        });
    } catch (error) {
        console.error('Error fetching home data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch home page data'
        });
    }
});

// GET /api/home/featured - Get featured products
router.get('/featured', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 8;
        const [products] = await db.query(`
            SELECT p.*, 
                   ROUND(p.price * (1 - p.discount/100), 2) as discounted_price,
                   v.name as vendor_name
            FROM products p
            LEFT JOIN users v ON p.vendor_id = v.id
            WHERE p.is_active = TRUE AND p.stock > 0
            ORDER BY p.created_at DESC
            LIMIT ?
        `, [limit]);

        res.json({ success: true, products });
    } catch (error) {
        console.error('Error fetching featured products:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch featured products' });
    }
});

// GET /api/home/categories - Get categories
router.get('/categories', async (req, res) => {
    try {
        const [categories] = await db.query(`
            SELECT c.*, COUNT(p.id) as product_count 
            FROM categories c 
            LEFT JOIN products p ON c.name = p.category AND p.is_active = TRUE
            WHERE c.is_active = TRUE
            GROUP BY c.id
            ORDER BY c.sort_order ASC
        `);

        res.json({ 
            success: true, 
            categories: categories.length > 0 ? categories : getDefaultCategories() 
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.json({ 
            success: true, 
            categories: getDefaultCategories() 
        });
    }
});

// GET /api/home/deals - Get deals of the day
router.get('/deals', async (req, res) => {
    try {
        const [deals] = await db.query(`
            SELECT p.*, 
                   ROUND(p.price * (1 - p.discount/100), 2) as discounted_price
            FROM products p
            WHERE p.is_active = TRUE AND p.discount > 0 AND p.stock > 0
            ORDER BY p.discount DESC
            LIMIT 10
        `);

        res.json({ success: true, deals });
    } catch (error) {
        console.error('Error fetching deals:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch deals' });
    }
});

// GET /api/home/promotions - Get promotions
router.get('/promotions', async (req, res) => {
    try {
        const [promotions] = await db.query(`
            SELECT * FROM promotions 
            WHERE is_active = TRUE AND start_date <= NOW() AND end_date >= NOW()
            ORDER BY sort_order ASC
        `);

        res.json({ success: true, promotions });
    } catch (error) {
        console.error('Error fetching promotions:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch promotions' });
    }
});

// GET /api/home/auctions - Get live auctions
router.get('/auctions', async (req, res) => {
    try {
        const [auctions] = await db.query(`
            SELECT a.*, p.name as product_name, p.image_url as product_image,
                   (SELECT MAX(bid_amount) FROM auction_bids WHERE auction_id = a.id) as current_bid
            FROM auctions a
            LEFT JOIN products p ON a.product_id = p.id
            WHERE a.status = 'active' AND a.end_date > NOW()
            ORDER BY a.end_date ASC
            LIMIT 6
        `);

        res.json({ success: true, auctions });
    } catch (error) {
        console.error('Error fetching auctions:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch auctions' });
    }
});

// GET /api/home/countdown - Get countdown for deals
router.get('/countdown', async (req, res) => {
    try {
        const [events] = await db.query(`
            SELECT * FROM countdown_events 
            WHERE is_active = TRUE AND display_on_homepage = TRUE 
            AND start_date <= NOW() AND end_date >= NOW()
            ORDER BY end_date ASC
            LIMIT 1
        `);

        res.json({ success: true, event: events[0] || null });
    } catch (error) {
        console.error('Error fetching countdown:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch countdown' });
    }
});

// GET /api/home/hero - Get hero banner
router.get('/hero', async (req, res) => {
    try {
        const [banners] = await db.query(`
            SELECT * FROM hero_banners 
            WHERE is_active = TRUE AND (start_date IS NULL OR start_date <= NOW()) 
            AND (end_date IS NULL OR end_date >= NOW())
            ORDER BY sort_order ASC
            LIMIT 1
        `);

        res.json({ success: true, banner: banners[0] || null });
    } catch (error) {
        console.error('Error fetching hero banner:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch hero banner' });
    }
});

// GET /api/home/search - Real-time search
router.get('/search', async (req, res) => {
    try {
        const { q, limit = 6 } = req.query;
        
        if (!q || q.trim().length < 2) {
            return res.json({ success: true, products: [] });
        }

        const searchTerm = `%${q}%`;
        const [products] = await db.query(`
            SELECT p.id, p.name, p.price, p.discount, p.image_url, p.stock,
                   ROUND(p.price * (1 - p.discount/100), 2) as discounted_price,
                   c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category = c.name
            WHERE p.is_active = TRUE AND p.stock > 0
            AND (p.name LIKE ? OR p.description LIKE ? OR p.category LIKE ?)
            ORDER BY 
                CASE WHEN p.name LIKE ? THEN 0 ELSE 1 END,
                p.created_at DESC
            LIMIT ?
        `, [searchTerm, searchTerm, searchTerm, searchTerm, parseInt(limit)]);

        res.json({ success: true, products });
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ success: false, message: 'Search failed' });
    }
});

// GET /api/home/product/:id/stock - Get live stock availability
router.get('/product/:id/stock', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [products] = await db.query(
            'SELECT id, name, stock, is_active FROM products WHERE id = ?',
            [id]
        );

        if (products.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const product = products[0];
        res.json({
            success: true,
            stock: {
                available: product.stock,
                status: product.stock === 0 ? 'out_of_stock' : 
                       product.stock < 10 ? 'low_stock' : 'in_stock',
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error fetching stock:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stock' });
    }
});

// Helper function to return default categories if database table is empty
function getDefaultCategories() {
    return [
        { id: 1, name: 'Electronics', product_count: 15, image_url: '/images/category-electronics.jpg' },
        { id: 2, name: 'Fashion', product_count: 25, image_url: '/images/category-fashion.jpg' },
        { id: 3, name: 'Home & Living', product_count: 12, image_url: '/images/category-home.jpg' },
        { id: 4, name: 'Sports', product_count: 8, image_url: '/images/category-sports.jpg' },
        { id: 5, name: 'Beauty', product_count: 18, image_url: '/images/category-beauty.jpg' },
        { id: 6, name: 'Books', product_count: 22, image_url: '/images/category-books.jpg' }
    ];
}

module.exports = router;
