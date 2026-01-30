const express = require('express');
const router = express.Router();

// In-memory storage for demo (use database in production)
const subscribers = new Map();

// Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
    try {
        const { email, coupon } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address'
            });
        }

        // Check if already subscribed
        if (subscribers.has(email)) {
            return res.status(400).json({
                success: false,
                message: 'This email is already subscribed to our newsletter'
            });
        }

        // Store subscriber
        subscribers.set(email, {
            email,
            couponCode: coupon || 'WELCOME10',
            subscribedAt: new Date(),
            used: false
        });

        console.log(`Newsletter subscription: ${email}`);

        res.json({
            success: true,
            message: 'Successfully subscribed!',
            couponCode: coupon || 'WELCOME10',
            discount: '10% OFF'
        });

    } catch (error) {
        console.error('Newsletter subscribe error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to subscribe. Please try again.'
        });
    }
});

// Validate coupon code
router.get('/validate/:code', async (req, res) => {
    try {
        const { code } = req.params;

        // Check if code is valid (in production, check database)
        const validCodes = ['WELCOME10', 'FIRSTORDER10'];

        if (validCodes.includes(code)) {
            res.json({
                success: true,
                valid: true,
                discount: '10% off your order',
                code: code
            });
        } else {
            res.json({
                success: true,
                valid: false,
                message: 'Invalid or expired coupon code'
            });
        }
    } catch (error) {
        console.error('Coupon validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate coupon'
        });
    }
});

// Export subscribers (admin only in production)
router.get('/subscribers', (req, res) => {
    res.json({
        success: true,
        count: subscribers.size,
        subscribers: Array.from(subscribers.values()).map(s => ({
            email: s.email,
            couponCode: s.couponCode,
            subscribedAt: s.subscribedAt
        }))
    });
});

module.exports = router;
