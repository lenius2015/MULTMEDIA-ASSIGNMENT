-- Promotions Database Schema
-- Full promotion system with coupons, banner promotions, category-based promotions

-- ============================================
-- PROMOTION TYPES
-- ============================================
-- 1. coupons - Coupon codes users can apply
-- 2. banner - Banner promotions on home page
-- 3. category - Category-based discounts
-- 4. cart - Cart-total based promotions
-- 5. first_order - First order discounts
-- 6. seasonal - Seasonal promotions (Christmas, Black Friday, etc.)

-- ============================================
-- PROMOTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS promotions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type ENUM('coupon', 'banner', 'category', 'cart', 'first_order', 'seasonal') NOT NULL DEFAULT 'coupon',
    discount_type ENUM('percentage', 'fixed', 'bogo') NOT NULL DEFAULT 'percentage',
    discount_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
    max_discount_amount DECIMAL(10, 2) DEFAULT NULL, -- Cap for percentage discounts
    min_order_amount DECIMAL(10, 2) DEFAULT 0, -- Minimum order to use
    min_quantity INT DEFAULT 1, -- Minimum quantity requirement
    usage_limit INT DEFAULT NULL, -- Total usage limit
    usage_limit_per_user INT DEFAULT NULL, -- Per user limit
    usage_count INT DEFAULT 0, -- Current usage count
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_auto_apply BOOLEAN DEFAULT FALSE, -- Auto apply without code
    priority INT DEFAULT 0, -- Higher priority applied first
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT DEFAULT NULL, -- Admin user ID
    INDEX idx_type (type),
    INDEX idx_active (is_active),
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- COUPONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS coupons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    promotion_id INT NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
    INDEX idx_code (code),
    INDEX idx_promotion (promotion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BANNER PROMOTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS banner_promotions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    promotion_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    subtitle VARCHAR(300),
    image_url VARCHAR(500),
    background_color VARCHAR(20),
    text_color VARCHAR(20),
    button_text VARCHAR(100),
    button_url VARCHAR(500),
    position ENUM('hero', 'sidebar', 'footer', 'popup') DEFAULT 'hero',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
    INDEX idx_position (position),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CATEGORY PROMOTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS category_promotions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    promotion_id INT NOT NULL,
    category_id INT NOT NULL,
    is_include_subcategories BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE KEY unique_promotion_category (promotion_id, category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PRODUCT PROMOTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS product_promotions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    promotion_id INT NOT NULL,
    product_id INT NOT NULL,
    is_exclude BOOLEAN DEFAULT FALSE, -- TRUE = exclude from promotion
    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_promotion_product (promotion_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- USER PROMOTION USAGE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS promotion_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    promotion_id INT NOT NULL,
    user_id INT NOT NULL,
    order_id INT,
    discount_amount DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    INDEX idx_promotion_user (promotion_id, user_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PROMOTION RULES TABLE (Advanced Rules Engine)
-- ============================================
CREATE TABLE IF NOT EXISTS promotion_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    promotion_id INT NOT NULL,
    rule_type ENUM('min_age', 'max_age', 'user_group', 'payment_method', 'shipping_method', 'location', 'first_purchase', 'device_type') NOT NULL,
    rule_value VARCHAR(500) NOT NULL, -- JSON or comma-separated values
    is_required BOOLEAN DEFAULT FALSE, -- TRUE = must match, FALSE = nice to have
    priority INT DEFAULT 0, -- Higher priority evaluated first
    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
    INDEX idx_promotion (promotion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SEASONAL PROMOTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS seasonal_promotions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    promotion_id INT NOT NULL,
    season_name VARCHAR(100) NOT NULL, -- 'Christmas', 'Black Friday', etc.
    theme_color VARCHAR(20),
    icon_url VARCHAR(500),
    decoration_html TEXT, -- Custom HTML for decorations
    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PROMOTION ANALYTICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS promotion_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    promotion_id INT NOT NULL,
    date DATE NOT NULL,
    views INT DEFAULT 0,
    clicks INT DEFAULT 0,
    usages INT DEFAULT 0,
    revenue_generated DECIMAL(12, 2) DEFAULT 0,
    discount_given DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_promotion_date (promotion_id, date),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STORED PROCEDURES
-- ============================================

-- Validate and apply promotion
DELIMITER //
CREATE PROCEDURE ValidateAndApplyPromotion(
    IN p_user_id INT,
    IN p_coupon_code VARCHAR(50),
    IN p_cart_total DECIMAL(10, 2),
    IN p_cart_items JSON
)
BEGIN
    DECLARE v_promotion_id INT;
    DECLARE v_discount_type ENUM('percentage', 'fixed', 'bogo');
    DECLARE v_discount_value DECIMAL(10, 2);
    DECLARE v_max_discount DECIMAL(10, 2);
    DECLARE v_min_order DECIMAL(10, 2);
    DECLARE v_usage_limit INT;
    DECLARE v_usage_count INT;
    DECLARE v_usage_per_user INT;
    DECLARE v_user_usage_count INT;
    DECLARE v_start_date DATETIME;
    DECLARE v_end_date DATETIME;
    DECLARE v_is_active BOOLEAN;
    DECLARE v_final_discount DECIMAL(10, 2);
    DECLARE v_error_message VARCHAR(500);
    DECLARE v_success BOOLEAN DEFAULT FALSE;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_message = MESSAGE_TEXT;
        SELECT NULL as promotion_id, NULL as discount_amount, NULL as discount_type, 
               NULL as final_total, v_error_message as error, FALSE as success;
    END;

    -- Get promotion from coupon code
    SELECT p.id, p.discount_type, p.discount_value, p.max_discount_amount,
           p.min_order_amount, p.usage_limit, p.usage_count, p.usage_limit_per_user,
           p.start_date, p.end_date, p.is_active
    INTO v_promotion_id, v_discount_type, v_discount_value, v_max_discount,
         v_min_order, v_usage_limit, v_usage_count, v_usage_per_user,
         v_start_date, v_end_date, v_is_active
    FROM promotions p
    INNER JOIN coupons c ON p.id = c.promotion_id
    WHERE c.code = p_coupon_code AND c.is_active = TRUE
    LIMIT 1;

    -- Check if promotion exists
    IF v_promotion_id IS NULL THEN
        SET v_error_message = 'Invalid coupon code';
        SELECT NULL as promotion_id, NULL as discount_amount, NULL as discount_type, 
               NULL as final_total, v_error_message as error, FALSE as success;
    ELSE
        -- Validate promotion status
        IF v_is_active = FALSE THEN
            SET v_error_message = 'This coupon is no longer active';
            SELECT NULL as promotion_id, NULL as discount_amount, NULL as discount_type, 
                   NULL as final_total, v_error_message as error, FALSE as success;
        ELSEIF NOW() < v_start_date THEN
            SET v_error_message = 'This coupon is not yet active';
            SELECT NULL as promotion_id, NULL as discount_amount, NULL as discount_type, 
                   NULL as final_total, v_error_message as error, FALSE as success;
        ELSEIF NOW() > v_end_date THEN
            SET v_error_message = 'This coupon has expired';
            SELECT NULL as promotion_id, NULL as discount_amount, NULL as discount_type, 
                   NULL as final_total, v_error_message as error, FALSE as success;
        ELSEIF v_usage_limit IS NOT NULL AND v_usage_count >= v_usage_limit THEN
            SET v_error_message = 'This coupon has reached its maximum usage limit';
            SELECT NULL as promotion_id, NULL as discount_amount, NULL as discount_type, 
                   NULL as final_total, v_error_message as error, FALSE as success;
        ELSE
            -- Check user usage limit
            IF v_usage_per_user IS NOT NULL THEN
                SELECT COUNT(*) INTO v_user_usage_count
                FROM promotion_usage
                WHERE promotion_id = v_promotion_id AND user_id = p_user_id;
                
                IF v_user_usage_count >= v_usage_per_user THEN
                    SET v_error_message = 'You have already used this coupon the maximum number of times';
                    SELECT NULL as promotion_id, NULL as discount_amount, NULL as discount_type, 
                           NULL as final_total, v_error_message as error, FALSE as success;
                ELSE
                    SET v_success = TRUE;
                END IF;
            ELSE
                SET v_success = TRUE;
            END IF;

            -- Check minimum order amount
            IF v_success = TRUE AND p_cart_total < v_min_order THEN
                SET v_error_message = CONCAT('Minimum order amount of $', v_min_order, ' required');
                SELECT NULL as promotion_id, NULL as discount_amount, NULL as discount_type, 
                       NULL as final_total, v_error_message as error, FALSE as success;
            ELSE
                SET v_success = TRUE;
            END IF;
        END IF;
    END IF;

    -- Calculate discount
    IF v_success = TRUE THEN
        IF v_discount_type = 'percentage' THEN
            SET v_final_discount = LEAST((p_cart_total * v_discount_value / 100), 
                                         COALESCE(v_max_discount, p_cart_total));
        ELSEIF v_discount_type = 'fixed' THEN
            SET v_final_discount = LEAST(v_discount_value, p_cart_total);
        ELSE
            SET v_final_discount = 0; -- BOGO handled separately
        END IF;

        -- Return success response
        SELECT v_promotion_id as promotion_id,
               v_final_discount as discount_amount,
               v_discount_type as discount_type,
               (p_cart_total - v_final_discount) as final_total,
               NULL as error,
               TRUE as success;
    END IF;
END //
DELIMITER ;

-- Calculate discount for cart items
DELIMITER //
CREATE PROCEDURE CalculateCartDiscount(
    IN p_promotion_id INT,
    IN p_cart_items JSON
)
BEGIN
    DECLARE v_discount_type ENUM('percentage', 'fixed', 'bogo');
    DECLARE v_discount_value DECIMAL(10, 2);
    DECLARE v_max_discount DECIMAL(10, 2);
    DECLARE v_min_quantity INT;
    DECLARE v_total_items INT;
    DECLARE v_eligible_total DECIMAL(10, 2);
    DECLARE v_final_discount DECIMAL(10, 2);
    DECLARE v_item_count INT DEFAULT 0;
    DECLARE v_bogo_count INT DEFAULT 0;
    DECLARE i INT DEFAULT 0;
    DECLARE item JSON;

    SELECT discount_type, discount_value, max_discount_amount, min_quantity
    INTO v_discount_type, v_discount_value, v_max_discount, v_min_quantity
    FROM promotions WHERE id = p_promotion_id;

    -- Count total items and calculate eligible total
    SET v_item_count = JSON_LENGTH(p_cart_items);
    SET v_eligible_total = 0;

    WHILE i < v_item_count DO
        SET item = JSON_EXTRACT(p_cart_items, CONCAT('$[', i, ']'));
        SET v_eligible_total = v_eligible_total + 
            (JSON_UNQUOTE(item->'$.price') * JSON_UNQUOTE(item->'$.quantity'));
        SET i = i + 1;
    END WHILE;

    -- Check minimum quantity
    SET v_total_items = JSON_LENGTH(p_cart_items);
    IF v_min_quantity > 0 AND v_total_items < v_min_quantity THEN
        SELECT 0 as discount_amount, 'Minimum quantity not met' as error;
    ELSE
        -- Calculate discount
        IF v_discount_type = 'percentage' THEN
            SET v_final_discount = LEAST((v_eligible_total * v_discount_value / 100), 
                                         COALESCE(v_max_discount, v_eligible_total));
        ELSEIF v_discount_type = 'fixed' THEN
            SET v_final_discount = v_discount_value;
        ELSE
            SET v_final_discount = 0;
        END IF;

        SELECT v_final_discount as discount_amount, NULL as error;
    END IF;
END //
DELIMITER ;

-- Record promotion usage
DELIMITER //
CREATE PROCEDURE RecordPromotionUsage(
    IN p_promotion_id INT,
    IN p_user_id INT,
    IN p_order_id INT,
    IN p_discount_amount DECIMAL(10, 2)
)
BEGIN
    INSERT INTO promotion_usage (promotion_id, user_id, order_id, discount_amount)
    VALUES (p_promotion_id, p_user_id, p_order_id, p_discount_amount);

    UPDATE promotions 
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = p_promotion_id;

    SELECT TRUE as success;
END //
DELIMITER ;

-- ============================================
-- SAMPLE DATA - Insert default promotions
-- ============================================
INSERT INTO promotions (name, description, type, discount_type, discount_value, max_discount_amount, min_order_amount, usage_limit, start_date, end_date, is_active, priority) VALUES
('WELCOME10', 'Welcome discount for new customers', 'first_order', 'percentage', 10.00, 50.00, 100.00, 1000, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), TRUE, 10),
('SUMMER25', 'Summer sale - 25% off', 'seasonal', 'percentage', 25.00, 100.00, 200.00, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 2 MONTH), TRUE, 5),
('FLAT50', 'Flat $50 off orders over $300', 'cart', 'fixed', 50.00, NULL, 300.00, 500, NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), TRUE, 3);

INSERT INTO coupons (promotion_id, code, is_active) VALUES
(1, 'WELCOME10', TRUE),
(2, 'SUMMER25', TRUE),
(3, 'FLAT50', TRUE);

INSERT INTO banner_promotions (promotion_id, title, subtitle, image_url, position, sort_order, is_active) VALUES
(2, 'Summer Sale', 'Up to 50% off on summer collection', '/images/summer-sale.jpg', 'hero', 1, TRUE),
(2, 'Shop Now', 'Limited time offer', NULL, 'sidebar', 1, TRUE);

INSERT INTO seasonal_promotions (promotion_id, season_name, theme_color) VALUES
(2, 'Summer Sale', '#FF6B35');
