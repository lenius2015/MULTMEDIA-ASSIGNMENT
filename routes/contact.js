const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /contact - Display contact page
router.get('/', (req, res) => {
    res.render('contact', {
        title: 'Contact Us - OMUNJU SHOPPERS',
        user: req.session.user || null
    });
});

// POST / - Handle contact form submission
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        // Basic validation
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and message are required fields.'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address.'
            });
        }

        // Get user_id if user is logged in
        const userId = req.session.userId || null;

        // Save to database
        const [result] = await pool.query(
            'INSERT INTO contact_messages (user_id, name, email, subject, message) VALUES (?, ?, ?, ?, ?)',
            [userId, name, email, subject || null, message]
        );

        console.log('Contact form submission saved:', {
            id: result.insertId,
            name,
            email,
            subject,
            message,
            userId,
            timestamp: new Date().toISOString()
        });

        // Notify admin about new contact message
        try {
            const NotificationService = require('../utils/notificationService');
            await NotificationService.notifyNewContactMessage(result.insertId, name, email, subject);
        } catch (notificationError) {
            console.error('Error sending contact notification:', notificationError);
            // Don't fail the contact form submission if notification fails
        }

        res.json({
            success: true,
            message: 'Thank you for your message! We\'ll get back to you within 24 hours.'
        });

    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({
            success: false,
            message: 'Sorry, there was an error sending your message. Please try again later.'
        });
    }
});

module.exports = router;