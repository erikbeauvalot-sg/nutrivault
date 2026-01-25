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
const billingService = require('./billing.service');
const emailService = require('./email.service');
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

    // RBAC: In POC system, all authenticated users can see all visits
    // (Original restrictive logic commented out for POC purposes)
    // if (user && user.role && user.role.name === 'DIETITIAN') {
    //   // Get patients assigned to this dietitian
    //   const assignedPatients = await Patient.findAll({
    //     where: { assigned_dietitian_id: user.id, is_active: true },
    //     attributes: ['id']
    //   });
    //   const patientIds = assignedPatients.map(p => p.id);

    //   // Can see visits where they're the dietitian OR visits for their assigned patients
    //   whereClause[Op.or] = [
    //     { dietitian_id: user.id },
    //     { patient_id: { [Op.in]: patientIds } }
    //   ];
    // }

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

    // Auto-create invoice when visit is created as COMPLETED
    let createdInvoice = null;
    if (visit.status === 'COMPLETED') {
      try {
        // Check if invoice already exists for this visit (shouldn't happen for new visits)
        const existingInvoice = await db.Billing.findOne({
          where: { visit_id: visit.id, is_active: true }
        });

        if (!existingInvoice) {
          // Create invoice automatically
          const invoiceData = {
            patient_id: visit.patient_id,
            visit_id: visit.id,
            service_description: `Consultation - ${visit.visit_type || 'General Visit'}`,
            amount_total: calculateVisitAmount(visit), // Helper function for pricing
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
          };

          createdInvoice = await billingService.createInvoice(invoiceData, user, {
            ...requestMetadata,
            note: 'Auto-generated invoice for immediately completed visit'
          });

          console.log(`✅ Auto-created invoice for immediately completed visit ${visit.id}: ${createdInvoice.id}`);
        }
      } catch (billingError) {
        console.error('❌ Failed to auto-create invoice for new completed visit:', billingError);
        // Don't fail the visit creation if billing creation fails
      }
    }

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

    return {
      ...createdVisit.toJSON(),
      created_invoice: createdInvoice ? {
        id: createdInvoice.id,
        invoice_number: createdInvoice.invoice_number
      } : null
    };
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

    // RBAC: Only assigned dietitian, admin, or assistant can update
    if (user.role.name === 'DIETITIAN' && visit.dietitian_id !== user.id) {
      const error = new Error('Access denied: You can only update your own visits');
      error.statusCode = 403;
      throw error;
    }

    // Validate new dietitian if being changed
    if (updateData.dietitian_id && updateData.dietitian_id !== visit.dietitian_id) {
      const newDietitian = await User.findByPk(updateData.dietitian_id);
      if (!newDietitian || !newDietitian.is_active) {
        const error = new Error('New dietitian not found or inactive');
        error.statusCode = 400;
        throw error;
      }

      // Validate dietitian role
      const dietitianRole = await Role.findByPk(newDietitian.role_id);
      if (dietitianRole.name !== 'DIETITIAN' && dietitianRole.name !== 'ADMIN') {
        const error = new Error('Assigned user must have DIETITIAN or ADMIN role');
        error.statusCode = 400;
        throw error;
      }
    }

    // Track changes for audit
    const changes = {};
    const allowedFields = [
      'dietitian_id', 'visit_date', 'visit_type', 'status', 'duration_minutes',
      'chief_complaint', 'assessment', 'recommendations', 'notes', 'next_visit_date'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined && updateData[field] !== visit[field]) {
        changes[field] = { old: visit[field], new: updateData[field] };
        visit[field] = updateData[field];
      }
    });

    await visit.save();

    // Auto-create invoice when visit status changes to COMPLETED
    if (changes.status && changes.status.new === 'COMPLETED' && changes.status.old !== 'COMPLETED') {
      try {
        // Check if invoice already exists for this visit
        const existingInvoice = await db.Billing.findOne({
          where: { visit_id: visitId, is_active: true }
        });

        if (!existingInvoice) {
          // Create invoice automatically
          const invoiceData = {
            patient_id: visit.patient_id,
            visit_id: visitId,
            service_description: `Consultation - ${visit.visit_type || 'General Visit'}`,
            amount_total: calculateVisitAmount(visit), // Helper function for pricing
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
          };

          await billingService.createInvoice(invoiceData, user, {
            ...requestMetadata,
            note: 'Auto-generated invoice for completed visit'
          });

          console.log(`✅ Auto-created invoice for completed visit ${visitId}`);
        }
      } catch (billingError) {
        console.error('❌ Failed to auto-create invoice:', billingError);
        // Don't fail the visit update if billing creation fails
        // Log the error but continue
      }
    }

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
 * Finish visit and send invoice (Quick Action)
 * Completes a visit, generates invoice, and sends email in one action
 *
 * @param {Object} user - Authenticated user object
 * @param {string} visitId - Visit UUID
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Updated visit and invoice info
 */
