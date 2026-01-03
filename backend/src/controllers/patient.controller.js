/**
 * Patient Management Controller
 *
 * Handles HTTP requests for patient management endpoints
 */

const {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  activatePatient,
  deactivatePatient,
  getPatientStats
} = require('../services/patient.service');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get all patients
 * GET /api/patients
 */
const getPatientsHandler = asyncHandler(async (req, res) => {
  const filters = {
    assigned_dietitian_id: req.query.assigned_dietitian_id,
    is_active: req.query.is_active,
    search: req.query.search,
    age_min: req.query.age_min,
    age_max: req.query.age_max,
    limit: req.query.limit || 50,
    offset: req.query.offset || 0,
    sort_by: req.query.sort_by || 'created_at',
    sort_order: req.query.sort_order || 'DESC'
  };

  const result = await getPatients(filters, req.user);

  res.json({
    success: true,
    data: result
  });
});

/**
 * Get patient by ID
 * GET /api/patients/:id
 */
const getPatientByIdHandler = asyncHandler(async (req, res) => {
  const patient = await getPatientById(req.params.id, req.user);

  res.json({
    success: true,
    data: { patient }
  });
});

/**
 * Create new patient
 * POST /api/patients
 */
const createPatientHandler = asyncHandler(async (req, res) => {
  const patient = await createPatient(req.body, req.user.id);

  res.status(201).json({
    success: true,
    message: 'Patient created successfully',
    data: { patient }
  });
});

/**
 * Update patient
 * PUT /api/patients/:id
 */
const updatePatientHandler = asyncHandler(async (req, res) => {
  const patient = await updatePatient(req.params.id, req.body, req.user.id, req.user);

  res.json({
    success: true,
    message: 'Patient updated successfully',
    data: { patient }
  });
});

/**
 * Delete patient (soft delete)
 * DELETE /api/patients/:id
 */
const deletePatientHandler = asyncHandler(async (req, res) => {
  const result = await deletePatient(req.params.id, req.user.id, req.user);

  res.json({
    success: true,
    message: result.message
  });
});

/**
 * Activate patient
 * PUT /api/patients/:id/activate
 */
const activatePatientHandler = asyncHandler(async (req, res) => {
  const result = await activatePatient(req.params.id, req.user.id, req.user);

  res.json({
    success: true,
    message: result.message
  });
});

/**
 * Deactivate patient
 * PUT /api/patients/:id/deactivate
 */
const deactivatePatientHandler = asyncHandler(async (req, res) => {
  const result = await deactivatePatient(req.params.id, req.user.id, req.user);

  res.json({
    success: true,
    message: result.message
  });
});

/**
 * Get patient statistics
 * GET /api/patients/stats
 */
const getPatientStatsHandler = asyncHandler(async (req, res) => {
  const stats = await getPatientStats(req.user);

  res.json({
    success: true,
    data: stats
  });
});

module.exports = {
  getPatientsHandler,
  getPatientByIdHandler,
  createPatientHandler,
  updatePatientHandler,
  deletePatientHandler,
  activatePatientHandler,
  deactivatePatientHandler,
  getPatientStatsHandler
};
