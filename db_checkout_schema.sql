-- ============================================
-- COMPLETE CHECKOUT SYSTEM DATABASE SCHEMA
-- Compatible with existing database structure
-- ============================================

-- Checkout Orders Table
CREATE TABLE IF NOT EXISTS checkout_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INT,
    session_id VARCHAR(100),
    
    -- Customer Information
    customer_name VARCHAR(200) NOT NULL,
    customer_email VARCHAR(200) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    
    -- Shipping Address
    shipping_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Tanzania',
    
    -- Delivery Details
    delivery_method ENUM('home_delivery', 'pickup_point', 'express') NOT NULL DEFAULT 'home_delivery',
    delivery_notes TEXT,
    pickup_location VARCHAR(200),
    pickup_contact VARCHAR(200),
    
    -- Payment Details
    payment_method VARCHAR(50) NOT NULL,
    payment_status ENUM('pending', 'processing', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    payment_reference VARCHAR(200),
    
    -- Pricing
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    tax DECIMAL(10, 2) DEFAULT 0,
    discount DECIMAL(10, 2) DEFAULT 0,
    processing_fee DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Order Status
    status ENUM('pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded') DEFAULT 'pending',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_order_number (order_number),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Checkout Order Items Table
CREATE TABLE IF NOT EXISTS checkout_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    image_url VARCHAR(500),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id)
);

-- Checkout Payments Table
CREATE TABLE IF NOT EXISTS checkout_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'TZS',
    status ENUM('pending', 'processing', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    transaction_id VARCHAR(200),
    payment_reference VARCHAR(200),
    payment_response TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_order_id (order_id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_status (status)
);

-- Checkout Delivery Requests Table
CREATE TABLE IF NOT EXISTS checkout_delivery_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    delivery_method VARCHAR(50) NOT NULL,
    pickup_location VARCHAR(200),
    pickup_time DATETIME,
    notes TEXT,
    status ENUM('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed') DEFAULT 'pending',
    assigned_driver_id INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_order_id (order_id),
    INDEX idx_status (status)
);

-- Delivery Zones Table
CREATE TABLE IF NOT EXISTS delivery_zones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zone_name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    standard_fee DECIMAL(10, 2) DEFAULT 5000,
    express_fee DECIMAL(10, 2) DEFAULT 15000,
    estimated_days INT DEFAULT 5,
    is_active TINYINT(1) DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_city (city),
    INDEX idx_active (is_active)
);

-- Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    method_code VARCHAR(50) UNIQUE NOT NULL,
    method_name VARCHAR(100) NOT NULL,
    method_type ENUM('mobile_money', 'bank_card', 'bank_transfer', 'cash') NOT NULL,
    processing_fee DECIMAL(5, 2) DEFAULT 0,
    instructions TEXT,
    is_active TINYINT(1) DEFAULT 1,
    sort_order INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Promo Codes Table
CREATE TABLE IF NOT EXISTS checkout_promocodes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    discount_type ENUM('percentage', 'fixed') NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    min_order_amount DECIMAL(12, 2) DEFAULT 0,
    max_discount DECIMAL(10, 2),
    usage_limit INT,
    usage_count INT DEFAULT 0,
    one_time_use TINYINT(1) DEFAULT 0,
    expires_at DATETIME,
    is_active TINYINT(1) DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_code (code),
    INDEX idx_active (is_active)
);

-- Promo Code Usage Table
CREATE TABLE IF NOT EXISTS promocode_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    promo_code VARCHAR(50) NOT NULL,
    order_id INT,
    discount_amount DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_promo_code (promo_code),
    INDEX idx_order_id (order_id)
);

-- Order History Table
CREATE TABLE IF NOT EXISTS checkout_order_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_order_id (order_id)
);

-- User Addresses Table
CREATE TABLE IF NOT EXISTS user_addresses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    label VARCHAR(100),
    street_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Tanzania',
    is_default TINYINT(1) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_default (is_default)
);

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Insert Delivery Zones
INSERT IGNORE INTO delivery_zones (zone_name, city, region, standard_fee, express_fee, estimated_days) VALUES
('CBD', 'Dar es Salaam', 'Dar es Salaam', 5000, 10000, 1),
('Msasani', 'Dar es Salaam', 'Dar es Salaam', 5000, 10000, 2),
('Kinondoni', 'Dar es Salaam', 'Dar es Salaam', 5000, 10000, 2),
('Ilala', 'Dar es Salaam', 'Dar es Salaam', 5000, 10000, 2),
('Temeke', 'Dar es Salaam', 'Dar es Salaam', 5000, 10000, 3),
('City Center', 'Arusha', 'Arusha', 10000, 20000, 3),
('North', 'Arusha', 'Arusha', 10000, 20000, 4),
('City Center', 'Mwanza', 'Mwanza', 10000, 20000, 4),
('Ilemela', 'Mwanza', 'Mwanza', 10000, 20000, 4),
('Nyamagana', 'Mwanza', 'Mwanza', 10000, 20000, 4),
('Dodoma', 'Dodoma', 'Dodoma', 15000, 25000, 5),
('Tanga', 'Tanga', 'Tanga', 12000, 22000, 4);

-- Insert Payment Methods
INSERT IGNORE INTO payment_methods (method_code, method_name, method_type, processing_fee, instructions, sort_order) VALUES
('mpesa', 'M-Pesa', 'mobile_money', 0, 'Pay using M-Pesa Lipa na M-Pesa', 1),
('airtel_money', 'Airtel Money', 'mobile_money', 0, 'Pay using Airtel Money', 2),
('tigo_pesa', 'Tigo Pesa', 'mobile_money', 0, 'Pay using Tigo Pesa', 3),
('halo_pesa', 'Halo Pesa', 'mobile_money', 0, 'Pay using Halo Pesa', 4),
('bank_card', 'Credit/Debit Card', 'bank_card', 2.5, 'Pay using Visa or Mastercard', 5),
('bank_transfer', 'Bank Transfer', 'bank_transfer', 0, 'Transfer to our bank account', 6),
('cod', 'Cash on Delivery', 'cash', 0, 'Pay when you receive your order', 7);

-- Insert Sample Promo Codes
INSERT IGNORE INTO checkout_promocodes (code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, one_time_use) VALUES
('WELCOME10', 'Welcome discount - 10% off', 'percentage', 10, 50000, 10000, NULL, 0),
('FIRST20', 'First order - 20% off', 'percentage', 20, 100000, 20000, 1, 1),
('SAVE5000', 'Fixed discount of TSh 5,000', 'fixed', 5000, 50000, NULL, NULL, 0),
('FREEDELIVERY', 'Free delivery', 'fixed', 0, 0, NULL, NULL, 0);
