const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class InvoiceGenerator {
  constructor() {
    this.invoicesDir = path.join(__dirname, '../invoices');
    // Ensure invoices directory exists
    if (!fs.existsSync(this.invoicesDir)) {
      fs.mkdirSync(this.invoicesDir, { recursive: true });
    }
  }

  generateInvoiceNumber(orderId) {
    const timestamp = Date.now();
    return `INV-${orderId}-${timestamp}`;
  }

  async generateInvoice(orderData, userData, orderItems) {
    return new Promise((resolve, reject) => {
      try {
        const invoiceNumber = this.generateInvoiceNumber(orderData.id);
        const fileName = `${invoiceNumber}.pdf`;
        const filePath = path.join(this.invoicesDir, fileName);

        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('OMUNJU SHOPPERS', { align: 'center' });
        doc.moveDown();
        doc.fontSize(16).text('INVOICE', { align: 'center' });
        doc.moveDown();

        // Invoice details
        doc.fontSize(12).font('Helvetica');
        doc.text(`Invoice Number: ${invoiceNumber}`, 50, 150);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, 170);
        doc.text(`Order ID: ${orderData.id}`, 50, 190);

        // Customer details
        doc.text('Bill To:', 50, 230);
        doc.text(userData.name, 50, 250);
        doc.text(userData.email, 50, 270);
        if (orderData.shipping_address) {
          doc.text('Shipping Address:', 50, 290);
          doc.text(orderData.shipping_address, 50, 310, { width: 200 });
        }

        // Items table
        let yPosition = 370;
        doc.font('Helvetica-Bold');
        doc.text('Item', 50, yPosition);
        doc.text('Qty', 300, yPosition);
        doc.text('Price', 350, yPosition);
        doc.text('Total', 420, yPosition);

        doc.moveTo(50, yPosition + 20).lineTo(500, yPosition + 20).stroke();
        yPosition += 30;

        doc.font('Helvetica');
        let subtotal = 0;

        orderItems.forEach(item => {
          const itemTotal = item.price * item.quantity;
          subtotal += itemTotal;

          doc.text(item.name || 'Product', 50, yPosition, { width: 240 });
          doc.text(item.quantity.toString(), 300, yPosition);
          doc.text(`$${item.price.toFixed(2)}`, 350, yPosition);
          doc.text(`$${itemTotal.toFixed(2)}`, 420, yPosition);
          yPosition += 20;
        });

        // Totals
        yPosition += 20;
        doc.moveTo(350, yPosition).lineTo(500, yPosition).stroke();
        yPosition += 10;

        const tax = subtotal * 0.1; // 10% tax
        const discount = orderData.discount || 0;
        const total = subtotal + tax - discount;

        doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 350, yPosition);
        yPosition += 20;
        doc.text(`Tax (10%): $${tax.toFixed(2)}`, 350, yPosition);
        yPosition += 20;
        if (discount > 0) {
          doc.text(`Discount: -$${discount.toFixed(2)}`, 350, yPosition);
          yPosition += 20;
        }
        doc.font('Helvetica-Bold');
        doc.text(`Total: $${total.toFixed(2)}`, 350, yPosition);

        // Footer
        yPosition += 50;
        doc.font('Helvetica').fontSize(10);
        doc.text('Thank you for shopping with OMUNJU SHOPPERS!', 50, yPosition, { align: 'center' });
        doc.text('For any questions, please contact our support team.', 50, yPosition + 20, { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          resolve({
            invoiceNumber,
            filePath,
            fileName,
            total: total,
            subtotal: subtotal,
            tax: tax,
            discount: discount
          });
        });

        stream.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  async getInvoice(orderId) {
    // This would be used to retrieve existing invoices
    const fs = require('fs').promises;
    const invoiceFiles = await fs.readdir(this.invoicesDir);
    const invoiceFile = invoiceFiles.find(file => file.includes(`INV-${orderId}-`));

    if (invoiceFile) {
      return path.join(this.invoicesDir, invoiceFile);
    }
    return null;
  }
}

module.exports = new InvoiceGenerator();