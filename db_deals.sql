/**
 * Advanced Deals Database Schema
 * Includes deal rules, flash sales, stock management, and expiry logic
 */

-- ============================================
-- DEALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS deals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    type ENUM('flash_sale', 'daily_deal', 'limited_time', 'clearance', 'bundle') DEFAULT 'flash_sale',
    
    -- Pricing
    original_price DECIMAL(10, 2) NOT NULL,
    deal_price DECIMAL(10, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) GENERATED ALWAYS AS (
        CASE 
            WHEN original_price > 0 
            THEN ROUND((1 - deal_price / original_price) * 100, 2)
            ELSE 0 
        END
    ) STORED,
    
    -- Stock Management
    total_stock INT NOT NULL DEFAULT 0,
    available_stock INT NOT NULL DEFAULT 0,
    max_per_customer INT DEFAULT 1,
    max_total_limit INT DEFAULT 0,  -- 0 = unlimited
    sold_count INT DEFAULT 0,
    
    -- Time Management
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
    
    -- Status
    status ENUM('scheduled', 'active', 'paused', 'expired', 'sold_out') DEFAULT 'scheduled',
    is_featured BOOLEAN DEFAULT FALSE,
    is_auto_renew BOOLEAN DEFAULT FALSE,
    
    -- Deal Rules
    min_purchase_qty INT DEFAULT 1,
    apply_to_categories JSON,  -- Array of category IDs
    apply_to_products JSON,    -- Array of product IDs
    exclusion_list JSON,       -- Products excluded from deal
    coupon_code VARCHAR(50),
    
    -- SEO
    meta_title VARCHAR(200),
    meta_description VARCHAR(500),
    
    -- Analytics
    view_count INT DEFAULT 0,
    conversion_count INT DEFAULT 0,
    
    -- Timestamps
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX (slug),
    INDEX (status),
    INDEX (type),
    INDEX (start_date, end_date),
    INDEX (is_featured),
    INDEX (deal_price),
    FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
);

-- ============================================
-- DEAL PRODUCTS TABLE
-- Links products to deals with custom pricing
-- ============================================
CREATE TABLE IF NOT EXISTS deal_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
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
);

-- ============================================
-- DEAL PURCHASES TABLE
-- Track individual purchases for deal rules
-- ============================================
CREATE TABLE IF NOT EXISTS deal_purchases (
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
);

-- ============================================
-- FLASH SALE SCHEDULE TABLE
-- For recurring flash sales
-- ============================================
CREATE TABLE IF NOT EXISTS flash_sale_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    day_of_week SET('MON','TUE','WED','THU','FRI','SAT','SUN'),
    start_time TIME NOT NULL,
    duration_minutes INT DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    deal_template_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (deal_template_id) REFERENCES deals(id) ON DELETE SET NULL,
    INDEX (is_active),
    INDEX (day_of_week)
);

-- ============================================
-- DEAL ACTIVITY LOG TABLE
-- Audit trail for deal changes
-- ============================================
CREATE TABLE IF NOT EXISTS deal_activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSON,
    new_values JSON,
    performed_by INT,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX (deal_id),
    INDEX (performed_at)
);

-- ============================================
-- DEAL NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS deal_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_id INT NOT NULL,
    user_id INT,
    type ENUM('starting_soon', 'ending_soon', 'price_drop', 'back_in_stock') NOT NULL,
    message TEXT,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX (deal_id),
    INDEX (user_id),
    INDEX (is_sent)
);

-- ============================================
-- SAMPLE DEALS DATA
-- ============================================
INSERT INTO deals (name, slug, description, type, original_price, deal_price, total_stock, available_stock, start_date, end_date, status, is_featured, max_per_customer) VALUES
('Flash Sale - Electronics', 'flash-sale-electronics', 'Massive discounts on electronics - 24 hours only!', 'flash_sale', 500.00, 299.99, 100, 75, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), 'active', TRUE, 2),

('Daily Deal - Fashion', 'daily-deal-fashion', 'Get 40% off on selected fashion items', 'daily_deal', 150.00, 89.99, 50, 30, NOW(), DATE_ADD(NOW(), INTERVAL 12 HOUR), 'active', TRUE, 1),

('Weekend Clearance', 'weekend-clearance', 'End of season clearance - up to 70% off', 'clearance', 300.00, 99.99, 200, 150, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 3 DAY), 'active', TRUE, 5),

('Bundle Deal - Smart Home', 'bundle-smart-home', 'Smart home starter kit at special price', 'bundle', 800.00, 599.99, 25, 20, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 'active', FALSE, 1);

-- ============================================
-- DEAL PRODUCTS MAPPING
-- ============================================
INSERT INTO deal_products (deal_id, product_id, original_price, deal_price, stock_allocated, sort_order) VALUES
(1, 1, 499.99, 299.99, 30, 1),
(1, 2, 299.99, 199.99, 25, 2),
(1, 3, 199.99, 149.99, 20, 3),
(2, 4, 149.99, 89.99, 25, 1),
(2, 5, 99.99, 59.99, 25, 2);

