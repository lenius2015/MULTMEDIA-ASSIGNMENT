// Seed script for admin notifications
// Run with: node seed_notifications.js

const db = require('./db');

async function seedNotifications() {
  try {
    console.log('Seeding admin notifications...');
    
    // Add broadcast notifications that all admins can see
    await db.query(`
      INSERT INTO admin_notifications (title, message, type, priority, is_broadcast, action_url) VALUES
      ('Welcome to Admin Dashboard', 'Welcome to OMUNJU SHOPPERS Admin Dashboard! Here you can manage your store, view analytics, and respond to customer inquiries.', 'system', 'low', TRUE, '/admin/dashboard'),
      ('New Order Received', 'A new order has been placed on the platform. Check the orders section to process it.', 'order', 'medium', TRUE, '/admin/orders'),
      ('Low Stock Alert', 'Several products are running low on stock. Review and restock to avoid missing sales.', 'system', 'high', TRUE, '/admin/products'),
      ('New Customer Registration', 'A new customer has registered on the platform. Welcome them and offer assistance if needed.', 'user', 'low', TRUE, '/admin/customers'),
      ('System Update Available', 'A new system update is available. Review the changes and apply when ready.', 'system', 'medium', TRUE, '/admin/settings')
    `);
    
    // Add sample unread notifications
    await db.query(`
      INSERT INTO admin_notifications (title, message, type, priority, is_broadcast, is_read) VALUES
      ('Pending Messages', 'You have 3 unread customer messages waiting for response.', 'contact', 'medium', TRUE, FALSE)
    `);
    
    console.log('✅ Admin notifications seeded successfully!');
    
    // Verify
    const [count] = await db.query('SELECT COUNT(*) as count FROM admin_notifications');
    console.log(`Total notifications: ${count[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding notifications:', error);
    process.exit(1);
  }
}

seedNotifications();
