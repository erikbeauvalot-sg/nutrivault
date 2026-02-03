/**
 * Patient Controller
 * 
 * HTTP request handlers for patient management.
 * Thin controllers that delegate business logic to patient service.
 */

const patientService = require('../services/patient.service');
const db = require('../../../models');
const { ensurePatientDietitianLink, canAccessPatient } = require('../helpers/scopeHelper');

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
 * GET /api/patients/:id/details - Get patient details with visits and measurements
 */
exports.getPatientDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const patient = await patientService.getPatientDetails(id, user, requestMetadata);

    res.json({
      success: true,
      data: patient
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

/**
 * GET /api/patients/check-email/:email - Check if email is available
 */
exports.checkEmailAvailability = async (req, res, next) => {
  try {
    const { email } = req.params;
    const { excludeId } = req.query; // For updates, exclude current patient

    const isAvailable = await patientService.checkEmailAvailability(email, excludeId);

    res.json({
      success: true,
      available: isAvailable,
      email: email.toLowerCase().trim()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/patients/:id/dietitians - List dietitians linked to a patient
 */
exports.getPatientDietitians = async (req, res, next) => {
  try {
    const { id } = req.params;

    const links = await db.PatientDietitian.findAll({
      where: { patient_id: id },
      include: [{
        model: db.User,
        as: 'dietitian',
        attributes: ['id', 'username', 'first_name', 'last_name', 'email']
      }],
      order: [['created_at', 'ASC']]
    });

    res.json({
      success: true,
      data: links.map(l => ({
        id: l.id,
        dietitian: l.dietitian,
        linked_at: l.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/patients/:id/dietitians - Add a dietitian link
 */
exports.addPatientDietitian = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dietitian_id } = req.body;
    const user = req.user;

    // Only ADMIN or the dietitian themselves can add a link
    const roleName = user.role?.name || user.role;
    if (roleName !== 'ADMIN' && dietitian_id !== user.id) {
      const error = new Error('Only ADMIN or the dietitian themselves can add a link');
      error.statusCode = 403;
      throw error;
    }

    // Verify patient exists
    const patient = await db.Patient.findByPk(id);
    if (!patient) {
      const error = new Error('Patient not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify dietitian exists
    const dietitian = await db.User.findByPk(dietitian_id);
    if (!dietitian) {
      const error = new Error('Dietitian not found');
      error.statusCode = 404;
      throw error;
    }

    const link = await ensurePatientDietitianLink(id, dietitian_id);

    res.status(201).json({
      success: true,
      data: link,
      message: 'Dietitian linked to patient'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/patients/:id/dietitians/:dietitianId - Remove a dietitian link
 */
exports.removePatientDietitian = async (req, res, next) => {
  try {
    const { id, dietitianId } = req.params;
    const user = req.user;

    // Only ADMIN can remove links
    const roleName = user.role?.name || user.role;
    if (roleName !== 'ADMIN') {
      const error = new Error('Only ADMIN can remove dietitian links');
      error.statusCode = 403;
      throw error;
    }

    const deleted = await db.PatientDietitian.destroy({
      where: {
        patient_id: id,
        dietitian_id: dietitianId
      }
    });

    if (!deleted) {
      const error = new Error('Link not found');
      error.statusCode = 404;
      throw error;
    }

    res.json({
      success: true,
      message: 'Dietitian link removed'
    });
  } catch (error) {
    next(error);
  }
};
