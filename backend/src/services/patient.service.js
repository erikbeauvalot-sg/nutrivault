/**
 * Patient Management Service
 *
 * Business logic for patient management operations
 */

const db = require('../../../models');
const { AppError } = require('../middleware/errorHandler');
const { logCrudEvent } = require('./audit.service');
const { Op } = require('sequelize');
const QueryBuilder = require('../utils/queryBuilder');
const { PATIENTS_CONFIG } = require('../config/queryConfigs');

/**
 * Get all patients with filtering and pagination
 * Dietitians can only see their assigned patients
 */
async function getPatients(filters = {}, requestingUser) {
  // Use QueryBuilder for advanced filtering
  const queryBuilder = new QueryBuilder(PATIENTS_CONFIG);
  const { where, pagination, sort } = queryBuilder.build(filters);

  // Apply RBAC: Dietitians can only see their assigned patients
  if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
    where.assigned_dietitian_id = requestingUser.id;
  } else if (filters.assigned_dietitian_id && !where.assigned_dietitian_id) {
    // Admins can filter by specific dietitian (if not already filtered by QueryBuilder)
    where.assigned_dietitian_id = filters.assigned_dietitian_id;
  }

  // Handle legacy age filtering (age_min/age_max) with date calculations
  // This is backward compatible with existing API
  const { age_min, age_max } = filters;
  if (age_min || age_max) {
    const today = new Date();
    if (age_max) {
      const minBirthDate = new Date(today.getFullYear() - age_max - 1, today.getMonth(), today.getDate());
      if (!where.date_of_birth) {
        where.date_of_birth = {};
      }
      if (typeof where.date_of_birth === 'object') {
        where.date_of_birth[Op.gte] = minBirthDate;
      }
    }
    if (age_min) {
      const maxBirthDate = new Date(today.getFullYear() - age_min, today.getMonth(), today.getDate());
      if (!where.date_of_birth) {
        where.date_of_birth = {};
      }
      if (typeof where.date_of_birth === 'object') {
        where.date_of_birth[Op.lte] = maxBirthDate;
      }
    }
  }

  const { count, rows } = await db.Patient.findAndCountAll({
    where,
    include: [
      {
        model: db.User,
        as: 'assignedDietitian',
        attributes: ['id', 'username', 'first_name', 'last_name', 'email']
      }
    ],
    limit: pagination.limit,
    offset: pagination.offset,
    order: sort
  });

  return {
    patients: rows,
    total: count,
    limit: pagination.limit,
    offset: pagination.offset
  };
}

/**
 * Get patient by ID
 * Checks if dietitian is assigned to this patient
 */
async function getPatientById(patientId, requestingUser) {
  const patient = await db.Patient.findByPk(patientId, {
    include: [
      {
        model: db.User,
        as: 'assignedDietitian',
        attributes: ['id', 'username', 'first_name', 'last_name', 'email']
      },
      {
        model: db.User,
        as: 'creator',
        attributes: ['id', 'username', 'first_name', 'last_name']
      }
    ]
  });

  if (!patient) {
    throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
  }

  // Check if dietitian is assigned to this patient
  if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
    if (patient.assigned_dietitian_id !== requestingUser.id) {
      throw new AppError(
        'Access denied. You can only view your assigned patients',
        403,
        'NOT_ASSIGNED_PATIENT'
      );
    }
  }

  return patient;
}

/**
 * Create new patient
 */
