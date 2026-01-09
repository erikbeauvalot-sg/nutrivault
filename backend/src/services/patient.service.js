/**
 * Patient Service
 * 
 * Business logic for patient management with RBAC and audit logging.
 * Enforces dietitian filtering and soft delete.
 */

const db = require('../../../models');
const Patient = db.Patient;
const User = db.User;
const Role = db.Role;
const auditService = require('./audit.service');
const { Op } = db.Sequelize;

/**
 * Get all patients with filtering and pagination
 * 
 * @param {Object} user - Authenticated user object
 * @param {Object} filters - Filter criteria
 * @param {string} filters.search - Search by name, email, or phone
 * @param {boolean} filters.is_active - Filter by active status
 * @param {string} filters.assigned_dietitian_id - Filter by assigned dietitian
 * @param {number} filters.page - Page number (default 1)
 * @param {number} filters.limit - Items per page (default 20)
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Patients, total count, and pagination info
 */
async function getPatients(user, filters = {}, requestMetadata = {}) {
  try {
    const whereClause = { is_active: true };

    // RBAC: Dietitians can only see their assigned patients
    // ADMIN and ASSISTANT can see all patients
    if (user.role.name === 'DIETITIAN') {
      whereClause.assigned_dietitian_id = user.id;
    }

    // Apply additional filters
    if (filters.search) {
      whereClause[Op.or] = [
        { first_name: { [Op.like]: `%${filters.search}%` } },
        { last_name: { [Op.like]: `%${filters.search}%` } },
        { email: { [Op.like]: `%${filters.search}%` } },
        { phone: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    if (filters.is_active !== undefined) {
      whereClause.is_active = filters.is_active;
    }

    if (filters.assigned_dietitian_id) {
      whereClause.assigned_dietitian_id = filters.assigned_dietitian_id;
    }

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await Patient.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['last_name', 'ASC'], ['first_name', 'ASC']],
      include: [
        {
          model: User,
          as: 'assigned_dietitian',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ]
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'patients',
      resource_id: null,
      changes: { filter_count: count },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200,
      // status_code: 200
    });

    return {
      patients: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  } catch (error) {
    // Audit log failure
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'patients',
      status_code: 500,
      error_message: error.message,
      // status_code: 500,
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path
    });

    throw error;
  }
}

/**
 * Get patient by ID
 * 
 * @param {string} patientId - Patient UUID
 * @param {Object} user - Authenticated user object
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Patient data
 */
async function getPatientById(patientId, user, requestMetadata = {}) {
  try {
    const patient = await Patient.findOne({
      where: { 
        id: patientId,
        is_active: true
      },
      include: [
        {
          model: User,
          as: 'assigned_dietitian',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ]
    });

    if (!patient) {
      const error = new Error('Patient not found');
      error.statusCode = 404;
      throw error;
    }

    // RBAC: Dietitians can only access their assigned patients
    if (user.role.name === 'DIETITIAN' && patient.assigned_dietitian_id !== user.id) {
      const error = new Error('Access denied. You can only access your assigned patients');
      error.statusCode = 403;
      throw error;
    }

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'patients',
      resource_id: patient.id,
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200,
      // status_code: 200
    });

    return patient;
  } catch (error) {
    // Audit log failure
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'patients',
      resource_id: patientId,
      status_code: 500,
      error_message: error.message,
      // status_code: 500,
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path
    });

    throw error;
  }
}

/**
 * Get patient details with visits and measurements for graphical display
 * 
 * @param {string} patientId - Patient UUID
 * @param {Object} user - Authenticated user object
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Patient data with visits and measurements
 */
async function getPatientDetails(patientId, user, requestMetadata = {}) {
  try {
    const patient = await Patient.findOne({
      where: { 
        id: patientId,
        is_active: true
      },
      include: [
        {
          model: User,
          as: 'assigned_dietitian',
          attributes: ['id', 'username', 'first_name', 'last_name']
        },
        {
          model: db.Visit,
          as: 'visits',
          where: { status: 'COMPLETED' },
          required: false,
          include: [
            {
              model: db.VisitMeasurement,
              as: 'measurements',
              required: false
            },
            {
              model: User,
              as: 'dietitian',
              attributes: ['id', 'username', 'first_name', 'last_name']
            }
          ],
          order: [['visit_date', 'ASC']]
        }
      ]
    });

    if (!patient) {
      const error = new Error('Patient not found');
      error.statusCode = 404;
      throw error;
    }

    // RBAC: Dietitians can only access their assigned patients
    if (user.role.name === 'DIETITIAN' && patient.assigned_dietitian_id !== user.id) {
      const error = new Error('Access denied. You can only access your assigned patients');
      error.statusCode = 403;
      throw error;
    }

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'patients',
      resource_id: patient.id,
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200,
      details: 'Patient details with visits and measurements accessed'
    });

    return patient;
  } catch (error) {
    console.error('Error in getPatientDetails:', error);
    throw error;
  }
}

