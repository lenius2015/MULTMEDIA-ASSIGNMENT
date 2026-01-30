const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdminAuth } = require('../middleware/adminAuth');
const Logger = require('../utils/logger');

// Get all auctions with pagination and filtering
router.get('/', requireAdminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status || 'all';
        const offset = (page - 1) * limit;

        let whereClause = '';
        let params = [];

        if (status !== 'all') {
            whereClause = 'WHERE a.status = ?';
            params.push(status);
        }

        // Get auctions with winner info and product details
        const [auctions] = await db.query(`
            SELECT
                a.*,
                p.name as product_name,
                p.price as product_price,
                p.image_url as product_image,
                u.name as winner_name,
                adm.name as created_by_name,
                (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) as total_bids,
                (SELECT COUNT(DISTINCT b.user_id) FROM bids b WHERE b.auction_id = a.id) as total_bidders,
                (SELECT MAX(bid_amount) FROM bids b WHERE b.auction_id = a.id) as highest_bid
            FROM auctions a
            LEFT JOIN products p ON a.product_id = p.id
            LEFT JOIN users u ON a.winner_user_id = u.id
            LEFT JOIN admins adm ON a.created_by = adm.id
            ${whereClause}
            ORDER BY a.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        // Get total count
        const [countResult] = await db.query(`
            SELECT COUNT(*) as total FROM auctions a ${whereClause}
        `, params);

        const totalAuctions = countResult[0].total;
        const totalPages = Math.ceil(totalAuctions / limit);

        res.render('admin/auctions', {
            title: 'Auction Management - OMUNJU SHOPPERS',
            currentPage: 'auctions',
            auctions,
            page,
            totalPages,
            totalAuctions,
            limit,
            status
        });
    } catch (error) {
        console.error('Error fetching auctions:', error);
        res.status(500).render('error', { message: 'Failed to load auctions' });
    }
});

// Get auction creation form
router.get('/create', requireAdminAuth, async (req, res) => {
    try {
        // Get available products for auction
        const [products] = await db.query(`
            SELECT id, name, price, stock, image_url
            FROM products
            WHERE stock > 0
            ORDER BY name ASC
        `);

        res.render('admin/auction-create', {
            title: 'Create Auction - OMUNJU SHOPPERS',
            currentPage: 'auctions',
            products
        });
    } catch (error) {
        console.error('Error loading auction creation form:', error);
        res.status(500).render('error', { message: 'Failed to load auction form' });
    }
});

// Create new auction
router.post('/create', requireAdminAuth, async (req, res) => {
    try {
        const {
            product_id,
            title,
            description,
            starting_bid,
            bid_increment,
            reserve_price,
            start_date,
            end_date
        } = req.body;

        const adminId = req.session.adminId;

        // Validate required fields
        if (!product_id || !title || !starting_bid || !bid_increment || !start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in all required fields'
            });
        }

        // Validate numeric fields
        const startingBid = parseFloat(starting_bid);
        const bidIncrement = parseFloat(bid_increment);
        const reservePrice = reserve_price ? parseFloat(reserve_price) : null;

        if (startingBid <= 0 || bidIncrement <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Starting bid and bid increment must be greater than 0'
            });
        }

        if (reservePrice !== null && reservePrice <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Reserve price must be greater than 0'
            });
        }

        // Validate dates
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        const now = new Date();

        if (startDate <= now) {
            return res.status(400).json({
                success: false,
                message: 'Start date must be in the future'
            });
        }

        if (endDate <= startDate) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date'
            });
        }

        // Get product details
        const [products] = await db.query('SELECT * FROM products WHERE id = ?', [product_id]);
        if (products.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Selected product not found'
            });
        }

        const product = products[0];

        // Create auction
        const [result] = await db.query(`
            INSERT INTO auctions (
                product_id, title, description, starting_bid, current_bid,
                bid_increment, reserve_price, start_date, end_date,
                status, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, CURRENT_TIMESTAMP)
        `, [
            product_id, title, description || '', startingBid, startingBid,
            bidIncrement, reservePrice, start_date, end_date, adminId
        ]);

        // Log the action
        console.log(`Admin ${adminId} created auction "${title}" for product "${product.name}"`);

        res.json({
            success: true,
            message: 'Auction created successfully',
            auctionId: result.insertId
        });
    } catch (error) {
        console.error('Error creating auction:', error);
        console.error('Error stack:', error.stack);
        console.error('Error message:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to create auction',
            error: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
});

// Get auction details
router.get('/:id', requireAdminAuth, async (req, res) => {
    try {
        const auctionId = req.params.id;

        // Get auction details
        const [auctions] = await db.query(`
            SELECT
                a.*,
                u.name as winner_name,
                u.email as winner_email,
                adm.name as created_by_name
            FROM auctions a
            LEFT JOIN users u ON a.winner_user_id = u.id
            LEFT JOIN admins adm ON a.created_by = adm.id
            WHERE a.id = ?
        `, [auctionId]);

        if (auctions.length === 0) {
            return res.status(404).render('error', { message: 'Auction not found' });
        }

        const auction = auctions[0];

        // Get bids for this auction
        const [bids] = await db.query(`
            SELECT
                b.*,
                u.name as bidder_name,
                u.email as bidder_email
            FROM bids b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.auction_id = ?
            ORDER BY b.bid_amount DESC, b.created_at ASC
        `, [auctionId]);

        res.render('admin/auction-detail', {
            title: `Auction: ${auction.title} - OMUNJU SHOPPERS`,
            currentPage: 'auctions',
            auction,
            bids
        });
    } catch (error) {
        console.error('Error fetching auction details:', error);
        res.status(500).render('error', { message: 'Failed to load auction details' });
    }
});

// Update auction status
router.put('/:id/status', requireAdminAuth, async (req, res) => {
    try {
        const auctionId = req.params.id;
        const { status } = req.body;
        const adminId = req.session.adminId;

        const validStatuses = ['draft', 'active', 'ended', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        // Get current auction
        const [auctions] = await db.query('SELECT * FROM auctions WHERE id = ?', [auctionId]);
        if (auctions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Auction not found'
            });
        }

        const auction = auctions[0];

        // If ending auction, determine winner
        if (status === 'ended') {
            const [highestBid] = await db.query(
                'SELECT user_id, bid_amount FROM bids WHERE auction_id = ? ORDER BY bid_amount DESC LIMIT 1',
                [auctionId]
            );

            if (highestBid.length > 0) {
                // Update auction with winner
                await db.query(
                    'UPDATE auctions SET status = ?, winner_id = ?, winning_bid = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    ['ended', highestBid[0].user_id, highestBid[0].bid_amount, auctionId]
                );

                // Insert into auction_winners table
                await db.query(
                    'INSERT INTO auction_winners (auction_id, user_id, winning_bid) VALUES (?, ?, ?)',
                    [auctionId, highestBid[0].user_id, highestBid[0].bid_amount]
                );

                // Send notification to winner
                const NotificationService = require('../utils/notificationService');
                await NotificationService.sendToUser(
                    highestBid[0].user_id,
                    'Auction Won!',
                    `Congratulations! You won the auction for "${auction.title}" with a bid of $${highestBid[0].bid_amount}`,
                    { type: 'auction', priority: 'high' }
                );
            } else {
                // No bids, just end the auction
                await db.query(
                    'UPDATE auctions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    ['ended', auctionId]
                );
            }
        } else {
            // Update status normally
            await db.query(
                'UPDATE auctions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [status, auctionId]
            );
        }

        // Log the action
        await Logger.activity(adminId, 'auction_status_updated',
            `Updated auction "${auction.title}" status to ${status}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: `Auction status updated to ${status}`
        });
    } catch (error) {
        console.error('Error updating auction status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update auction status'
        });
    }
});