-- ============================================
-- STORED PROCEDURES
-- ============================================

-- Update deal status based on dates
DELIMITER //
CREATE PROCEDURE update_deal_statuses()
BEGIN
    DECLARE current_time DATETIME DEFAULT NOW();
    
    -- Expire deals past end date
    UPDATE deals 
    SET status = 'expired' 
    WHERE status IN ('active', 'scheduled') 
    AND end_date < current_time;
    
    -- Activate deals within date range
    UPDATE deals 
    SET status = 'active' 
    WHERE status = 'scheduled' 
    AND start_date <= current_time 
    AND end_date > current_time;
    
    -- Check sold out
    UPDATE deals 
    SET status = 'sold_out' 
    WHERE status = 'active' 
    AND available_stock <= 0 
    AND max_total_limit > 0;
    
    SELECT ROW_COUNT() as deals_updated;
END//

-- Get deal countdown data
DELIMITER //
CREATE PROCEDURE get_deal_countdown(IN p_deal_id INT)
BEGIN
    SELECT 
        id,
        name,
        status,
        end_date,
        TIMESTAMPDIFF(SECOND, NOW(), end_date) as seconds_remaining,
        available_stock,
        max_per_customer,
        sold_count
    FROM deals 
    WHERE id = p_deal_id;
END//

-- Validate purchase against deal rules
DELIMITER //
CREATE PROCEDURE validate_deal_purchase(
    IN p_deal_id INT,
    IN p_user_id INT,
    IN p_quantity INT,
    OUT p_valid BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_stock INT;
    DECLARE v_max_per_customer INT;
    DECLARE v_user_purchased INT;
    DECLARE v_deal_status VARCHAR(20);
    
    -- Get deal details
    SELECT available_stock, max_per_customer, status 
    INTO v_stock, v_max_per_customer, v_deal_status
    FROM deals WHERE id = p_deal_id;
    
    -- Check deal status
    IF v_deal_status != 'active' THEN
        SET p_valid = FALSE;
        SET p_message = 'This deal is no longer active';
    ELSEIF v_stock < p_quantity THEN
        SET p_valid = FALSE;
        SET p_message = CONCAT('Only ', v_stock, ' items available');
    ELSE
        -- Check user purchase limit
        IF p_user_id IS NOT NULL AND v_max_per_customer > 0 THEN
            SELECT COALESCE(SUM(quantity), 0) INTO v_user_purchased
            FROM deal_purchases 
            WHERE deal_id = p_deal_id 
            AND user_id = p_user_id 
            AND status IN ('pending', 'confirmed');
            
            IF v_user_purchased + p_quantity > v_max_per_customer THEN
                SET p_valid = FALSE;
                SET p_message = CONCAT('Maximum ', v_max_per_customer, ' per customer');
            ELSE
                SET p_valid = TRUE;
                SET p_message = 'Valid';
            END IF;
        ELSE
            SET p_valid = TRUE;
            SET p_message = 'Valid';
        END IF;
    END IF;
END//

-- Process deal purchase
DELIMITER //
CREATE PROCEDURE process_deal_purchase(
    IN p_deal_id INT,
    IN p_product_id INT,
    IN p_user_id INT,
    IN p_quantity INT,
    IN p_price DECIMAL(10, 2),
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_valid BOOLEAN;
    DECLARE v_stock INT;
    DECLARE v_new_stock INT;
    
    -- Validate
    CALL validate_deal_purchase(p_deal_id, p_user_id, p_quantity, v_valid, p_message);
    
    IF v_valid THEN
        START TRANSACTION;
        
        -- Lock and update stock
        SELECT available_stock INTO v_stock
        FROM deals 
        WHERE id = p_deal_id 
        FOR UPDATE;
        
        IF v_stock >= p_quantity THEN
            SET v_new_stock = v_stock - p_quantity;
            
            UPDATE deals 
            SET available_stock = v_new_stock,
                sold_count = sold_count + p_quantity,
                conversion_count = conversion_count + 1,
                updated_at = NOW()
            WHERE id = p_deal_id;
            
            -- Record purchase
            INSERT INTO deal_purchases (deal_id, product_id, user_id, quantity, price_at_purchase, status)
            VALUES (p_deal_id, p_product_id, p_user_id, p_quantity, p_price, 'confirmed');
            
            -- Update deal status if sold out
            IF v_new_stock <= 0 AND (SELECT max_total_limit FROM deals WHERE id = p_deal_id) > 0 THEN
                UPDATE deals SET status = 'sold_out' WHERE id = p_deal_id;
            END IF;
            
            COMMIT;
            SET p_success = TRUE;
            SET p_message = 'Purchase successful';
        ELSE
            ROLLBACK;
            SET p_success = FALSE;
            SET p_message = 'Insufficient stock';
        END IF;
    ELSE
        SET p_success = FALSE;
    END IF;
END//

DELIMITER ;

SELECT 'Deals schema created successfully!' as status;
