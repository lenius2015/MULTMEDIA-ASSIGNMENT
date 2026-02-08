-- ============================================================
-- COMPREHENSIVE CART & ORDER MANAGEMENT SYSTEM DATABASE SCHEMA
-- ============================================================

-- ============================================================
-- 1. ADDRESSES TABLE (for delivery & billing)
-- ============================================================
CREATE TABLE IF NOT EXISTS addresses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type ENUM('shipping', 'billing', 'both') DEFAULT 'both',
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  street_address VARCHAR(500) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Kenya',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_default (is_default)
);

-- ============================================================
-- 2. CART TABLE (for persistent cart storage)
-- ============================================================
CREATE TABLE IF NOT EXISTS carts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE,
  session_id VARCHAR(100),
  subtotal DECIMAL(12, 2) DEFAULT 0,
  tax DECIMAL(12, 2) DEFAULT 0,
  delivery_fee DECIMAL(12, 2) DEFAULT 0,
  discount DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) DEFAULT 0,
  coupon_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_session (session_id),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
);

-- ============================================================
-- 3. CART_ITEMS TABLE (line items in cart)
-- ============================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cart_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_cart_product (cart_id, product_id),
  INDEX idx_product_id (product_id)
);

-- ============================================================
-- 4. ORDERS TABLE (main orders)
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  guest_email VARCHAR(255),
  subtotal DECIMAL(12, 2) NOT NULL,
  tax DECIMAL(12, 2) DEFAULT 0,
  delivery_fee DECIMAL(12, 2) DEFAULT 0,
  discount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,
  
  -- Shipping info
  shipping_address_id INT,
  shipping_first_name VARCHAR(100),
  shipping_last_name VARCHAR(100),
  shipping_phone VARCHAR(20),
  shipping_email VARCHAR(255),
  shipping_street VARCHAR(500),
  shipping_city VARCHAR(100),
  shipping_state VARCHAR(100),
  shipping_postal_code VARCHAR(20),
  shipping_country VARCHAR(100),
  
  -- Order status & tracking
  status ENUM('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  shipped_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  
  -- References
  coupon_code VARCHAR(50),
  notes TEXT,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shipping_address_id) REFERENCES addresses(id),
  INDEX idx_order_number (order_number),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_payment_status (payment_status),
  INDEX idx_created_at (created_at)
);

-- ============================================================
-- 5. ORDER_ITEMS TABLE (line items for order)
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  quantity INT NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  INDEX idx_order_id (order_id),
  INDEX idx_product_id (product_id)
);

-- ============================================================
-- 6. PAYMENTS TABLE (payment transactions)
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  payment_method ENUM('mobile_money', 'card', 'bank_transfer', 'cash_on_delivery') NOT NULL,
  payment_provider VARCHAR(50),
  transaction_id VARCHAR(100) UNIQUE,
  reference_number VARCHAR(100),
  amount DECIMAL(12, 2) NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  
  -- Payment details
  payment_date TIMESTAMP NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  
  -- Mobile money details
  phone_number VARCHAR(20),
  network_operator VARCHAR(50),
  
  -- Card details (tokenized, never store full card)
  card_last_four VARCHAR(4),
  card_brand VARCHAR(50),
  
  -- Webhook info
  webhook_response JSON,
  webhook_received_at TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  UNIQUE KEY unique_transaction (transaction_id),
  INDEX idx_order_id (order_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- ============================================================
-- 7. DELIVERY_REQUESTS TABLE (delivery tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL UNIQUE,
  delivery_type ENUM('home_delivery', 'pickup_point') DEFAULT 'home_delivery',
  pickup_point_id INT,
  
  -- Delivery partner
  delivery_partner_id INT,
  delivery_partner_name VARCHAR(255),
  delivery_partner_phone VARCHAR(20),
  delivery_partner_vehicle VARCHAR(100),
  
  -- Estimated timeline
  estimated_delivery_date DATE,
  estimated_delivery_time_start TIME,
  estimated_delivery_time_end TIME,
  actual_delivery_date TIMESTAMP NULL,
  
  -- Tracking
  status ENUM('pending', 'assigned', 'in_transit', 'delivered', 'failed', 'returned') DEFAULT 'pending',
  tracking_number VARCHAR(100) UNIQUE,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  last_location_update TIMESTAMP NULL,
  
  -- Proof of delivery
  signature_url VARCHAR(500),
  photo_url VARCHAR(500),
  delivered_by VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (delivery_partner_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_order_id (order_id),
  INDEX idx_status (status),
  INDEX idx_tracking_number (tracking_number)
);

-- ============================================================
-- 8. INVOICES TABLE (invoice records)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL UNIQUE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  
  -- Invoice details
  invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  due_date DATE,
  
  -- Totals
  subtotal DECIMAL(12, 2) NOT NULL,
  tax DECIMAL(12, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 2),
  delivery_fee DECIMAL(12, 2) DEFAULT 0,
  discount DECIMAL(12, 2) DEFAULT 0,
  discount_reason VARCHAR(255),
  total DECIMAL(12, 2) NOT NULL,
  
  -- Status
  status ENUM('draft', 'sent', 'paid', 'cancelled') DEFAULT 'draft',
  
  -- File storage
  pdf_url VARCHAR(500),
  html_content LONGTEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_invoice_number (invoice_number),
  INDEX idx_order_id (order_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);

-- ============================================================
-- 9. DELIVERY_FEES TABLE (location-based delivery fees)
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_fees (
  id INT PRIMARY KEY AUTO_INCREMENT,
  city VARCHAR(100) NOT NULL,
  state_province VARCHAR(100),
  postal_code_range_start VARCHAR(20),
  postal_code_range_end VARCHAR(20),
  base_fee DECIMAL(12, 2) NOT NULL,
  per_km_fee DECIMAL(12, 2),
  min_order_free DECIMAL(12, 2) DEFAULT 0,
  estimated_days_min INT DEFAULT 1,
  estimated_days_max INT DEFAULT 3,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_city (city)
);

-- ============================================================
-- 10. PICKUP_POINTS TABLE (for pickup delivery option)
-- ============================================================
CREATE TABLE IF NOT EXISTS pickup_points (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500) NOT NULL,
  city VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  operating_hours_open TIME,
  operating_hours_close TIME,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_city (city),
  INDEX idx_is_active (is_active)
);

-- ============================================================
-- 11. COUPONS/DISCOUNTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL,
  type ENUM('percentage', 'fixed_amount') DEFAULT 'percentage',
  value DECIMAL(12, 2) NOT NULL,
  max_discount DECIMAL(12, 2),
  min_order_amount DECIMAL(12, 2),
  usage_limit INT,
  usage_count INT DEFAULT 0,
  per_user_limit INT DEFAULT 1,
  
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_code (code),
  INDEX idx_is_active (is_active)
);

