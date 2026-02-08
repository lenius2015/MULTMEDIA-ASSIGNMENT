/**
 * Database Configuration
 * Manages MySQL connection pool
 */

const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0
});

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    logger.info('Database connected successfully');
    return true;
  } catch (error) {
    logger.error('Database connection failed', { error: error.message });
    return false;
  }
}

/**
 * Execute query with promise
 */
async function query(sql, values = []) {
  try {
    const connection = await pool.getConnection();
    const [results] = await connection.execute(sql, values);
    connection.release();
    return results;
  } catch (error) {
    logger.error('Database query error', { sql, error: error.message });
    throw error;
  }
}

/**
 * Execute query and return single row
 */
async function queryOne(sql, values = []) {
  const results = await query(sql, values);
  return results.length > 0 ? results[0] : null;
}

/**
 * Execute transaction
 */
async function transaction(callback) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    logger.error('Transaction failed', { error: error.message });
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  query,
  queryOne,
  transaction,
  testConnection
};
