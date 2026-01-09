/**
 * Visit Service
 * 
 * Business logic for visit management with RBAC and audit logging.
 * Enforces dietitian filtering and status tracking.
 */

const db = require('../../../models');
const Visit = db.Visit;
const VisitMeasurement = db.VisitMeasurement;
const Patient = db.Patient;
const User = db.User;
const Role = db.Role;
const auditService = require('./audit.service');
const { Op } = db.Sequelize;

/**
 * Get all visits with filtering and pagination
 * 
 * @param {Object} user - Authenticated user object
 * @param {Object} filters - Filter criteria
 * @param {string} filters.search - Search by patient name
 * @param {string} filters.patient_id - Filter by patient
 * @param {string} filters.dietitian_id - Filter by dietitian
 * @param {string} filters.status - Filter by status
 * @param {string} filters.start_date - Filter visits after this date
 * @param {string} filters.end_date - Filter visits before this date
 * @param {number} filters.page - Page number (default 1)
 * @param {number} filters.limit - Items per page (default 20)
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Visits, total count, and pagination info
 */
async function getVisits(user, filters = {}, requestMetadata = {}) {
  try {
    const whereClause = {};

    // RBAC: Dietitians can only see visits where they're assigned OR their assigned patients' visits
    if (user.role.name === 'DIETITIAN') {
      // Get patients assigned to this dietitian
      const assignedPatients = await Patient.findAll({
        where: { assigned_dietitian_id: user.id, is_active: true },
        attributes: ['id']
      });
      const patientIds = assignedPatients.map(p => p.id);

      // Can see visits where they're the dietitian OR visits for their assigned patients
      whereClause[Op.or] = [
        { dietitian_id: user.id },
        { patient_id: { [Op.in]: patientIds } }
      ];
    }

    // Apply additional filters
    if (filters.patient_id) {
      whereClause.patient_id = filters.patient_id;
    }

    if (filters.dietitian_id) {
      whereClause.dietitian_id = filters.dietitian_id;
    }

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.start_date) {
      whereClause.visit_date = whereClause.visit_date || {};
      whereClause.visit_date[Op.gte] = new Date(filters.start_date);
    }

    if (filters.end_date) {
      whereClause.visit_date = whereClause.visit_date || {};
      whereClause.visit_date[Op.lte] = new Date(filters.end_date);
    }

    // Search by patient name
    if (filters.search) {
      const patients = await Patient.findAll({
        where: {
          [Op.or]: [
            { first_name: { [Op.like]: `%${filters.search}%` } },
            { last_name: { [Op.like]: `%${filters.search}%` } }
          ]
        },
        attributes: ['id']
      });
      const searchPatientIds = patients.map(p => p.id);
      
      if (searchPatientIds.length > 0) {
        if (whereClause.patient_id) {
          // If already filtering by patient_id, intersect
          whereClause.patient_id = searchPatientIds.includes(whereClause.patient_id) 
            ? whereClause.patient_id 
            : null;
        } else {
          whereClause.patient_id = { [Op.in]: searchPatientIds };
        }
      } else {
        // No patients match search, return empty
        whereClause.patient_id = null;
      }
    }

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await Visit.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['visit_date', 'DESC']],
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'dietitian',
          attributes: ['id', 'username', 'first_name', 'last_name']
        },
        {
          model: VisitMeasurement,
          as: 'measurements',
          required: false
        }
      ]
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'visits',
      resource_id: null,
      details: { filter_count: count, page, limit },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    return {
      visits: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  } catch (error) {
    console.error('Error in getVisits:', error);
    throw error;
  }
}

/**
 * Get visit by ID
 * 
 * @param {Object} user - Authenticated user object
 * @param {string} visitId - Visit UUID
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Visit details with patient, dietitian, and measurements
 */
