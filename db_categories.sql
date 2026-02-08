/**
 * Production Category Page Database Schema
 * Includes categories, subcategories, brands, and optimized indexes
 */

-- ============================================
-- CATEGORIES TABLE (Enhanced)
-- ============================================
DROP TABLE IF EXISTS product_specs;
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS product_attribute_values;
DROP TABLE IF EXISTS product_attributes;
DROP TABLE IF EXISTS category_products;
DROP TABLE IF EXISTS product_reviews_aggregate;
DROP TABLE IF EXISTS brands;
DROP TABLE IF EXISTS categories;

CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image_url VARCHAR(255),
    parent_id INT DEFAULT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    meta_title VARCHAR(200),
    meta_description VARCHAR(500),
    product_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (slug),
    INDEX (parent_id),
    INDEX (is_active),
    INDEX (is_featured),
    INDEX (sort_order),
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ============================================
-- BRANDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    logo_url VARCHAR(255),
    description TEXT,
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    product_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (slug),
    INDEX (is_active)
);

-- ============================================
-- PRODUCT ATTRIBUTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS product_attributes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    type ENUM('select', 'range', 'boolean') DEFAULT 'select',
    is_filterable BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (name),
    INDEX (is_filterable)
);

-- ============================================
-- PRODUCT ATTRIBUTE VALUES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS product_attribute_values (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attribute_id INT NOT NULL,
    value VARCHAR(100) NOT NULL,
    display_value VARCHAR(100),
    sort_order INT DEFAULT 0,
    FOREIGN KEY (attribute_id) REFERENCES product_attributes(id) ON DELETE CASCADE,
    INDEX (attribute_id),
    UNIQUE KEY attr_value (attribute_id, value)
);

-- ============================================
-- PRODUCT IMAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS product_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    alt_text VARCHAR(200),
    sort_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX (product_id),
    INDEX (sort_order)
);

-- ============================================
-- PRODUCT SPECIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS product_specs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    spec_name VARCHAR(100) NOT NULL,
    spec_value VARCHAR(255) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX (product_id),
    UNIQUE KEY product_spec (product_id, spec_name)
);

-- ============================================
-- REVIEWS AGGREGATE TABLE (Denormalized)
-- ============================================
CREATE TABLE IF NOT EXISTS product_reviews_aggregate (
    product_id INT PRIMARY KEY,
    avg_rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INT DEFAULT 0,
    five_star INT DEFAULT 0,
    four_star INT DEFAULT 0,
    three_star INT DEFAULT 0,
    two_star INT DEFAULT 0,
    one_star INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================
-- CATEGORY PRODUCT MAPPING (Denormalized)
-- ============================================
CREATE TABLE IF NOT EXISTS category_products (
    category_id INT NOT NULL,
    product_id INT NOT NULL,
    is_primary BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    PRIMARY KEY (category_id, product_id),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX (product_id),
    INDEX (is_primary),
    INDEX (sort_order)
);

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Insert main categories
INSERT INTO categories (name, slug, description, sort_order, is_featured, meta_title, meta_description) VALUES
('Electronics', 'electronics', 'Latest electronic gadgets and devices', 1, TRUE, 'Electronics - OMUNJU SHOPPERS', 'Shop the latest electronics including phones, laptops, cameras and more'),
('Fashion', 'fashion', 'Trendy clothing and accessories', 2, TRUE, 'Fashion - OMUNJU SHOPPERS', 'Discover trendy fashion for men, women and kids'),
('Home & Living', 'home-living', 'Furniture and home decor', 3, TRUE, 'Home and Living - OMUNJU SHOPPERS', 'Beautiful furniture and decor for your home'),
('Sports', 'sports', 'Sports equipment and activewear', 4, FALSE, 'Sports Equipment - OMUNJU SHOPPERS', 'Get fit with our sports equipment and activewear'),
('Beauty', 'beauty', 'Skincare and cosmetics', 5, TRUE, 'Beauty Products - OMUNJU SHOPPERS', 'Premium skincare and cosmetics from top brands'),
('Books', 'books', 'Books and publications', 6, FALSE, 'Books - OMUNJU SHOPPERS', 'Wide collection of books across all genres');

-- Insert sub-categories (using IDs)
INSERT INTO categories (name, slug, description, parent_id, sort_order, meta_title) VALUES
('Smartphones', 'smartphones', 'Latest smartphones and accessories', 1, 1, 'Smartphones - OMUNJU SHOPPERS'),
('Laptops', 'laptops', 'Portable computers and accessories', 1, 2, 'Laptops - OMUNJU SHOPPERS'),
('Cameras', 'cameras', 'Digital cameras and accessories', 1, 3, 'Cameras - OMUNJU SHOPPERS'),
('Audio', 'audio', 'Headphones, speakers and audio gear', 1, 4, 'Audio Equipment - OMUNJU SHOPPERS'),
('Men Clothing', 'men-clothing', 'Men fashion and clothing', 2, 1, 'Men Fashion - OMUNJU SHOPPERS'),
('Women Clothing', 'women-clothing', 'Women fashion and clothing', 2, 2, 'Women Fashion - OMUNJU SHOPPERS'),
('Accessories', 'accessories', 'Fashion accessories', 2, 3, 'Accessories - OMUNJU SHOPPERS'),
('Furniture', 'furniture', 'Home furniture', 3, 1, 'Furniture - OMUNJU SHOPPERS'),
('Decor', 'home-decor', 'Home decoration items', 3, 2, 'Home Decor - OMUNJU SHOPPERS'),
('Kitchen', 'kitchen', 'Kitchen appliances and tools', 3, 3, 'Kitchen - OMUNJU SHOPPERS');

-- Insert sample brands
INSERT INTO brands (name, slug, logo_url, description, website) VALUES
('Samsung', 'samsung', '/uploads/brands/samsung.png', 'Global technology leader', 'https://www.samsung.com'),
('Apple', 'apple', '/uploads/brands/apple.png', 'Innovation in technology', 'https://www.apple.com'),
('Sony', 'sony', '/uploads/brands/sony.png', 'Entertainment technology', 'https://www.sony.com'),
('Nike', 'nike', '/uploads/brands/nike.png', 'Athletic wear and shoes', 'https://www.nike.com'),
('Adidas', 'adidas', '/uploads/brands/adidas.png', 'Sports footwear and apparel', 'https://www.adidas.com'),
('IKEA', 'ikea', '/uploads/brands/ikea.png', 'Furniture and home accessories', 'https://www.ikea.com'),
('LOreal', 'loreal', '/uploads/brands/loreal.png', 'Cosmetics and beauty products', 'https://www.loreal.com'),
('Dell', 'dell', '/uploads/brands/dell.png', 'Computer technology', 'https://www.dell.com');

-- Insert product attributes
INSERT INTO product_attributes (name, display_name, type, is_filterable, sort_order) VALUES
('color', 'Color', 'select', TRUE, 1),
('size', 'Size', 'select', TRUE, 2),
('brand', 'Brand', 'select', TRUE, 3),
('rating', 'Rating', 'select', TRUE, 4),
('price_range', 'Price Range', 'range', TRUE, 5),
('in_stock', 'Availability', 'boolean', TRUE, 6);

-- Add columns to products table if not exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id INT AFTER category;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE AFTER is_active;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 2) DEFAULT 0 AFTER discount;
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0 AFTER rating;

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

SELECT 'Category schema created successfully!' as status;
