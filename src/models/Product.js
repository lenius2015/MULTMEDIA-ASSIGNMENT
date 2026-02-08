/**
 * Product Model
 * Handles product-related database operations
 */

const { query, queryOne } = require('../config/database');

class Product {
  /**
   * Create new product
   */
  static async create(productData) {
    const {
      name, description, price, stock, category, image, sku, vendorId
    } = productData;

    const sql = `
      INSERT INTO products (name, description, price, stock, category, image_url, sku, vendor_id, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
    `;

    const result = await query(sql, [name, description, price, stock, category, image, sku, vendorId]);
    return { id: result.insertId, ...productData };
  }

  /**
   * Find product by ID
   */
  static async findById(id) {
    const sql = `
      SELECT p.*, u.first_name as vendor_name, u.email as vendor_email
      FROM products p
      LEFT JOIN users u ON p.vendor_id = u.id
      WHERE p.id = ? AND p.is_active = 1
      LIMIT 1
    `;
    return queryOne(sql, [id]);
  }

  /**
   * Find all products with filters
   */
  static async findAll(filters = {}, pagination) {
    let sql = 'SELECT * FROM products WHERE is_active = 1';
    const params = [];

    if (filters.category) {
      sql += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters.vendorId) {
      sql += ' AND vendor_id = ?';
      params.push(filters.vendorId);
    }

    if (filters.search) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (filters.minPrice) {
      sql += ' AND price >= ?';
      params.push(filters.minPrice);
    }

    if (filters.maxPrice) {
      sql += ' AND price <= ?';
      params.push(filters.maxPrice);
    }

    // Count total before pagination
    const countResult = await queryOne(
      sql.replace('SELECT *', 'SELECT COUNT(*) as total'),
      params
    );

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pagination.limit, pagination.offset);

    const products = await query(sql, params);
    return { products, total: countResult.total };
  }

  /**
   * Get products by category
   */
  static async getByCategory(category, pagination) {
    const sql = `
      SELECT * FROM products
      WHERE category = ? AND is_active = 1
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    return query(sql, [category, pagination.limit, pagination.offset]);
  }

  /**
   * Get featured products
   */
  static async getFeatured(limit = 8) {
    const sql = `
      SELECT * FROM products
      WHERE is_active = 1
      ORDER BY created_at DESC
      LIMIT ?
    `;
    return query(sql, [limit]);
  }

  /**
   * Update product
   */
  static async update(id, updateData) {
    const allowedFields = ['name', 'description', 'price', 'stock', 'category', 'image_url'];
    const fields = [];
    const values = [];

    Object.entries(updateData).forEach(([key, value]) => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return false;

    values.push(id);
    const sql = `UPDATE products SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`;
    
    const result = await query(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * Get all categories
   */
  static async getCategories() {
    const sql = `
      SELECT DISTINCT category FROM products WHERE is_active = 1
      ORDER BY category
    `;
    return query(sql);
  }

  /**
   * Check stock availability
   */
  static async checkStock(productId, quantity) {
    const product = await this.findById(productId);
    return product && product.stock >= quantity;
  }

  /**
   * Update stock
   */
  static async updateStock(productId, quantity) {
    const sql = 'UPDATE products SET stock = stock - ? WHERE id = ?';
    const result = await query(sql, [quantity, productId]);
    return result.affectedRows > 0;
  }
}

module.exports = Product;
