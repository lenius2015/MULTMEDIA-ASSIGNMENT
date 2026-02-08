// Fix access_logs table - Add missing time_zone column
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

async function fixAccessLogs() {
    const connection = await pool.getConnection();
    console.log('Connected to database');

    try {
        // Check what columns exist
        const [columns] = await connection.query(`DESCRIBE access_logs`);
        const existingColumns = columns.map(c => c.Field);
        console.log('Existing columns:', existingColumns.join(', '));

        // Add missing columns
        const columnsToAdd = [
            { name: 'time_zone', type: 'VARCHAR(50) DEFAULT "UTC"' }
        ];

        for (const col of columnsToAdd) {
            const colName = col.name.split(' ')[0];
            if (!existingColumns.includes(colName)) {
                await connection.query(`ALTER TABLE access_logs ADD COLUMN ${col.type} AFTER user_id`);
                console.log(`✓ Added ${colName} column to access_logs`);
            } else {
                console.log(`⚠ ${colName} already exists, skipping...`);
            }
        }

        console.log('\n✅ Access logs schema fixed!');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        connection.release();
        await pool.end();
    }
}

fixAccessLogs();
