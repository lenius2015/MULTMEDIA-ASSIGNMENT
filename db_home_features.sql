/**
 * Database Schema for Home Page Features
 * Adds tables for: hero_banners, promotions, auctions, auction_bids
 */

-- Drop existing tables if they exist (in correct order for foreign keys)
DROP TABLE IF EXISTS auction_bids;
DROP TABLE IF EXISTS auctions;
DROP TABLE IF EXISTS promotions;
DROP TABLE IF EXISTS hero_banners;

-- ============================================
-- HERO BANNERS TABLE
-- Dynamic hero banners managed by admin
-- ============================================
CREATE TABLE IF NOT EXISTS hero_banners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL DEFAULT 'Discover Bold New Arrivals',
    subtitle TEXT,
    cta_text VARCHAR(100) DEFAULT 'Shop the Drop',
    cta_link VARCHAR(255) DEFAULT '/products',
    background_image VARCHAR(255),
    badge VARCHAR(50),
    badge_color VARCHAR(20),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATETIME,
    end_date DATETIME,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (is_active),
    INDEX (sort_order),
    INDEX (start_date, end_date)
);

-- ============================================
-- PROMOTIONS TABLE
-- Promotional banners and deals
-- ============================================
CREATE TABLE IF NOT EXISTS promotions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    link VARCHAR(255),
    discount_percent DECIMAL(5, 2),
    code VARCHAR(50),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATETIME,
    end_date DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (is_active),
    INDEX (start_date, end_date)
);

-- ============================================
-- AUCTIONS TABLE
-- Live auction items
-- ============================================
CREATE TABLE IF NOT EXISTS auctions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    product_id INT,
    image_url VARCHAR(255),
    starting_bid DECIMAL(10, 2) NOT NULL DEFAULT 0,
    current_bid DECIMAL(10, 2) DEFAULT 0,
    min_bid_increment DECIMAL(10, 2) DEFAULT 1.00,
    reserve_price DECIMAL(10, 2),
    status ENUM('scheduled', 'active', 'ended', 'cancelled') DEFAULT 'scheduled',
    start_date DATETIME,
    end_date DATETIME NOT NULL,
    winner_id INT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    INDEX (status),
    INDEX (end_date),
    INDEX (start_date, end_date)
);

-- ============================================
-- AUCTION BIDS TABLE
-- Track all bids on auctions
-- ============================================
CREATE TABLE IF NOT EXISTS auction_bids (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auction_id INT NOT NULL,
    user_id INT NOT NULL,
    bid_amount DECIMAL(10, 2) NOT NULL,
    max_amount DECIMAL(10, 2),  -- For proxy bidding
    is_winning BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX (auction_id),
    INDEX (user_id),
    INDEX (bid_amount),
    INDEX (created_at)
);

-- ============================================
-- COUNTDOWN EVENTS TABLE (Extended)
-- ============================================
CREATE TABLE IF NOT EXISTS countdown_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type ENUM('deal', 'auction', 'product', 'general') DEFAULT 'general',
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    display_on_homepage BOOLEAN DEFAULT FALSE,
    display_on_product BOOLEAN DEFAULT FALSE,
    related_auction_id INT,
    related_product_id INT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (is_active),
    INDEX (display_on_homepage),
    INDEX (end_date),
    FOREIGN KEY (related_auction_id) REFERENCES auctions(id) ON DELETE SET NULL,
    FOREIGN KEY (related_product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- ============================================
-- SAMPLE DATA FOR TESTING
-- ============================================

-- Sample Hero Banner
INSERT INTO hero_banners (title, subtitle, cta_text, cta_link, badge, sort_order, is_active) VALUES
('Discover Bold New Arrivals', 'Premium picks curated weekly. Fast shipping, secure checkout, fresh drops.', 'Shop the Drop', '/products', 'NEW', 1, TRUE),
('Summer Sale Up to 50% Off', 'Get ready for summer with amazing deals on fashion and outdoor gear!', 'Shop Sale', '/products?sale=true', 'SALE', 2, TRUE);

-- Sample Promotions
INSERT INTO promotions (title, description, image_url, discount_percent, code, sort_order, is_active, start_date, end_date) VALUES
('Free Shipping on Orders Over $50', 'Get free shipping when you spend $50 or more!', NULL, NULL, 'FREESHIP50', 1, TRUE, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY)),
('Welcome Discount', '10% off your first order!', NULL, 10, 'WELCOME10', 2, TRUE, NOW(), DATE_ADD(NOW(), INTERVAL 90 DAY)),
('Flash Sale - 24 Hours Only', 'Massive discounts on selected items!', NULL, 25, 'FLASH25', 3, TRUE, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY));

-- Sample Auctions
INSERT INTO auctions (title, description, product_id, starting_bid, current_bid, status, start_date, end_date) VALUES
('Vintage Camera Collection', 'Rare vintage camera in excellent condition', 1, 150.00, 150.00, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 3 DAY)),
('Limited Edition Sneakers', 'Brand new limited edition release', 2, 200.00, 225.00, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 5 DAY)),
('Designer Handbag', 'Authentic designer handbag with certificate', 3, 300.00, 300.00, 'scheduled', DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 7 DAY));

-- Sample Auction Bids
INSERT INTO auction_bids (auction_id, user_id, bid_amount, is_winning) VALUES
(1, 2, 175.00, TRUE),
(1, 3, 160.00, FALSE),
(2, 2, 225.00, TRUE);

-- Sample Countdown Event for Deals
INSERT INTO countdown_events (title, description, event_type, start_date, end_date, display_on_homepage, is_active) VALUES
('Deals of the Day Countdown', 'Special daily deals with massive discounts', 'deal', NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), TRUE, TRUE);

-- Add foreign key for countdown_events related tables
ALTER TABLE countdown_events
ADD CONSTRAINT fk_countdown_auction FOREIGN KEY (related_auction_id) REFERENCES auctions(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_countdown_product FOREIGN KEY (related_product_id) REFERENCES products(id) ON DELETE SET NULL;

-- Add foreign key for hero_banners created_by
ALTER TABLE hero_banners
ADD CONSTRAINT fk_hero_admin FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL;

-- Add foreign key for auctions created_by
ALTER TABLE auctions
ADD CONSTRAINT fk_auction_admin FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL;

-- Add foreign key for auctions winner
ALTER TABLE auctions
ADD CONSTRAINT fk_auction_winner FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL;

SELECT 'Home page feature tables created successfully!' as status;
