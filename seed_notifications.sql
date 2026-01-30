-- Seed script for admin notifications
-- Run this to add sample notifications for testing

-- Add broadcast notifications that all admins can see
INSERT INTO admin_notifications (title, message, type, priority, is_broadcast, action_url) VALUES
('Welcome to Admin Dashboard', 'Welcome to OMUNJU SHOPPERS Admin Dashboard! Here you can manage your store, view analytics, and respond to customer inquiries.', 'system', 'low', TRUE, '/admin/dashboard'),
('New Order Received', 'A new order has been placed on the platform. Check the orders section to process it.', 'order', 'medium', TRUE, '/admin/orders'),
('Low Stock Alert', 'Several products are running low on stock. Review and restock to avoid missing sales.', 'system', 'high', TRUE, '/admin/products'),
('New Customer Registration', 'A new customer has registered on the platform. Welcome them and offer assistance if needed.', 'user', 'low', TRUE, '/admin/customers'),
('System Update Available', 'A new system update is available. Review the changes and apply when ready.', 'system', 'medium', TRUE, '/admin/settings');

-- Add some order-related notifications
INSERT INTO admin_notifications (title, message, type, priority, is_broadcast, related_order_id) VALUES
('High Value Order', 'An order with total amount over $500 has been placed.', 'order', 'high', TRUE, 1);

-- Add sample unread notifications
INSERT INTO admin_notifications (title, message, type, priority, is_broadcast, is_read) VALUES
('Pending Messages', 'You have 3 unread customer messages waiting for response.', 'contact', 'medium', TRUE, FALSE);
