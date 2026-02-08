-- Payment System Database Schema
-- Supports M-Pesa, Tigo Pesa, Airtel Money, Visa/Mastercard

-- ============================================
-- PAYMENT METHODS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    type ENUM('mobile_money', 'card', 'bank_transfer', 'cash') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    processing_fee DECIMAL(5, 2) DEFAULT 0.00, -- Percentage fee
    min_amount DECIMAL(10, 2) DEFAULT 0.00,
    max_amount DECIMAL(10, 2) DEFAULT NULL,
    config JSON DEFAULT NULL, -- Provider-specific config
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_type (type),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_ref VARCHAR(100) NOT NULL UNIQUE, -- Unique transaction reference
    order_id INT NOT NULL,
    user_id INT NOT NULL,
    payment_method_id INT NOT NULL,
    provider_ref VARCHAR(200) DEFAULT NULL, -- Provider's transaction ID
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TZS',
    status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded') NOT NULL DEFAULT 'pending',
    payment_type ENUM('full', 'partial', 'refund') DEFAULT 'full',
    metadata JSON DEFAULT NULL, -- Additional provider data
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
    INDEX idx_transaction_ref (transaction_ref),
    INDEX idx_order (order_id),
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PAYMENT CALLBACKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payment_callbacks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    provider VARCHAR(50) NOT NULL,
    callback_data JSON NOT NULL,
    signature VARCHAR(500) DEFAULT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP NULL,
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    INDEX idx_transaction (transaction_id),
    INDEX idx_provider (provider),
    INDEX idx_processed (processed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- REFUNDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS refunds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    order_id INT NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    reason VARCHAR(500) DEFAULT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
    provider_ref VARCHAR(200) DEFAULT NULL, -- Provider's refund reference
    processed_by INT DEFAULT NULL, -- Admin user ID
    metadata JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_transaction (transaction_id),
    INDEX idx_order (order_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PAYMENT STATUS HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payment_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    from_status VARCHAR(20) DEFAULT NULL,
    to_status VARCHAR(20) NOT NULL,
    note TEXT DEFAULT NULL,
    metadata JSON DEFAULT NULL,
    created_by INT DEFAULT NULL, -- User or system
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    INDEX idx_transaction (transaction_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MOBILE MONEY ACCOUNTS TABLE (Saved for users)
-- ============================================
CREATE TABLE IF NOT EXISTS saved_payment_methods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    payment_method_id INT NOT NULL,
    account_number VARCHAR(50) NOT NULL, -- Phone number or card last 4
    account_name VARCHAR(100) DEFAULT NULL, -- Account holder name
    is_default BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
    UNIQUE KEY unique_user_method (user_id, payment_method_id, account_number),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STORED PROCEDURES
-- ============================================

-- Create transaction
DELIMITER //
CREATE PROCEDURE CreateTransaction(
    IN p_order_id INT,
    IN p_user_id INT,
    IN p_payment_method_id INT,
    IN p_amount DECIMAL(10, 2),
    IN p_currency VARCHAR(3),
    IN p_ip_address VARCHAR(45)
)
BEGIN
    DECLARE v_transaction_ref VARCHAR(100);
    DECLARE v_error_message VARCHAR(500);

    -- Generate unique transaction reference
    SET v_transaction_ref = CONCAT('TXN', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), LPAD(FLOOR(RAND() * 100000), 5, '0'));

    -- Insert transaction
    INSERT INTO transactions (
        transaction_ref, order_id, user_id, payment_method_id,
        amount, currency, status, ip_address
    ) VALUES (
        v_transaction_ref, p_order_id, p_user_id, p_payment_method_id,
        p_amount, p_currency, 'pending', p_ip_address
    );

    -- Add status history
    INSERT INTO payment_status_history (transaction_id, to_status, note, created_by)
    VALUES (LAST_INSERT_ID(), 'pending', 'Transaction initiated', p_user_id);

    SELECT LAST_INSERT_ID() as transaction_id, v_transaction_ref as transaction_ref, 'success' as status;
END //
DELIMITER ;

-- Update transaction status
DELIMITER //
CREATE PROCEDURE UpdateTransactionStatus(
    IN p_transaction_id INT,
    IN p_new_status VARCHAR(20),
    IN p_note TEXT,
    IN p_provider_ref VARCHAR(200),
    IN p_metadata JSON
)
BEGIN
    DECLARE v_old_status VARCHAR(20);

    -- Get current status
    SELECT status INTO v_old_status FROM transactions WHERE id = p_transaction_id;

    -- Update transaction
    UPDATE transactions 
    SET status = p_new_status,
        provider_ref = COALESCE(p_provider_ref, provider_ref),
        metadata = COALESCE(p_metadata, metadata),
        updated_at = NOW(),
        completed_at = CASE WHEN p_new_status IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE completed_at END
    WHERE id = p_transaction_id;

    -- Add status history
    INSERT INTO payment_status_history (transaction_id, from_status, to_status, note, metadata)
    VALUES (p_transaction_id, v_old_status, p_new_status, p_note, p_metadata);

    SELECT TRUE as success;
END //
DELIMITER ;

-- Process refund
DELIMITER //
CREATE PROCEDURE ProcessRefund(
    IN p_transaction_id INT,
    IN p_amount DECIMAL(10, 2),
    IN p_reason VARCHAR(500),
    IN p_processed_by INT
)
BEGIN
    DECLARE v_order_id INT;
    DECLARE v_user_id INT;
    DECLARE v_current_amount DECIMAL(10, 2);
    DECLARE v_refunded_amount DECIMAL(10, 2);
    DECLARE v_total_refunded DECIMAL(10, 2);
    DECLARE v_error_message VARCHAR(500);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_message = MESSAGE_TEXT;
        SELECT FALSE as success, v_error_message as error;
    END;

    -- Get transaction details
    SELECT order_id, user_id, amount INTO v_order_id, v_user_id, v_current_amount
    FROM transactions WHERE id = p_transaction_id;

    IF v_current_amount IS NULL THEN
        SELECT FALSE as success, 'Transaction not found' as error;
    ELSE
        -- Calculate total already refunded
        SELECT COALESCE(SUM(amount), 0) INTO v_total_refunded
        FROM refunds WHERE transaction_id = p_transaction_id AND status IN ('pending', 'processing', 'completed');

        IF (v_total_refunded + p_amount) > v_current_amount THEN
            SELECT FALSE as success, CONCAT('Refund amount exceeds original payment. Max refund: ', v_current_amount - v_total_refunded) as error;
        ELSE
            -- Create refund record
            INSERT INTO refunds (transaction_id, order_id, user_id, amount, reason, processed_by, status)
            VALUES (p_transaction_id, v_order_id, v_user_id, p_amount, p_reason, p_processed_by, 'pending');

            -- Update transaction status if full refund
            IF (v_total_refunded + p_amount) >= v_current_amount THEN
                UPDATE transactions SET status = 'refunded' WHERE id = p_transaction_id;
                
                INSERT INTO payment_status_history (transaction_id, from_status, to_status, note, created_by)
                VALUES (p_transaction_id, 'completed', 'refunded', CONCAT('Full refund of ', p_amount), p_processed_by);
            ELSE
                UPDATE transactions SET status = 'partially_refunded' WHERE id = p_transaction_id;
                
                INSERT INTO payment_status_history (transaction_id, from_status, to_status, note, created_by)
                VALUES (p_transaction_id, 'completed', 'partially_refunded', CONCAT('Partial refund of ', p_amount), p_processed_by);
            END IF;

            SELECT LAST_INSERT_ID() as refund_id, 'Refund initiated' as status, TRUE as success;
        END IF;
    END IF;
END //
DELIMITER ;

-- ============================================
-- SAMPLE DATA - Payment Methods
-- ============================================
INSERT INTO payment_methods (name, code, type, processing_fee, min_amount, max_amount, config) VALUES
('M-Pesa', 'MPESA', 'mobile_money', 1.50, 100, 3000000, 
 '{"provider": "vodacom", "shortcode": "123456", "callback_url": "https://yourdomain.com/api/payments/mpesa/callback"}'),
('Tigo Pesa', 'TIGO', 'mobile_money', 1.50, 100, 3000000,
 '{"provider": "tigo", "shortcode": "654321", "callback_url": "https://yourdomain.com/api/payments/tigo/callback"}'),
('Airtel Money', 'AIRTEL', 'mobile_money', 1.50, 100, 3000000,
 '{"provider": "airtel", "shortcode": "789012", "callback_url": "https://yourdomain.com/api/payments/airtel/callback"}'),
('Visa / Mastercard', 'CARD', 'card', 2.90, 500, 10000000,
 '{"provider": "stripe", "publishable_key": "pk_test_xxx", "currency": "tzd"}'),
('Cash on Delivery', 'COD', 'cash', 0.00, NULL, NULL, NULL);

-- ============================================
-- EXAMPLE API PAYLOADS
-- ============================================

/*
M-Pesa STK Push Request:
POST https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest
Headers: {
    "Authorization": "Bearer <access_token>",
    "Content-Type": "application/json"
}
Body: {
    "BusinessShortCode": "123456",
    "Password": "base64(Shortcode+Passkey+Timestamp)",
    "Timestamp": "20240101120000",
    "TransactionType": "CustomerPayBillOnline",
    "Amount": "1000",
    "PartyA": "254712345678",
    "PartyB": "123456",
    "PhoneNumber": "254712345678",
    "CallBackURL": "https://yourdomain.com/api/payments/mpesa/callback",
    "AccountReference": "ORDER123",
    "TransactionDesc": "Payment for order ORDER123"
}

M-Pesa Callback Response:
{
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "MerchantRequestID": "12345-67890-1",
    "CheckoutRequestID": "ws_CO_01012024123456789",
    "ResultParameters": {
        "ResultParameter": [
            {"Key": "TransactionAmount", "Value": "1000"},
            {"Key": "TransactionID", "Value": "NLJ4RXXXXXXXX"},
            {"Key": "PhoneNumber", "Value": "254712345678"},
            {"Key": "ResultDesc", "Value": "The service request is processed successfully."}
        ]
    }
}

Stripe Payment Intent:
POST https://api.stripe.com/v1/payment_intents
Headers: {
    "Authorization": "Bearer sk_test_xxx",
    "Content-Type": "application/x-www-form-urlencoded"
}
Body: {
    "amount": "100000", // Amount in smallest currency unit (TZS cents)
    "currency": "tzd",
    "payment_method_types[]": "card",
    "metadata[order_id]": "ORDER123",
    "metadata[user_id]": "456"
}

Stripe Webhook:
{
    "id": "evt_1ABC2DEF",
    "type": "payment_intent.succeeded",
    "data": {
        "object": {
            "id": "pi_123ABC",
            "amount": 100000,
            "currency": "tzd",
            "status": "succeeded",
            "metadata": {
                "order_id": "ORDER123"
            }
        }
    }
}
*/
