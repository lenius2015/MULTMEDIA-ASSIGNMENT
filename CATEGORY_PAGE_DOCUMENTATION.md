# Production Category Page Documentation

## Overview
A fully functional e-commerce category page with filtering, sorting, pagination, and SEO optimization.

## Features Implemented

### Frontend
- **Category Listing**: Dynamic category display with subcategories
- **Product Filtering**: Price range, brand, rating, availability
- **Sorting Options**: Newest, Price (Low/High), Rating, Popularity
- **Pagination**: Smart pagination with ellipsis
- **Add to Cart/Wishlist**: Full integration with cart system
- **Quick View Modal**: Product preview with add to cart
- **SEO Metadata**: Meta tags, JSON-LD breadcrumbs
- **Breadcrumb Navigation**: Hierarchical category path
- **Mobile Responsive**: Mobile-first design with filter drawer

### Backend
- **REST API Endpoints**: Full CRUD for categories and products
- **Advanced Filtering**: Dynamic filter query building
- **Optimized SQL Queries**: Indexed columns, denormalized data
- **Breadcrumb Generation**: Recursive SQL for category paths

## API Endpoints

### GET /api/categories
Get all categories.

**Query Parameters:**
- `active` (boolean): Filter active categories only
- `featured` (boolean): Get featured categories
- `parent_id` (int): Get subcategories of a parent
- `limit`, `offset`: Pagination

**Response:**
```json
{
  "success": true,
  "categories": [
    {
      "id": 1,
      "name": "Electronics",
      "slug": "electronics",
      "description": "Latest electronic gadgets",
      "image_url": "/uploads/categories/electronics.jpg",
      "subcategory_count": 4,
      "product_count": 50
    }
  ]
}
```

### GET /api/categories/:slug
Get single category with breadcrumb and subcategories.

**Response:**
```json
{
  "success": true,
  "category": {
    "id": 1,
    "name": "Electronics",
    "slug": "electronics",
    "breadcrumb": [
      { "id": 1, "name": "Electronics", "slug": "electronics" }
    ],
    "parent": null
  },
  "subcategories": [
    {
      "id": 2,
      "name": "Smartphones",
      "slug": "smartphones"
    }
  ]
}
```

### GET /api/categories/:slug/products
Get products in category with filters and pagination.

**Query Parameters:**
- `page` (int): Page number
- `limit` (int): Items per page (max 100)
- `sortBy`: newest, price-low, price-high, rating, popularity
- `minPrice`, `maxPrice`: Price range
- `brand`: Brand slug filter
- `rating`: Minimum rating filter (1-4)
- `inStock`: Filter in-stock items only
- `search`: Search within category

**Response:**
```json
{
  "success": true,
  "category": { "id": 1, "name": "Electronics", "slug": "electronics" },
  "products": [
    {
      "id": 1,
      "name": "iPhone 15 Pro",
      "price": 999.99,
      "discount": 10,
      "discounted_price": 899.99,
      "image_url": "/uploads/products/iphone15.jpg",
      "stock": 50,
      "rating": 4.5,
      "brand_name": "Apple",
      "brand_slug": "apple"
    }
  ],
  "filters": {
    "priceRange": { "min_price": 50, "max_price": 5000 },
    "brands": [
      { "id": 1, "name": "Apple", "slug": "apple", "product_count": 25 },
      { "id": 2, "name": "Samsung", "slug": "samsung", "product_count": 30 }
    ],
    "ratings": [4, 3, 2, 1]
  },
  "pagination": {
    "page": 1,
    "limit": 12,
    "totalProducts": 150,
    "totalPages": 13,
    "hasNext": true,
    "hasPrev": false
  },
  "sortOptions": [
    { "value": "newest", "label": "Newest Arrivals" },
    { "value": "price-low", "label": "Price: Low to High" }
  ]
}
```

### GET /api/categories/brands/list
Get all brands for filter sidebar.

### GET /api/categories/breadcrumb/:categoryId
Get breadcrumb for a specific category.

### GET /api/categories/tree/all
Get full category tree structure.

## Database Schema

### categories Table
```sql
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image_url VARCHAR(255),
    parent_id INT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    meta_title VARCHAR(200),
    meta_description VARCHAR(500),
    product_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX (slug),
    INDEX (parent_id),
    INDEX (is_active)
);
```

### brands Table
```sql
CREATE TABLE brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    logo_url VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    product_count INT DEFAULT 0,
    FOREIGN KEY (id) REFERENCES products(brand_id)
);
```

## Performance Optimization Tips

### 1. Database Indexing
```sql
-- Essential indexes for filtering performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_rating ON products(rating);
CREATE INDEX idx_products_created_at ON products(created_at);
CREATE INDEX idx_products_is_active ON products(is_active);
```

### 2. Denormalization
- Store `product_count` in categories table (update on product insert/delete)
- Store `avg_rating` and `total_reviews` in product_reviews_aggregate table
- Use `category_products` mapping table for fast category-product lookups

### 3. Query Optimization
- Use `EXPLAIN` to analyze slow queries
- Limit SELECT columns to only needed fields
- Use `COUNT(*)` instead of `COUNT(column)` for accurate counts
- Avoid SELECT * in production queries

### 4. Caching Strategy
```javascript
// Redis cache example for category products
const CACHE_TTL = 300; // 5 minutes

async function getCategoryProductsCached(slug, params) {
  const cacheKey = `category:${slug}:${JSON.stringify(params)}`;
  
  let products = await redis.get(cacheKey);
  if (products) return JSON.parse(products);
  
  products = await getCategoryProductsFromDB(slug, params);
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(products));
  
  return products;
}
```

### 5. Pagination Optimization
- Use cursor-based pagination for large datasets (better than offset)
- Limit max items per page (100 max)
- Pre-count total for pagination UI

### 6. Image Optimization
- Use lazy loading for product images
- Implement image CDN
- Use WebP format with fallbacks

## Setup Instructions

1. **Run database migration:**
```bash
mysql -u root -p ecommerce < db_categories.sql
```

2. **Update server.js:**
The categories route is already mounted at `/api/categories`

3. **Restart server:**
```bash
npm run dev
```

4. **Test endpoints:**
```bash
curl http://localhost:5000/api/categories
curl http://localhost:5000/api/categories/electronics/products?page=1&limit=12
```

## URL Structure
- Category Page: `/category/:slug` (e.g., `/category/electronics`)
- Products Page: `/products`
- Product Details: `/products/:id`

## Example Usage

```javascript
// Frontend API call
import { categoryAPI } from '../services/api';

// Get category with subcategories
const response = await categoryAPI.getCategory('electronics');

// Get products with filters
const products = await categoryAPI.getProducts('electronics', {
  page: 1,
  limit: 12,
  sortBy: 'price-low',
  minPrice: 100,
  maxPrice: 1000,
  brand: 'apple',
  rating: 4
});
```

## Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Error Handling
All endpoints return consistent error format:
```json
{
  "success": false,
  "message": "Error description"
}
```

**HTTP Status Codes:**
- 200: Success
- 400: Bad Request
- 404: Not Found
- 500: Server Error