-- ============================================================
-- 12. COUPON_USAGE TABLE (track coupon usage per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS coupon_usage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  coupon_id INT NOT NULL,
  user_id INT NOT NULL,
  order_id INT,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_coupon_id (coupon_id),
  INDEX idx_user_id (user_id)
);

-- ============================================================
-- 13. ORDER_ACTIVITIES TABLE (audit log for orders)
-- ============================================================
CREATE TABLE IF NOT EXISTS order_activities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  activity_type VARCHAR(100),
  description TEXT,
  performed_by INT,
  performed_by_type ENUM('user', 'admin', 'system') DEFAULT 'system',
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_order_id (order_id),
  INDEX idx_created_at (created_at)
);

-- ============================================================
-- 14. INVENTORY/STOCK TABLE (product stock tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_stock (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL UNIQUE,
  quantity_available INT DEFAULT 0,
  quantity_reserved INT DEFAULT 0,
  reorder_level INT DEFAULT 10,
  reorder_quantity INT DEFAULT 50,
  last_restocked TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_id (product_id)
);

-- ============================================================
-- 15. STOCK_HISTORY TABLE (audit trail for inventory)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  quantity_change INT NOT NULL,
  reason ENUM('purchase', 'return', 'restock', 'adjustment', 'damaged') DEFAULT 'adjustment',
  related_order_id INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (related_order_id) REFERENCES orders(id) ON DELETE SET NULL,
  INDEX idx_product_id (product_id),
  INDEX idx_created_at (created_at)
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Cart performance indexes
CREATE INDEX idx_carts_updated_at ON carts(updated_at);
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);

-- Order performance indexes
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);
CREATE INDEX idx_orders_status_created ON orders(status, created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Payment performance indexes
CREATE INDEX idx_payments_status_created ON payments(status, created_at);
CREATE INDEX idx_payments_order_created ON payments(order_id, created_at);

-- Delivery performance indexes
CREATE INDEX idx_delivery_status_updated ON delivery_requests(status, updated_at);
CREATE INDEX idx_delivery_tracking ON delivery_requests(tracking_number, status);

-- Invoice performance indexes
CREATE INDEX idx_invoices_user_created ON invoices(user_id, created_at);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);

-- ============================================================
-- STORED PROCEDURES FOR COMPLEX OPERATIONS
-- ============================================================

-- Generate unique order number
DELIMITER //
CREATE PROCEDURE sp_generate_order_number(OUT order_number VARCHAR(50))
BEGIN
  DECLARE order_count INT;
  DECLARE order_date VARCHAR(8);
  
  SET order_date = DATE_FORMAT(NOW(), '%Y%m%d');
  SET order_count = (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE()) + 1;
  SET order_number = CONCAT('ORD-', order_date, '-', LPAD(order_count, 5, '0'));
END //
DELIMITER ;

