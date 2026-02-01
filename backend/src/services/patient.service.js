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

    // RBAC: In POC system, all authenticated users can see all active patients
    // (Original restrictive logic commented out for POC purposes)
    // if (user && user.role && user.role.name === 'DIETITIAN') {
    //   whereClause.assigned_dietitian_id = user.id;
    // }

    // Apply additional filters
    if (filters.search) {
      // Sanitize search input to prevent LIKE injection
      const sanitizedSearch = filters.search.replace(/[%_]/g, '\\$&');
      whereClause[Op.or] = [
        { first_name: { [Op.like]: `%${sanitizedSearch}%` } },
        { last_name: { [Op.like]: `%${sanitizedSearch}%` } },
        { email: { [Op.like]: `%${sanitizedSearch}%` } },
        { phone: { [Op.like]: `%${sanitizedSearch}%` } }
      ];
    }

    if (filters.is_active !== undefined && filters.is_active !== '') {
      // Convert string to boolean for database query
      whereClause.is_active = filters.is_active === 'true' || filters.is_active === true;
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

    // Fetch custom fields marked as "show_in_list" for patients
    const CustomFieldDefinition = db.CustomFieldDefinition;
    const PatientCustomFieldValue = db.PatientCustomFieldValue;

    const listFields = await CustomFieldDefinition.findAll({
      where: {
        show_in_list: true,
        is_active: true
      },
      attributes: ['id', 'field_name', 'field_label', 'field_type'],
      order: [['display_order', 'ASC']],
      limit: 5 // Max 5 custom fields in list view
    });

    // Attach custom field values to each patient
    if (listFields.length > 0) {
      const fieldIds = listFields.map(f => f.id);
      const patientIds = rows.map(p => p.id);

      // Fetch all custom field values for these patients and fields
      const values = await PatientCustomFieldValue.findAll({
        where: {
          patient_id: patientIds,
          field_definition_id: fieldIds
        }
      });

      // Build a map for quick lookup: patientId -> { defId -> valueObject }
      const valueMap = {};
      values.forEach(v => {
        if (!valueMap[v.patient_id]) valueMap[v.patient_id] = {};
        valueMap[v.patient_id][v.field_definition_id] = v;
      });

      // Attach custom fields to each patient
      rows.forEach(patient => {
        patient.dataValues.custom_fields = listFields.map(field => {
          const valueObj = valueMap[patient.id]?.[field.id];
          // Use the model's getValue method to get the correct value based on field type
          const value = valueObj ? valueObj.getValue(field.field_type) : null;

          return {
            definition_id: field.id,
            field_name: field.field_name,
            field_label: field.field_label,
            field_type: field.field_type,
            value: value
          };
        });
      });
    }

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
    // Note: We don't filter by is_active here to allow viewing/editing inactive patients
    const patient = await Patient.findOne({
      where: {
        id: patientId
      },
      attributes: [
        'id', 'first_name', 'last_name', 'email', 'phone',
        'assigned_dietitian_id', 'is_active', 'appointment_reminders_enabled', 'created_at', 'updated_at'
      ],
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

    // RBAC: In POC system, DIETITIANS can access all patients
    // (Original restrictive logic commented out for POC purposes)
    // if (user.role.name === 'DIETITIAN' && patient.assigned_dietitian_id !== user.id) {
    //   const error = new Error('Access denied. You can only access your assigned patients');
    //   error.statusCode = 403;
    //   throw error;
    // }

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
        }
      ]
    });

    if (!patient) {
      const error = new Error('Patient not found');
      error.statusCode = 404;
      throw error;
    }

    // RBAC: In POC system, DIETITIANS can access all patients
    // (Original restrictive logic commented out for POC purposes)
    // if (user.role.name === 'DIETITIAN' && patient.assigned_dietitian_id !== user.id) {
    //   const error = new Error('Access denied. You can only access your assigned patients');
    //   error.statusCode = 403;
    //   throw error;
    // }

    // Fetch visits separately to ensure all visits are included
    const visits = await db.Visit.findAll({
      where: {
        patient_id: patientId
      },
      include: [
        {
          model: db.PatientMeasure,
          as: 'measures',
          required: false
        },
        {
          model: User,
          as: 'dietitian',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ],
      order: [['visit_date', 'ASC']]
    });

    // Add visits to patient object
    patient.dataValues.visits = visits;
    console.log(`Patient ${patientId} has ${visits.length} visits:`, visits.map(v => ({ id: v.id, date: v.visit_date, status: v.status })));

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

      // Only non-admin users are restricted to assigning DIETITIAN role users
      // Admins can assign any active user
      if (user.role.name !== 'ADMIN' && dietitian.role.name !== 'DIETITIAN') {
        const error = new Error('Assigned user must have DIETITIAN role');
        error.statusCode = 400;
        throw error;
      }
    }

    // Extract tags from patient data if present
    const { tags, ...patientFields } = patientData;

    // Create patient
    const patient = await Patient.create(patientFields);

    // Handle tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      const patientTagService = require('./patientTag.service');
      for (const tagName of tags) {
        if (tagName && tagName.trim()) {
          try {
            await patientTagService.addTag(patient.id, tagName.trim(), user, requestMetadata);
          } catch (tagError) {
            console.warn(`Failed to add tag "${tagName}" to patient:`, tagError.message);
            // Continue with other tags, don't fail the entire patient creation
          }
        }
      }
    }

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
    // Handle unique constraint violations
    if (error.name === 'SequelizeUniqueConstraintError' || error.message?.includes('UNIQUE constraint failed')) {
      if (error.message?.includes('email') || error.fields?.email) {
        const duplicateError = new Error('Email already exists for another patient');
        duplicateError.statusCode = 409;
        duplicateError.code = 'EMAIL_ALREADY_EXISTS_PATIENT';

        // Audit log failure
        await auditService.log({
          user_id: user.id,
          username: user.username,
          action: 'CREATE',
          resource_type: 'patients',
          status_code: 409,
          error_message: duplicateError.message,
          ip_address: requestMetadata.ip,
          user_agent: requestMetadata.userAgent,
          request_method: requestMetadata.method,
          request_path: requestMetadata.path
        });

        throw duplicateError;
      }
    }

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
    // Note: We don't filter by is_active here to allow editing inactive patients
    // (e.g., to reactivate them or update their information)
    const patient = await Patient.findOne({
      where: {
        id: patientId
      }
    });

    if (!patient) {
      const error = new Error('Patient not found');
      error.statusCode = 404;
      throw error;
    }

    // RBAC: In POC system, DIETITIANS can update all patients
    // (Original restrictive logic commented out for POC purposes)
    // if (user.role.name === 'DIETITIAN' && patient.assigned_dietitian_id !== user.id) {
    //   const error = new Error('Access denied. You can only update your assigned patients');
    //   error.statusCode = 403;
    //   throw error;
    // }

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

      // Only non-admin users are restricted to assigning DIETITIAN role users
      // Admins can assign any active user
      if (user.role.name !== 'ADMIN' && dietitian.role.name !== 'DIETITIAN') {
        const error = new Error('Assigned user must have DIETITIAN role');
        error.statusCode = 400;
        throw error;
      }
    }

    // Extract tags from update data if present
    const { tags, ...patientFields } = updateData;

    // Capture before state
    const beforeData = patient.toJSON();

    // Update patient
    await patient.update(patientFields);

    // Handle tags if provided
    if (tags !== undefined) {
      const patientTagService = require('./patientTag.service');
      try {
        // Update patient tags (replace all existing tags with new ones)
        await patientTagService.updatePatientTags(patient.id, tags || [], user, requestMetadata);
      } catch (tagError) {
        console.warn('Failed to update patient tags:', tagError.message);
        // Continue with patient update, don't fail the entire operation
      }
    }

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
    // Handle unique constraint violations
    if (error.name === 'SequelizeUniqueConstraintError' || error.message?.includes('UNIQUE constraint failed')) {
      if (error.message?.includes('email') || error.fields?.email) {
        const duplicateError = new Error('Email already exists for another patient');
        duplicateError.statusCode = 409;
        duplicateError.code = 'EMAIL_ALREADY_EXISTS_PATIENT';

        // Audit log failure
        await auditService.log({
          user_id: user.id,
          username: user.username,
          action: 'UPDATE',
          resource_type: 'patients',
          resource_id: patientId,
          status_code: 409,
          error_message: duplicateError.message,
          ip_address: requestMetadata.ip,
          user_agent: requestMetadata.userAgent,
          request_method: requestMetadata.method,
          request_path: requestMetadata.path
        });

        throw duplicateError;
      }
    }

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

    // RBAC: In POC system, DIETITIANS can delete all patients
    // (Original restrictive logic commented out for POC purposes)
    // if (user.role.name === 'DIETITIAN' && patient.assigned_dietitian_id !== user.id) {
    //   const error = new Error('Access denied. You can only delete your assigned patients');
    //   error.statusCode = 403;
    //   throw error;
    // }

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

/**
 * Check if email is available for use
 *
 * @param {string} email - Email to check
 * @param {string} excludeId - Patient ID to exclude from check (for updates)
 * @returns {Promise<boolean>} True if email is available, false if taken
 */
async function checkEmailAvailability(email, excludeId = null) {
  try {
    if (!email) {
      return true; // Empty email is allowed
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    const whereClause = {
      email: normalizedEmail,
      is_active: true
    };

    // Exclude current patient when updating
    if (excludeId) {
      whereClause.id = { [Op.ne]: excludeId };
    }

    const existingPatient = await Patient.findOne({
      where: whereClause
    });

    return !existingPatient; // Available if no existing patient found
  } catch (error) {
    console.error('Error checking email availability:', error);
    throw error;
  }
}

module.exports = {
  getPatients,
  getPatientById,
  getPatientDetails,
  createPatient,
  updatePatient,
  deletePatient,
  checkEmailAvailability
};
