/**
 * Billing Service
 *
 * Business logic for billing/invoice management with RBAC and audit logging.
 * Handles invoice creation, payment recording, and financial tracking.
 */

const db = require('../../../models');
const Billing = db.Billing;
const Patient = db.Patient;
const Visit = db.Visit;
const User = db.User;
const auditService = require('./audit.service');
const { Op } = db.Sequelize;

/**
 * Get all invoices with filtering and pagination
 *
 * @param {Object} user - Authenticated user object
 * @param {Object} filters - Filter criteria
 * @param {string} filters.patient_id - Filter by patient ID
 * @param {string} filters.status - Filter by status (DRAFT, SENT, PAID, OVERDUE, CANCELLED)
 * @param {string} filters.search - Search by invoice number or service description
 * @param {Date} filters.start_date - Filter invoices from this date
 * @param {Date} filters.end_date - Filter invoices to this date
 * @param {number} filters.page - Page number (default 1)
 * @param {number} filters.limit - Items per page (default 20)
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Invoices, total count, and pagination info
 */
async function getInvoices(user, filters = {}, requestMetadata = {}) {
  try {
    const whereClause = { is_active: true };

    // RBAC: Apply role-based filtering
    if (user && user.role) {
      if (user.role.name === 'VIEWER') {
        // VIEWER can only see their own invoices if they have any
        // For now, VIEWER role doesn't create invoices, so return empty
        return {
          invoices: [],
          total: 0,
          page: filters.page || 1,
          limit: filters.limit || 20,
          totalPages: 0
        };
      }
      // ADMIN, DIETITIAN, ASSISTANT can see all invoices
    }

    // Apply filters
    if (filters.patient_id) {
      whereClause.patient_id = filters.patient_id;
    }

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.search) {
      whereClause[Op.or] = [
        { invoice_number: { [Op.like]: `%${filters.search}%` } },
        { service_description: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    if (filters.start_date || filters.end_date) {
      whereClause.invoice_date = {};
      if (filters.start_date) {
        whereClause.invoice_date[Op.gte] = filters.start_date;
      }
      if (filters.end_date) {
        whereClause.invoice_date[Op.lte] = filters.end_date;
      }
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const offset = (page - 1) * limit;

    const { rows: invoices, count: total } = await Billing.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          where: { is_active: true },
          required: true
        },
        {
          model: Visit,
          as: 'visit',
          attributes: ['id', 'visit_date', 'status'],
          required: false
        }
      ],
      order: [['invoice_date', 'DESC'], ['created_at', 'DESC']],
      limit,
      offset
    });

    const totalPages = Math.ceil(total / limit);

    return {
      invoices,
      total,
      page,
      limit,
      totalPages
    };
  } catch (error) {
    console.error('Error in getInvoices:', error);
    throw error;
  }
}

/**
 * Get invoice by ID
 *
 * @param {string} invoiceId - Invoice UUID
 * @param {Object} user - Authenticated user object
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Invoice with patient and visit details
 */
async function getInvoiceById(invoiceId, user, requestMetadata = {}) {
  try {
    const invoice = await Billing.findOne({
      where: {
        id: invoiceId,
        is_active: true
      },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'address'],
          where: { is_active: true },
          required: true
        },
        {
          model: Visit,
          as: 'visit',
          attributes: ['id', 'visit_date', 'status', 'notes'],
          required: false
        }
      ]
    });

    if (!invoice) {
      const error = new Error('Invoice not found');
      error.statusCode = 404;
      throw error;
    }

    // RBAC: Check if user can view this invoice
    if (user && user.role) {
      if (user.role.name === 'VIEWER') {
        const error = new Error('Access denied');
        error.statusCode = 403;
        throw error;
      }
      // ADMIN, DIETITIAN, ASSISTANT can view all invoices
    }

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'billing',
      resource_id: invoiceId,
      changes: { action: 'view_invoice' },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return invoice;
  } catch (error) {
    console.error('Error in getInvoiceById:', error);
    throw error;
  }
}

