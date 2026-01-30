const express = require('express');
const router = express.Router();
const db = require('../db');

// Public auction page - shows all active and upcoming auctions
router.get('/', async (req, res) => {
    try {
        // Get active auctions
        const [activeAuctions] = await db.query(`
            SELECT
                a.*,
                p.name as product_name,
                p.price as product_price,
                p.image_url as product_image,
                p.description as product_description,
                COUNT(b.id) as total_bids,
                COUNT(DISTINCT b.user_id) as total_bidders,
                MAX(b.bid_amount) as highest_bid
            FROM auctions a
            LEFT JOIN products p ON a.product_id = p.id
            LEFT JOIN bids b ON a.id = b.auction_id
            WHERE a.status = 'active' AND a.end_date > NOW()
            GROUP BY a.id, p.id
            ORDER BY a.end_date ASC
        `);

        // Get upcoming auctions (scheduled)
        const [upcomingAuctions] = await db.query(`
            SELECT
                a.*,
                p.name as product_name,
                p.price as product_price,
                p.image_url as product_image,
                p.description as product_description
            FROM auctions a
            LEFT JOIN products p ON a.product_id = p.id
            WHERE a.status = 'scheduled' AND a.start_date > NOW()
            ORDER BY a.start_date ASC
            LIMIT 6
        `);

        // Get completed auctions (recent winners)
        const [completedAuctions] = await db.query(`
            SELECT
                a.*,
                p.name as product_name,
                p.price as product_price,
                p.image_url as product_image,
                u.name as winner_name,
                a.winning_bid
            FROM auctions a
            LEFT JOIN products p ON a.product_id = p.id
            LEFT JOIN users u ON a.winner_user_id = u.id
            WHERE a.status = 'completed'
            ORDER BY a.end_date DESC
            LIMIT 6
        `);

        // Get active countdown events
        const [activeCountdowns] = await db.query(`
            SELECT * FROM countdown_events
            WHERE is_active = 1 AND end_date > NOW()
            ORDER BY start_date ASC
        `);

        res.render('auctions', {
            title: 'Auctions - OMUNJU SHOPPERS',
            activeAuctions,
            upcomingAuctions,
            completedAuctions,
            activeCountdowns,
            user: req.session.userId ? {
                id: req.session.userId,
                name: req.session.userName,
                email: req.session.userEmail
            } : null
        });
    } catch (error) {
        console.error('Error fetching auctions:', error);
        res.status(500).render('error', { message: 'Failed to load auctions' });
    }
});

// Individual auction details page
router.get('/:id', async (req, res) => {
    try {
        const auctionId = req.params.id;

        // Get auction details with bids
        const [auctions] = await db.query(`
            SELECT
                a.*,
                p.name as product_name,
                p.price as product_price,
                p.image_url as product_image,
                p.description as product_description,
                p.stock,
                c.name as category_name,
                u.name as winner_name,
                u.email as winner_email
            FROM auctions a
            LEFT JOIN products p ON a.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN users u ON a.winner_user_id = u.id
            WHERE a.id = ? AND a.status IN ('scheduled', 'active', 'ended')
        `, [auctionId]);

        if (auctions.length === 0) {
            return res.status(404).render('error', { message: 'Auction not found' });
        }

        const auction = auctions[0];

        // Get bid history
        const [bids] = await db.query(`
            SELECT
                b.bid_amount,
                b.bid_time,
                u.name as bidder_name
            FROM bids b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.auction_id = ?
            ORDER BY b.bid_time DESC
            LIMIT 10
        `, [auctionId]);

        // Check if user can bid
        const canBid = req.session.userId &&
                       auction.status === 'active' &&
                       new Date(auction.end_date) > new Date() &&
                       (!auction.winner_user_id || auction.winner_user_id !== req.session.userId);

        // Check if current user is the winner
        const isWinner = req.session.userId && auction.winner_user_id === req.session.userId && auction.status === 'ended';

        res.render('auction-detail', {
            title: `${auction.title} - Auctions - OMUNJU SHOPPERS`,
            auction,
            bids,
            canBid,
            isWinner,
            user: req.session.userId ? {
                id: req.session.userId,
                name: req.session.userName,
                email: req.session.userEmail
            } : null
        });
    } catch (error) {
        console.error('Error fetching auction details:', error);
        res.status(500).render('error', { message: 'Failed to load auction details' });
    }
});

// Place a bid (requires authentication)
router.post('/:id/bid', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Please login to place a bid'
            });
        }

        const auctionId = req.params.id;
        const { bid_amount } = req.body;
        const userId = req.session.userId;

        // Get auction details
        const [auctions] = await db.query(`
            SELECT a.*, p.name as product_name
            FROM auctions a
            LEFT JOIN products p ON a.product_id = p.id
            WHERE a.id = ? AND a.status = 'active' AND a.end_date > NOW()
        `, [auctionId]);

        if (auctions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Auction is not active or does not exist'
            });
        }

        const auction = auctions[0];
        const currentBid = auction.current_bid || auction.starting_bid;
        const minBid = currentBid + auction.bid_increment;

        // Validate bid amount
        if (parseFloat(bid_amount) < minBid) {
            return res.status(400).json({
                success: false,
                message: `Minimum bid is $${minBid.toFixed(2)}`
            });
        }

        // Check if user already has the highest bid
        const [existingBids] = await db.query(`
            SELECT bid_amount FROM bids
            WHERE auction_id = ? AND user_id = ?
            ORDER BY bid_amount DESC LIMIT 1
        `, [auctionId, userId]);

        if (existingBids.length > 0 && existingBids[0].bid_amount >= parseFloat(bid_amount)) {
            return res.status(400).json({
                success: false,
                message: 'You already have a higher or equal bid'
            });
        }

        // Place the bid
        await db.query(`
            INSERT INTO bids (auction_id, user_id, bid_amount, is_winning)
            VALUES (?, ?, ?, 1)
        `, [auctionId, userId, parseFloat(bid_amount)]);

        // Update auction current bid
        await db.query(`
            UPDATE auctions
            SET current_bid = ?, total_bids = total_bids + 1
            WHERE id = ?
        `, [parseFloat(bid_amount), auctionId]);

        // Mark previous winning bids as not winning
        await db.query(`
            UPDATE bids
            SET is_winning = 0
            WHERE auction_id = ? AND user_id != ?
        `, [auctionId, userId]);

        // Update bidder count
        await db.query(`
            UPDATE auctions
            SET total_bidders = (
                SELECT COUNT(DISTINCT user_id) FROM bids WHERE auction_id = ?
            )
            WHERE id = ?
        `, [auctionId, auctionId]);

        // Log the bid
        console.log(`User ${userId} placed bid of $${parseFloat(bid_amount).toFixed(2)} on auction "${auction.title}"`);

        res.json({
            success: true,
            message: 'Bid placed successfully!',
            newBid: parseFloat(bid_amount),
            minNextBid: parseFloat(bid_amount) + auction.bid_increment
        });
    } catch (error) {
        console.error('Error placing bid:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to place bid'
        });
    }
});

module.exports = router;