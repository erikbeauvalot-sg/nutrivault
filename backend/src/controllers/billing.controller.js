/**
 * Billing Management Controller
 *
 * Handles HTTP requests for billing and invoice management endpoints
 */

const {
  getBillingRecords,
  getBillingById,
  createBilling,
  updateBilling,
  deleteBilling,
  markAsPaid,
  getBillingStats
} = require('../services/billing.service');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get all billing records
 * GET /api/billing
 */
const getBillingRecordsHandler = asyncHandler(async (req, res) => {
  const filters = {
    patient_id: req.query.patient_id,
    status: req.query.status,
    from_date: req.query.from_date,
    to_date: req.query.to_date,
    limit: req.query.limit || 50,
    offset: req.query.offset || 0,
    sort_by: req.query.sort_by || 'invoice_date',
    sort_order: req.query.sort_order || 'DESC'
  };

  const result = await getBillingRecords(filters, req.user);

  res.json({
    success: true,
    data: result
  });
});

/**
 * Get billing record by ID
 * GET /api/billing/:id
 */
const getBillingByIdHandler = asyncHandler(async (req, res) => {
  const billing = await getBillingById(req.params.id, req.user);

  res.json({
    success: true,
    data: { billing }
  });
});

/**
 * Create new billing record/invoice
 * POST /api/billing
 */
const createBillingHandler = asyncHandler(async (req, res) => {
  const billing = await createBilling(req.body, req.user.id, req.user);

  res.status(201).json({
    success: true,
    message: 'Invoice created successfully',
    data: { billing }
  });
});

/**
 * Update billing record
 * PUT /api/billing/:id
 */
const updateBillingHandler = asyncHandler(async (req, res) => {
  const billing = await updateBilling(req.params.id, req.body, req.user.id, req.user);

  res.json({
    success: true,
    message: 'Billing record updated successfully',
    data: { billing }
  });
});

/**
 * Delete billing record
 * DELETE /api/billing/:id
 */
const deleteBillingHandler = asyncHandler(async (req, res) => {
  const result = await deleteBilling(req.params.id, req.user.id, req.user);

  res.json({
    success: true,
    message: result.message
  });
});

/**
 * Mark invoice as paid
 * POST /api/billing/:id/pay
 */
const markAsPaidHandler = asyncHandler(async (req, res) => {
  const billing = await markAsPaid(req.params.id, req.body, req.user.id, req.user);

  res.json({
    success: true,
    message: 'Invoice marked as paid successfully',
    data: { billing }
  });
});

/**
 * Get billing statistics
 * GET /api/billing/stats
 */
const getBillingStatsHandler = asyncHandler(async (req, res) => {
  const filters = {
    from_date: req.query.from_date,
    to_date: req.query.to_date
  };

  const stats = await getBillingStats(filters, req.user);

  res.json({
    success: true,
    data: stats
  });
});

module.exports = {
  getBillingRecordsHandler,
  getBillingByIdHandler,
  createBillingHandler,
  updateBillingHandler,
  deleteBillingHandler,
  markAsPaidHandler,
  getBillingStatsHandler
};
