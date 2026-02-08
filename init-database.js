/**
 * Database Initialization Script
 * Creates all required tables for the OMUNJU SHOPPERS e-commerce website
 * Skips tables that already exist
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDatabase() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ecommerce',
        port: parseInt(process.env.DB_PORT) || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        multipleStatements: true
    });

    console.log('Initializing database tables...');

    try {
        // Check existing tables
        const [existingTables] = await pool.query("SHOW TABLES");
        const tableNames = existingTables.map(t => Object.values(t)[0]);
        console.log('Existing tables:', tableNames);

        // Create deals table if not exists
        if (!tableNames.includes('deals')) {
            await pool.query(`
                CREATE TABLE deals (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    slug VARCHAR(255) NOT NULL UNIQUE,
                    description TEXT,
                    type ENUM('flash_sale', 'daily_deal', 'limited_time', 'clearance', 'bundle') DEFAULT 'flash_sale',
                    original_price DECIMAL(10, 2) NOT NULL,
                    deal_price DECIMAL(10, 2) NOT NULL,
                    discount_percent DECIMAL(5, 2) GENERATED ALWAYS AS (
                        CASE 
                            WHEN original_price > 0 
                            THEN ROUND((1 - deal_price / original_price) * 100, 2)
                            ELSE 0 
                        END
                    ) STORED,
                    total_stock INT NOT NULL DEFAULT 0,
                    available_stock INT NOT NULL DEFAULT 0,
                    max_per_customer INT DEFAULT 1,
                    max_total_limit INT DEFAULT 0,
                    sold_count INT DEFAULT 0,
                    start_date DATETIME NOT NULL,
                    end_date DATETIME NOT NULL,
                    timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
                    status ENUM('scheduled', 'active', 'paused', 'expired', 'sold_out') DEFAULT 'scheduled',
                    is_featured BOOLEAN DEFAULT FALSE,
                    is_auto_renew BOOLEAN DEFAULT FALSE,
                    min_purchase_qty INT DEFAULT 1,
                    apply_to_categories JSON,
                    apply_to_products JSON,
                    exclusion_list JSON,
                    coupon_code VARCHAR(50),
                    meta_title VARCHAR(200),
                    meta_description VARCHAR(500),
                    view_count INT DEFAULT 0,
                    conversion_count INT DEFAULT 0,
                    created_by INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX (slug),
                    INDEX (status),
                    INDEX (type),
                    INDEX (start_date, end_date),
                    INDEX (is_featured),
                    INDEX (deal_price)
                )
            `);
            console.log('✓ Created deals table');
        } else {
            console.log('✓ Deals table already exists');
        }

        // Create deal_products table if not exists
        if (!tableNames.includes('deal_products')) {
            await pool.query(`
                CREATE TABLE deal_products (
                    deal_id INT NOT NULL,
                    product_id INT NOT NULL,
                    original_price DECIMAL(10, 2) NOT NULL,
                    deal_price DECIMAL(10, 2) NOT NULL,
                    stock_allocated INT NOT NULL DEFAULT 0,
                    stock_sold INT DEFAULT 0,
                    sort_order INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (deal_id, product_id),
                    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
                    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                    INDEX (product_id),
                    INDEX (deal_id)
                )
            `);
            console.log('✓ Created deal_products table');
        } else {
            console.log('✓ Deal_products table already exists');
        }

        // Create deal_purchases table if not exists
        if (!tableNames.includes('deal_purchases')) {
            await pool.query(`
                CREATE TABLE deal_purchases (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    deal_id INT NOT NULL,
                    product_id INT NOT NULL,
                    user_id INT,
                    session_id VARCHAR(255),
                    quantity INT NOT NULL DEFAULT 1,
                    price_at_purchase DECIMAL(10, 2) NOT NULL,
                    status ENUM('pending', 'confirmed', 'cancelled', 'refunded') DEFAULT 'pending',
                    order_id INT,
                    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
                    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
                    INDEX (deal_id),
                    INDEX (user_id),
                    INDEX (product_id),
                    INDEX (purchased_at)
                )
            `);
            console.log('✓ Created deal_purchases table');
        } else {
            console.log('✓ Deal_purchases table already exists');
        }

        // Insert sample deals data if deals table is empty
        const [dealCount] = await pool.query('SELECT COUNT(*) as count FROM deals');
        if (dealCount[0].count === 0) {
            await pool.query(`
                INSERT INTO deals (name, slug, description, type, original_price, deal_price, total_stock, available_stock, start_date, end_date, status, is_featured, max_per_customer) VALUES
                ('Flash Sale - Electronics', 'flash-sale-electronics', 'Massive discounts on electronics - 24 hours only!', 'flash_sale', 500.00, 299.99, 100, 75, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), 'active', TRUE, 2),
                ('Daily Deal - Fashion', 'daily-deal-fashion', 'Get 40% off on selected fashion items', 'daily_deal', 150.00, 89.99, 50, 30, NOW(), DATE_ADD(NOW(), INTERVAL 12 HOUR), 'active', TRUE, 1)
            `);
            console.log('✓ Added sample deals data');
        } else {
            console.log('✓ Deals data already exists');
        }

        console.log('\n✅ Database initialization completed successfully!');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run if called directly
if (require.main === module) {
    initDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { initDatabase };