-- Calculate cart totals
DELIMITER //
CREATE PROCEDURE sp_calculate_cart_totals(IN p_cart_id INT)
BEGIN
  DECLARE v_subtotal DECIMAL(12, 2);
  DECLARE v_tax DECIMAL(12, 2);
  DECLARE v_delivery_fee DECIMAL(12, 2);
  DECLARE v_discount DECIMAL(12, 2);
  DECLARE v_total DECIMAL(12, 2);
  
  -- Calculate subtotal
  SELECT COALESCE(SUM(subtotal), 0) INTO v_subtotal
  FROM cart_items WHERE cart_id = p_cart_id;
  
  -- Calculate tax (assuming 16% VAT for Kenya)
  SET v_tax = v_subtotal * 0.16;
  
  -- Get delivery fee
  SELECT COALESCE(delivery_fee, 0) INTO v_delivery_fee FROM carts WHERE id = p_cart_id;
  
  -- Get discount
  SELECT COALESCE(discount, 0) INTO v_discount FROM carts WHERE id = p_cart_id;
  
  -- Calculate total
  SET v_total = v_subtotal + v_tax + v_delivery_fee - v_discount;
  
  -- Update cart
  UPDATE carts 
  SET subtotal = v_subtotal,
      tax = v_tax,
      total = v_total
  WHERE id = p_cart_id;
END //
DELIMITER ;

-- Update order status with activity log
DELIMITER //
CREATE PROCEDURE sp_update_order_status(
  IN p_order_id INT,
  IN p_new_status VARCHAR(50),
  IN p_admin_id INT,
  IN p_notes TEXT
)
BEGIN
  DECLARE v_old_status VARCHAR(50);
  
  -- Get old status
  SELECT status INTO v_old_status FROM orders WHERE id = p_order_id;
  
  -- Update order status
  UPDATE orders SET status = p_new_status, updated_at = NOW() WHERE id = p_order_id;
  
  -- Log activity
  INSERT INTO order_activities (order_id, activity_type, description, performed_by, performed_by_type)
  VALUES (p_order_id, 'status_change', CONCAT('Status changed from ', v_old_status, ' to ', p_new_status, '. Notes: ', p_notes), p_admin_id, 'admin');
END //
DELIMITER ;

-- ============================================================
-- SAMPLE DATA & SEED
-- ============================================================

-- Insert sample delivery fees
INSERT INTO delivery_fees (city, base_fee, per_km_fee, estimated_days_min, estimated_days_max) VALUES
('Nairobi', 100, 5, 1, 2),
('Mombasa', 150, 6, 2, 3),
('Kisumu', 200, 7, 3, 4),
('Nakuru', 120, 5.5, 2, 3)
ON DUPLICATE KEY UPDATE base_fee = VALUES(base_fee);

-- Insert sample pickup points
INSERT INTO pickup_points (name, address, city, phone, operating_hours_open, operating_hours_close) VALUES
('ShopHub Nairobi CBD', '123 Kenyatta Avenue, Nairobi', 'Nairobi', '+254700000001', '08:00:00', '18:00:00'),
('ShopHub Westlands', '456 Westlands Plaza, Nairobi', 'Nairobi', '+254700000002', '08:00:00', '18:00:00'),
('ShopHub Mombasa', '789 Moi Avenue, Mombasa', 'Mombasa', '+254700000003', '09:00:00', '17:00:00')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert sample coupons
INSERT INTO coupons (code, type, value, min_order_amount, valid_until, is_active) VALUES
('WELCOME10', 'percentage', 10, 1000, DATE_ADD(NOW(), INTERVAL 30 DAY), TRUE),
('NEWYEAR2024', 'percentage', 15, 5000, DATE_ADD(NOW(), INTERVAL 60 DAY), TRUE),
('FLAT500', 'fixed_amount', 500, 2000, DATE_ADD(NOW(), INTERVAL 30 DAY), TRUE)
ON DUPLICATE KEY UPDATE is_active = VALUES(is_active);

-- ============================================================
-- VIEWS FOR EASIER QUERYING
-- ============================================================

-- Complete order view with all related data
CREATE OR REPLACE VIEW v_orders_complete AS
SELECT 
  o.id,
  o.order_number,
  o.user_id,
  COALESCE(u.first_name, 'Guest') as customer_name,
  u.email as customer_email,
  o.total_amount,
  o.status,
  o.payment_status,
  o.created_at,
  o.updated_at,
  COUNT(DISTINCT oi.id) as item_count,
  p.status as payment_status_detail,
  dr.status as delivery_status,
  dr.tracking_number
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN payments p ON o.id = p.order_id
LEFT JOIN delivery_requests dr ON o.id = dr.order_id
GROUP BY o.id;

-- Sales analytics view
CREATE OR REPLACE VIEW v_sales_analytics AS
SELECT 
  DATE(o.created_at) as sale_date,
  COUNT(DISTINCT o.id) as total_orders,
  SUM(o.total_amount) as total_revenue,
  AVG(o.total_amount) as avg_order_value,
  COUNT(DISTINCT o.user_id) as unique_customers
FROM orders o
WHERE o.status != 'cancelled'
GROUP BY DATE(o.created_at);

-- Low stock products view
CREATE OR REPLACE VIEW v_low_stock_products AS
SELECT 
  p.id,
  p.name,
  ps.quantity_available,
  ps.reorder_level,
  ps.reorder_quantity
FROM products p
INNER JOIN product_stock ps ON p.id = ps.product_id
WHERE ps.quantity_available <= ps.reorder_level
AND p.status = 'active';

COMMIT;
