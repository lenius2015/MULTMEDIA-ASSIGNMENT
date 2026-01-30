// Load environment variables first
require('dotenv').config();

const mysql = require('mysql2/promise');

async function seedCategories() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ecommerce',
        port: parseInt(process.env.DB_PORT) || 3306,
        multipleStatements: true
    });

    try {
        console.log('Connected to database');

        // Create categories table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                image_url VARCHAR(500),
                parent_id INT DEFAULT NULL,
                sort_order INT DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
            )
        `);
        console.log('Categories table created');

        // Insert sample categories
        const categories = [
            { name: 'T-Shirts', description: 'Classic and graphic t-shirts for everyday wear', image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', sort_order: 1 },
            { name: 'Jackets', description: 'Premium jackets for all seasons', image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400', sort_order: 2 },
            { name: 'Jeans', description: 'Slim fit and vintage jeans', image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400', sort_order: 3 },
            { name: 'Dresses', description: 'Elegant dresses for special occasions', image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', sort_order: 4 },
            { name: 'Sweaters', description: 'Cozy wool and cashmere sweaters', image_url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400', sort_order: 5 }
        ];

        for (const cat of categories) {
            await connection.query(`
                INSERT INTO categories (name, description, image_url, sort_order)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE name = name
            `, [cat.name, cat.description, cat.image_url, cat.sort_order]);
        }
        console.log('Sample categories inserted');

        // Verify
        const [rows] = await connection.query('SELECT * FROM categories');
        console.log('Categories in database:', rows);

        console.log('\nCategories seed completed successfully!');
    } catch (error) {
        console.error('Error seeding categories:', error.message);
        console.error('\nMake sure:');
        console.error('1. XAMPP MySQL is running');
        console.error('2. Database "ecommerce" exists');
    } finally {
        await connection.end();
    }
}

seedCategories();
