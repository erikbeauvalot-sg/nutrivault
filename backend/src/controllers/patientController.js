/**
 * Patient Controller
 * 
 * HTTP request handlers for patient management.
 * Thin controllers that delegate business logic to patient service.
 */

const patientService = require('../services/patient.service');
const portalService = require('../services/portal.service');
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

// =============================================
// PORTAL MANAGEMENT (Dietitian endpoints)
// =============================================

/**
 * GET /api/patients/:id/portal/status — Get portal status
 */
exports.getPortalStatus = async (req, res, next) => {
  try {
    const status = await portalService.getPortalStatus(req.params.id);
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/patients/:id/portal/activate — Activate portal
 */
exports.activatePortal = async (req, res, next) => {
  try {
    const status = await portalService.activatePortal(req.params.id, req.user.id);
    res.json({ success: true, data: status, message: 'Portal activated. Invitation email sent.' });
  } catch (error) {
    if (error.message.includes('already') || error.message.includes('must have') || error.message.includes('associated')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
};

/**
 * POST /api/patients/:id/portal/deactivate — Deactivate portal
 */
exports.deactivatePortal = async (req, res, next) => {
  try {
    const status = await portalService.deactivatePortal(req.params.id);
    res.json({ success: true, data: status, message: 'Portal deactivated.' });
  } catch (error) {
    if (error.message.includes('not active')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
};

/**
 * POST /api/patients/:id/portal/reactivate — Reactivate portal
 */
exports.reactivatePortal = async (req, res, next) => {
  try {
    const status = await portalService.reactivatePortal(req.params.id);
    res.json({ success: true, data: status, message: 'Portal reactivated.' });
  } catch (error) {
    if (error.message.includes('never activated') || error.message.includes('already active')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
};

/**
 * POST /api/patients/:id/portal/resend — Resend invitation
 */
exports.resendInvitation = async (req, res, next) => {
  try {
    const status = await portalService.resendInvitation(req.params.id);
    res.json({ success: true, data: status, message: 'Invitation email resent.' });
  } catch (error) {
    if (error.message.includes('not active') || error.message.includes('does not have')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
};

/**
 * POST /api/patients/:id/portal/reset-password — Send password reset email
 */
exports.sendPortalPasswordReset = async (req, res, next) => {
  try {
    const status = await portalService.sendPasswordReset(req.params.id);
    res.json({ success: true, data: status, message: 'Password reset email sent.' });
  } catch (error) {
    if (error.message.includes('not active') || error.message.includes('does not have') || error.message.includes('not active')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/patients/:patientId/objectives — Get patient objectives
 */
exports.getPatientObjectives = async (req, res, next) => {
  try {
    const patientId = req.params.patientId || req.params.id;
    const hasAccess = await canAccessPatient(req.user, patientId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const objectives = await db.PatientObjective.findAll({
      where: { patient_id: patientId },
      order: [['objective_number', 'ASC']],
      include: [{ model: db.User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }]
    });
    res.json({ success: true, data: objectives });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/patients/:patientId/objectives — Upsert patient objectives (max 3)
 */
exports.upsertPatientObjectives = async (req, res, next) => {
  try {
    const patientId = req.params.patientId || req.params.id;
    const hasAccess = await canAccessPatient(req.user, patientId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const objectives = req.body;
    if (!Array.isArray(objectives)) {
      return res.status(400).json({ success: false, error: 'Body must be an array of objectives' });
    }

    const results = [];
    for (const obj of objectives) {
      if (!obj.objective_number || obj.objective_number < 1 || obj.objective_number > 3) continue;
      if (!obj.content || !obj.content.trim()) continue;

      const [record, created] = await db.PatientObjective.findOrCreate({
        where: { patient_id: patientId, objective_number: obj.objective_number },
        defaults: { content: obj.content.trim(), created_by: req.user.id }
      });
      if (!created) {
        await record.update({ content: obj.content.trim(), created_by: req.user.id });
      }
      results.push(record);
    }

    // Delete objectives that were not included
    const includedNumbers = objectives.filter(o => o.content && o.content.trim()).map(o => o.objective_number);
    if (includedNumbers.length > 0) {
      await db.PatientObjective.destroy({
        where: {
          patient_id: patientId,
          objective_number: { [db.Sequelize.Op.notIn]: includedNumbers }
        }
      });
    } else {
      await db.PatientObjective.destroy({ where: { patient_id: patientId } });
    }

    const finalObjectives = await db.PatientObjective.findAll({
      where: { patient_id: patientId },
      order: [['objective_number', 'ASC']],
      include: [{ model: db.User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }]
    });
    res.json({ success: true, data: finalObjectives });
  } catch (error) {
    next(error);
  }
};