async function createPatient(patientData, createdBy) {
  const {
    first_name,
    last_name,
    date_of_birth,
    gender,
    email,
    phone,
    address,
    city,
    postal_code,
    country,
    emergency_contact_name,
    emergency_contact_phone,
    medical_notes,
    dietary_preferences,
    allergies,
    assigned_dietitian_id
  } = patientData;

  // Validate required fields
  if (!first_name || !last_name || !date_of_birth) {
    throw new AppError(
      'First name, last name, and date of birth are required',
      400,
      'VALIDATION_ERROR'
    );
  }

  // Check if assigned dietitian exists
  if (assigned_dietitian_id) {
    const dietitian = await db.User.findByPk(assigned_dietitian_id);
    if (!dietitian) {
      throw new AppError('Assigned dietitian not found', 404, 'DIETITIAN_NOT_FOUND');
    }
  }

  // Create patient
  const patient = await db.Patient.create({
    first_name,
    last_name,
    date_of_birth,
    gender,
    email,
    phone,
    address,
    city,
    postal_code,
    country,
    emergency_contact_name,
    emergency_contact_phone,
    medical_notes,
    dietary_preferences,
    allergies,
    assigned_dietitian_id,
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy
  });

  // Log creation
  await logCrudEvent({
    user_id: createdBy,
    action: 'CREATE',
    resource_type: 'patients',
    resource_id: patient.id,
    changes: { created: true },
    status: 'SUCCESS'
  });

  // Reload with associations
  await patient.reload({
    include: [{
      model: db.User,
      as: 'assignedDietitian',
      attributes: ['id', 'username', 'first_name', 'last_name', 'email']
    }]
  });

  return patient;
}

/**
 * Update patient
 */
async function updatePatient(patientId, updates, updatedBy, requestingUser) {
  const patient = await db.Patient.findByPk(patientId);

  if (!patient) {
    throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
  }

  // Check if dietitian is assigned to this patient
  if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
    if (patient.assigned_dietitian_id !== requestingUser.id) {
      throw new AppError(
        'Access denied. You can only update your assigned patients',
        403,
        'NOT_ASSIGNED_PATIENT'
      );
    }
  }

  // Fields that can be updated
  const allowedUpdates = [
    'first_name',
    'last_name',
    'date_of_birth',
    'gender',
    'email',
    'phone',
    'address',
    'city',
    'postal_code',
    'country',
    'emergency_contact_name',
    'emergency_contact_phone',
    'medical_notes',
    'dietary_preferences',
    'allergies',
    'assigned_dietitian_id'
  ];

  // Filter updates to only allowed fields
  const filteredUpdates = {};
  Object.keys(updates).forEach(key => {
    if (allowedUpdates.includes(key) && updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  });

  // Track changes for audit log
  const changes = {};
  Object.keys(filteredUpdates).forEach(key => {
    if (patient[key] !== filteredUpdates[key]) {
      changes[key] = {
        old: patient[key],
        new: filteredUpdates[key]
      };
    }
  });

  // Update patient
  await patient.update({
    ...filteredUpdates,
    updated_by: updatedBy
  });

  // Log the update
  await logCrudEvent({
    user_id: updatedBy,
    action: 'UPDATE',
    resource_type: 'patients',
    resource_id: patientId,
    changes: changes,
    status: 'SUCCESS'
  });

  // Reload with associations
  await patient.reload({
    include: [{
      model: db.User,
      as: 'assignedDietitian',
      attributes: ['id', 'username', 'first_name', 'last_name', 'email']
    }]
  });

  return patient;
}

/**
 * Delete patient (soft delete by deactivating)
 */
async function deletePatient(patientId, deletedBy, requestingUser) {
  const patient = await db.Patient.findByPk(patientId);

  if (!patient) {
    throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
  }

  // Check if dietitian is assigned to this patient
  if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
    if (patient.assigned_dietitian_id !== requestingUser.id) {
      throw new AppError(
        'Access denied. You can only delete your assigned patients',
        403,
        'NOT_ASSIGNED_PATIENT'
      );
    }
  }

  // Deactivate instead of hard delete
  await patient.update({
    is_active: false,
    updated_by: deletedBy
  });

  // Log the deletion
  await logCrudEvent({
    user_id: deletedBy,
    action: 'DELETE',
    resource_type: 'patients',
    resource_id: patientId,
    status: 'SUCCESS'
  });

  return { message: 'Patient deactivated successfully' };
}

