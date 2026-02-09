/**
 * Visit Service
 * 
 * Business logic for visit management with RBAC and audit logging.
 * Enforces dietitian filtering and status tracking.
 */

const db = require('../../../models');
const Visit = db.Visit;
const Patient = db.Patient;
const User = db.User;
const Role = db.Role;
const CustomFieldDefinition = db.CustomFieldDefinition;
const VisitCustomFieldValue = db.VisitCustomFieldValue;
const PatientCustomFieldValue = db.PatientCustomFieldValue;
const CustomFieldCategory = db.CustomFieldCategory;
const auditService = require('./audit.service');
const billingService = require('./billing.service');
const emailService = require('./email.service');
const { Op } = db.Sequelize;
const { getScopedDietitianIds, canAccessVisit, ensurePatientDietitianLink } = require('../helpers/scopeHelper');

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

    // RBAC: Scope visits by dietitian
    // DIETITIAN only sees their own visits; ASSISTANT sees linked dietitians' visits; ADMIN sees all
    const dietitianIds = await getScopedDietitianIds(user);
    if (dietitianIds !== null) {
      if (dietitianIds.length === 0) {
        return { visits: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      }
      whereClause.dietitian_id = { [Op.in]: dietitianIds };
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
        }
      ]
    });

    // Get custom field definitions with show_in_visit_list: true
    const visitListFields = await CustomFieldDefinition.findAll({
      where: {
        is_active: true,
        show_in_visit_list: true
      },
      include: [{
        model: CustomFieldCategory,
        as: 'category',
        where: { is_active: true },
        required: true
      }],
      order: [['display_order', 'ASC']]
    });

    // If there are fields to display in the visit list, get values for all visits
    let visitsWithCustomFields = rows;
    if (visitListFields.length > 0 && rows.length > 0) {
      const visitIds = rows.map(v => v.id);
      const patientIds = rows.map(v => v.patient_id).filter(Boolean);
      const fieldDefinitionIds = visitListFields.map(f => f.id);

      // Separate fields by storage level (patient vs visit)
      const patientLevelFieldIds = visitListFields
        .filter(f => f.category && (f.category.entity_types || ['patient']).includes('patient'))
        .map(f => f.id);
      const visitLevelFieldIds = visitListFields
        .filter(f => f.category && !(f.category.entity_types || ['patient']).includes('patient'))
        .map(f => f.id);

      // Get patient-level values (shared fields)
      const patientFieldValues = patientLevelFieldIds.length > 0 && patientIds.length > 0
        ? await PatientCustomFieldValue.findAll({
            where: {
              patient_id: { [Op.in]: patientIds },
              field_definition_id: { [Op.in]: patientLevelFieldIds }
            },
            include: [{
              model: CustomFieldDefinition,
              as: 'field_definition',
              attributes: ['field_name', 'field_type', 'allow_multiple']
            }]
          })
        : [];

      // Get visit-level values (visit-specific fields)
      const visitFieldValues = visitLevelFieldIds.length > 0
        ? await VisitCustomFieldValue.findAll({
            where: {
              visit_id: { [Op.in]: visitIds },
              field_definition_id: { [Op.in]: visitLevelFieldIds }
            },
            include: [{
              model: CustomFieldDefinition,
              as: 'field_definition',
              attributes: ['field_name', 'field_type', 'allow_multiple']
            }]
          })
        : [];

      // Build maps for quick lookup
      const patientValuesMap = {};
      patientFieldValues.forEach(v => {
        const key = `${v.patient_id}_${v.field_definition_id}`;
        patientValuesMap[key] = v;
      });

      const visitValuesMap = {};
      visitFieldValues.forEach(v => {
        const key = `${v.visit_id}_${v.field_definition_id}`;
        visitValuesMap[key] = v;
      });

      // Attach custom field values to each visit
      visitsWithCustomFields = rows.map(visit => {
        const visitJson = visit.toJSON ? visit.toJSON() : visit;
        const customFieldValues = {};

        visitListFields.forEach(field => {
          const isPatientLevel = field.category && (field.category.entity_types || ['patient']).includes('patient');
          let value = null;

          if (isPatientLevel && visitJson.patient_id) {
            const patientValue = patientValuesMap[`${visitJson.patient_id}_${field.id}`];
            if (patientValue) {
              value = patientValue.getValue(field.field_type, field.allow_multiple);
            }
          } else {
            const visitValue = visitValuesMap[`${visitJson.id}_${field.id}`];
            if (visitValue) {
              value = visitValue.getValue(field.field_type, field.allow_multiple);
            }
          }

          customFieldValues[field.field_name] = value;
        });

        return {
          ...visitJson,
          custom_field_values: customFieldValues
        };
      });
    }

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
      visits: visitsWithCustomFields,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      customFieldDefinitions: visitListFields.map(f => ({
        id: f.id,
        field_name: f.field_name,
        field_label: f.field_label,
        field_type: f.field_type
      }))
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
        }
      ]
    });

    console.log('📅 [getVisitById] Visit found:', !!visit);

    if (!visit) {
      const error = new Error('Visit not found');
      error.statusCode = 404;
      throw error;
    }

    // RBAC: Check scoped access to this visit
    const hasAccess = await canAccessVisit(user, visit);
    if (!hasAccess) {
      const error = new Error('Access denied: You can only view visits for your assigned patients');
      error.statusCode = 403;
      throw error;
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
    // RBAC: DIETITIAN must be the dietitian on their own visits
    const roleName = user.role.name || user.role;
    if (roleName === 'DIETITIAN') {
      visitData.dietitian_id = user.id;
    }

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
      // Clinical fields now managed via custom fields
      next_visit_date: visitData.next_visit_date
    });

    // Auto-create patient ↔ dietitian M2M link
    try {
      await ensurePatientDietitianLink(visitData.patient_id, visitData.dietitian_id);
    } catch (linkError) {
      console.warn('Failed to auto-create patient-dietitian link:', linkError.message);
    }

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
          // Get invoice amount from VisitType.default_price
          let invoiceAmount = 0;
          if (visit.visit_type) {
            const visitType = await db.VisitType.findOne({
              where: { name: visit.visit_type, is_active: true }
            });
            if (visitType && visitType.default_price) {
              invoiceAmount = parseFloat(visitType.default_price);
              console.log(`💰 Create visit auto-invoice using VisitType price: ${invoiceAmount} for ${visit.visit_type}`);
            }
          }

          // Fallback to calculateVisitAmount if no VisitType price found
          if (invoiceAmount <= 0) {
            invoiceAmount = calculateVisitAmount(visit);
            console.log(`💰 Create visit auto-invoice using calculated price: ${invoiceAmount}`);
          }

          // Format visit date for description
          const visitDate = new Date(visit.visit_date).toLocaleDateString('fr-FR');

          // Create invoice automatically
          const invoiceData = {
            patient_id: visit.patient_id,
            visit_id: visit.id,
            service_description: `${visit.visit_type || 'Consultation'} - ${visitDate}`,
            amount_total: invoiceAmount,
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
          };

          createdInvoice = await billingService.createInvoice(invoiceData, user, {
            ...requestMetadata,
            note: 'Auto-generated invoice for immediately completed visit'
          });

          console.log(`✅ Auto-created invoice for immediately completed visit ${visit.id}: ${createdInvoice.id} with amount ${invoiceAmount}`);
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
    // Clinical fields (chief_complaint, assessment, recommendations, notes) removed
    // Now managed via custom fields
    const allowedFields = [
      'dietitian_id', 'visit_date', 'visit_type', 'status', 'duration_minutes', 'next_visit_date', 'visit_summary', 'request_message'
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
          // Get invoice amount from VisitType.default_price
          let invoiceAmount = 0;
          if (visit.visit_type) {
            const visitType = await db.VisitType.findOne({
              where: { name: visit.visit_type, is_active: true }
            });
            if (visitType && visitType.default_price) {
              invoiceAmount = parseFloat(visitType.default_price);
              console.log(`💰 Auto-invoice using VisitType price: ${invoiceAmount} for ${visit.visit_type}`);
            }
          }

          // Fallback to calculateVisitAmount if no VisitType price found
          if (invoiceAmount <= 0) {
            invoiceAmount = calculateVisitAmount(visit);
            console.log(`💰 Auto-invoice using calculated price: ${invoiceAmount}`);
          }

          // Format visit date for description
          const visitDate = new Date(visit.visit_date).toLocaleDateString('fr-FR');

          // Create invoice automatically
          const invoiceData = {
            patient_id: visit.patient_id,
            visit_id: visitId,
            service_description: `${visit.visit_type || 'Consultation'} - ${visitDate}`,
            amount_total: invoiceAmount,
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
          };

          await billingService.createInvoice(invoiceData, user, {
            ...requestMetadata,
            note: 'Auto-generated invoice for completed visit'
          });

          console.log(`✅ Auto-created invoice for completed visit ${visitId} with amount ${invoiceAmount}`);
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
async function finishAndInvoice(user, visitId, options = {}, requestMetadata = {}) {
  // Default options
  const {
    markCompleted = true,
    generateInvoice = true,
    sendEmail = false
  } = options;

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

    // Check if visit is already completed (only relevant if marking completed)
    if (markCompleted && visit.status === 'COMPLETED') {
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

    let updatedVisit = visit;
    let invoice = null;
    let emailSent = false;
    const messages = [];

    // Step 1: Mark visit as COMPLETED (if requested)
    if (markCompleted) {
      updatedVisit = await updateVisit(user, visitId, {
        status: 'COMPLETED'
      }, requestMetadata);
      messages.push('Visit marked as completed');
    }

    // Step 2: Generate invoice (if requested)
    if (generateInvoice) {
      console.log(`🧾 [finishAndInvoice] Generating invoice for visit ${visitId}`);

      // First check if an invoice already exists for this visit
      invoice = await db.Billing.findOne({
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

      if (invoice) {
        console.log(`🧾 [finishAndInvoice] Invoice already exists: ${invoice.invoice_number}`);
        messages.push('Invoice already exists');
      } else {
        console.log(`🧾 [finishAndInvoice] No existing invoice, creating new one...`);
        // Create new invoice - get amount from visit type's default_price
        let invoiceAmount = 0;
        let invoiceDescription = visit.visit_type || 'Consultation';

        // Try to get default_price from VisitType
        if (visit.visit_type) {
          console.log(`🧾 [finishAndInvoice] Looking up visit type: "${visit.visit_type}"`);
          const visitType = await db.VisitType.findOne({
            where: { name: visit.visit_type, is_active: true }
          });
          console.log(`🧾 [finishAndInvoice] Visit type found:`, visitType ? `${visitType.name} (default_price: ${visitType.default_price})` : 'NOT FOUND');
          if (visitType && visitType.default_price) {
            invoiceAmount = parseFloat(visitType.default_price);
            console.log(`💰 Using visit type default_price: ${invoiceAmount} for ${visit.visit_type}`);
          }
        } else {
          console.log(`🧾 [finishAndInvoice] Visit has no visit_type set`);
        }

        // If no amount from visit type, use fallback calculation
        if (invoiceAmount <= 0) {
          invoiceAmount = calculateVisitAmount(visit);
          console.log(`💰 Using calculated amount: ${invoiceAmount}`);
        }

        // Format visit date for description
        const visitDate = new Date(visit.visit_date).toLocaleDateString('fr-FR');
        invoiceDescription = `${visit.visit_type || 'Consultation'} - ${visitDate}`;

        try {
          // Create the invoice
          invoice = await billingService.createInvoice({
            patient_id: visit.patient_id,
            visit_id: visitId,
            service_description: invoiceDescription,
            amount_total: invoiceAmount
          }, user, requestMetadata);

          // Reload invoice with patient info
          invoice = await db.Billing.findByPk(invoice.id, {
            include: [
              {
                model: Patient,
                as: 'patient',
                attributes: ['id', 'first_name', 'last_name', 'email']
              }
            ]
          });

          messages.push('Invoice generated');
          console.log(`✅ Invoice ${invoice.invoice_number} created with amount ${invoiceAmount}`);
        } catch (invoiceError) {
          console.error('❌ Failed to create invoice:', invoiceError);
          messages.push('Failed to create invoice: ' + invoiceError.message);
        }
      }
    }

    // Step 3: Send invoice email (if requested AND invoice exists AND patient has email)
    if (sendEmail && invoice) {
      if (!invoice.patient || !invoice.patient.email) {
        console.warn('⚠️  Patient has no email address');
        messages.push('Email not sent (patient has no email)');
      } else {
        console.log(`📧 Sending invoice email for visit ${visitId}`);
        try {
          await billingService.sendInvoiceEmail(invoice.id, user, requestMetadata);
          emailSent = true;
          messages.push('Email sent to patient');
        } catch (emailError) {
          console.error('❌ Failed to send invoice email:', emailError);
          messages.push('Email failed to send: ' + emailError.message);
        }
      }
    }

    // Audit log for the action
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'FINISH_AND_INVOICE',
      resource_type: 'visits',
      resource_id: visitId,
      changes: {
        action: 'finish_and_invoice',
        options: { markCompleted, generateInvoice, sendEmail },
        visit_status: markCompleted ? 'COMPLETED' : visit.status,
        invoice_id: invoice?.id || null,
        invoice_number: invoice?.invoice_number || null,
        email_sent: emailSent
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
      emailSent,
      // Return structured actions for frontend to translate
      actions: {
        markCompleted: markCompleted,
        generateInvoice: generateInvoice && !!invoice,
        sendEmailRequested: sendEmail,
        emailSent: emailSent,
        patientHasEmail: !!(invoice?.patient?.email)
      }
    };
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

module.exports = {
  getVisits,
  getVisitById,
  createVisit,
  updateVisit,
  deleteVisit,
  finishAndInvoice
};
