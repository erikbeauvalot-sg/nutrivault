/**
 * Visit Management Service
 *
 * Business logic for visit management operations
 */

const db = require('../../models');
const { AppError } = require('../middleware/errorHandler');
const { logCrudEvent } = require('./audit.service');
const { Op } = require('sequelize');
const QueryBuilder = require('../utils/queryBuilder');
const { VISITS_CONFIG } = require('../config/queryConfigs');
const cacheInvalidation = require('./cache-invalidation.service');

/**
 * Check if user has access to patient
 */
async function checkPatientAccess(patientId, user) {
  const patient = await db.Patient.findByPk(patientId);

  if (!patient) {
    throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
  }

  // Dietitians can only access their assigned patients
  if (user.role && user.role.name === 'DIETITIAN') {
    if (patient.assigned_dietitian_id !== user.id) {
      throw new AppError(
        'Access denied. You can only manage visits for your assigned patients',
        403,
        'NOT_ASSIGNED_PATIENT'
      );
    }
  }

  return patient;
}

/**
 * Get all visits with filtering and pagination
 * Dietitians can only see visits for their assigned patients
 * Supports search across chief_complaint, assessment, recommendations
 */
async function getVisits(filters = {}, requestingUser) {
  // Use QueryBuilder for advanced filtering and search
  const queryBuilder = new QueryBuilder(VISITS_CONFIG);
  const { where, pagination, sort } = queryBuilder.build(filters);

  // Verify patient access if filtering by specific patient
  if (filters.patient_id) {
    await checkPatientAccess(filters.patient_id, requestingUser);
  }

  // Apply RBAC: Dietitians can only see their own visits
  if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
    if (filters.dietitian_id && filters.dietitian_id !== requestingUser.id) {
      throw new AppError(
        'Access denied. You can only view your own visits',
        403,
        'ACCESS_DENIED'
      );
    }
    // Force dietitian filter for dietitian users
    where.dietitian_id = requestingUser.id;
  } else if (filters.dietitian_id && !where.dietitian_id) {
    // Admins can filter by specific dietitian (if not already set by QueryBuilder)
    where.dietitian_id = filters.dietitian_id;
  }

  // Handle legacy from_date/to_date parameters (backward compatibility)
  const { from_date, to_date } = filters;
  if (from_date || to_date) {
    if (!where.visit_date) {
      where.visit_date = {};
    }
    if (from_date) {
      if (typeof where.visit_date === 'object') {
        where.visit_date[Op.gte] = new Date(from_date);
      }
    }
    if (to_date) {
      if (typeof where.visit_date === 'object') {
        where.visit_date[Op.lte] = new Date(to_date);
      }
    }
  }

  const { count, rows } = await db.Visit.findAndCountAll({
    where,
    include: [
      {
        model: db.Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name', 'date_of_birth']
      },
      {
        model: db.User,
        as: 'dietitian',
        attributes: ['id', 'username', 'first_name', 'last_name']
      }
    ],
    limit: pagination.limit,
    offset: pagination.offset,
    order: sort
  });

  return {
    visits: rows,
    total: count,
    limit: pagination.limit,
    offset: pagination.offset
  };
}

/**
 * Get visit by ID
 */
async function getVisitById(visitId, requestingUser) {
  const visit = await db.Visit.findByPk(visitId, {
    include: [
      {
        model: db.Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name', 'date_of_birth', 'assigned_dietitian_id']
      },
      {
        model: db.User,
        as: 'dietitian',
        attributes: ['id', 'username', 'first_name', 'last_name']
      }
    ]
  });

  if (!visit) {
    throw new AppError('Visit not found', 404, 'VISIT_NOT_FOUND');
  }

  // Check access for dietitians
  if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
    // Dietitians can only view visits for their assigned patients
    if (visit.patient.assigned_dietitian_id !== requestingUser.id) {
      throw new AppError(
        'Access denied. You can only view visits for your assigned patients',
        403,
        'NOT_ASSIGNED_PATIENT'
      );
    }
  }

  return visit;
}

