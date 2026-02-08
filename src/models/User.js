/**
 * User Model
 * Handles user-related database operations
 */

const bcrypt = require('bcryptjs');
const { query, queryOne } = require('../config/database');

class User {
  /**
   * Create new user
   */
  static async create(userData) {
    const { email, password, firstName, lastName, phone } = userData;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users (email, password, first_name, last_name, phone, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;

    const result = await query(sql, [email, hashedPassword, firstName, lastName, phone]);
    return { id: result.insertId, ...userData };
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ? LIMIT 1';
    return queryOne(sql, [email]);
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const sql = 'SELECT id, email, first_name, last_name, phone, role, is_active, created_at FROM users WHERE id = ? LIMIT 1';
    return queryOne(sql, [id]);
  }

  /**
   * Verify password
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Update user
   */
  static async update(id, updateData) {
    const allowedFields = ['first_name', 'last_name', 'phone', 'address', 'city', 'country'];
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
    const sql = `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`;
    
    const result = await query(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * Check if email exists
   */
  static async emailExists(email) {
    const user = await this.findByEmail(email);
    return !!user;
  }

  /**
   * Get all users with pagination
   */
  static async getAll(pagination) {
    const { limit, offset } = pagination;
    const sql = `
      SELECT id, email, first_name, last_name, phone, role, is_active, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    return query(sql, [limit, offset]);
  }

  /**
   * Get total user count
   */
  static async count() {
    const result = await queryOne('SELECT COUNT(*) as total FROM users');
    return result.total;
  }
}

module.exports = User;
