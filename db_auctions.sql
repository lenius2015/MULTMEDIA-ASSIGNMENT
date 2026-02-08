-- Auction System Database Schema
-- Real-time bidding with WebSocket support

-- ============================================
-- AUCTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS auctions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    seller_id INT NOT NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    starting_price DECIMAL(10, 2) NOT NULL,
    current_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    reserve_price DECIMAL(10, 2) DEFAULT NULL, -- Minimum price seller will accept
    buy_now_price DECIMAL(10, 2) DEFAULT NULL, -- Instant purchase price
    min_bid_increment DECIMAL(10, 2) DEFAULT 1.00, -- Minimum bid increase
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('pending', 'active', 'paused', 'ended', 'cancelled', 'sold') NOT NULL DEFAULT 'pending',
    winner_id INT DEFAULT NULL, -- Winning user ID
    winner_bid_id INT DEFAULT NULL, -- Reference to winning bid
    total_bids INT DEFAULT 0,
    total_viewers INT DEFAULT 0,
    is_reserve_met BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_end_time (end_time),
    INDEX idx_product (product_id),
    INDEX idx_seller (seller_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BIDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bids (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auction_id INT NOT NULL,
    user_id INT NOT NULL,
    bid_amount DECIMAL(10, 2) NOT NULL,
    max_bid_amount DECIMAL(10, 2) DEFAULT NULL, -- For proxy bidding
    is_auto_bid BOOLEAN DEFAULT FALSE,
    is_winning BOOLEAN DEFAULT FALSE,
    bid_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'outbid', 'winning', 'cancelled', 'accepted') DEFAULT 'active',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_auction (auction_id),
    INDEX idx_user (user_id),
    INDEX idx_bid_time (bid_time),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- AUCTION HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS auction_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auction_id INT NOT NULL,
    event_type ENUM('started', 'bid', 'outbid', 'ended', 'sold', 'cancelled', 'extended', 'paused', 'price_change') NOT NULL,
    user_id INT DEFAULT NULL, -- User involved in event (if any)
    old_value VARCHAR(500) DEFAULT NULL,
    new_value VARCHAR(500) DEFAULT NULL,
    description TEXT,
    metadata JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    INDEX idx_auction (auction_id),
    INDEX idx_event (event_type),
    INDEX idx_time (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- AUCTION WATCHLIST TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS auction_watchlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auction_id INT NOT NULL,
    user_id INT NOT NULL,
    notify_on_new_bid BOOLEAN DEFAULT TRUE,
    notify_on_ending BOOLEAN DEFAULT TRUE,
    notify_on_won BOOLEAN DEFAULT TRUE,
    last_notified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_auction_user (auction_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- AUCTION EXTENSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS auction_extensions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auction_id INT NOT NULL,
    original_end_time DATETIME NOT NULL,
    new_end_time DATETIME NOT NULL,
    reason VARCHAR(500),
    extended_by INT DEFAULT NULL, -- Admin user ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    INDEX idx_auction (auction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BID THROTTLE TABLE (Anti-Spam)
-- ============================================
CREATE TABLE IF NOT EXISTS bid_throttle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auction_id INT NOT NULL,
    user_id INT NOT NULL,
    bid_count INT DEFAULT 0,
    last_bid_at TIMESTAMP NULL,
    blocked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_auction_user (auction_id, user_id),
    INDEX idx_blocked (blocked_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- AUCTION ANALYTICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS auction_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auction_id INT NOT NULL,
    date DATE NOT NULL,
    unique_bidders INT DEFAULT 0,
    total_bids INT DEFAULT 0,
    peak_viewers INT DEFAULT 0,
    avg_time_between_bids DECIMAL(10, 2) DEFAULT NULL,
    conversion_rate DECIMAL(5, 2) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_auction_date (auction_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STORED PROCEDURES
-- ============================================

-- Place a new bid
DELIMITER //
CREATE PROCEDURE PlaceBid(
    IN p_auction_id INT,
    IN p_user_id INT,
    IN p_bid_amount DECIMAL(10, 2),
    IN p_max_bid_amount DECIMAL(10, 2),
    IN p_is_auto_bid BOOLEAN,
    IN p_ip_address VARCHAR(45)
)
BEGIN
    DECLARE v_current_price DECIMAL(10, 2);
    DECLARE v_min_bid_increment DECIMAL(10, 2);
    DECLARE v_end_time DATETIME;
    DECLARE v_status VARCHAR(20);
    DECLARE v_seller_id INT;
    DECLARE v_min_bid DECIMAL(10, 2);
    DECLARE v_error_message VARCHAR(500);
    DECLARE v_bid_id INT;
    DECLARE v_previous_winner_id INT;
    DECLARE v_success BOOLEAN DEFAULT FALSE;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_message = MESSAGE_TEXT;
        SELECT NULL as bid_id, v_error_message as error, FALSE as success;
    END;

    -- Get auction details
    SELECT current_price, min_bid_increment, end_time, status, seller_id
    INTO v_current_price, v_min_bid_increment, v_end_time, v_status, v_seller_id
    FROM auctions WHERE id = p_auction_id;

    -- Validation checks
    IF v_status != 'active' THEN
        SET v_error_message = 'This auction is not currently active';
        SELECT NULL as bid_id, v_error_message as error, FALSE as success;
    ELSEIF NOW() > v_end_time THEN
        SET v_error_message = 'This auction has already ended';
        SELECT NULL as bid_id, v_error_message as error, FALSE as success;
    ELSEIF p_user_id = v_seller_id THEN
        SET v_error_message = 'You cannot bid on your own auction';
        SELECT NULL as bid_id, v_error_message as error, FALSE as success;
    ELSE
        -- Calculate minimum bid
        SET v_min_bid = v_current_price + v_min_bid_increment;
        
        IF p_bid_amount < v_min_bid THEN
            SET v_error_message = CONCAT('Minimum bid is $', v_min_bid);
            SELECT NULL as bid_id, v_error_message as error, FALSE as success;
        ELSE
            SET v_success = TRUE;
        END IF;
    END IF;

    IF v_success = TRUE THEN
        -- Start transaction
        START TRANSACTION;

        -- Get previous winner
        SELECT user_id INTO v_previous_winner_id
        FROM bids WHERE auction_id = p_auction_id AND is_winning = TRUE
        LIMIT 1;

        -- Insert the bid
        INSERT INTO bids (auction_id, user_id, bid_amount, max_bid_amount, is_auto_bid, ip_address, status)
        VALUES (p_auction_id, p_user_id, p_bid_amount, p_max_bid_amount, p_is_auto_bid, p_ip_address, 'winning');

        SET v_bid_id = LAST_INSERT_ID();

        -- Update previous winning bid to outbid
        IF v_previous_winner_id IS NOT NULL AND v_previous_winner_id != p_user_id THEN
            UPDATE bids SET is_winning = FALSE, status = 'outbid'
            WHERE auction_id = p_auction_id AND user_id = v_previous_winner_id 
            AND is_winning = TRUE AND status = 'winning';
        END IF;

        -- Update auction
        UPDATE auctions 
        SET current_price = p_bid_amount,
            total_bids = total_bids + 1,
            winner_id = p_user_id,
            winner_bid_id = v_bid_id,
            updated_at = NOW()
        WHERE id = p_auction_id;

        -- Check reserve price
        SELECT reserve_price INTO @reserve FROM auctions WHERE id = p_auction_id;
        IF @reserve IS NOT NULL AND p_bid_amount >= @reserve THEN
            UPDATE auctions SET is_reserve_met = TRUE WHERE id = p_auction_id;
        END IF;

        -- Add history entry
        INSERT INTO auction_history (auction_id, event_type, user_id, old_value, new_value, description)
        VALUES (p_auction_id, 'bid', p_user_id, v_current_price, p_bid_amount, 
                CONCAT('New bid of $', p_bid_amount, ' placed'));

        COMMIT;

        -- Return success
        SELECT v_bid_id as bid_id, 
               p_bid_amount as bid_amount,
               (SELECT COUNT(*) FROM bids WHERE auction_id = p_auction_id) as total_bids,
               TRUE as success,
               NULL as error;
    END IF;
END //
DELIMITER ;

-- End auction and select winner
DELIMITER //
CREATE PROCEDURE EndAuction(
    IN p_auction_id INT
)
BEGIN
    DECLARE v_winner_id INT;
    DECLARE v_winning_bid DECIMAL(10, 2);
    DECLARE v_reserve_met BOOLEAN;
    DECLARE v_seller_id INT;
    DECLARE v_status VARCHAR(20);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SELECT FALSE as success, 'Error ending auction' as error;
    END;

    -- Get auction details
    SELECT winner_id, current_price, is_reserve_met, seller_id, status
    INTO v_winner_id, v_winning_bid, v_reserve_met, v_seller_id, v_status
    FROM auctions WHERE id = p_auction_id;

    IF v_status != 'active' THEN
        SELECT FALSE as success, 'Auction is not active' as error;
    ELSE
        START TRANSACTION;

        -- Determine final status
        IF v_winner_id IS NOT NULL AND (v_reserve_met OR v_winning_bid >= (SELECT reserve_price FROM auctions WHERE id = p_auction_id)) THEN
            -- Sale completed
            UPDATE auctions 
            SET status = 'sold', 
                updated_at = NOW()
            WHERE id = p_auction_id;
        ELSE
            -- No sale - reserve not met or no bids
            UPDATE auctions 
            SET status = 'ended', 
                updated_at = NOW()
            WHERE id = p_auction_id;
        END IF;

        -- Add history entry
        INSERT INTO auction_history (auction_id, event_type, user_id, description)
        VALUES (p_auction_id, 'ended', v_winner_id, 
                CONCAT('Auction ended. Winner: ', IFNULL(v_winner_id, 'None')));

        COMMIT;

        SELECT TRUE as success, 
               v_winner_id as winner_id,
               v_winning_bid as winning_amount,
               v_reserve_met as reserve_met;
    END IF;
END //
DELIMITER ;

-- Extend auction time
DELIMITER //
CREATE PROCEDURE ExtendAuction(
    IN p_auction_id INT,
    IN p_new_end_time DATETIME,
    IN p_reason VARCHAR(500),
    IN p_extended_by INT
)
BEGIN
    DECLARE v_old_end_time DATETIME;

    SELECT end_time INTO v_old_end_time FROM auctions WHERE id = p_auction_id;

    UPDATE auctions 
    SET end_time = p_new_end_time,
        updated_at = NOW()
    WHERE id = p_auction_id;

    INSERT INTO auction_extensions (auction_id, original_end_time, new_end_time, reason, extended_by)
    VALUES (p_auction_id, v_old_end_time, p_new_end_time, p_reason, p_extended_by);

    INSERT INTO auction_history (auction_id, event_type, old_value, new_value, description)
    VALUES (p_auction_id, 'extended', v_old_end_time, p_new_end_time, 
            CONCAT('Auction extended until ', p_new_end_time));

    SELECT TRUE as success;
END //
DELIMITER ;

-- ============================================
-- SAMPLE DATA
-- ============================================
INSERT INTO auctions (product_id, seller_id, title, description, starting_price, current_price, reserve_price, buy_now_price, min_bid_increment, start_time, end_time, status) VALUES
(1, 2, 'Vintage Rolex Watch', 'Rare vintage Rolex Submariner in excellent condition', 5000.00, 5000.00, 8000.00, 12000.00, 100.00, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 'active'),
(2, 3, 'Antique Persian Rug', 'Hand-woven 100-year-old Persian carpet', 2000.00, 2000.00, 3500.00, 5000.00, 50.00, NOW(), DATE_ADD(NOW(), INTERVAL 3 DAY), 'active'),
(3, 4, 'Signed Memorabilia', 'Signed basketball from legendary player', 500.00, 500.00, 1500.00, 2500.00, 25.00, NOW(), DATE_ADD(NOW(), INTERVAL 5 DAY), 'active');

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_auctions_active ON auctions(status, end_time);
CREATE INDEX idx_bids_auction_time ON bids(auction_id, bid_time DESC);
CREATE INDEX idx_auction_history_time ON auction_history(auction_id, created_at DESC);