async function getVisitById(user, visitId, requestMetadata = {}) {
  try {
    console.log('📅 [getVisitById] Fetching visit:', visitId);
    
    const visit = await Visit.findByPk(visitId, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'assigned_dietitian_id']
        },
        {
          model: User,
          as: 'dietitian',
          attributes: ['id', 'username', 'first_name', 'last_name', 'email']
        },
        {
          model: VisitMeasurement,
          as: 'measurements'
        }
      ]
    });

    console.log('📅 [getVisitById] Visit found:', !!visit);

    if (!visit) {
      const error = new Error('Visit not found');
      error.statusCode = 404;
      throw error;
    }

    // RBAC: Check if user is authorized to view this visit
    if (user.role.name === 'DIETITIAN') {
      const isAssignedDietitian = visit.dietitian_id === user.id;
      const isPatientsDietitian = visit.patient.assigned_dietitian_id === user.id;
      
      if (!isAssignedDietitian && !isPatientsDietitian) {
        const error = new Error('Access denied: You can only view visits for your assigned patients');
        error.statusCode = 403;
        throw error;
      }
    }

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'visits',
      resource_id: visitId,
      details: { patient_id: visit.patient_id, status: visit.status },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    console.log('📅 [getVisitById] Returning visit data');
    return visit;
  } catch (error) {
    console.error('❌ [getVisitById] Error:', error.message);
    throw error;
    throw error;
  }
}

/**
 * Create new visit
 * 
 * @param {Object} user - Authenticated user object
 * @param {Object} visitData - Visit data
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Created visit
 */
async function createVisit(user, visitData, requestMetadata = {}) {
  try {
    // Validate patient exists and is active
    const patient = await Patient.findByPk(visitData.patient_id);
    if (!patient || !patient.is_active) {
      const error = new Error('Patient not found or inactive');
      error.statusCode = 400;
      throw error;
    }

    // Validate dietitian exists and is active
    const dietitian = await User.findByPk(visitData.dietitian_id);
    if (!dietitian || !dietitian.is_active) {
      const error = new Error('Dietitian not found or inactive');
      error.statusCode = 400;
      throw error;
    }

    // Validate dietitian role
    const dietitianRole = await Role.findByPk(dietitian.role_id);
    if (dietitianRole.name !== 'DIETITIAN' && dietitianRole.name !== 'ADMIN') {
      const error = new Error('Assigned user must have DIETITIAN or ADMIN role');
      error.statusCode = 400;
      throw error;
    }

    // Create visit
    const visit = await Visit.create({
      patient_id: visitData.patient_id,
      dietitian_id: visitData.dietitian_id,
      visit_date: visitData.visit_date,
      visit_type: visitData.visit_type || 'Follow-up',
      status: visitData.status || 'SCHEDULED',
      duration_minutes: visitData.duration_minutes,
      chief_complaint: visitData.chief_complaint,
      assessment: visitData.assessment,
      recommendations: visitData.recommendations,
      notes: visitData.notes,
      next_visit_date: visitData.next_visit_date
    });

    // Fetch with associations
    const createdVisit = await Visit.findByPk(visit.id, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'dietitian',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ]
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      resource_type: 'visits',
      resource_id: visit.id,
      details: {
        patient_id: visit.patient_id,
        dietitian_id: visit.dietitian_id,
        visit_date: visit.visit_date,
        status: visit.status
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    return createdVisit;
  } catch (error) {
    console.error('Error in createVisit:', error);
    throw error;
  }
}

/**
 * Update visit
 * 
 * @param {Object} user - Authenticated user object
 * @param {string} visitId - Visit UUID
 * @param {Object} updateData - Update data
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Updated visit
 */
async function updateVisit(user, visitId, updateData, requestMetadata = {}) {
  try {
    const visit = await Visit.findByPk(visitId);

    if (!visit) {
      const error = new Error('Visit not found');
      error.statusCode = 404;
      throw error;
    }

    // RBAC: Only assigned dietitian or admin can update
    if (user.role.name === 'DIETITIAN' && visit.dietitian_id !== user.id) {
      const error = new Error('Access denied: You can only update your own visits');
      error.statusCode = 403;
      throw error;
    }

    // Track changes for audit
    const changes = {};
    const allowedFields = [
      'visit_date', 'visit_type', 'status', 'duration_minutes',
      'chief_complaint', 'assessment', 'recommendations', 'notes', 'next_visit_date'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined && updateData[field] !== visit[field]) {
        changes[field] = { old: visit[field], new: updateData[field] };
        visit[field] = updateData[field];
      }
    });

    await visit.save();

    // Fetch with associations
    const updatedVisit = await Visit.findByPk(visitId, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'dietitian',
          attributes: ['id', 'username', 'first_name', 'last_name']
        },
        {
          model: VisitMeasurement,
          as: 'measurements'
        }
      ]
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      resource_type: 'visits',
      resource_id: visitId,
      details: { changes },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    return updatedVisit;
  } catch (error) {
    console.error('Error in updateVisit:', error);
    throw error;
  }
}

