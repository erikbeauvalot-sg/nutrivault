/**
 * Visit Management Controller
 *
 * Handles HTTP requests for visit management endpoints
 */

const {
  getVisits,
  getVisitById,
  createVisit,
  updateVisit,
  deleteVisit,
  getVisitStats
} = require('../services/visit.service');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get all visits
 * GET /api/visits
 */
const getVisitsHandler = asyncHandler(async (req, res) => {
  const filters = {
    patient_id: req.query.patient_id,
    dietitian_id: req.query.dietitian_id,
    status: req.query.status,
    visit_type: req.query.visit_type,
    from_date: req.query.from_date,
    to_date: req.query.to_date,
    limit: req.query.limit || 50,
    offset: req.query.offset || 0,
    sort_by: req.query.sort_by || 'visit_date',
    sort_order: req.query.sort_order || 'DESC'
  };

  const result = await getVisits(filters, req.user);

  res.json({
    success: true,
    data: result
  });
});

/**
 * Get visit by ID
 * GET /api/visits/:id
 */
const getVisitByIdHandler = asyncHandler(async (req, res) => {
  const visit = await getVisitById(req.params.id, req.user);

  res.json({
    success: true,
    data: { visit }
  });
});

/**
 * Create new visit
 * POST /api/visits
 */
const createVisitHandler = asyncHandler(async (req, res) => {
  const visit = await createVisit(req.body, req.user.id, req.user);

  res.status(201).json({
    success: true,
    message: 'Visit created successfully',
    data: { visit }
  });
});

/**
 * Update visit
 * PUT /api/visits/:id
 */
const updateVisitHandler = asyncHandler(async (req, res) => {
  const visit = await updateVisit(req.params.id, req.body, req.user.id, req.user);

  res.json({
    success: true,
    message: 'Visit updated successfully',
    data: { visit }
  });
});

/**
 * Delete visit
 * DELETE /api/visits/:id
 */
const deleteVisitHandler = asyncHandler(async (req, res) => {
  const result = await deleteVisit(req.params.id, req.user.id, req.user);

  res.json({
    success: true,
    message: result.message
  });
});

/**
 * Get visit statistics
 * GET /api/visits/stats
 */
const getVisitStatsHandler = asyncHandler(async (req, res) => {
  const filters = {
    from_date: req.query.from_date,
    to_date: req.query.to_date
  };

  const stats = await getVisitStats(filters, req.user);

  res.json({
    success: true,
    data: stats
  });
});

module.exports = {
  getVisitsHandler,
  getVisitByIdHandler,
  createVisitHandler,
  updateVisitHandler,
  deleteVisitHandler,
  getVisitStatsHandler
};
