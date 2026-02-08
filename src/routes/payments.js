/**
 * Payments Routes
 */

const express = require('express');
const router = express.Router();
const PaymentService = require('../services/PaymentService');
const OrderService = require('../services/OrderService');
const InvoiceService = require('../services/InvoiceService');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');

// Initialize payment
router.post('/initialize', authenticate, asyncHandler(async (req, res) => {
  const { order_id, payment_method, phone_number, card_token } = req.body;

  const payment = await PaymentService.initializePayment(order_id, payment_method, {
    phone_number,
    card_token
  });

  res.json({ success: true, data: payment });
}));

// Confirm mobile money payment
router.post('/confirm-mobile-money', asyncHandler(async (req, res) => {
  const { payment_id, confirmation_code, transaction_id } = req.body;

  const result = await PaymentService.confirmMobileMoneyPayment(
    payment_id,
    confirmation_code,
    transaction_id
  );

  // Generate invoice after payment
  if (result.status === 'completed') {
    await InvoiceService.generateInvoice(result.order_id);
  }

  res.json({ success: true, message: 'Payment confirmed', data: result });
}));

// Handle webhook
router.post('/webhook', asyncHandler(async (req, res) => {
  const { signature } = req.headers;
  const payload = req.body;

  // Verify signature
  const isValid = PaymentService.verifyWebhookSignature(
    payload,
    signature,
    process.env.PAYMENT_WEBHOOK_SECRET
  );

  if (!isValid) {
    return res.status(401).json({ success: false, message: 'Invalid signature' });
  }

  const result = await PaymentService.handlePaymentWebhook(payload);

  // Generate invoice if payment successful
  if (result.status === 'completed') {
    await InvoiceService.generateInvoice(result.order_id);
  }

  res.json({ success: true, data: result });
}));

// Get payment status
router.get('/:paymentId/status', asyncHandler(async (req, res) => {
  const status = await PaymentService.checkPaymentStatus(req.params.paymentId);
  res.json({ success: true, data: status });
}));

// Admin: Get payments report
router.get('/admin/report', authorize(['admin']), asyncHandler(async (req, res) => {
  const payments = await PaymentService.getPaymentsReport(req.query);
  res.json({ success: true, data: payments });
}));

module.exports = router;
