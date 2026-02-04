/**
 * Invoice Service
 * Handles invoice generation in PDF and HTML formats
 */

const db = require('../../db');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

class InvoiceService {
  /**
   * Generate invoice after successful payment
   */
  static async generateInvoice(orderId) {
    // Check if invoice already exists
    const [existing] = await db.query(
      'SELECT * FROM invoices WHERE order_id = ?',
      [orderId]
    );

    if (existing.length > 0) {
      return existing[0];
    }

    // Get order details
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      throw new Error('Order not found');
    }

    const order = orders[0];

    // Get order items
    const [items] = await db.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [orderId]
    );

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Create invoice record
    const [result] = await db.query(
      `INSERT INTO invoices (
        order_id, invoice_number, user_id,
        subtotal, tax, tax_rate, delivery_fee, discount, total,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [
        orderId,
        invoiceNumber,
        order.user_id,
        order.subtotal,
        order.tax,
        16, // 16% VAT for Kenya
        order.delivery_fee,
        order.discount,
        order.total_amount
      ]
    );

    const invoiceId = result.insertId;

    // Generate HTML invoice
    const htmlContent = this.generateHTMLInvoice(order, items, invoiceNumber);

    // Save HTML content
    await db.query(
      `UPDATE invoices SET html_content = ? WHERE id = ?`,
      [htmlContent, invoiceId]
    );

    // In production, generate PDF using puppeteer or similar
    // For now, we'll save HTML content and generate PDF on demand

    return {
      id: invoiceId,
      invoice_number: invoiceNumber,
      order_id: orderId,
      status: 'draft',
      html_available: true,
      pdf_available: false // Will be generated on demand
    };
  }

  /**
   * Generate unique invoice number
   */
  static async generateInvoiceNumber() {
    const [results] = await db.query(
      "SELECT COUNT(*) + 1 as count FROM invoices WHERE DATE(created_at) = CURDATE()"
    );

    const count = results[0].count;
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    return `INV-${year}${month}-${String(count).padStart(6, '0')}`;
  }

  /**
   * Generate HTML invoice
   */
  static generateHTMLInvoice(order, items, invoiceNumber) {
    const invoiceDate = new Date(order.created_at).toLocaleDateString('en-KE');

    let itemsHTML = items
      .map(
        item => `
      <tr>
        <td>${item.product_name}</td>
        <td class="text-right">${item.quantity}</td>
        <td class="text-right">KES ${item.unit_price.toFixed(2)}</td>
        <td class="text-right">KES ${item.subtotal.toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoiceNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
          line-height: 1.6;
        }

        .invoice-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 40px;
          background: white;
        }

        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          border-bottom: 2px solid #667eea;
          padding-bottom: 20px;
        }

        .company-info h1 {
          color: #667eea;
          font-size: 28px;
          margin-bottom: 10px;
        }

        .company-info p {
          font-size: 14px;
          color: #666;
        }

        .invoice-details {
          text-align: right;
        }

        .invoice-details p {
          margin: 5px 0;
          font-size: 14px;
        }

        .invoice-number {
          font-size: 18px;
          font-weight: bold;
          color: #333;
        }

        .section-title {
          font-weight: 600;
          color: #667eea;
          margin-top: 30px;
          margin-bottom: 10px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }

        .address-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin: 30px 0;
        }

        .address-block h3 {
          color: #333;
          font-size: 14px;
          margin-bottom: 10px;
          text-transform: uppercase;
        }

        .address-block p {
          font-size: 13px;
          color: #666;
          line-height: 1.8;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin: 30px 0;
        }

        table th {
          background: #667eea;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
        }

        table td {
          padding: 12px;
          border-bottom: 1px solid #eee;
          font-size: 13px;
        }

        table tr:last-child td {
          border-bottom: none;
        }

        .text-right {
          text-align: right;
        }

        .summary-section {
          margin-top: 30px;
          display: flex;
          justify-content: flex-end;
        }

        .summary-table {
          width: 350px;
          border: 1px solid #ddd;
          border-radius: 5px;
          overflow: hidden;
        }

        .summary-table tr td {
          padding: 12px 15px;
          font-size: 13px;
        }

        .summary-table tr:nth-child(odd) {
          background: #f9f9f9;
        }

        .summary-table tr.total {
          background: #667eea;
          color: white;
          font-weight: 600;
          font-size: 14px;
        }

        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 12px;
          color: #999;
        }

        .payment-status {
          padding: 10px 15px;
          background: #e8f5e9;
          border-radius: 5px;
          color: #2e7d32;
          font-weight: 600;
          font-size: 12px;
          display: inline-block;
          margin: 20px 0;
        }

        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .invoice-container {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Header -->
        <div class="invoice-header">
          <div class="company-info">
            <h1>🛍️ ShopHub</h1>
            <p>Your Trusted Online Marketplace</p>
            <p>info@shophub.com</p>
            <p>+254 700 000 000</p>
          </div>
          <div class="invoice-details">
            <p class="invoice-number">${invoiceNumber}</p>
            <p><strong>Invoice Date:</strong> ${invoiceDate}</p>
            <p><strong>Order Number:</strong> ${order.order_number}</p>
            <p><strong>Payment Status:</strong></p>
            <div class="payment-status">${order.payment_status.toUpperCase()}</div>
          </div>
        </div>

        <!-- Addresses -->
        <div class="address-section">
          <div class="address-block">
            <h3>Bill To</h3>
            <p>
              ${order.shipping_first_name} ${order.shipping_last_name}<br>
              ${order.shipping_email}<br>
              ${order.shipping_phone}<br>
              ${order.shipping_street}<br>
              ${order.shipping_city}, ${order.shipping_state || 'N/A'}<br>
              ${order.shipping_postal_code || ''} ${order.shipping_country}
            </p>
          </div>
          <div class="address-block">
            <h3>Ship To</h3>
            <p>
              ${order.shipping_first_name} ${order.shipping_last_name}<br>
              ${order.shipping_street}<br>
              ${order.shipping_city}, ${order.shipping_state || 'N/A'}<br>
              ${order.shipping_postal_code || ''} ${order.shipping_country}
            </p>
          </div>
        </div>

        <!-- Items Table -->
        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th class="text-right">Quantity</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <!-- Summary -->
        <div class="summary-section">
          <table class="summary-table">
            <tr>
              <td>Subtotal</td>
              <td class="text-right">KES ${order.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>VAT (16%)</td>
              <td class="text-right">KES ${order.tax.toFixed(2)}</td>
            </tr>
            ${
              order.delivery_fee > 0
                ? `<tr>
              <td>Delivery Fee</td>
              <td class="text-right">KES ${order.delivery_fee.toFixed(2)}</td>
            </tr>`
                : ''
            }
            ${
              order.discount > 0
                ? `<tr>
              <td>Discount</td>
              <td class="text-right">-KES ${order.discount.toFixed(2)}</td>
            </tr>`
                : ''
            }
            <tr class="total">
              <td>Total Due</td>
              <td class="text-right">KES ${order.total_amount.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Questions or concerns? Contact us at support@shophub.com</p>
          <p style="margin-top: 10px; color: #ccc;">
            This is an electronically generated invoice and is valid without a signature.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;

    return html;
  }

  /**
   * Get invoice
   */
  static async getInvoice(invoiceId) {
    const [invoices] = await db.query(
      'SELECT * FROM invoices WHERE id = ?',
      [invoiceId]
    );

    if (invoices.length === 0) return null;

    return invoices[0];
  }

  /**
   * Get invoice by order
   */
  static async getInvoiceByOrder(orderId) {
    const [invoices] = await db.query(
      'SELECT * FROM invoices WHERE order_id = ?',
      [orderId]
    );

    if (invoices.length === 0) return null;

    return invoices[0];
  }

  /**
   * Send invoice to customer email
   */
  static async sendInvoiceEmail(invoiceId, customerEmail) {
    const invoice = await this.getInvoice(invoiceId);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: true,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
      }
    });

    // Send email with HTML invoice
    const mailOptions = {
      from: process.env.MAIL_FROM || 'noreply@shophub.com',
      to: customerEmail,
      subject: `Invoice ${invoice.invoice_number} - ShopHub`,
      html: invoice.html_content,
      attachments: invoice.pdf_url
        ? [
            {
              filename: `${invoice.invoice_number}.pdf`,
              path: invoice.pdf_url
            }
          ]
        : []
    };

    try {
      await transporter.sendMail(mailOptions);

      // Update invoice status
      await db.query(
        `UPDATE invoices SET status = 'sent' WHERE id = ?`,
        [invoiceId]
      );

      return { success: true, message: 'Invoice sent successfully' };
    } catch (error) {
      throw new Error(`Failed to send invoice: ${error.message}`);
    }
  }

  /**
   * Update invoice status
   */
  static async updateInvoiceStatus(invoiceId, status) {
    const validStatuses = ['draft', 'sent', 'paid', 'cancelled'];

    if (!validStatuses.includes(status)) {
      throw new Error('Invalid invoice status');
    }

    await db.query(
      `UPDATE invoices SET status = ? WHERE id = ?`,
      [status, invoiceId]
    );

    return { id: invoiceId, status };
  }

  /**
   * Get invoices for admin
   */
  static async getAdminInvoices(filters = {}) {
    let query = `
      SELECT i.*, o.order_number, COALESCE(u.first_name, 'Guest') as customer_name
      FROM invoices i
      LEFT JOIN orders o ON i.order_id = o.id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (filters.status) {
      query += ' AND i.status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      query += ' AND (i.invoice_number LIKE ? OR o.order_number LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (filters.date_from) {
      query += ' AND DATE(i.created_at) >= ?';
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      query += ' AND DATE(i.created_at) <= ?';
      params.push(filters.date_to);
    }

    query += ' ORDER BY i.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(filters.limit, filters.offset || 0);
    }

    const [invoices] = await db.query(query, params);

    return invoices;
  }
}

module.exports = InvoiceService;
