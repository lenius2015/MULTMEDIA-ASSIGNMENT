const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/uploads/reviews');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'review-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: function(req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|webm/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only images and videos are allowed'));
        }
    }
});

// In-memory storage for demo
const reviews = new Map();

// Get reviews for a product
router.get('/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        
        const productReviews = Array.from(reviews.values())
            .filter(r => r.productId === parseInt(productId))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json({
            success: true,
            reviews: productReviews
        });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews'
        });
    }
});

// Submit a review with photos/videos
router.post('/', upload.array('media', 5), async (req, res) => {
    try {
        const { productId, rating, comment } = req.body;
        const userData = req.body.user || { id: 1, name: 'Guest User' }; // Get from auth in production

        if (!productId || !rating || !comment) {
            return res.status(400).json({
                success: false,
                message: 'Product ID, rating, and comment are required'
            });
        }

        if (parseInt(rating) < 1 || parseInt(rating) > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        // Process uploaded files
        const media = req.files.map(file => ({
            type: file.mimetype.startsWith('video') ? 'video' : 'image',
            url: '/uploads/reviews/' + file.filename,
            filename: file.filename
        }));

        const review = {
            id: Date.now(),
            productId: parseInt(productId),
            userId: userData.id,
            userName: userData.name || 'Anonymous',
            rating: parseInt(rating),
            comment: comment,
            media: media,
            created_at: new Date(),
            helpful: 0
        };

        reviews.set(review.id, review);

        console.log(`New review for product ${productId}:`, review);

        res.json({
            success: true,
            message: 'Review submitted successfully!',
            review: review
        });

    } catch (error) {
        console.error('Submit review error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to submit review'
        });
    }
});

// Mark review as helpful
router.post('/:reviewId/helpful', async (req, res) => {
    try {
        const { reviewId } = req.params;
        const review = reviews.get(parseInt(reviewId));

        if (review) {
            review.helpful = (review.helpful || 0) + 1;
            reviews.set(parseInt(reviewId), review);

            res.json({
                success: true,
                message: 'Thanks for your feedback!'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
    } catch (error) {
        console.error('Mark helpful error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark review as helpful'
        });
    }
});

// Delete a review
router.delete('/:reviewId', async (req, res) => {
    try {
        const { reviewId } = req.params;
        
        if (reviews.has(parseInt(reviewId))) {
            reviews.delete(parseInt(reviewId));
            res.json({
                success: true,
                message: 'Review deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete review'
        });
    }
});

module.exports = router;
