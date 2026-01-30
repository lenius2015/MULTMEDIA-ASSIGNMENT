-- Notification System Database Schema
-- OMUNJU SHOPPERS E-commerce Website

-- User Notifications Table
CREATE TABLE IF NOT EXISTS user_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('order', 'auction', 'payment', 'shipping', 'promotion', 'system', 'account') DEFAULT 'system',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    is_read BOOLEAN DEFAULT FALSE,
    is_email_sent BOOLEAN DEFAULT FALSE,
    related_order_id INT DEFAULT NULL,
    related_auction_id INT DEFAULT NULL,
    related_product_id INT DEFAULT NULL,
    action_url VARCHAR(500) DEFAULT NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at),
    INDEX idx_related_order (related_order_id),
    INDEX idx_related_auction (related_auction_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (related_order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (related_auction_id) REFERENCES auctions(id) ON DELETE SET NULL,
    FOREIGN KEY (related_product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Admin Notifications Table
CREATE TABLE IF NOT EXISTS admin_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT DEFAULT NULL, -- NULL means system-wide notification
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('order', 'user', 'auction', 'system', 'security', 'financial') DEFAULT 'system',
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    is_read BOOLEAN DEFAULT FALSE,
    is_broadcast BOOLEAN DEFAULT FALSE, -- Send to all admins
    related_user_id INT DEFAULT NULL,
    related_order_id INT DEFAULT NULL,
    related_auction_id INT DEFAULT NULL,
    action_url VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_id (admin_id),
    INDEX idx_type (type),
    INDEX idx_is_read (is_read),
    INDEX idx_is_broadcast (is_broadcast),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (related_order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (related_auction_id) REFERENCES auctions(id) ON DELETE SET NULL
);

-- Notification Templates Table
CREATE TABLE IF NOT EXISTS notification_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    type ENUM('user', 'admin') NOT NULL,
    category ENUM('order', 'auction', 'payment', 'shipping', 'promotion', 'system', 'account', 'security') NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message_template TEXT NOT NULL,
    email_template TEXT DEFAULT NULL,
    sms_template VARCHAR(160) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    variables TEXT, -- JSON string of available variables
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_category (category),
    INDEX idx_is_active (is_active),
    FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
);

-- User Notification Settings Table
CREATE TABLE IF NOT EXISTS user_notification_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    push_notifications BOOLEAN DEFAULT TRUE,
    order_updates BOOLEAN DEFAULT TRUE,
    auction_updates BOOLEAN DEFAULT TRUE,
    promotion_emails BOOLEAN DEFAULT TRUE,
    account_alerts BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Admin Notification Settings Table
CREATE TABLE IF NOT EXISTS admin_notification_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL UNIQUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    system_alerts BOOLEAN DEFAULT TRUE,
    order_alerts BOOLEAN DEFAULT TRUE,
    user_alerts BOOLEAN DEFAULT TRUE,
    auction_alerts BOOLEAN DEFAULT TRUE,
    security_alerts BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

-- Notification Queue Table (for scheduled/batch notifications)
CREATE TABLE IF NOT EXISTS notification_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    notification_type ENUM('user', 'admin', 'broadcast') NOT NULL,
    recipient_id INT DEFAULT NULL, -- NULL for broadcasts
    template_id INT DEFAULT NULL,
    title VARCHAR(255) DEFAULT NULL,
    message TEXT DEFAULT NULL,
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP NULL,
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notification_type (notification_type),
    INDEX idx_recipient_id (recipient_id),
    INDEX idx_scheduled_at (scheduled_at),
    INDEX idx_processed (processed),
    FOREIGN KEY (template_id) REFERENCES notification_templates(id) ON DELETE SET NULL
);

-- Insert default notification templates
INSERT INTO notification_templates (name, type, category, subject, message_template, email_template, variables) VALUES
('order_placed', 'user', 'order', 'Order Confirmation', 'Your order #{order_id} has been placed successfully!', '<h2>Order Confirmation</h2><p>Your order #{order_id} has been placed successfully!</p><p>Order Total: ${order_total}</p>', '{"order_id": "Order ID", "order_total": "Order Total Amount"}'),
('order_shipped', 'user', 'shipping', 'Order Shipped', 'Your order #{order_id} has been shipped and is on its way!', '<h2>Order Shipped</h2><p>Your order #{order_id} has been shipped!</p><p>Tracking Number: {tracking_number}</p>', '{"order_id": "Order ID", "tracking_number": "Tracking Number"}'),
('order_delivered', 'user', 'shipping', 'Order Delivered', 'Your order #{order_id} has been delivered successfully!', '<h2>Order Delivered</h2><p>Your order #{order_id} has been delivered to your address.</p>', '{"order_id": "Order ID"}'),
('auction_won', 'user', 'auction', 'Congratulations! You Won an Auction', 'Congratulations! You won the auction for {product_name} with a bid of ${winning_bid}!', '<h2>Auction Won!</h2><p>Congratulations! You won the auction for {product_name}.</p><p>Winning Bid: ${winning_bid}</p>', '{"product_name": "Product Name", "winning_bid": "Winning Bid Amount"}'),
('auction_outbid', 'user', 'auction', 'You\'ve Been Outbid', 'Someone placed a higher bid on {product_name}. Current highest bid: ${current_bid}', '<h2>You\'ve Been Outbid</h2><p>Someone placed a higher bid on {product_name}.</p><p>Current highest bid: ${current_bid}</p>', '{"product_name": "Product Name", "current_bid": "Current Highest Bid"}'),
('payment_failed', 'user', 'payment', 'Payment Failed', 'Your payment for order #{order_id} failed. Please update your payment method.', '<h2>Payment Failed</h2><p>Your payment for order #{order_id} failed.</p><p>Please update your payment method to complete the order.</p>', '{"order_id": "Order ID"}'),
('new_admin_order', 'admin', 'order', 'New Order Received', 'New order #{order_id} received from {customer_name}. Total: ${order_total}', 'New order #{order_id} received from {customer_name}. Total: ${order_total}', '{"order_id": "Order ID", "customer_name": "Customer Name", "order_total": "Order Total"}'),
('auction_ended', 'admin', 'auction', 'Auction Ended', 'Auction for {product_name} has ended. Winner: {winner_name}, Final Bid: ${final_bid}', 'Auction for {product_name} has ended. Winner: {winner_name}, Final Bid: ${final_bid}', '{"product_name": "Product Name", "winner_name": "Winner Name", "final_bid": "Final Bid Amount"}'),
('security_alert', 'admin', 'security', 'Security Alert', '{alert_type}: {alert_message}', 'Security Alert: {alert_type} - {alert_message}', '{"alert_type": "Alert Type", "alert_message": "Alert Message"}');

-- Insert sample notifications for testing
INSERT INTO user_notifications (user_id, title, message, type, priority, related_order_id) VALUES
(1, 'Welcome to OMUNJU SHOPPERS!', 'Thank you for joining our community. Start shopping for amazing deals!', 'account', 'low', NULL),
(1, 'Order Confirmation', 'Your order #12345 has been placed successfully. We\'ll notify you when it ships.', 'order', 'medium', 1);

INSERT INTO admin_notifications (title, message, type, priority, is_broadcast) VALUES
('System Maintenance', 'Scheduled maintenance will occur tonight from 2-4 AM EAT.', 'system', 'medium', TRUE),
('New User Registration', 'A new user has registered on the platform.', 'user', 'low', FALSE);