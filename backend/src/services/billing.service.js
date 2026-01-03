/**
 * Billing Management Service
 *
 * Business logic for billing and invoice management operations
 */

const db = require('../../../models');
const { AppError } = require('../middleware/errorHandler');
const { logCrudEvent } = require('./audit.service');
const { Op } = require('sequelize');

/**
 * Check if user has access to patient for billing
 */
async function checkPatientAccessForBilling(patientId, user) {
  const patient = await db.Patient.findByPk(patientId);

  if (!patient) {
    throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
  }

  // Dietitians can only access billing for their assigned patients
  if (user.role && user.role.name === 'DIETITIAN') {
    if (patient.assigned_dietitian_id !== user.id) {
      throw new AppError(
        'Access denied. You can only manage billing for your assigned patients',
        403,
        'NOT_ASSIGNED_PATIENT'
      );
    }
  }

  return patient;
}

/**
 * Generate next invoice number
 */
async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // Find the latest invoice for this year
  const latestInvoice = await db.Billing.findOne({
    where: {
      invoice_number: {
        [Op.like]: `${prefix}%`
      }
    },
    order: [['created_at', 'DESC']]
  });

  let nextNumber = 1;
  if (latestInvoice) {
    const lastNumber = parseInt(latestInvoice.invoice_number.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(6, '0')}`;
}

/**
 * Get all billing records with filtering and pagination
 */
async function getBillingRecords(filters = {}, requestingUser) {
  const {
    patient_id,
    status,
    from_date,
    to_date,
    limit = 50,
    offset = 0,
    sort_by = 'invoice_date',
    sort_order = 'DESC'
  } = filters;

  // Build where clause
  const where = {};

  if (patient_id) {
    where.patient_id = patient_id;
    // Verify access to this patient
    await checkPatientAccessForBilling(patient_id, requestingUser);
  }

  if (status) {
    where.status = status;
  }

  if (from_date) {
    where.invoice_date = { [Op.gte]: from_date };
  }

  if (to_date) {
    where.invoice_date = { ...where.invoice_date, [Op.lte]: to_date };
  }

  // If user is a dietitian, only show billing for their assigned patients
  if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
    const assignedPatients = await db.Patient.findAll({
      where: { assigned_dietitian_id: requestingUser.id },
      attributes: ['id']
    });
    const patientIds = assignedPatients.map(p => p.id);

    if (patientIds.length > 0) {
      where.patient_id = { [Op.in]: patientIds };
    } else {
      // Dietitian has no assigned patients
      where.patient_id = null;
    }
  }

  const { count, rows } = await db.Billing.findAndCountAll({
    where,
    include: [
      {
        model: db.Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name']
      },
      {
        model: db.Visit,
        as: 'visit',
        attributes: ['id', 'visit_date', 'visit_type']
      }
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[sort_by, sort_order.toUpperCase()]]
  });

  return {
    billing: rows,
    total: count,
    limit: parseInt(limit),
    offset: parseInt(offset)
  };
}

/**
 * Get billing record by ID
 */
async function getBillingById(billingId, requestingUser) {
  const billing = await db.Billing.findByPk(billingId, {
    include: [
      {
        model: db.Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name', 'email', 'assigned_dietitian_id']
      },
      {
        model: db.Visit,
        as: 'visit',
        attributes: ['id', 'visit_date', 'visit_type', 'duration_minutes']
      },
      {
        model: db.User,
        as: 'creator',
        attributes: ['id', 'username', 'first_name', 'last_name']
      }
    ]
  });

  if (!billing) {
    throw new AppError('Billing record not found', 404, 'BILLING_NOT_FOUND');
  }

  // Check access for dietitians
  if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
    if (billing.patient.assigned_dietitian_id !== requestingUser.id) {
      throw new AppError(
        'Access denied. You can only view billing for your assigned patients',
        403,
        'NOT_ASSIGNED_PATIENT'
      );
    }
  }

  return billing;
}

/**
 * Create new billing record/invoice
 */
async function createBilling(billingData, createdBy, requestingUser) {
  const {
    patient_id,
    visit_id,
    invoice_date,
    due_date,
    amount,
    tax_amount,
    currency,
    status,
    payment_method,
    notes
  } = billingData;

  // Validate required fields
  if (!patient_id || !invoice_date || !due_date || amount === undefined) {
    throw new AppError(
      'Patient ID, invoice date, due date, and amount are required',
      400,
      'VALIDATION_ERROR'
    );
  }

  // Check patient access
  await checkPatientAccessForBilling(patient_id, requestingUser);

  // Verify visit exists if provided
  if (visit_id) {
    const visit = await db.Visit.findByPk(visit_id);
    if (!visit) {
      throw new AppError('Visit not found', 404, 'VISIT_NOT_FOUND');
    }
    if (visit.patient_id !== patient_id) {
      throw new AppError('Visit does not belong to this patient', 400, 'VISIT_PATIENT_MISMATCH');
    }
  }

  // Generate invoice number
  const invoice_number = await generateInvoiceNumber();

  // Calculate total amount
  const taxAmt = tax_amount || 0;
  const total_amount = parseFloat(amount) + parseFloat(taxAmt);

  // Create billing record
  const billing = await db.Billing.create({
    patient_id,
    visit_id,
    invoice_number,
    invoice_date,
    due_date,
    amount,
    tax_amount: taxAmt,
    total_amount,
    currency: currency || 'USD',
    status: status || 'PENDING',
    payment_method,
    notes,
    created_by: createdBy,
    updated_by: createdBy
  });

  // Log creation
  await logCrudEvent({
    user_id: createdBy,
    action: 'CREATE',
    resource_type: 'billing',
    resource_id: billing.id,
    changes: { created: true, invoice_number },
    status: 'SUCCESS'
  });

  // Reload with associations
  await billing.reload({
    include: [
      {
        model: db.Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name', 'email']
      },
      {
        model: db.Visit,
        as: 'visit',
        attributes: ['id', 'visit_date', 'visit_type']
      }
    ]
  });

  return billing;
}

/**
 * Update billing record
 */
async function updateBilling(billingId, updates, updatedBy, requestingUser) {
  const billing = await db.Billing.findByPk(billingId, {
    include: [{
      model: db.Patient,
      as: 'patient',
      attributes: ['id', 'assigned_dietitian_id']
    }]
  });

  if (!billing) {
    throw new AppError('Billing record not found', 404, 'BILLING_NOT_FOUND');
  }

  // Check access for dietitians
  if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
    if (billing.patient.assigned_dietitian_id !== requestingUser.id) {
      throw new AppError(
        'Access denied. You can only update billing for your assigned patients',
        403,
        'NOT_ASSIGNED_PATIENT'
      );
    }
  }

  // Fields that can be updated
  const allowedUpdates = [
    'due_date',
    'amount',
    'tax_amount',
    'status',
    'payment_method',
    'payment_date',
    'notes'
  ];

  // Filter updates to only allowed fields
  const filteredUpdates = {};
  Object.keys(updates).forEach(key => {
    if (allowedUpdates.includes(key) && updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  });

  // Recalculate total if amount or tax changed
  if (filteredUpdates.amount !== undefined || filteredUpdates.tax_amount !== undefined) {
    const newAmount = filteredUpdates.amount !== undefined ? filteredUpdates.amount : billing.amount;
    const newTax = filteredUpdates.tax_amount !== undefined ? filteredUpdates.tax_amount : billing.tax_amount;
    filteredUpdates.total_amount = parseFloat(newAmount) + parseFloat(newTax);
  }

  // Track changes for audit log
  const changes = {};
  Object.keys(filteredUpdates).forEach(key => {
    if (String(billing[key]) !== String(filteredUpdates[key])) {
      changes[key] = {
        old: billing[key],
        new: filteredUpdates[key]
      };
    }
  });

  // Update billing
  await billing.update({
    ...filteredUpdates,
    updated_by: updatedBy
  });

  // Log the update
  await logCrudEvent({
    user_id: updatedBy,
    action: 'UPDATE',
    resource_type: 'billing',
    resource_id: billingId,
    changes: changes,
    status: 'SUCCESS'
  });

  // Reload with associations
  await billing.reload({
    include: [
      {
        model: db.Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name', 'email']
      },
      {
        model: db.Visit,
        as: 'visit',
        attributes: ['id', 'visit_date', 'visit_type']
      }
    ]
  });

  return billing;
}

/**
 * Delete billing record
 */
async function deleteBilling(billingId, deletedBy, requestingUser) {
  const billing = await db.Billing.findByPk(billingId, {
    include: [{
      model: db.Patient,
      as: 'patient',
      attributes: ['id', 'assigned_dietitian_id']
    }]
  });

  if (!billing) {
    throw new AppError('Billing record not found', 404, 'BILLING_NOT_FOUND');
  }

  // Check access for dietitians
  if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
    if (billing.patient.assigned_dietitian_id !== requestingUser.id) {
      throw new AppError(
        'Access denied. You can only delete billing for your assigned patients',
        403,
        'NOT_ASSIGNED_PATIENT'
      );
    }
  }

  // Prevent deletion of paid invoices
  if (billing.status === 'PAID') {
    throw new AppError('Cannot delete paid invoices', 400, 'CANNOT_DELETE_PAID_INVOICE');
  }

  const invoice_number = billing.invoice_number;

  // Hard delete
  await billing.destroy();

  // Log the deletion
  await logCrudEvent({
    user_id: deletedBy,
    action: 'DELETE',
    resource_type: 'billing',
    resource_id: billingId,
    changes: { invoice_number },
    status: 'SUCCESS'
  });

  return { message: 'Billing record deleted successfully' };
}

/**
 * Mark invoice as paid
 */
async function markAsPaid(billingId, paymentData, updatedBy, requestingUser) {
  const { payment_method, payment_date } = paymentData;

  const billing = await getBillingById(billingId, requestingUser);

  if (billing.status === 'PAID') {
    throw new AppError('Invoice is already marked as paid', 400, 'ALREADY_PAID');
  }

  await billing.update({
    status: 'PAID',
    payment_method: payment_method || billing.payment_method,
    payment_date: payment_date || new Date().toISOString().split('T')[0],
    updated_by: updatedBy
  });

  // Log the payment
  await logCrudEvent({
    user_id: updatedBy,
    action: 'UPDATE',
    resource_type: 'billing',
    resource_id: billingId,
    changes: { status: { old: billing.status, new: 'PAID' } },
    status: 'SUCCESS'
  });

  return billing;
}

/**
 * Get billing statistics
 */
async function getBillingStats(filters = {}, requestingUser) {
  let where = {};

  const { from_date, to_date } = filters;

  if (from_date) {
    where.invoice_date = { [Op.gte]: from_date };
  }

  if (to_date) {
    where.invoice_date = { ...where.invoice_date, [Op.lte]: to_date };
  }

  // If user is a dietitian, only count their patients' billing
  if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
    const assignedPatients = await db.Patient.findAll({
      where: { assigned_dietitian_id: requestingUser.id },
      attributes: ['id']
    });
    const patientIds = assignedPatients.map(p => p.id);

    if (patientIds.length > 0) {
      where.patient_id = { [Op.in]: patientIds };
    } else {
      where.patient_id = null;
    }
  }

  const totalInvoices = await db.Billing.count({ where });

  // Revenue by status
  const revenueByStatus = await db.Billing.findAll({
    attributes: [
      'status',
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
      [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'total']
    ],
    where,
    group: ['status']
  });

  // Total revenue
  const totalRevenue = await db.Billing.sum('total_amount', { where }) || 0;
  const paidRevenue = await db.Billing.sum('total_amount', {
    where: { ...where, status: 'PAID' }
  }) || 0;
  const pendingRevenue = await db.Billing.sum('total_amount', {
    where: { ...where, status: 'PENDING' }
  }) || 0;

  return {
    total_invoices: totalInvoices,
    total_revenue: parseFloat(totalRevenue).toFixed(2),
    paid_revenue: parseFloat(paidRevenue).toFixed(2),
    pending_revenue: parseFloat(pendingRevenue).toFixed(2),
    by_status: revenueByStatus.map(item => ({
      status: item.status,
      count: parseInt(item.get('count')),
      total: parseFloat(item.get('total') || 0).toFixed(2)
    }))
  };
}

module.exports = {
  getBillingRecords,
  getBillingById,
  createBilling,
  updateBilling,
  deleteBilling,
  markAsPaid,
  getBillingStats
};
