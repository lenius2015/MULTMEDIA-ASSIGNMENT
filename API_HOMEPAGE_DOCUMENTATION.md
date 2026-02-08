# E-Commerce Home Page API Documentation

## Base URL
```
http://localhost:5000/api
```

## Endpoints

### 1. GET /home
Get all home page data in a single request.

**Response:**
```json
{
  "success": true,
  "data": {
    "hero": {
      "id": 1,
      "title": "Discover Bold New Arrivals",
      "subtitle": "Premium picks curated weekly...",
      "cta_text": "Shop the Drop",
      "cta_link": "/products",
      "background_image": "/uploads/hero-1.jpg",
      "badge": "NEW",
      "badge_color": "#3b82f6"
    },
    "featured": [
      {
        "id": 1,
        "name": "Wireless Headphones",
        "price": 99.99,
        "discount": 20,
        "discounted_price": 79.99,
        "image_url": "/uploads/products/headphones.jpg",
        "stock": 50,
        "vendor_name": "TechBrand"
      }
    ],
    "categories": [
      { "id": 1, "name": "Electronics", "product_count": 15, "image_url": null },
      { "id": 2, "name": "Fashion", "product_count": 25, "image_url": null }
    ],
    "deals": [
      {
        "id": 2,
        "name": "Smart Watch Pro",
        "price": 199.99,
        "discount": 30,
        "discounted_price": 139.99,
        "stock": 10
      }
    ],
    "promotions": [
      {
        "id": 1,
        "title": "Free Shipping",
        "description": "On orders over $50",
        "code": "FREESHIP50"
      }
    ],
    "auctions": [
      {
        "id": 1,
        "title": "Vintage Camera",
        "product_name": "Vintage Camera Collection",
        "current_bid": 175.00,
        "end_date": "2026-02-06T23:59:59Z"
      }
    ],
    "countdown": {
      "id": 1,
      "title": "Deals of the Day",
      "end_date": "2026-02-04T00:00:00Z",
      "display_on_homepage": true
    },
    "wishlistIds": [1, 3, 5]
  }
}
```

### 2. GET /home/featured
Get featured products.

**Query Parameters:**
- `limit` (optional): Number of products to return, default 8

**Response:**
```json
{
  "success": true,
  "products": [
    {
      "id": 1,
      "name": "Wireless Headphones",
      "price": 99.99,
      "discount": 20,
      "discounted_price": 79.99,
      "image_url": "/uploads/products/headphones.jpg",
      "stock": 50
    }
  ]
}
```

### 3. GET /home/categories
Get categories with product counts.

**Response:**
```json
{
  "success": true,
  "categories": [
    {
      "id": 1,
      "name": "Electronics",
      "product_count": 15,
      "image_url": "/uploads/categories/electronics.jpg",
      "slug": "electronics"
    }
  ]
}
```

### 4. GET /home/deals
Get deals of the day (products with discounts).

**Response:**
```json
{
  "success": true,
  "deals": [
    {
      "id": 1,
      "name": "Smart Watch Pro",
      "price": 199.99,
      "discount": 30,
      "discounted_price": 139.99,
      "stock": 10,
      "description": "Latest smart watch with health tracking..."
    }
  ]
}
```

### 5. GET /home/promotions
Get active promotions.

**Response:**
```json
{
  "success": true,
  "promotions": [
    {
      "id": 1,
      "title": "Summer Sale",
      "description": "Up to 50% off selected items",
      "discount_percent": 50,
      "code": "SUMMER50",
      "image_url": "/uploads/promos/summer.jpg"
    }
  ]
}
```

### 6. GET /home/auctions
Get live auctions.

**Response:**
```json
{
  "success": true,
  "auctions": [
    {
      "id": 1,
      "title": "Vintage Camera Collection",
      "product_name": "Vintage Camera",
      "product_image": "/uploads/products/camera.jpg",
      "current_bid": 175.00,
      "starting_bid": 150.00,
      "end_date": "2026-02-06T23:59:59Z",
      "status": "active"
    }
  ]
}
```

