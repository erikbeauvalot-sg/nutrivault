/**
 * Patient Controller
 * 
 * HTTP request handlers for patient management.
 * Thin controllers that delegate business logic to patient service.
 */

const patientService = require('../services/patient.service');

/**
 * Extract request metadata for audit logging
 * @param {Object} req - Express request object
 * @returns {Object} Request metadata
 */
function getRequestMetadata(req) {
  return {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.originalUrl
  };
}

/**
 * GET /api/patients - Get all patients
 */
exports.getAllPatients = async (req, res, next) => {
  try {
    const user = req.user;
    const filters = {
      search: req.query.search,
      is_active: req.query.is_active,
      assigned_dietitian_id: req.query.assigned_dietitian_id,
      page: req.query.page,
      limit: req.query.limit
    };
    const requestMetadata = getRequestMetadata(req);

    const result = await patientService.getPatients(user, filters, requestMetadata);

    res.json({
      success: true,
      data: result.patients,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/patients/:id - Get patient by ID
 */
exports.getPatientById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const patient = await patientService.getPatientById(id, user, requestMetadata);

    res.json({
      success: true,
      data: patient
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/patients - Create new patient
 */
exports.createPatient = async (req, res, next) => {
  try {
    const patientData = req.body;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const patient = await patientService.createPatient(patientData, user, requestMetadata);

    res.status(201).json({
      success: true,
      data: patient,
      message: 'Patient created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/patients/:id - Update patient
 */
exports.updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const patient = await patientService.updatePatient(id, updateData, user, requestMetadata);

    res.json({
      success: true,
      data: patient,
      message: 'Patient updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/patients/:id - Delete patient (soft delete)
 */
exports.deletePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const result = await patientService.deletePatient(id, user, requestMetadata);

    res.json(result);
  } catch (error) {
    next(error);
  }
};
