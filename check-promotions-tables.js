const mysql = require('mysql2/promise');

async function checkPromotionsTables() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ecommerce',
        port: process.env.DB_PORT || 4306
    });

    try {
        console.log('Checking promotions-related tables...');
        
        // Check if categories table exists
        try {
            const [categories] = await connection.execute('SELECT * FROM categories LIMIT 1');
            console.log('✓ Categories table exists');
        } catch (e) {
            console.log('✗ Categories table does not exist');
        }
        
        // Check products table structure
        try {
            const [columns] = await connection.execute(`
                SELECT COLUMN_NAME, DATA_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products'
            `, [process.env.DB_NAME || 'ecommerce']);
            
            console.log('Products table columns:');
            columns.forEach(col => {
                console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE}`);
            });
        } catch (e) {
            console.error('Error checking products table:', e);
        }
        
    } catch (error) {
        console.error('Error checking tables:', error);
    } finally {
        await connection.end();
    }
}

checkPromotionsTables();