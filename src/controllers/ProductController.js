/**
 * Product Controller
 * Handles product requests
 */

const ProductService = require('../services/ProductService');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

class ProductController {
  /**
   * Get all products
   * GET /api/products
   */
  static getAll = asyncHandler(async (req, res) => {
    const filters = {
      category: req.query.category,
      search: req.query.search,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice
    };

    const { products, total } = await ProductService.getProducts(
      filters,
      req.pagination
    );

    return sendPaginated(res, products, {
      page: req.pagination.page,
      limit: req.pagination.limit,
      total
    }, 'Products retrieved successfully');
  });

  /**
   * Get single product
   * GET /api/products/:id
   */
  static getOne = asyncHandler(async (req, res) => {
    const product = await ProductService.getProduct(req.params.id);
    
    return sendSuccess(res, product, 'Product retrieved successfully');
  });

  /**
   * Get products by category
   * GET /api/products/category/:name
   */
  static getByCategory = asyncHandler(async (req, res) => {
    const products = await ProductService.getByCategory(
      req.params.name,
      req.pagination
    );

    return sendSuccess(res, products, 'Category products retrieved successfully');
  });

  /**
   * Get featured products
   * GET /api/products/featured
   */
  static getFeatured = asyncHandler(async (req, res) => {
    const products = await ProductService.getFeatured();
    
    return sendSuccess(res, products, 'Featured products retrieved successfully');
  });

  /**
   * Get categories
   * GET /api/products/categories
   */
  static getCategories = asyncHandler(async (req, res) => {
    const categories = await ProductService.getCategories();
    
    return sendSuccess(res, categories, 'Categories retrieved successfully');
  });

  /**
   * Create product
   * POST /api/products
   */
  static create = asyncHandler(async (req, res) => {
    const product = await ProductService.createProduct(req.user.id, req.body);
    
    return sendSuccess(res, product, 'Product created successfully', 201);
  });

  /**
   * Update product
   * PUT /api/products/:id
   */
  static update = asyncHandler(async (req, res) => {
    const product = await ProductService.updateProduct(req.params.id, req.body);
    
    return sendSuccess(res, product, 'Product updated successfully');
  });
}

module.exports = ProductController;
