-- Auction Management System Database Schema
-- OMUNJU SHOPPERS E-commerce Website

-- Auctions Table
CREATE TABLE IF NOT EXISTS auctions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    starting_bid DECIMAL(10,2) NOT NULL,
    current_bid DECIMAL(10,2) DEFAULT NULL,
    bid_increment DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    reserve_price DECIMAL(10,2) DEFAULT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    status ENUM('draft', 'active', 'ended', 'cancelled') DEFAULT 'draft',
    winner_id INT DEFAULT NULL,
    winning_bid DECIMAL(10,2) DEFAULT NULL,
    created_by INT NOT NULL, -- admin user id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_product_id (product_id),
    INDEX idx_status (status),
    INDEX idx_start_date (start_date),
    INDEX idx_end_date (end_date),
    INDEX idx_created_by (created_by),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Auction Winners Table (for historical record keeping)
CREATE TABLE IF NOT EXISTS auction_winners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auction_id INT NOT NULL,
    user_id INT NOT NULL,
    winning_bid DECIMAL(10,2) NOT NULL,
    won_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_auction_id (auction_id),
    INDEX idx_user_id (user_id),
    INDEX idx_won_at (won_at),
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bids Table
CREATE TABLE IF NOT EXISTS bids (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auction_id INT NOT NULL,
    user_id INT NOT NULL,
    bid_amount DECIMAL(10,2) NOT NULL,
    bid_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_winning BOOLEAN DEFAULT FALSE,
    INDEX idx_auction_id (auction_id),
    INDEX idx_user_id (user_id),
    INDEX idx_bid_time (bid_time),
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Countdown Events Table
CREATE TABLE IF NOT EXISTS countdown_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type ENUM('auction', 'promotion', 'flash_sale', 'announcement', 'launch') NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    display_on_homepage BOOLEAN DEFAULT TRUE,
    display_on_product BOOLEAN DEFAULT FALSE,
    related_auction_id INT DEFAULT NULL,
    related_product_id INT DEFAULT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_event_type (event_type),
    INDEX idx_start_date (start_date),
    INDEX idx_end_date (end_date),
    INDEX idx_is_active (is_active),
    INDEX idx_created_by (created_by),
    FOREIGN KEY (related_auction_id) REFERENCES auctions(id) ON DELETE SET NULL,
    FOREIGN KEY (related_product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE CASCADE
);

-- Auction Watchlist (users watching auctions)
CREATE TABLE IF NOT EXISTS auction_watchlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auction_id INT NOT NULL,
    user_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notified BOOLEAN DEFAULT FALSE,
    INDEX idx_auction_id (auction_id),
    INDEX idx_user_id (user_id),
    UNIQUE KEY unique_watch (auction_id, user_id),
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Auction Notifications (for winners, bidders, watchers)
CREATE TABLE IF NOT EXISTS auction_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auction_id INT NOT NULL,
    user_id INT NOT NULL,
    notification_type ENUM('auction_started', 'auction_ending', 'outbid', 'auction_won', 'auction_lost', 'auction_cancelled') NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_auction_id (auction_id),
    INDEX idx_user_id (user_id),
    INDEX idx_notification_type (notification_type),
    INDEX idx_is_read (is_read),
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Auction Settings (global settings)
CREATE TABLE IF NOT EXISTS auction_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key),
    FOREIGN KEY (updated_by) REFERENCES admins(id) ON DELETE SET NULL
);

-- Insert default auction settings
INSERT INTO auction_settings (setting_key, setting_value, setting_type, description) VALUES
('min_bid_increment', '1.00', 'number', 'Minimum bid increment amount'),
('max_bid_increment', '100.00', 'number', 'Maximum bid increment amount'),
('auction_extension_time', '5', 'number', 'Minutes to extend auction when bid placed near end'),
('auction_extension_threshold', '10', 'number', 'Minutes before end to trigger extension'),
('max_auctions_per_day', '50', 'number', 'Maximum auctions that can run simultaneously'),
('allow_bid_retraction', 'false', 'boolean', 'Whether users can retract their bids'),
('require_registration_for_bidding', 'true', 'boolean', 'Require user registration to place bids'),
('auto_close_auctions', 'true', 'boolean', 'Automatically close auctions when time expires'),
('send_notification_emails', 'true', 'boolean', 'Send email notifications for auction events'),
('timezone', 'Africa/Nairobi', 'string', 'Default timezone for auctions');

-- Sample data for testing
INSERT INTO auctions (product_id, title, description, starting_bid, bid_increment, start_date, end_date, status, created_by) VALUES
(1, 'iPhone 15 Pro Max Auction', 'Brand new iPhone 15 Pro Max 256GB', 1200.00, 10.00, '2024-01-26 10:00:00', '2024-01-26 18:00:00', 'draft', 1),
(2, 'MacBook Pro M3 Auction', 'Latest MacBook Pro with M3 chip', 2500.00, 25.00, '2024-01-27 14:00:00', '2024-01-27 20:00:00', 'draft', 1);

INSERT INTO countdown_events (title, description, event_type, start_date, end_date, is_active, display_on_homepage, created_by) VALUES
('New Year Flash Sale', 'Massive discounts on all electronics', 'flash_sale', '2024-01-26 00:00:00', '2024-01-31 23:59:59', TRUE, TRUE, 1),
('iPhone 15 Launch Event', 'Be the first to bid on the new iPhone 15', 'auction', '2024-01-26 09:00:00', '2024-01-26 10:00:00', TRUE, TRUE, 1),
('Weekend Promotion', 'Special weekend deals on laptops', 'promotion', '2024-01-27 00:00:00', '2024-01-28 23:59:59', TRUE, FALSE, 1);