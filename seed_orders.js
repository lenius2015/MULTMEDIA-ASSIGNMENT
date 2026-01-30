/**
 * Seed script for creating sample order data
 * Run this script to populate the database with test orders
 * 
 * Usage: node seed_orders.js
 */

const db = require('./db');

async function seedOrders() {
    try {
        console.log('🌱 Starting order seed...');
        
        // Check if users exist
        const [users] = await db.query('SELECT id, name FROM users LIMIT 5');
        if (users.length === 0) {
            console.log('No users found. Creating sample users...');
            await db.query(`
                INSERT INTO users (name, email, password, phone, address, created_at) VALUES
                ('John Doe', 'john@example.com', 'hashed', '+254700000001', '123 Main St, Nairobi', NOW()),
                ('Jane Smith', 'jane@example.com', 'hashed', '+254700000002', '456 Oak Ave, Mombasa', NOW()),
                ('Bob Wilson', 'bob@example.com', 'hashed', '+254700000003', '789 Pine Rd, Kisumu', NOW())
            `);
            console.log('✅ Sample users created');
        }
        
        // Get users again
        const [userList] = await db.query('SELECT id, name, email FROM users LIMIT 5');
        
        // Check if orders exist
        const [existingOrders] = await db.query('SELECT COUNT(*) as count FROM orders');
        if (existingOrders[0].count > 0) {
            console.log(`ℹ️  ${existingOrders[0].count} orders already exist. Skipping seed.`);
            console.log('✅ Seed completed (existing data preserved)');
            return;
        }
        
        // Create sample products first
        console.log('📝 Creating sample products...');
        const [products] = await db.query('SELECT id, name, price FROM products LIMIT 5');
        if (products.length === 0) {
            await db.query(`
                INSERT INTO products (name, description, price, stock, category_id, created_at) VALUES
                ('Smartphone X', 'Latest smartphone with high-res camera', 599.99, 50, 1, NOW()),
                ('Laptop Pro', 'Professional laptop for work', 1299.99, 30, 1, NOW()),
                ('Wireless Headphones', 'Noise-cancelling headphones', 199.99, 100, 2, NOW()),
                ('Smart Watch', 'Fitness tracking smartwatch', 299.99, 75, 2, NOW()),
                ('Tablet Air', 'Lightweight tablet for entertainment', 449.99, 40, 1, NOW())
            `);
            console.log('✅ Sample products created');
        }
        
        const [productList] = await db.query('SELECT id, name, price FROM products LIMIT 5');
        
        // Create sample orders
        console.log('📦 Creating sample orders...');
        
        const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
        
        for (let i = 0; i < userList.length; i++) {
            const user = userList[i];
            const status = statuses[i % statuses.length];
            
            // Insert order
            const totalAmount = productList.reduce((sum, p) => sum + parseFloat(p.price), 0);
            const [orderResult] = await db.query(`
                INSERT INTO orders (user_id, total_amount, status, payment_method, shipping_address, created_at)
                VALUES (?, ?, ?, 'Credit Card', '123 Main St, Nairobi', NOW() - INTERVAL ? DAY)
            `, [user.id, totalAmount, status, i + 1]);
            
            const orderId = orderResult.insertId;
            
            // Add order items
            for (const product of productList) {
                const quantity = Math.floor(Math.random() * 3) + 1;
                await db.query(`
                    INSERT INTO order_items (order_id, product_id, quantity, price)
                    VALUES (?, ?, ?, ?)
                `, [orderId, product.id, quantity, product.price]);
            }
            
            console.log(`✅ Created order #${orderId} for ${user.name} (${status})`);
        }
        
        console.log('✅ Seed completed successfully!');
        console.log('📊 You can now test the admin orders panel at /admin/orders');
        
    } catch (error) {
        console.error('❌ Error seeding orders:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

seedOrders();