/**
 * Activate patient
 */
async function activatePatient(patientId, activatedBy, requestingUser) {
  const patient = await db.Patient.findByPk(patientId);

  if (!patient) {
    throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
  }

  // Check if dietitian is assigned to this patient
  if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
    if (patient.assigned_dietitian_id !== requestingUser.id) {
      throw new AppError(
        'Access denied. You can only activate your assigned patients',
        403,
        'NOT_ASSIGNED_PATIENT'
      );
    }
  }

  if (patient.is_active) {
    throw new AppError('Patient is already active', 400, 'PATIENT_ALREADY_ACTIVE');
  }

  await patient.update({
    is_active: true,
    updated_by: activatedBy
  });

  // Log activation
  await logCrudEvent({
    user_id: activatedBy,
    action: 'UPDATE',
    resource_type: 'patients',
    resource_id: patientId,
    changes: { is_active: { old: false, new: true } },
    status: 'SUCCESS'
  });

  return { message: 'Patient activated successfully' };
}

/**
 * Deactivate patient
 */
async function deactivatePatient(patientId, deactivatedBy, requestingUser) {
  const patient = await db.Patient.findByPk(patientId);

  if (!patient) {
    throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
  }

  // Check if dietitian is assigned to this patient
  if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
    if (patient.assigned_dietitian_id !== requestingUser.id) {
      throw new AppError(
        'Access denied. You can only deactivate your assigned patients',
        403,
        'NOT_ASSIGNED_PATIENT'
      );
    }
  }

  if (!patient.is_active) {
    throw new AppError('Patient is already inactive', 400, 'PATIENT_ALREADY_INACTIVE');
  }

  await patient.update({
    is_active: false,
    updated_by: deactivatedBy
  });

  // Log deactivation
  await logCrudEvent({
    user_id: deactivatedBy,
    action: 'UPDATE',
    resource_type: 'patients',
    resource_id: patientId,
    changes: { is_active: { old: true, new: false } },
    status: 'SUCCESS'
  });

  return { message: 'Patient deactivated successfully' };
}

/**
 * Get patient statistics
 */
async function getPatientStats(requestingUser) {
  let where = {};

  // If user is a dietitian, only count their assigned patients
  if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
    where.assigned_dietitian_id = requestingUser.id;
  }

  const totalPatients = await db.Patient.count({ where });
  const activePatients = await db.Patient.count({
    where: { ...where, is_active: true }
  });
  const inactivePatients = await db.Patient.count({
    where: { ...where, is_active: false }
  });

  // Patients by assigned dietitian (admins only)
  let patientsByDietitian = [];
  if (!requestingUser.role || requestingUser.role.name !== 'DIETITIAN') {
    patientsByDietitian = await db.Patient.findAll({
      attributes: [
        'assigned_dietitian_id',
        [db.sequelize.fn('COUNT', db.sequelize.col('Patient.id')), 'count']
      ],
      include: [{
        model: db.User,
        as: 'assignedDietitian',
        attributes: ['username', 'first_name', 'last_name']
      }],
      group: ['assigned_dietitian_id', 'assignedDietitian.id', 'assignedDietitian.username', 'assignedDietitian.first_name', 'assignedDietitian.last_name'],
      where: { assigned_dietitian_id: { [Op.not]: null } }
    });
  }

  return {
    total: totalPatients,
    active: activePatients,
    inactive: inactivePatients,
    by_dietitian: patientsByDietitian.map(item => ({
      dietitian: item.assignedDietitian ? {
        id: item.assigned_dietitian_id,
        name: `${item.assignedDietitian.first_name} ${item.assignedDietitian.last_name}`,
        username: item.assignedDietitian.username
      } : null,
      count: parseInt(item.get('count'))
    }))
  };
}

module.exports = {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  activatePatient,
  deactivatePatient,
  getPatientStats
};