### 7. GET /home/countdown
Get countdown event for homepage.

**Response:**
```json
{
  "success": true,
  "event": {
    "id": 1,
    "title": "Flash Sale Ends Soon",
    "end_date": "2026-02-04T12:00:00Z",
    "display_on_homepage": true
  }
}
```

### 8. GET /home/hero
Get hero banner.

**Response:**
```json
{
  "success": true,
  "banner": {
    "id": 1,
    "title": "Discover Bold New Arrivals",
    "subtitle": "Premium picks curated weekly...",
    "cta_text": "Shop the Drop",
    "cta_link": "/products",
    "background_image": "/uploads/hero-1.jpg",
    "badge": "NEW",
    "badge_color": "#3b82f6"
  }
}
```

### 9. GET /home/search
Real-time product search.

**Query Parameters:**
- `q`: Search query (required, min 2 characters)
- `limit`: Max results (optional, default 6)

**Response:**
```json
{
  "success": true,
  "products": [
    {
      "id": 1,
      "name": "Wireless Headphones",
      "price": 99.99,
      "discount": 20,
      "discounted_price": 79.99,
      "image_url": "/uploads/products/headphones.jpg",
      "category_name": "Electronics",
      "stock": 50
    }
  ]
}
```

### 10. GET /home/product/:id/stock
Get live stock availability for a product.

**Response:**
```json
{
  "success": true,
  "stock": {
    "available": 25,
    "status": "in_stock",
    "lastUpdated": "2026-02-03T09:30:00Z"
  }
}
```

## Error Responses

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
- 401: Unauthorized
- 404: Not Found
- 500: Server Error

## Cart Endpoints

### POST /cart/items
Add item to cart.

**Request:**
```json
{
  "productId": 1,
  "quantity": 1
}
```

### GET /cart
Get cart items.

### DELETE /cart/items/:itemId
Remove item from cart.

## Wishlist Endpoints

### GET /wishlist
Get wishlist items.

### POST /wishlist
Add to wishlist.

**Request:**
```json
{
  "productId": 1
}
```

### DELETE /wishlist/:productId
Remove from wishlist.

## WebSocket Events (Socket.IO)

### Countdown Events
- `countdown_started`: { eventId }
- `countdown_stopped`: { eventId }
- `countdown_updated`: { eventId, updates }
- `countdown_deleted`: { eventId }

### Cart Updates
- `cart-updated`: Dispatched when cart changes
- `wishlist-updated`: Dispatched when wishlist changes

## Database Schema

### hero_banners
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| title | VARCHAR(255) | Banner title |
| subtitle | TEXT | Banner subtitle |
| cta_text | VARCHAR(100) | Button text |
| cta_link | VARCHAR(255) | Button link |
| background_image | VARCHAR(255) | Image URL |
| badge | VARCHAR(50) | Badge text |
| sort_order | INT | Display order |
| is_active | BOOLEAN | Active status |

### promotions
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| title | VARCHAR(255) | Promo title |
| description | TEXT | Promo description |
| code | VARCHAR(50) | Promo code |
| discount_percent | DECIMAL | Discount percentage |
| start_date | DATETIME | Start date |
| end_date | DATETIME | End date |
| is_active | BOOLEAN | Active status |

### auctions
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| title | VARCHAR(255) | Auction title |
| product_id | INT | Product FK |
| current_bid | DECIMAL | Current highest bid |
| status | ENUM | scheduled/active/ended |
| end_date | DATETIME | Auction end |
| start_date | DATETIME | Auction start |

### countdown_events
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| title | VARCHAR(255) | Event title |
| end_date | DATETIME | Countdown end |
| display_on_homepage | BOOLEAN | Show on home |
| event_type | ENUM | deal/auction/product |
