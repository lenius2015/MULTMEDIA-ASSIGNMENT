/**
 * Invoices Routes
 */

const express = require('express');
const router = express.Router();
const InvoiceService = require('../services/InvoiceService');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');

// Get invoice
router.get('/:invoiceId', asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.getInvoice(req.params.invoiceId);

  if (!invoice) {
    return res.status(404).json({ success: false, message: 'Invoice not found' });
  }

  res.json({ success: true, data: invoice });
}));

// Get invoice by order
router.get('/order/:orderId', asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.getInvoiceByOrder(req.params.orderId);

  if (!invoice) {
    return res.status(404).json({ success: false, message: 'Invoice not found' });
  }

  res.json({ success: true, data: invoice });
}));

// Download invoice as HTML
router.get('/:invoiceId/html', asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.getInvoice(req.params.invoiceId);

  if (!invoice || !invoice.html_content) {
    return res.status(404).json({ success: false });
  }

  res.setHeader('Content-Type', 'text/html');
  res.send(invoice.html_content);
}));

// Send invoice to email
router.post('/:invoiceId/send-email', authenticate, asyncHandler(async (req, res) => {
  const result = await InvoiceService.sendInvoiceEmail(
    req.params.invoiceId,
    req.body.email || req.user.email
  );

  res.json({ success: true, data: result });
}));

// Admin: Get invoices
router.get('/admin/list', authorize(['admin']), asyncHandler(async (req, res) => {
  const invoices = await InvoiceService.getAdminInvoices(req.query);
  res.json({ success: true, data: invoices });
}));

// Admin: Update invoice status
router.patch('/:invoiceId/status', authorize(['admin']), asyncHandler(async (req, res) => {
  const result = await InvoiceService.updateInvoiceStatus(
    req.params.invoiceId,
    req.body.status
  );

  res.json({ success: true, data: result });
}));

module.exports = router;