async function finishAndInvoice(user, visitId, requestMetadata = {}) {
  try {
    // Get visit with patient details
    const visit = await Visit.findByPk(visitId, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          where: { is_active: true },
          required: true
        }
      ]
    });

    if (!visit) {
      const error = new Error('Visit not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if visit is already completed
    if (visit.status === 'COMPLETED') {
      const error = new Error('Visit is already completed');
      error.statusCode = 400;
      throw error;
    }

    // Check permissions
    if (!user || !user.role) {
      const error = new Error('Authentication required');
      error.statusCode = 401;
      throw error;
    }

    // Update visit to COMPLETED (this will auto-generate invoice)
    const updatedVisit = await updateVisit(user, visitId, {
      status: 'COMPLETED'
    }, requestMetadata);

    // Wait a moment for invoice creation to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Find the generated invoice
    const invoice = await db.Billing.findOne({
      where: {
        visit_id: visitId,
        is_active: true
      },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    if (!invoice) {
      console.warn('⚠️  No invoice found after completing visit');
      return {
        visit: updatedVisit,
        invoice: null,
        emailSent: false,
        message: 'Visit completed but invoice not found'
      };
    }

    // Check if patient has email
    if (!invoice.patient || !invoice.patient.email) {
      console.warn('⚠️  Patient has no email address');
      return {
        visit: updatedVisit,
        invoice,
        emailSent: false,
        message: 'Visit completed and invoice created, but patient has no email'
      };
    }

    // Send invoice email using billing service (this will log to invoice_emails table)
    console.log(`📧 Sending invoice email for visit ${visitId}`);
    try {
      await billingService.sendInvoiceEmail(invoice.id, user, requestMetadata);

      // Audit log for the complete action
      await auditService.log({
        user_id: user.id,
        username: user.username,
        action: 'FINISH_AND_INVOICE',
        resource_type: 'visits',
        resource_id: visitId,
        changes: {
          action: 'finish_and_invoice',
          visit_status: 'COMPLETED',
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          email_sent: true
        },
        ip_address: requestMetadata.ip,
        user_agent: requestMetadata.userAgent,
        request_method: requestMetadata.method,
        request_path: requestMetadata.path,
        status_code: 200
      });

      return {
        visit: updatedVisit,
        invoice,
        emailSent: true,
        message: 'Visit completed, invoice created and email sent successfully'
      };
    } catch (emailError) {
      console.error('❌ Failed to send invoice email:', emailError);

      // Audit log for failed email
      await auditService.log({
        user_id: user.id,
        username: user.username,
        action: 'FINISH_AND_INVOICE',
        resource_type: 'visits',
        resource_id: visitId,
        changes: {
          action: 'finish_and_invoice',
          visit_status: 'COMPLETED',
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          email_sent: false
        },
        ip_address: requestMetadata.ip,
        user_agent: requestMetadata.userAgent,
        request_method: requestMetadata.method,
        request_path: requestMetadata.path,
        status_code: 500,
        error_message: emailError.message
      });

      return {
        visit: updatedVisit,
        invoice,
        emailSent: false,
        message: 'Visit completed and invoice created, but email failed to send',
        error: emailError.message
      };
    }
  } catch (error) {
    console.error('Error in finishAndInvoice:', error);
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

    // RBAC: Only admin, assistant, or assigned dietitian can delete
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

/**
 * Calculate the amount to charge for a visit based on visit type and duration
 * 
 * @param {Object} visit - Visit object
 * @returns {number} Amount in euros
 */
function calculateVisitAmount(visit) {
  // Base pricing by visit type
  const basePrices = {
    'Initial Consultation': 150,
    'Follow-up': 100,
    'Final Assessment': 120,
    'Nutrition Counseling': 80,
    'Other': 100
  };

  const basePrice = basePrices[visit.visit_type] || basePrices['Other'];
  
  // Adjust based on duration (if longer than 60 minutes, add €50 per additional 30 minutes)
  const duration = visit.duration_minutes || 60;
  if (duration > 60) {
    const extraMinutes = duration - 60;
    const extraHalfHours = Math.ceil(extraMinutes / 30);
    return basePrice + (extraHalfHours * 50);
  }

  return basePrice;
}

/**
 * Update measurement
 *
 * @param {Object} user - Authenticated user object
 * @param {string} visitId - Visit UUID
 * @param {string} measurementId - Measurement UUID
 * @param {Object} measurementData - Measurement update data
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Updated measurement
 */
async function updateMeasurement(user, visitId, measurementId, measurementData, requestMetadata = {}) {
  try {
    const visit = await Visit.findByPk(visitId);

    if (!visit) {
      const error = new Error('Visit not found');
      error.statusCode = 404;
      throw error;
    }

    // RBAC: Only assigned dietitian can update measurements
    if (user.role.name === 'DIETITIAN' && visit.dietitian_id !== user.id) {
      const error = new Error('Access denied: You can only update measurements for your own visits');
      error.statusCode = 403;
      throw error;
    }

    const measurement = await VisitMeasurement.findOne({
      where: {
        id: measurementId,
        visit_id: visitId
      }
    });

    if (!measurement) {
      const error = new Error('Measurement not found');
      error.statusCode = 404;
      throw error;
    }

    // Store old values for audit
    const oldValues = measurement.toJSON();

    // Auto-calculate BMI if weight and height provided
    let bmi = measurementData.bmi;
    if (measurementData.weight_kg && measurementData.height_cm && !bmi) {
      const heightInMeters = measurementData.height_cm / 100;
      bmi = (measurementData.weight_kg / (heightInMeters * heightInMeters)).toFixed(2);
    }

    // Update measurement
    await measurement.update({
      weight_kg: measurementData.weight_kg !== undefined ? measurementData.weight_kg : measurement.weight_kg,
      height_cm: measurementData.height_cm !== undefined ? measurementData.height_cm : measurement.height_cm,
      bmi: bmi !== undefined ? bmi : measurement.bmi,
      blood_pressure_systolic: measurementData.blood_pressure_systolic !== undefined
        ? measurementData.blood_pressure_systolic
        : measurement.blood_pressure_systolic,
      blood_pressure_diastolic: measurementData.blood_pressure_diastolic !== undefined
        ? measurementData.blood_pressure_diastolic
        : measurement.blood_pressure_diastolic,
      waist_circumference_cm: measurementData.waist_circumference_cm !== undefined
        ? measurementData.waist_circumference_cm
        : measurement.waist_circumference_cm,
      body_fat_percentage: measurementData.body_fat_percentage !== undefined
        ? measurementData.body_fat_percentage
        : measurement.body_fat_percentage,
      muscle_mass_percentage: measurementData.muscle_mass_percentage !== undefined
        ? measurementData.muscle_mass_percentage
        : measurement.muscle_mass_percentage,
      notes: measurementData.notes !== undefined ? measurementData.notes : measurement.notes
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      resource_type: 'visit_measurements',
      resource_id: measurementId,
      status: 'SUCCESS',
      severity: 'INFO',
      changes: {
        before: oldValues,
        after: measurement.toJSON()
      },
      ip_address: requestMetadata.ip,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      user_agent: requestMetadata.userAgent
    });

    return measurement;
  } catch (error) {
    console.error('Error in updateMeasurement:', error);
    throw error;
  }
}

/**
 * Delete measurement
 *
 * @param {Object} user - Authenticated user object
 * @param {string} visitId - Visit UUID
 * @param {string} measurementId - Measurement UUID
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<void>}
 */
async function deleteMeasurement(user, visitId, measurementId, requestMetadata = {}) {
  try {
    const visit = await Visit.findByPk(visitId);

    if (!visit) {
      const error = new Error('Visit not found');
      error.statusCode = 404;
      throw error;
    }

    // RBAC: Only assigned dietitian can delete measurements
    if (user.role.name === 'DIETITIAN' && visit.dietitian_id !== user.id) {
      const error = new Error('Access denied: You can only delete measurements from your own visits');
      error.statusCode = 403;
      throw error;
    }

    const measurement = await VisitMeasurement.findOne({
      where: {
        id: measurementId,
        visit_id: visitId
      }
    });

    if (!measurement) {
      const error = new Error('Measurement not found');
      error.statusCode = 404;
      throw error;
    }

    // Store values for audit before deletion
    const deletedValues = measurement.toJSON();

    // Delete measurement
    await measurement.destroy();

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'DELETE',
      resource_type: 'visit_measurements',
      resource_id: measurementId,
      status: 'SUCCESS',
      severity: 'WARNING',
      changes: { before: deletedValues },
      ip_address: requestMetadata.ip,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      user_agent: requestMetadata.userAgent
    });
  } catch (error) {
    console.error('Error in deleteMeasurement:', error);
    throw error;
  }
}

module.exports = {
  getVisits,
  getVisitById,
  createVisit,
  updateVisit,
  deleteVisit,
  addMeasurements,
  updateMeasurement,
  deleteMeasurement,
  finishAndInvoice
};