/**
 * Delete visit
 * 
 * @param {Object} user - Authenticated user object
 * @param {string} visitId - Visit UUID
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<void>}
 */
async function deleteVisit(user, visitId, requestMetadata = {}) {
  try {
    const visit = await Visit.findByPk(visitId);

    if (!visit) {
      const error = new Error('Visit not found');
      error.statusCode = 404;
      throw error;
    }

    // RBAC: Only admin or assigned dietitian can delete
    if (user.role.name === 'DIETITIAN' && visit.dietitian_id !== user.id) {
      const error = new Error('Access denied: You can only delete your own visits');
      error.statusCode = 403;
      throw error;
    }

    // Delete associated measurements first
    await VisitMeasurement.destroy({
      where: { visit_id: visitId }
    });

    // Delete visit
    await visit.destroy();

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'DELETE',
      resource_type: 'visits',
      resource_id: visitId,
      details: {
        patient_id: visit.patient_id,
        dietitian_id: visit.dietitian_id,
        visit_date: visit.visit_date
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });
  } catch (error) {
    console.error('Error in deleteVisit:', error);
    throw error;
  }
}

/**
 * Add measurements to visit
 * 
 * @param {Object} user - Authenticated user object
 * @param {string} visitId - Visit UUID
 * @param {Object} measurementData - Measurement data
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Created measurement
 */
async function addMeasurements(user, visitId, measurementData, requestMetadata = {}) {
  try {
    const visit = await Visit.findByPk(visitId);

    if (!visit) {
      const error = new Error('Visit not found');
      error.statusCode = 404;
      throw error;
    }

    // RBAC: Only assigned dietitian can add measurements
    if (user.role.name === 'DIETITIAN' && visit.dietitian_id !== user.id) {
      const error = new Error('Access denied: You can only add measurements to your own visits');
      error.statusCode = 403;
      throw error;
    }

    // Auto-calculate BMI if weight and height provided
    let bmi = measurementData.bmi;
    if (measurementData.weight_kg && measurementData.height_cm && !bmi) {
      const heightInMeters = measurementData.height_cm / 100;
      bmi = (measurementData.weight_kg / (heightInMeters * heightInMeters)).toFixed(2);
    }

    // Always create new measurement record for history tracking (Beta feature)
    // This allows tracking measurement changes over time for trend analysis
    const measurement = await VisitMeasurement.create({
      visit_id: visitId,
      weight_kg: measurementData.weight_kg || null,
      height_cm: measurementData.height_cm || null,
      bmi: bmi || null,
      blood_pressure_systolic: measurementData.blood_pressure_systolic || null,
      blood_pressure_diastolic: measurementData.blood_pressure_diastolic || null,
      waist_circumference_cm: measurementData.waist_circumference_cm || null,
      body_fat_percentage: measurementData.body_fat_percentage || null,
      muscle_mass_percentage: measurementData.muscle_mass_percentage || null,
      notes: measurementData.notes || null
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      resource_type: 'visit_measurements',
      resource_id: measurement.id,
      details: {
        visit_id: visitId,
        bmi: bmi,
        weight_kg: measurementData.weight_kg,
        height_cm: measurementData.height_cm,
        timestamp: new Date().toISOString()
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    return measurement;
  } catch (error) {
    console.error('Error in addMeasurements:', error);
    throw error;
  }
}

module.exports = {
  getVisits,
  getVisitById,
  createVisit,
  updateVisit,
  deleteVisit,
  addMeasurements
};
