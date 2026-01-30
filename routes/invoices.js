const express = require('express');
const router = express.Router();
const pool = require('../db');
const invoiceGenerator = require('../utils/invoiceGenerator');
const path = require('path');
const fs = require('fs');

// Generate invoice for an order
router.post('/generate/:orderId', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const orderId = req.params.orderId;

    // Check if order belongs to user or user is admin
    let orderQuery = 'SELECT * FROM orders WHERE id = ?';
    let orderParams = [orderId];

    if (req.session.role !== 'admin') {
      orderQuery += ' AND user_id = ?';
      orderParams.push(req.session.userId);
    }

    const [orders] = await pool.query(orderQuery, orderParams);

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orders[0];

    // Check if invoice already exists
    const [existingInvoices] = await pool.query(
      'SELECT * FROM invoices WHERE order_id = ?',
      [orderId]
    );

    if (existingInvoices.length > 0) {
      return res.json({
        success: true,
        message: 'Invoice already exists',
        invoice: existingInvoices[0]
      });
    }

    // Get user details
    const [users] = await pool.query(
      'SELECT id, name, email FROM users WHERE id = ?',
      [order.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = users[0];

    // Get order items
    const [orderItems] = await pool.query(`
      SELECT oi.*, p.name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    // Generate invoice
    const invoiceData = await invoiceGenerator.generateInvoice(order, user, orderItems);

    // Save invoice record to database
    const [result] = await pool.query(`
      INSERT INTO invoices (order_id, user_id, invoice_number, total_amount, tax_amount, discount_amount, pdf_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      orderId,
      order.user_id,
      invoiceData.invoiceNumber,
      invoiceData.total,
      invoiceData.tax,
      invoiceData.discount,
      invoiceData.filePath
    ]);

    const invoice = {
      id: result.insertId,
      order_id: orderId,
      user_id: order.user_id,
      invoice_number: invoiceData.invoiceNumber,
      total_amount: invoiceData.total,
      tax_amount: invoiceData.tax,
      discount_amount: invoiceData.discount,
      pdf_path: invoiceData.filePath,
      status: 'generated',
      created_at: new Date()
    };

    res.json({
      success: true,
      message: 'Invoice generated successfully',
      invoice: invoice
    });

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ success: false, message: 'Failed to generate invoice' });
  }
});

// Download invoice PDF
router.get('/download/:orderId', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const orderId = req.params.orderId;

    // Check if order belongs to user or user is admin
    let orderQuery = 'SELECT * FROM orders WHERE id = ?';
    let orderParams = [orderId];

    if (req.session.role !== 'admin') {
      orderQuery += ' AND user_id = ?';
      orderParams.push(req.session.userId);
    }

    const [orders] = await pool.query(orderQuery, orderParams);

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Get invoice
    const [invoices] = await pool.query(
      'SELECT * FROM invoices WHERE order_id = ?',
      [orderId]
    );

    if (invoices.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invoice = invoices[0];

    if (!fs.existsSync(invoice.pdf_path)) {
      return res.status(404).json({ success: false, message: 'Invoice file not found' });
    }

    // Update status to viewed
    await pool.query(
      'UPDATE invoices SET status = "viewed" WHERE id = ?',
      [invoice.id]
    );

    // Send file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    res.sendFile(invoice.pdf_path);

  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({ success: false, message: 'Failed to download invoice' });
  }
});

// Get user's invoices
router.get('/', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    let query = 'SELECT * FROM invoices WHERE user_id = ?';
    let params = [req.session.userId];

    if (req.session.role === 'admin') {
      query = 'SELECT i.*, u.name as user_name, u.email as user_email FROM invoices i JOIN users u ON i.user_id = u.id';
      params = [];
    }

    const [invoices] = await pool.query(query + ' ORDER BY created_at DESC', params);

    res.json({
      success: true,
      invoices: invoices
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch invoices' });
  }
});

// Get specific invoice details
router.get('/:id', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    let query = 'SELECT * FROM invoices WHERE id = ?';
    let params = [req.params.id];

    if (req.session.role !== 'admin') {
      query += ' AND user_id = ?';
      params.push(req.session.userId);
    }

    const [invoices] = await pool.query(query, params);

    if (invoices.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({
      success: true,
      invoice: invoices[0]
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch invoice' });
  }
});

module.exports = router;