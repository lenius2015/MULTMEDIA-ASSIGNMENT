/**
 * API Documentation
 * Complete guide to ShopHub API endpoints
 */

# Authentication API

## Register
POST /api/auth/register
Request:
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+254712345678"
}

Response:
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}

## Login
POST /api/auth/login
Request:
{
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}

## Get Current User
GET /api/auth/me
Headers: Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+254712345678",
    "role": "user"
  }
}

## Update Profile
PUT /api/auth/profile
Headers: Authorization: Bearer {accessToken}
Request:
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+254712345679",
  "address": "123 Main St",
  "city": "Nairobi"
}

Response:
{
  "success": true,
  "message": "Profile updated successfully",
  "data": { ...updated user... }
}

# Products API

## Get All Products
GET /api/products?page=1&limit=10&category=electronics&search=phone&minPrice=100&maxPrice=500

Response:
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Smartphone",
      "description": "Latest smartphone",
      "price": 299.99,
      "stock": 50,
      "category": "electronics",
      "image": "https://...",
      "vendor": {
        "name": "TechVendor",
        "email": "vendor@tech.com"
      },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}

## Get Product By ID
GET /api/products/1

Response:
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": { ...product details... }
}

## Get Featured Products
GET /api/products/featured

Response:
{
  "success": true,
  "message": "Featured products retrieved successfully",
  "data": [ ...products... ]
}

## Get Categories
GET /api/products/categories

Response:
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": ["electronics", "clothing", "books", "home"]
}

## Get Products by Category
GET /api/products/category/electronics?page=1

Response:
{
  "success": true,
  "message": "Category products retrieved successfully",
  "data": [ ...products... ]
}

## Create Product (Vendor/Admin Only)
POST /api/products
Headers: Authorization: Bearer {accessToken}
Request:
{
  "name": "New Product",
  "description": "Product description",
  "price": 99.99,
  "stock": 100,
  "category": "electronics",
  "image": "https://..."
}

Response:
{
  "success": true,
  "message": "Product created successfully",
  "data": { ...created product... }
}

## Update Product
PUT /api/products/1
Headers: Authorization: Bearer {accessToken}
Request:
{
  "price": 89.99,
  "stock": 50
}

Response:
{
  "success": true,
  "message": "Product updated successfully",
  "data": { ...updated product... }
}

# Orders API

## Create Order
POST /api/orders
Headers: Authorization: Bearer {accessToken}
Request:
{
  "items": [
    { "productId": 1, "quantity": 2 },
    { "productId": 2, "quantity": 1 }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Nairobi",
    "zipCode": "00100",
    "country": "Kenya"
  },
  "paymentMethod": "mpesa"
}

Response:
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 100,
    "userId": 1,
    "totalAmount": 599.98,
    "status": "pending",
    "items": [ ...order items... ],
    "createdAt": "2024-01-01T00:00:00Z"
  }
}

## Get User Orders
GET /api/orders?page=1&limit=10
Headers: Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": [ ...orders... ],
  "pagination": { ...pagination... }
}

## Get Order Details
GET /api/orders/100
Headers: Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": { ...order details with items... }
}

## Update Order Status (Admin Only)
PATCH /api/orders/100/status
Headers: Authorization: Bearer {adminToken}
Request:
{
  "status": "shipped"
}

Response:
{
  "success": true,
  "message": "Order status updated successfully",
  "data": { ...updated order... }
}

# Error Responses

## Validation Error
{
  "success": false,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": {
    "email": "Email must be valid",
    "password": "Password is too weak"
  }
}

## Unauthorized Error
{
  "success": false,
  "message": "Unauthorized access",
  "code": "UNAUTHORIZED"
}

## Not Found Error
{
  "success": false,
  "message": "Product not found",
  "code": "NOT_FOUND"
}

## Conflict Error
{
  "success": false,
  "message": "Email already registered",
  "code": "CONFLICT"
}
