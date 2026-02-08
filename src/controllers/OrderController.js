/**
 * Order Controller
 * Handles order requests
 */

const OrderService = require('../services/OrderService');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

class OrderController {
  /**
   * Create order
   * POST /api/orders
   */
  static create = asyncHandler(async (req, res) => {
    const order = await OrderService.createOrder(req.user.id, req.body);
    
    return sendSuccess(res, order, 'Order created successfully', 201);
  });

  /**
   * Get order
   * GET /api/orders/:id
   */
  static getOne = asyncHandler(async (req, res) => {
    const order = await OrderService.getOrder(req.params.id);
    
    return sendSuccess(res, order, 'Order retrieved successfully');
  });

  /**
   * Get user orders
   * GET /api/orders
   */
  static getUserOrders = asyncHandler(async (req, res) => {
    const { orders, total } = await OrderService.getUserOrders(
      req.user.id,
      req.pagination
    );

    return sendPaginated(res, orders, {
      page: req.pagination.page,
      limit: req.pagination.limit,
      total
    }, 'Orders retrieved successfully');
  });

  /**
   * Update order status
   * PATCH /api/orders/:id/status
   */
  static updateStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const order = await OrderService.updateOrderStatus(req.params.id, status);
    
    return sendSuccess(res, order, 'Order status updated successfully');
  });
}

module.exports = OrderController;