/**
 * Create new visit
 */
async function createVisit(visitData, createdBy, requestingUser) {
  const {
    patient_id,
    dietitian_id,
    visit_date,
    duration_minutes,
    visit_type,
    status,
    chief_complaint,
    assessment,
    recommendations,
    next_visit_date,
    private_notes
  } = visitData;

  // Validate required fields
  if (!patient_id || !visit_date || !duration_minutes) {
    throw new AppError(
      'Patient ID, visit date, and duration are required',
      400,
      'VALIDATION_ERROR'
    );
  }

  // Check patient access
  await checkPatientAccess(patient_id, requestingUser);

  // Set dietitian_id - if not provided, use requesting user if they're a dietitian
  let finalDietitianId = dietitian_id;
  if (!finalDietitianId) {
    if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
      finalDietitianId = requestingUser.id;
    } else {
      throw new AppError(
        'Dietitian ID is required',
        400,
        'VALIDATION_ERROR'
      );
    }
  }

  // Verify dietitian exists
  const dietitian = await db.User.findByPk(finalDietitianId);
  if (!dietitian) {
    throw new AppError('Dietitian not found', 404, 'DIETITIAN_NOT_FOUND');
  }

  // Create visit
  const visit = await db.Visit.create({
    patient_id,
    dietitian_id: finalDietitianId,
    visit_date: new Date(visit_date),
    duration_minutes,
    visit_type,
    status: status || 'SCHEDULED',
    chief_complaint,
    assessment,
    recommendations,
    next_visit_date,
    private_notes,
    created_by: createdBy,
    updated_by: createdBy
  });

  // Log creation
  await logCrudEvent({
    user_id: createdBy,
    action: 'CREATE',
    resource_type: 'visits',
    resource_id: visit.id,
    changes: { created: true },
    status: 'SUCCESS'
  });

  // Reload with associations
  await visit.reload({
    include: [
      {
        model: db.Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name', 'date_of_birth']
      },
      {
        model: db.User,
        as: 'dietitian',
        attributes: ['id', 'username', 'first_name', 'last_name']
      }
    ]
  });

  // Invalidate cache
  cacheInvalidation.invalidateVisitCache(visit.id, visit.patient_id);

  return visit;
}

/**
 * Update visit
 */
async function updateVisit(visitId, updates, updatedBy, requestingUser) {
  const visit = await db.Visit.findByPk(visitId, {
    include: [{
      model: db.Patient,
      as: 'patient',
      attributes: ['id', 'assigned_dietitian_id']
    }]
  });

  if (!visit) {
    throw new AppError('Visit not found', 404, 'VISIT_NOT_FOUND');
  }

  // Check access for dietitians
  if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
    if (visit.patient.assigned_dietitian_id !== requestingUser.id) {
      throw new AppError(
        'Access denied. You can only update visits for your assigned patients',
        403,
        'NOT_ASSIGNED_PATIENT'
      );
    }
  }

  // Fields that can be updated
  const allowedUpdates = [
    'visit_date',
    'duration_minutes',
    'visit_type',
    'status',
    'chief_complaint',
    'assessment',
    'recommendations',
    'next_visit_date',
    'private_notes',
    'dietitian_id'
  ];

  // Filter updates to only allowed fields
  const filteredUpdates = {};
  Object.keys(updates).forEach(key => {
    if (allowedUpdates.includes(key) && updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  });

  // Convert date strings to Date objects
  if (filteredUpdates.visit_date) {
    filteredUpdates.visit_date = new Date(filteredUpdates.visit_date);
  }

  // Track changes for audit log
  const changes = {};
  Object.keys(filteredUpdates).forEach(key => {
    if (visit[key] !== filteredUpdates[key]) {
      changes[key] = {
        old: visit[key],
        new: filteredUpdates[key]
      };
    }
  });

  // Update visit
  await visit.update({
    ...filteredUpdates,
    updated_by: updatedBy
  });

  // Log the update
  await logCrudEvent({
    user_id: updatedBy,
    action: 'UPDATE',
    resource_type: 'visits',
    resource_id: visitId,
    changes: changes,
    status: 'SUCCESS'
  });

  // Reload with associations
  await visit.reload({
    include: [
      {
        model: db.Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name', 'date_of_birth']
      },
      {
        model: db.User,
        as: 'dietitian',
        attributes: ['id', 'username', 'first_name', 'last_name']
      }
    ]
  });

  // Invalidate cache
  cacheInvalidation.invalidateVisitCache(visitId, visit.patient_id);

  return visit;
}

