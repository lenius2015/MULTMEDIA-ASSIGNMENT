# Category Page SQL Queries

## Database Schema

### Categories Table
```sql
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image VARCHAR(255),
    parent_id INT DEFAULT NULL,
    sort_order INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);
```

### Products Table
```sql
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    old_price DECIMAL(10, 2) DEFAULT NULL,
    image VARCHAR(255),
    images JSON DEFAULT NULL,
    category_id INT,
    brand VARCHAR(100),
    sku VARCHAR(50),
    stock_quantity INT DEFAULT 0,
    rating DECIMAL(2, 1) DEFAULT 0,
    review_count INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    is_deal TINYINT(1) DEFAULT 0,
    is_featured TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_category (category_id),
    INDEX idx_price (price),
    INDEX idx_rating (rating),
    INDEX idx_created (created_at),
    INDEX idx_brand (brand),
    INDEX idx_active (is_active),
    INDEX idx_deal (is_deal)
);
```

## SQL Queries

### 1. Get All Products with Filters
```sql
SELECT 
    p.id,
    p.name,
    p.slug,
    p.description,
    p.price,
    p.old_price AS oldPrice,
    p.image,
    p.category_id AS categoryId,
    c.name AS category,
    c.slug AS categorySlug,
    p.brand,
    p.rating,
    p.review_count AS reviewCount,
    p.stock_quantity AS stockQuantity,
    p.is_deal AS isDeal,
    p.created_at AS createdAt
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = 1
    AND (:category IS NULL OR c.slug = :category)
    AND (:minPrice IS NULL OR p.price >= :minPrice)
    AND (:maxPrice IS NULL OR p.price <= :maxPrice)
    AND (:brand IS NULL OR p.brand = :brand)
    AND (:rating.rating >= :rating)
ORDER BY IS NULL OR p 
    CASE WHEN :sort = 'price_low' THEN p.price END ASC,
    CASE WHEN :sort = 'price_high' THEN p.price END DESC,
    CASE WHEN :sort = 'bestselling' THEN p.review_count END DESC,
    CASE WHEN :sort = 'rating' THEN p.rating END DESC,
    CASE WHEN :sort = 'newest' THEN p.created_at END DESC
LIMIT :limit OFFSET :offset
```

### 2. Get Products Count
```sql
SELECT COUNT(*) AS total
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = 1
    AND (:category IS NULL OR c.slug = :category)
    AND (:minPrice IS NULL OR p.price >= :minPrice)
    AND (:maxPrice IS NULL OR p.price <= :maxPrice)
    AND (:brand IS NULL OR p.brand = :brand)
    AND (:rating IS NULL OR p.rating >= :rating)
```

### 3. Get Deals Only
```sql
SELECT 
    p.*,
    c.name AS category
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = 1
    AND p.is_deal = 1
    AND p.old_price IS NOT NULL
ORDER BY 
    (p.old_price - p.price) / p.old_price DESC
LIMIT 20
```

### 4. Get New Arrivals (Last 30 Days)
```sql
SELECT 
    p.*,
    c.name AS category
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = 1
    AND p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY p.created_at DESC
LIMIT 20
```

### 5. Get All Categories
```sql
SELECT 
    id,
    name,
    slug,
    description,
    image,
    parent_id AS parentId,
    sort_order AS sortOrder
FROM categories
WHERE is_active = 1
ORDER BY sort_order ASC, name ASC
```

### 6. Get All Brands with Product Count
```sql
SELECT 
    brand,
    COUNT(*) AS productCount
FROM products
WHERE is_active = 1 
    AND brand IS NOT NULL
GROUP BY brand
ORDER BY productCount DESC
```

### 7. Get Single Product by ID
```sql
SELECT 
    p.*,
    c.name AS category,
    c.slug AS categorySlug
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.id = ? AND p.is_active = 1
```

### 8. Search Products
```sql
SELECT 
    p.id,
    p.name,
    p.slug,
    p.price,
    p.image,
    p.rating,
    p.review_count AS reviewCount,
    c.name AS category
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = 1
    AND (
        p.name LIKE CONCAT('%', :searchTerm, '%')
        OR p.description LIKE CONCAT('%', :searchTerm, '%')
        OR p.brand LIKE CONCAT('%', :searchTerm, '%')
    )
ORDER BY 
    CASE 
        WHEN p.name LIKE CONCAT(:searchTerm, '%') THEN 0
        WHEN p.name LIKE CONCAT('%', :searchTerm, '%') THEN 1
        ELSE 2
    END,
    p.rating DESC
LIMIT 20
```

## Optimized Indexes for Performance

```sql
-- Composite index for common filtering patterns
CREATE INDEX idx_products_filter ON products(
    is_active, 
    category_id, 
    price, 
    rating, 
    created_at
);

-- Index for deals filtering
CREATE INDEX idx_products_deals ON products(
    is_active, 
    is_deal, 
    old_price, 
    created_at
);

-- Full-text index for search (MySQL 5.7+)
ALTER TABLE products ADD FULLTEXT INDEX idx_search (name, description, brand);
```

## Example Usage with Node.js mysql2

```javascript
const db = require('./db');

async function getProducts(options) {
    const {
        category,
        minPrice,
        maxPrice,
        brand,
        rating,
        sort = 'newest',
        page = 1,
        limit = 12
    } = options;

    const offset = (page - 1) * limit;

    let query = `
        SELECT 
            p.id, p.name, p.slug, p.price, p.old_price as oldPrice,
            p.image, p.category_id, c.name as category,
            p.brand, p.rating, p.review_count as reviewCount,
            p.is_deal as isDeal, p.created_at as createdAt
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = 1
    `;

    const params = [];

    if (category && category !== 'all') {
        if (category === 'deals') {
            query += ` AND p.is_deal = 1 AND p.old_price IS NOT NULL`;
        } else {
            query += ` AND c.slug = ?`;
            params.push(category);
        }
    }

    if (minPrice) {
        query += ` AND p.price >= ?`;
        params.push(minPrice);
    }

    if (maxPrice) {
        query += ` AND p.price <= ?`;
        params.push(maxPrice);
    }

    if (brand) {
        query += ` AND p.brand = ?`;
        params.push(brand);
    }

    if (rating) {
        query += ` AND p.rating >= ?`;
        params.push(rating);
    }

    // Sorting
    switch (sort) {
        case 'price_low':
            query += ` ORDER BY p.price ASC`;
            break;
        case 'price_high':
            query += ` ORDER BY p.price DESC`;
            break;
        case 'bestselling':
            query += ` ORDER BY p.review_count DESC`;
            break;
        case 'rating':
            query += ` ORDER BY p.rating DESC`;
            break;
        default:
            query += ` ORDER BY p.created_at DESC`;
    }

    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await db.query(query, params);
    return rows;
}
```
