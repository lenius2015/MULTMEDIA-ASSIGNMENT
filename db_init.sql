-- Create database if not exists
CREATE DATABASE IF NOT EXISTS ecommerce;

USE ecommerce;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    profile_picture VARCHAR(500),
    oauth_provider VARCHAR(50),
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(5,2) DEFAULT 0,
    category VARCHAR(100),
    image_url VARCHAR(500),
    stock INT DEFAULT 0,
    is_new BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Cart table
CREATE TABLE IF NOT EXISTS cart (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product (user_id, product_id)
);

-- Wishlist table
CREATE TABLE IF NOT EXISTS wishlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product (user_id, product_id)
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    shipping_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(5,2) DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('new_product', 'discount', 'order', 'general') DEFAULT 'general',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Contact messages table
CREATE TABLE IF NOT EXISTS contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status ENUM('pending', 'replied', 'closed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Inbox messages table (private messages between users and admin)
CREATE TABLE IF NOT EXISTS inbox_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT,
    recipient_id INT,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    message_type ENUM('order_confirmation', 'support', 'promotion', 'general') DEFAULT 'general',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    user_id INT NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    pdf_path VARCHAR(500),
    status ENUM('generated', 'sent', 'viewed') DEFAULT 'generated',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User onboarding status table
CREATE TABLE IF NOT EXISTS user_onboarding (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    completed BOOLEAN DEFAULT FALSE,
    skipped BOOLEAN DEFAULT FALSE,
    language VARCHAR(5) DEFAULT 'en',
    sections_viewed INT DEFAULT 0,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Delivery requests table
CREATE TABLE IF NOT EXISTS delivery_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    user_id INT NOT NULL,
    delivery_address TEXT NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    delivery_instructions TEXT,
    delivery_method ENUM('standard', 'express') DEFAULT 'standard',
    preferred_date DATE,
    status ENUM('pending', 'assigned', 'in_transit', 'delivered', 'cancelled') DEFAULT 'pending',
    assigned_agent VARCHAR(100),
    tracking_number VARCHAR(50) UNIQUE,
    estimated_delivery DATE,
    actual_delivery_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Product reviews and ratings table
CREATE TABLE IF NOT EXISTS product_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT TRUE,
    helpful_votes INT DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_order_product_review (order_id, product_id)
);

-- Delivery agents table (for admin management)
CREATE TABLE IF NOT EXISTS delivery_agents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    status ENUM('active', 'inactive') DEFAULT 'active',
    assigned_deliveries INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Partner links table
CREATE TABLE IF NOT EXISTS partner_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    logo_url VARCHAR(500),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample admin user (password: admin123)
INSERT INTO users (name, email, password, role) VALUES
('Admin User', 'admin@omunju.com', '$2a$10$YourHashedPasswordHere', 'admin')
ON DUPLICATE KEY UPDATE name=name;

-- Insert sample products with discounts and new items
INSERT INTO products (name, description, price, discount, category, image_url, stock, is_new) VALUES
('Classic White T-Shirt', 'Premium cotton t-shirt with comfortable fit', 29.99, 0, 'tshirts', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500', 50, TRUE),
('Vintage Denim Jacket', 'Stylish vintage denim jacket for all seasons', 89.99, 20, 'jackets', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500', 30, TRUE),
('Slim Fit Blue Jeans', 'High-quality slim fit jeans with stretch', 59.99, 15, 'jeans', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500', 40, FALSE),
('Floral Summer Dress', 'Beautiful floral print summer dress', 79.99, 25, 'dresses', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500', 25, TRUE),
('Cozy Wool Sweater', 'Warm and comfortable wool sweater', 69.99, 10, 'sweaters', 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500', 35, FALSE),
('Black Leather Jacket', 'Premium leather jacket with modern design', 149.99, 30, 'jackets', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500', 20, TRUE),
('Graphic Print T-Shirt', 'Trendy graphic print t-shirt', 34.99, 0, 'tshirts', 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500', 60, TRUE),
('Ripped Skinny Jeans', 'Fashionable ripped skinny jeans', 64.99, 20, 'jeans', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500', 45, FALSE),
('Elegant Evening Dress', 'Sophisticated evening dress for special occasions', 129.99, 35, 'dresses', 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=500', 15, TRUE),
('Cashmere Cardigan', 'Luxurious cashmere cardigan', 99.99, 15, 'sweaters', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500', 28, FALSE),
('Striped Polo Shirt', 'Classic striped polo shirt', 39.99, 0, 'tshirts', 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=500', 55, FALSE),
('Bomber Jacket', 'Stylish bomber jacket with zipper', 94.99, 25, 'jackets', 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500', 32, TRUE)
ON DUPLICATE KEY UPDATE name=name;

-- Insert sample partner links
INSERT INTO partner_links (name, url, logo_url, description, is_active) VALUES
('Fashion Hub', 'https://fashionhub.example.com', 'https://via.placeholder.com/150x50?text=Fashion+Hub', 'Premium fashion destination', TRUE),
('Style Central', 'https://stylecentral.example.com', 'https://via.placeholder.com/150x50?text=Style+Central', 'Latest fashion trends', TRUE),
('Trendy Wear', 'https://trendywear.example.com', 'https://via.placeholder.com/150x50?text=Trendy+Wear', 'Affordable fashion for everyone', TRUE),
('Elite Fashion', 'https://elitefashion.example.com', 'https://via.placeholder.com/150x50?text=Elite+Fashion', 'Luxury clothing brands', TRUE)
ON DUPLICATE KEY UPDATE name=name;

-- Insert sample notifications (global notifications for all users)
INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
(NULL, 'New Arrivals!', 'Check out our latest collection of summer dresses', 'new_product', FALSE),
(NULL, 'Special Discount', 'Get up to 35% off on selected items this week', 'discount', FALSE),
(NULL, 'Flash Sale', 'Limited time offer on leather jackets - 30% off!', 'discount', FALSE)
ON DUPLICATE KEY UPDATE title=title;