// Extend auction
router.put('/:id/extend', requireAdminAuth, async (req, res) => {
    try {
        const auctionId = req.params.id;
        const { minutes } = req.body;
        const adminId = req.session.adminId;

        if (!minutes || minutes < 1 || minutes > 1440) { // Max 24 hours
            return res.status(400).json({
                success: false,
                message: 'Invalid extension time (1-1440 minutes)'
            });
        }

        // Extend auction end date
        await db.query(`
            UPDATE auctions
            SET end_date = DATE_ADD(end_date, INTERVAL ? MINUTE),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [minutes, auctionId]);

        // Get updated auction
        const [auctions] = await db.query('SELECT title FROM auctions WHERE id = ?', [auctionId]);

        // Log the action
        await Logger.activity(adminId, 'auction_extended',
            `Extended auction "${auctions[0].title}" by ${minutes} minutes`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: `Auction extended by ${minutes} minutes`
        });
    } catch (error) {
        console.error('Error extending auction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to extend auction'
        });
    }
});

// Delete auction
router.delete('/:id', requireAdminAuth, async (req, res) => {
    try {
        const auctionId = req.params.id;
        const adminId = req.session.adminId;

        // Get auction details before deletion
        const [auctions] = await db.query('SELECT title FROM auctions WHERE id = ?', [auctionId]);
        if (auctions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Auction not found'
            });
        }

        // Delete auction (bids will be deleted automatically due to foreign key)
        await db.query('DELETE FROM auctions WHERE id = ?', [auctionId]);

        // Log the action
        await Logger.activity(adminId, 'auction_deleted',
            `Deleted auction "${auctions[0].title}"`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: 'Auction deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting auction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete auction'
        });
    }
});

// API endpoint to get live auction data
router.get('/:id/live', requireAdminAuth, async (req, res) => {
    try {
        const auctionId = req.params.id;

        const [auctions] = await db.query(`
            SELECT
                a.*,
                COUNT(b.id) as total_bids,
                COUNT(DISTINCT b.user_id) as total_bidders,
                MAX(b.bid_amount) as highest_bid
            FROM auctions a
            LEFT JOIN bids b ON a.id = b.auction_id
            WHERE a.id = ?
            GROUP BY a.id
        `, [auctionId]);

        if (auctions.length === 0) {
            return res.status(404).json({ success: false, message: 'Auction not found' });
        }

        const auction = auctions[0];

        // Get recent bids
        const [recentBids] = await db.query(`
            SELECT
                b.bid_amount,
                b.created_at,
                u.name as bidder_name
            FROM bids b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.auction_id = ?
            ORDER BY b.created_at DESC
            LIMIT 5
        `, [auctionId]);

        res.json({
            success: true,
            auction: {
                id: auction.id,
                title: auction.title,
                current_price: auction.current_price,
                highest_bid: auction.highest_bid,
                total_bids: auction.total_bids,
                total_bidders: auction.total_bidders,
                status: auction.status,
                end_time: auction.end_time,
                recent_bids: recentBids
            }
        });
    } catch (error) {
        console.error('Error fetching live auction data:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch auction data' });
    }
});

module.exports = router;
