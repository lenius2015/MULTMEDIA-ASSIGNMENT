/**
 * Product Service
 * Handles product business logic
 */

const Product = require('../models/Product');
const { NotFoundError, ValidationError } = require('../exceptions/AppError');
const { validatePrice, isPositiveInteger } = require('../utils/validators');

class ProductService {
  /**
   * Get all products with filters
   */
  static async getProducts(filters = {}, pagination) {
    const { products, total } = await Product.findAll(filters, pagination);
    
    if (products.length === 0 && pagination.page > 1) {
      return { products: [], total: 0 };
    }

    return {
      products: products.map(p => this.formatProduct(p)),
      total
    };
  }

  /**
   * Get single product
   */
  static async getProduct(id) {
    if (!isPositiveInteger(id)) {
      throw new ValidationError('Invalid product ID');
    }

    const product = await Product.findById(id);
    if (!product) {
      throw new NotFoundError('Product');
    }

    return this.formatProduct(product);
  }

  /**
   * Get products by category
   */
  static async getByCategory(category, pagination) {
    const products = await Product.getByCategory(category, pagination);
    return products.map(p => this.formatProduct(p));
  }

  /**
   * Get featured products
   */
  static async getFeatured() {
    const products = await Product.getFeatured();
    return products.map(p => this.formatProduct(p));
  }

  /**
   * Get all categories
   */
  static async getCategories() {
    const categories = await Product.getCategories();
    return categories.map(c => c.category);
  }

  /**
   * Create product (vendor/admin only)
   */
  static async createProduct(vendorId, data) {
    const { name, description, price, stock, category } = data;

    // Validate
    if (!name || !price || !stock) {
      throw new ValidationError('Missing required fields');
    }

    if (!validatePrice(price)) {
      throw new ValidationError('Invalid price');
    }

    if (!isPositiveInteger(stock)) {
      throw new ValidationError('Stock must be a positive integer');
    }

    const product = await Product.create({
      ...data,
      vendorId
    });

    return this.formatProduct(product);
  }

  /**
   * Update product
   */
  static async updateProduct(productId, data) {
    const product = await Product.findById(productId);
    if (!product) {
      throw new NotFoundError('Product');
    }

    // Validate price if provided
    if (data.price && !validatePrice(data.price)) {
      throw new ValidationError('Invalid price');
    }

    await Product.update(productId, data);
    return this.getProduct(productId);
  }

  /**
   * Format product for response
   */
  static formatProduct(product) {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: parseFloat(product.price),
      stock: product.stock,
      category: product.category,
      image: product.image_url,
      vendor: product.vendor_name ? {
        name: product.vendor_name,
        email: product.vendor_email
      } : null,
      createdAt: product.created_at
    };
  }
}

module.exports = ProductService;
