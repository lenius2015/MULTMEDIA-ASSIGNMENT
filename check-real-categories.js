const mysql = require('mysql2/promise');

async function checkRealCategories() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ecommerce',
        port: process.env.DB_PORT || 4306
    });

    try {
        console.log('Checking real categories from products table...');
        
        // Get unique categories from products table
        const [categories] = await connection.execute(`
            SELECT DISTINCT category, COUNT(*) as product_count 
            FROM products 
            WHERE category IS NOT NULL AND category != ''
            GROUP BY category 
            ORDER BY product_count DESC
        `);
        
        console.log('Available categories:');
        categories.forEach(cat => {
            console.log(`- ${cat.category} (${cat.product_count} products)`);
        });
        
        // Also check categories table
        try {
            const [dbCategories] = await connection.execute(`
                SELECT c.*, COUNT(p.id) as product_count 
                FROM categories c 
                LEFT JOIN products p ON c.name = p.category 
                GROUP BY c.id 
                ORDER BY c.name
            `);
            
            console.log('\nCategories from categories table:');
            dbCategories.forEach(cat => {
                console.log(`- ${cat.name} (${cat.product_count} products)`);
            });
        } catch (e) {
            console.log('\nNo categories table found');
        }
        
    } catch (error) {
        console.error('Error checking categories:', error);
    } finally {
        await connection.end();
    }
}

checkRealCategories();