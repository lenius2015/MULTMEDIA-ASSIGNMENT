// Load environment variables first
require('dotenv').config();

const mysql = require('mysql2/promise');

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce',
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the connection
pool.getConnection()
  .then(connection => {
    console.log('Database connected successfully');
    console.log(`Connected to MySQL on ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);
    connection.release();
  })
  .catch(error => {
    console.error('Database connection failed:', error.message);
    console.error('Connection details:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      database: process.env.DB_NAME
    });
    console.error('\nPlease check:');
    console.error('1. XAMPP MySQL is running');
    console.error('2. Database "ecommerce" exists');
    console.error('3. .env file has correct settings');
  });

module.exports = pool;
