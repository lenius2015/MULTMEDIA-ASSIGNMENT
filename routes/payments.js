/**
 * Payment API Routes
 * Handles payment initiation, callbacks, and management
 */

const express = require('express');
const router = express.Router();
const { PaymentService } = require('../services/paymentService');
const { isAuthenticated } = require('../middleware/auth');
const { requireAdminAuth } = require('../middleware/adminAuth');

const paymentService = new PaymentService();

// ============================================
// PUBLIC ROUTES
// ============================================

// Get available payment methods
router.get('/methods', async (req, res) => {
    try {
        const query = `
            SELECT id, name, code, type, processing_fee, min_amount, max_amount, is_active
            FROM payment_methods 
            WHERE is_active = TRUE
            ORDER BY type, name
        `;
        const db = require('../db');
        const methods = await db.query(query);

        res.json({
            success: true,
            data: methods,
            currency: process.env.CURRENCY || 'TZS'
        });
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch payment methods' });
    }
});

// ============================================
// INITIATE PAYMENT
// ============================================

// Initiate payment
router.post('/initiate', isAuthenticated, async (req, res) => {
    try {
        const { order_id, payment_method, phone_number, email } = req.body;
        const userId = req.user.id;

        if (!order_id || !payment_method) {
            return res.status(400).json({
                success: false,
                error: 'Order ID and payment method are required'
            });
        }

        // Get order details
        const db = require('../db');
        const [order] = await db.query(
            'SELECT * FROM orders WHERE id = ? AND user_id = ?',
            [order_id, userId]
        );

        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        if (order.payment_status === 'paid') {
            return res.status(400).json({ success: false, error: 'Order already paid' });
        }

        const totalAmount = parseFloat(order.total_amount);

        const result = await paymentService.initiatePayment(
            order_id,
            userId,
            payment_method,
            totalAmount,
            phone_number || req.user.phone,
            email || req.user.email
        );

        if (result.success) {
            res.json({
                success: true,
                transaction_ref: result.transactionRef,
                transaction_id: result.transactionId,
                payment_data: result
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Payment initiation error:', error);
        res.status(500).json({ success: false, error: 'Payment initiation failed' });
    }
});

// ============================================
// CALLBACK HANDLERS
// ============================================

// M-Pesa callback
router.post('/mpesa/callback', async (req, res) => {
    try {
        const db = require('../db');
        const { MpesaService } = require('../services/paymentService');
        const mpesa = new MpesaService();

        const result = mpesa.processCallback(req.body);

        // Store callback data
        await db.query(`
            INSERT INTO payment_callbacks (transaction_id, provider, callback_data, is_verified)
            VALUES (?, 'mpesa', ?, TRUE)
        `, [0, JSON.stringify(req.body)]);

        if (result.success) {
            // Find transaction by provider reference
            const [transaction] = await db.query(
                'SELECT id, transaction_ref, order_id FROM transactions WHERE provider_ref = ?',
                [result.checkoutRequestId]
            );

            if (transaction) {
                await paymentService.verifyPayment(transaction.transaction_ref, result);
                
                // Update callback record
                await db.query(`
                    UPDATE payment_callbacks SET transaction_id = ?, processed = TRUE, processed_at = NOW()
                    WHERE provider = 'mpesa' ORDER BY id DESC LIMIT 1
                `, [transaction.id]);
            }
        }

        res.json({ ResultCode: 0, ResultDesc: 'Callback processed' });
    } catch (error) {
        console.error('M-Pesa callback error:', error);
        res.json({ ResultCode: 1, ResultDesc: 'Error processing callback' });
    }
});

// Tigo Pesa callback
router.post('/tigo/callback', async (req, res) => {
    try {
        const db = require('../db');
        const { transactionId, status } = req.body;

        const [txRecord] = await db.query(
            'SELECT id, transaction_ref, order_id FROM transactions WHERE provider_ref = ?',
            [transactionId]
        );

        if (txRecord && status === 'SUCCESSFUL') {
            await paymentService.verifyPayment(txRecord.transaction_ref, req.body);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Tigo callback error:', error);
        res.status(500).json({ success: false, error: 'Callback processing failed' });
    }
});

// Airtel Money callback
router.post('/airtel/callback', async (req, res) => {
    try {
        const db = require('../db');
        const { transaction } = req.body;

        if (transaction.status === 'TSU') {
            const [tx] = await db.query(
                'SELECT id, transaction_ref, order_id FROM transactions WHERE provider_ref = ?',
                [transaction.id]
            );

            if (tx) {
                await paymentService.verifyPayment(tx.transaction_ref, req.body);
            }
        }

        res.json({ status: 'success' });
    } catch (error) {
        console.error('Airtel callback error:', error);
        res.status(500).json({ status: 'error' });
    }
});

// Stripe webhook
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const { StripeService } = require('../services/paymentService');
        const stripe = new StripeService();
        const signature = req.headers['stripe-signature'];

        const verification = stripe.verifyWebhookSignature(req.body, signature);

        if (!verification.success) {
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const result = await stripe.processWebhook(verification.event);

        if (result.type === 'success') {
            const [transaction] = await db.query(
                'SELECT id, transaction_ref, order_id FROM transactions WHERE provider_ref = ?',
                [result.paymentIntentId]
            );

            if (transaction) {
                await paymentService.verifyPayment(transaction.transaction_ref, result);
            }
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Stripe webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// ============================================
// PAYMENT STATUS
// ============================================

// Check payment status
router.get('/status/:transactionRef', isAuthenticated, async (req, res) => {
    try {
        const { transactionRef } = req.params;
        const userId = req.user.id;

        const transaction = await paymentService.getTransaction(transactionRef);

        if (!transaction) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }

        if (transaction.user_id !== userId) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        // Get status history
        const db = require('../db');
        const history = await db.query(`
            SELECT * FROM payment_status_history 
            WHERE transaction_id = ? 
            ORDER BY created_at DESC
        `, [transaction.id]);

        res.json({
            success: true,
            data: {
                transaction,
                status_history: history
            }
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ success: false, error: 'Failed to check status' });
    }
});

// ============================================
// USER PAYMENTS
// ============================================

// Get user's payment history
router.get('/history', isAuthenticated, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        const userId = req.user.id;

        const transactions = await paymentService.getUserTransactions(userId, limit, offset);

        res.json({
            success: true,
            data: transactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('History fetch error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch history' });
    }
});

// ============================================
// REFUNDS
// ============================================

// Request refund (user)
router.post('/refund/request', isAuthenticated, async (req, res) => {
    try {
        const { transaction_id, reason } = req.body;
        const userId = req.user.id;
        const db = require('../db');

        const [transaction] = await db.query(
            'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
            [transaction_id, userId]
        );

        if (!transaction) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }

        if (transaction.status !== 'completed') {
            return res.status(400).json({ success: false, error: 'Transaction not eligible for refund' });
        }

        // Create refund request (admin will process)
        const [refund] = await db.query(`
            INSERT INTO refunds (transaction_id, order_id, user_id, amount, reason, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
        `, [transaction.id, transaction.order_id, userId, transaction.amount, reason]);

        res.json({
            success: true,
            message: 'Refund request submitted',
            refund_id: refund.insertId
        });
    } catch (error) {
        console.error('Refund request error:', error);
        res.status(500).json({ success: false, error: 'Failed to submit refund request' });
    }
});

// ============================================
// ADMIN ROUTES
// ============================================

// Admin: Process refund
router.post('/admin/refund/:refundId', requireAdminAuth, async (req, res) => {
    try {
        const { refundId } = req.params;
        const { amount, action } = req.body; // action: 'approve' or 'reject'
        const adminId = req.admin.id;
        const db = require('../db');

        const [refund] = await db.query('SELECT * FROM refunds WHERE id = ?', [refundId]);

        if (!refund) {
            return res.status(404).json({ success: false, error: 'Refund not found' });
        }

        if (refund.status !== 'pending') {
            return res.status(400).json({ success: false, error: 'Refund already processed' });
        }

        const refundAmount = action === 'approve' ? (amount || refund.amount) : 0;

        if (action === 'approve') {
            const result = await paymentService.processRefund(
                refund.transaction_id,
                refundAmount,
                refund.reason,
                adminId
            );

            if (result.success) {
                await db.query(`
                    UPDATE refunds SET status = 'completed', provider_ref = ?, completed_at = NOW()
                    WHERE id = ?
                `, [result.refundId, refundId]);

                res.json({ success: true, message: 'Refund processed successfully' });
            } else {
                await db.query('UPDATE refunds SET status = ? WHERE id = ?', ['failed', refundId]);
                res.status(400).json({ success: false, error: result.error });
            }
        } else {
            await db.query(`
                UPDATE refunds SET status = 'cancelled', processed_by = ?
                WHERE id = ?
            `, [adminId, refundId]);

            res.json({ success: true, message: 'Refund request rejected' });
        }
    } catch (error) {
        console.error('Admin refund error:', error);
        res.status(500).json({ success: false, error: 'Failed to process refund' });
    }
});

// Admin: Get all transactions
router.get('/admin/transactions', requireAdminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 50, status, method, date_from, date_to } = req.query;
        const offset = (page - 1) * limit;
        const db = require('../db');

        let query = `
            SELECT t.*, u.name as user_name, u.email as user_email, pm.name as payment_method
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            JOIN payment_methods pm ON t.payment_method_id = pm.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }
        if (method) {
            query += ' AND pm.code = ?';
            params.push(method);
        }
        if (date_from) {
            query += ' AND t.created_at >= ?';
            params.push(date_from);
        }
        if (date_to) {
            query += ' AND t.created_at <= ?';
            params.push(date_to);
        }

        query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const transactions = await db.query(query, params);

        // Get totals
        const totals = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
                SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END) as total_refunds
            FROM transactions
        `);

        res.json({
            success: true,
            data: transactions,
            totals: totals[0],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Admin transactions fetch error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
    }
});

// Admin: Get transaction details
router.get('/admin/transactions/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const db = require('../db');

        const [transaction] = await db.query(`
            SELECT t.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
                   pm.name as payment_method, pm.code as payment_code
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            JOIN payment_methods pm ON t.payment_method_id = pm.id
            WHERE t.id = ?
        `, [id]);

        if (!transaction) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }

        const history = await db.query(`
            SELECT * FROM payment_status_history 
            WHERE transaction_id = ? 
            ORDER BY created_at DESC
        `, [id]);

        const callbacks = await db.query(`
            SELECT * FROM payment_callbacks 
            WHERE transaction_id = ? 
            ORDER BY created_at DESC
        `, [id]);

        const refunds = await db.query(`
            SELECT * FROM refunds 
            WHERE transaction_id = ? 
            ORDER BY created_at DESC
        `, [id]);

        res.json({
            success: true,
            data: {
                transaction,
                status_history: history,
                callbacks,
                refunds
            }
        });
    } catch (error) {
        console.error('Admin transaction detail error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch transaction' });
    }
});

module.exports = router;
