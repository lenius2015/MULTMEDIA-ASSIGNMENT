// Fix database schema - Add missing columns to products table
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecommerce',
    port: parseInt(process.env.DB_PORT) || 4306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function fixSchema() {
    const connection = await pool.getConnection();
    console.log('Connected to database');

    try {
        // First check what columns exist
        const [columns] = await connection.query(`DESCRIBE products`);
        const existingColumns = columns.map(c => c.Field);
        console.log('Existing columns:', existingColumns.join(', '));

        const columnsToAdd = [
            { name: 'slug', type: 'VARCHAR(255)', after: 'id' },
            { name: 'description', type: 'TEXT', after: 'slug' },
            { name: 'old_price', type: 'DECIMAL(10,2)', after: 'price' },
            { name: 'images', type: 'TEXT', after: 'image' },
            { name: 'category_id', type: 'INT', after: 'images' },
            { name: 'brand', type: 'VARCHAR(100)', after: 'category_id' },
            { name: 'rating', type: 'DECIMAL(3,2)', after: 'brand' },
            { name: 'review_count', type: 'INT DEFAULT 0', after: 'rating' },
            { name: 'stock_quantity', type: 'INT DEFAULT 0', after: 'review_count' },
            { name: 'is_active', type: 'TINYINT(1) DEFAULT 1', after: 'stock_quantity' },
            { name: 'is_deal', type: 'TINYINT(1) DEFAULT 0', after: 'is_active' },
            { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP', after: 'is_deal' },
            { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', after: 'created_at' }
        ];

        for (const col of columnsToAdd) {
            if (!existingColumns.includes(col.name.split(' ')[0])) { // Handle DEFAULT values in type
                const colName = col.name.split(' ')[0];
                const colType = col.name;
                await connection.query(`ALTER TABLE products ADD COLUMN ${col.type} AFTER ${col.after}`);
                console.log(`✓ Added ${colName} column`);
            } else {
                console.log(`⚠ ${col.name.split(' ')[0]} already exists, skipping...`);
            }
        }

        console.log('\n✅ Database schema fixed successfully!');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        connection.release();
        await pool.end();
    }
}

fixSchema();