/**
 * Create new patient
 * 
 * @param {Object} patientData - Patient data
 * @param {Object} user - Authenticated user object
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Created patient
 */
async function createPatient(patientData, user, requestMetadata = {}) {
  try {
    // Validate assigned_dietitian_id if provided
    if (patientData.assigned_dietitian_id) {
      const dietitian = await User.findOne({
        where: { id: patientData.assigned_dietitian_id },
        include: [{ model: Role, as: 'role' }]
      });

      if (!dietitian) {
        const error = new Error('Assigned dietitian not found');
        error.statusCode = 400;
        throw error;
      }

      if (dietitian.role.name !== 'DIETITIAN') {
        const error = new Error('Assigned user must have DIETITIAN role');
        error.statusCode = 400;
        throw error;
      }
    }

    // Create patient
    const patient = await Patient.create(patientData);

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      resource_type: 'patients',
      resource_id: patient.id,
      changes: { after: patient.toJSON() },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200,
      // status_code: 200
    });

    return patient;
  } catch (error) {
    // Audit log failure
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      resource_type: 'patients',
      status_code: 500,
      error_message: error.message,
      // status_code: 500,
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path
    });

    throw error;
  }
}

/**
 * Update patient
 * 
 * @param {string} patientId - Patient UUID
 * @param {Object} updateData - Updated patient data
 * @param {Object} user - Authenticated user object
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Updated patient
 */
async function updatePatient(patientId, updateData, user, requestMetadata = {}) {
  try {
    const patient = await Patient.findOne({
      where: { 
        id: patientId,
        is_active: true
      }
    });

    if (!patient) {
      const error = new Error('Patient not found');
      error.statusCode = 404;
      throw error;
    }

    // RBAC: Dietitians can only update their assigned patients
    if (user.role.name === 'DIETITIAN' && patient.assigned_dietitian_id !== user.id) {
      const error = new Error('Access denied. You can only update your assigned patients');
      error.statusCode = 403;
      throw error;
    }

    // Validate assigned_dietitian_id if being updated
    if (updateData.assigned_dietitian_id && updateData.assigned_dietitian_id !== patient.assigned_dietitian_id) {
      const dietitian = await User.findOne({
        where: { id: updateData.assigned_dietitian_id },
        include: [{ model: Role, as: 'role' }]
      });

      if (!dietitian) {
        const error = new Error('Assigned dietitian not found');
        error.statusCode = 400;
        throw error;
      }

      if (dietitian.role.name !== 'DIETITIAN') {
        const error = new Error('Assigned user must have DIETITIAN role');
        error.statusCode = 400;
        throw error;
      }
    }

    // Capture before state
    const beforeData = patient.toJSON();

    // Update patient
    await patient.update(updateData);

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      resource_type: 'patients',
      resource_id: patient.id,
      changes: { 
        before: beforeData, 
        after: patient.toJSON() 
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200,
      // status_code: 200
    });

    return patient;
  } catch (error) {
    // Audit log failure
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      resource_type: 'patients',
      resource_id: patientId,
      status_code: 500,
      error_message: error.message,
      // status_code: 500,
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path
    });

    throw error;
  }
}

/**
 * Delete patient (soft delete)
 * 
 * @param {string} patientId - Patient UUID
 * @param {Object} user - Authenticated user object
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Success message
 */
async function deletePatient(patientId, user, requestMetadata = {}) {
  try {
    const patient = await Patient.findOne({
      where: { 
        id: patientId,
        is_active: true
      }
    });

    if (!patient) {
      const error = new Error('Patient not found');
      error.statusCode = 404;
      throw error;
    }

    // RBAC: Dietitians can only delete their assigned patients
    if (user.role.name === 'DIETITIAN' && patient.assigned_dietitian_id !== user.id) {
      const error = new Error('Access denied. You can only delete your assigned patients');
      error.statusCode = 403;
      throw error;
    }

    // Capture before state
    const beforeData = patient.toJSON();

    // Soft delete: set is_active to false
    await patient.update({ is_active: false });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'DELETE',
      resource_type: 'patients',
      resource_id: patient.id,
      changes: { before: beforeData },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200,
      // status_code: 200
    });

    return {
      success: true,
      message: 'Patient deleted successfully'
    };
  } catch (error) {
    // Audit log failure
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'DELETE',
      resource_type: 'patients',
      resource_id: patientId,
      status_code: 500,
      error_message: error.message,
      // status_code: 500,
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path
    });

    throw error;
  }
}

module.exports = {
  getPatients,
  getPatientById,
  getPatientDetails,
  createPatient,
  updatePatient,
  deletePatient
};
