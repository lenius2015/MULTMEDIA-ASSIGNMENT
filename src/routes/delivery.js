/**
 * Delivery Routes
 */

const express = require('express');
const router = express.Router();
const DeliveryService = require('../services/DeliveryService');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');

// Address Management
router.post('/addresses', authenticate, asyncHandler(async (req, res) => {
  const address = await DeliveryService.saveAddress(req.user.id, req.body);
  res.status(201).json({ success: true, data: address });
}));

router.get('/addresses', authenticate, asyncHandler(async (req, res) => {
  const addresses = await DeliveryService.getUserAddresses(req.user.id, req.query.type);
  res.json({ success: true, data: addresses });
}));

router.patch('/addresses/:addressId', authenticate, asyncHandler(async (req, res) => {
  const address = await DeliveryService.updateAddress(
    req.params.addressId,
    req.user.id,
    req.body
  );
  res.json({ success: true, data: address });
}));

router.delete('/addresses/:addressId', authenticate, asyncHandler(async (req, res) => {
  await DeliveryService.deleteAddress(req.params.addressId, req.user.id);
  res.json({ success: true, message: 'Address deleted' });
}));

// Delivery Tracking
router.get('/track/:trackingNumber', asyncHandler(async (req, res) => {
  const deliveries = await DeliveryService.getAdminDeliveries({
    tracking_number: req.params.trackingNumber
  });
  res.json({ success: true, data: deliveries[0] || null });
}));

// Pickup Points
router.get('/pickup-points', asyncHandler(async (req, res) => {
  const points = await DeliveryService.getPickupPoints(req.query.city);
  res.json({ success: true, data: points });
}));

router.get('/pickup-points/:pointId', asyncHandler(async (req, res) => {
  const point = await DeliveryService.getPickupPoint(req.params.pointId);
  if (!point) return res.status(404).json({ success: false });
  res.json({ success: true, data: point });
}));

// Delivery Fees
router.get('/fees/:city', asyncHandler(async (req, res) => {
  const fee = await DeliveryService.getDeliveryFee(req.params.city);
  res.json({ success: true, data: fee });
}));

// Admin: Manage Deliveries
router.patch('/:deliveryId/status', authorize(['admin']), asyncHandler(async (req, res) => {
  const result = await DeliveryService.updateDeliveryStatus(
    req.params.deliveryId,
    req.body.status
  );
  res.json({ success: true, data: result });
}));

router.patch('/:deliveryId/assign', authorize(['admin']), asyncHandler(async (req, res) => {
  const result = await DeliveryService.assignDeliveryPartner(
    req.params.deliveryId,
    req.body.partner_id
  );
  res.json({ success: true, data: result });
}));

router.post('/:deliveryId/proof', asyncHandler(async (req, res) => {
  const result = await DeliveryService.uploadProofOfDelivery(
    req.params.deliveryId,
    req.body.signature_url,
    req.body.photo_url,
    req.body.delivered_by
  );
  res.json({ success: true, data: result });
}));

router.post('/:deliveryId/location', asyncHandler(async (req, res) => {
  const result = await DeliveryService.updateDeliveryLocation(
    req.params.deliveryId,
    req.body.latitude,
    req.body.longitude
  );
  res.json({ success: true, data: result });
}));

router.get('/admin/list', authorize(['admin']), asyncHandler(async (req, res) => {
  const deliveries = await DeliveryService.getAdminDeliveries(req.query);
  res.json({ success: true, data: deliveries });
}));

module.exports = router;
