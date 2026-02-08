const mysql = require('mysql2/promise');
const fs = require('fs');

async function setupDeals() {
    try {
        // Create connection
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'ecommerce',
            port: 4306
        });

        console.log('Connected to database');

        // Read SQL file
        const sql = fs.readFileSync('db_deals.sql', 'utf8');

        // Execute SQL
        await connection.execute(sql);
        
        console.log('Deals database schema created successfully!');
        
        // Test if tables were created
        const [tables] = await connection.execute('SHOW TABLES LIKE "deals"');
        if (tables.length > 0) {
            console.log('✓ deals table created');
        }
        
        const [dealProducts] = await connection.execute('SHOW TABLES LIKE "deal_products"');
        if (dealProducts.length > 0) {
            console.log('✓ deal_products table created');
        }

        await connection.end();
        
    } catch (error) {
        console.error('Error setting up deals:', error);
    }
}

setupDeals();