/**
 * Create new invoice
 *
 * @param {Object} invoiceData - Invoice data
 * @param {string} invoiceData.patient_id - Patient UUID
 * @param {string} invoiceData.visit_id - Optional visit UUID
 * @param {string} invoiceData.service_description - Service description
 * @param {number} invoiceData.amount_total - Total amount
 * @param {Date} invoiceData.due_date - Due date
 * @param {Object} user - Authenticated user object
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Created invoice
 */
async function createInvoice(invoiceData, user, requestMetadata = {}) {
  try {
    // RBAC: Check permissions
    if (user && user.role) {
      if (user.role.name === 'VIEWER') {
        const error = new Error('Access denied');
        error.statusCode = 403;
        throw error;
      }
      // ADMIN, DIETITIAN, ASSISTANT can create invoices
    }

    // Validate patient exists
    const patient = await Patient.findOne({
      where: { id: invoiceData.patient_id, is_active: true }
    });

    if (!patient) {
      const error = new Error('Patient not found');
      error.statusCode = 404;
      throw error;
    }

    // Validate visit if provided
    if (invoiceData.visit_id) {
      const visit = await Visit.findOne({
        where: { id: invoiceData.visit_id, is_active: true }
      });

      if (!visit) {
        const error = new Error('Visit not found');
        error.statusCode = 404;
        throw error;
      }
    }

    // Generate invoice number (format: INV-YYYY-NNNN)
    const currentYear = new Date().getFullYear();
    const lastInvoice = await Billing.findOne({
      where: {
        invoice_number: { [Op.like]: `INV-${currentYear}-%` }
      },
      order: [['invoice_number', 'DESC']]
    });

    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoice_number.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    const invoiceNumber = `INV-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;

    // Calculate amounts
    const amountTotal = parseFloat(invoiceData.amount_total) || 0;
    const amountDue = amountTotal; // Initially, due amount equals total

    const invoice = await Billing.create({
      patient_id: invoiceData.patient_id,
      visit_id: invoiceData.visit_id || null,
      invoice_number: invoiceNumber,
      invoice_date: new Date(),
      due_date: invoiceData.due_date,
      service_description: invoiceData.service_description,
      amount_total: amountTotal,
      amount_paid: 0,
      amount_due: amountDue,
      status: 'DRAFT'
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      resource_type: 'billing',
      resource_id: invoice.id,
      changes: {
        action: 'create_invoice',
        invoice_number: invoiceNumber,
        amount_total: amountTotal
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 201
    });

    return invoice;
  } catch (error) {
    console.error('Error in createInvoice:', error);
    throw error;
  }
}

/**
 * Update invoice
 *
 * @param {string} invoiceId - Invoice UUID
 * @param {Object} updateData - Update data
 * @param {Object} user - Authenticated user object
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Updated invoice
 */
async function updateInvoice(invoiceId, updateData, user, requestMetadata = {}) {
  try {
    // RBAC: Check permissions
    if (user && user.role) {
      if (user.role.name === 'VIEWER') {
        const error = new Error('Access denied');
        error.statusCode = 403;
        throw error;
      }
      // ADMIN, DIETITIAN, ASSISTANT can update invoices
    }

    const invoice = await Billing.findOne({
      where: { id: invoiceId, is_active: true }
    });

    if (!invoice) {
      const error = new Error('Invoice not found');
      error.statusCode = 404;
      throw error;
    }

    const oldData = invoice.toJSON();

    // Update fields
    const allowedFields = [
      'service_description', 'amount_total', 'due_date', 'status', 'notes'
    ];

    const updates = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    });

    // Recalculate amounts if total changed
    if (updates.amount_total !== undefined) {
      const newTotal = parseFloat(updates.amount_total);
      const currentPaid = parseFloat(invoice.amount_paid);
      updates.amount_due = Math.max(0, newTotal - currentPaid);
    }

    await invoice.update(updates);

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      resource_type: 'billing',
      resource_id: invoiceId,
      changes: { before: oldData, after: updates },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return invoice;
  } catch (error) {
    console.error('Error in updateInvoice:', error);
    throw error;
  }
}

/**
 * Record payment for invoice
 *
 * @param {string} invoiceId - Invoice UUID
 * @param {Object} paymentData - Payment data
 * @param {number} paymentData.amount - Payment amount
 * @param {string} paymentData.payment_method - Payment method
 * @param {Date} paymentData.payment_date - Payment date
 * @param {Object} user - Authenticated user object
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Updated invoice
 */
async function recordPayment(invoiceId, paymentData, user, requestMetadata = {}) {
  try {
    // RBAC: Check permissions
    if (user && user.role) {
      if (user.role.name === 'VIEWER') {
        const error = new Error('Access denied');
        error.statusCode = 403;
        throw error;
      }
      // ADMIN, DIETITIAN, ASSISTANT can record payments
    }

    const invoice = await Billing.findOne({
      where: { id: invoiceId, is_active: true }
    });

    if (!invoice) {
      const error = new Error('Invoice not found');
      error.statusCode = 404;
      throw error;
    }

    const oldData = invoice.toJSON();
    const paymentAmount = parseFloat(paymentData.amount) || 0;
    const currentPaid = parseFloat(invoice.amount_paid);
    const currentDue = parseFloat(invoice.amount_due);

    if (paymentAmount <= 0) {
      const error = new Error('Payment amount must be greater than 0');
      error.statusCode = 400;
      throw error;
    }

    if (paymentAmount > currentDue) {
      const error = new Error('Payment amount cannot exceed due amount');
      error.statusCode = 400;
      throw error;
    }

    const newPaid = currentPaid + paymentAmount;
    const newDue = Math.max(0, currentDue - paymentAmount);

    // Determine new status
    let newStatus = invoice.status;
    if (newDue === 0 && newPaid >= invoice.amount_total) {
      newStatus = 'PAID';
    } else if (newDue > 0 && new Date() > new Date(invoice.due_date)) {
      newStatus = 'OVERDUE';
    }

    const updates = {
      amount_paid: newPaid,
      amount_due: newDue,
      status: newStatus,
      payment_method: paymentData.payment_method || invoice.payment_method,
      payment_date: paymentData.payment_date || new Date()
    };

    await invoice.update(updates);

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      resource_type: 'billing',
      resource_id: invoiceId,
      changes: {
        before: oldData,
        after: updates,
        action: 'record_payment',
        payment_amount: paymentAmount
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return invoice;
  } catch (error) {
    console.error('Error in recordPayment:', error);
    throw error;
  }
}

/**
 * Delete invoice (soft delete)
 *
 * @param {string} invoiceId - Invoice UUID
 * @param {Object} user - Authenticated user object
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<boolean>} Success status
 */
async function deleteInvoice(invoiceId, user, requestMetadata = {}) {
  try {
    // RBAC: Check permissions
    if (user && user.role) {
      if (user.role.name !== 'ADMIN') {
        const error = new Error('Only administrators can delete invoices');
        error.statusCode = 403;
        throw error;
      }
    }

    const invoice = await Billing.findOne({
      where: { id: invoiceId, is_active: true }
    });

    if (!invoice) {
      const error = new Error('Invoice not found');
      error.statusCode = 404;
      throw error;
    }

    const oldData = invoice.toJSON();

    // Soft delete
    await invoice.update({ is_active: false });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'DELETE',
      resource_type: 'billing',
      resource_id: invoiceId,
      changes: { before: oldData, after: { is_active: false }, action: 'soft_delete_invoice' },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return true;
  } catch (error) {
    console.error('Error in deleteInvoice:', error);
    throw error;
  }
}

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  recordPayment,
  deleteInvoice
};