/**
 * Delete visit
 */
async function deleteVisit(visitId, deletedBy, requestingUser) {
  const visit = await db.Visit.findByPk(visitId, {
    include: [{
      model: db.Patient,
      as: 'patient',
      attributes: ['id', 'assigned_dietitian_id']
    }]
  });

  if (!visit) {
    throw new AppError('Visit not found', 404, 'VISIT_NOT_FOUND');
  }

  // Check access for dietitians
  if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
    if (visit.patient.assigned_dietitian_id !== requestingUser.id) {
      throw new AppError(
        'Access denied. You can only delete visits for your assigned patients',
        403,
        'NOT_ASSIGNED_PATIENT'
      );
    }
  }

  // Hard delete (visits don't have soft delete)
  await visit.destroy();

  // Log the deletion
  await logCrudEvent({
    user_id: deletedBy,
    action: 'DELETE',
    resource_type: 'visits',
    resource_id: visitId,
    status: 'SUCCESS'
  });

  // Invalidate cache
  cacheInvalidation.invalidateVisitCache(visitId, visit.patient_id);

  return { message: 'Visit deleted successfully' };
}

/**
 * Get visit statistics
 */
async function getVisitStats(filters = {}, requestingUser) {
  let where = {};

  const { from_date, to_date } = filters;

  if (from_date) {
    where.visit_date = { [Op.gte]: new Date(from_date) };
  }

  if (to_date) {
    where.visit_date = { ...where.visit_date, [Op.lte]: new Date(to_date) };
  }

  // If user is a dietitian, only count their visits
  if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
    where.dietitian_id = requestingUser.id;
  }

  const totalVisits = await db.Visit.count({ where });

  // Visits by status
  const visitsByStatus = await db.Visit.findAll({
    attributes: [
      'status',
      [db.sequelize.fn('COUNT', db.sequelize.col('Visit.id')), 'count']
    ],
    where,
    group: ['status']
  });

  // Visits by type
  const visitsByType = await db.Visit.findAll({
    attributes: [
      'visit_type',
      [db.sequelize.fn('COUNT', db.sequelize.col('Visit.id')), 'count']
    ],
    where,
    group: ['visit_type']
  });

  // Visits by dietitian (admins only)
  let visitsByDietitian = [];
  if (!requestingUser.role || requestingUser.role.name !== 'DIETITIAN') {
    visitsByDietitian = await db.Visit.findAll({
      attributes: [
        'dietitian_id',
        [db.sequelize.fn('COUNT', db.sequelize.col('Visit.id')), 'count']
      ],
      include: [{
        model: db.User,
        as: 'dietitian',
        attributes: ['username', 'first_name', 'last_name']
      }],
      where,
      group: ['dietitian_id', 'dietitian.id', 'dietitian.username', 'dietitian.first_name', 'dietitian.last_name']
    });
  }

  return {
    total: totalVisits,
    by_status: visitsByStatus.map(item => ({
      status: item.status,
      count: parseInt(item.get('count'))
    })),
    by_type: visitsByType.map(item => ({
      type: item.visit_type,
      count: parseInt(item.get('count'))
    })),
    by_dietitian: visitsByDietitian.map(item => ({
      dietitian: {
        id: item.dietitian_id,
        name: `${item.dietitian.first_name} ${item.dietitian.last_name}`,
        username: item.dietitian.username
      },
      count: parseInt(item.get('count'))
    }))
  };
}

module.exports = {
  getVisits,
  getVisitById,
  createVisit,
  updateVisit,
  deleteVisit,
  getVisitStats
};
