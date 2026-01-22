/**
 * Billing Service
 *
 * Business logic for billing/invoice management with RBAC and audit logging.
 * Handles invoice creation, payment recording, and financial tracking.
 */

const db = require('../../../models');
const Billing = db.Billing;
const Payment = db.Payment;
const InvoiceEmail = db.InvoiceEmail;
const Patient = db.Patient;
const Visit = db.Visit;
const User = db.User;
const auditService = require('./audit.service');
const emailService = require('./email.service');
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
        },
        {
          model: Payment,
          as: 'payments',
          attributes: ['id', 'amount', 'payment_method', 'payment_date', 'notes', 'status', 'recorded_by', 'created_at'],
          include: [
            {
              model: User,
              as: 'recorder',
              attributes: ['id', 'username', 'first_name', 'last_name'],
              required: false
            }
          ],
          order: [['payment_date', 'DESC']],
          required: false
        },
        {
          model: InvoiceEmail,
          as: 'email_history',
          attributes: ['id', 'sent_to', 'sent_at', 'sent_by', 'status', 'error_message', 'created_at'],
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'username', 'first_name', 'last_name'],
              required: false
            }
          ],
          order: [['sent_at', 'DESC']],
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
        where: { 
          id: invoiceData.visit_id,
          status: { [Op.notIn]: ['CANCELLED', 'NO_SHOW'] }
        }
      });

      if (!visit) {
        const error = new Error('Visit not found or not eligible for billing');
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

    // Set default due date to 30 days from now if not provided
    const dueDate = invoiceData.due_date ? new Date(invoiceData.due_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const invoice = await Billing.create({
      patient_id: invoiceData.patient_id,
      visit_id: invoiceData.visit_id || null,
      invoice_number: invoiceNumber,
      invoice_date: new Date(),
      due_date: dueDate,
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

    // Create Payment record
    const payment = await Payment.create({
      billing_id: invoiceId,
      amount: paymentAmount,
      payment_method: paymentData.payment_method || 'CASH',
      payment_date: paymentData.payment_date || new Date(),
      notes: paymentData.notes || null,
      recorded_by: user.id
    });

    console.log(`✅ Payment record created: ${payment.id} for €${paymentAmount}`);

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

/**
 * Send invoice email to patient
 *
 * @param {string} invoiceId - Invoice UUID
 * @param {Object} user - Authenticated user object
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Result object
 */
async function sendInvoiceEmail(invoiceId, user, requestMetadata = {}) {
  try {
    // Get invoice with patient details
    const invoice = await Billing.findOne({
      where: { id: invoiceId, is_active: true },
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

    if (!invoice) {
      const error = new Error('Invoice not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if patient has email
    if (!invoice.patient || !invoice.patient.email) {
      const error = new Error('Patient email not found');
      error.statusCode = 400;
      throw error;
    }

    // Send invoice email
    console.log('📧 Sending invoice email to:', invoice.patient.email);

    let emailStatus = 'SUCCESS';
    let errorMessage = null;

    try {
      const emailResult = await emailService.sendInvoiceEmail(invoice, invoice.patient);
    } catch (emailError) {
      emailStatus = 'FAILED';
      errorMessage = emailError.message;
      console.error('❌ Email send failed:', emailError);
    }

    // Log email send in invoice_emails table
    await InvoiceEmail.create({
      billing_id: invoiceId,
      sent_to: invoice.patient.email,
      sent_at: new Date(),
      sent_by: user.id,
      status: emailStatus,
      error_message: errorMessage
    });

    // Update invoice status to SENT if it was DRAFT and email succeeded
    if (invoice.status === 'DRAFT' && emailStatus === 'SUCCESS') {
      await invoice.update({ status: 'SENT' });
    }

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'SEND_EMAIL',
      resource_type: 'billing',
      resource_id: invoiceId,
      changes: {
        action: 'send_invoice_email',
        recipient: invoice.patient.email,
        invoice_number: invoice.invoice_number,
        status: emailStatus
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: emailStatus === 'SUCCESS' ? 200 : 500
    });

    if (emailStatus === 'FAILED') {
      const error = new Error('Failed to send invoice email');
      error.statusCode = 500;
      throw error;
    }

    return {
      success: true,
      message: 'Invoice email sent successfully',
      recipient: invoice.patient.email
    };
  } catch (error) {
    console.error('Error in sendInvoiceEmail:', error);
    throw error;
  }
}

/**
 * Mark invoice as paid (quick action - records full payment)
 *
 * @param {string} invoiceId - Invoice UUID
 * @param {Object} user - Authenticated user object
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Updated invoice
 */
async function markAsPaid(invoiceId, user, requestMetadata = {}) {
  try {
    const invoice = await Billing.findOne({
      where: { id: invoiceId, is_active: true },
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

    if (!invoice) {
      const error = new Error('Invoice not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if already paid
    if (invoice.status === 'PAID') {
      const error = new Error('Invoice is already marked as paid');
      error.statusCode = 400;
      throw error;
    }

    // Check if there's an outstanding balance
    if (invoice.amount_due <= 0) {
      const error = new Error('No outstanding balance to pay');
      error.statusCode = 400;
      throw error;
    }

    // Record a payment for the full outstanding amount
    const paymentData = {
      amount: invoice.amount_due,
      payment_method: 'CASH', // Default method for quick mark as paid
      payment_date: new Date(),
      notes: 'Marked as paid via quick action'
    };

    // Use the existing recordPayment function to handle the payment
    const updatedInvoice = await recordPayment(invoiceId, paymentData, user, requestMetadata);

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'MARK_PAID',
      resource_type: 'billing',
      resource_id: invoiceId,
      changes: {
        action: 'mark_as_paid',
        amount: paymentData.amount,
        previous_status: invoice.status,
        new_status: 'PAID'
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return updatedInvoice;
  } catch (error) {
    console.error('Error in markAsPaid:', error);
    throw error;
  }
}

/**
 * Send multiple invoices by email (batch operation)
 *
 * @param {Array<string>} invoiceIds - Array of invoice UUIDs
 * @param {Object} user - Authenticated user object
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Results with successful and failed invoice IDs
 */
async function sendInvoiceBatch(invoiceIds, user, requestMetadata = {}) {
  try {
    const results = {
      successful: [],
      failed: [],
      totalRequested: invoiceIds.length
    };

    console.log(`📧 Batch sending ${invoiceIds.length} invoices`);

    for (const invoiceId of invoiceIds) {
      try {
        const result = await sendInvoiceEmail(invoiceId, user, requestMetadata);
        results.successful.push({
          invoice_id: invoiceId,
          recipient: result.recipient
        });
      } catch (error) {
        console.error(`❌ Failed to send invoice ${invoiceId}:`, error.message);
        results.failed.push({
          invoice_id: invoiceId,
          error: error.message
        });
      }
    }

    // Audit log for batch operation
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'BATCH_SEND_INVOICES',
      resource_type: 'billing',
      details: {
        total_requested: results.totalRequested,
        successful_count: results.successful.length,
        failed_count: results.failed.length,
        invoice_ids: invoiceIds
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return results;
  } catch (error) {
    console.error('Error in sendInvoiceBatch:', error);
    throw error;
  }
}

/**
 * Send payment reminders for overdue invoices (batch operation)
 *
 * @param {Array<string>} invoiceIds - Array of invoice UUIDs
 * @param {Object} user - Authenticated user object
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Results with successful and failed invoice IDs
 */
async function sendReminderBatch(invoiceIds, user, requestMetadata = {}) {
  try {
    const results = {
      successful: [],
      failed: [],
      totalRequested: invoiceIds.length
    };

    console.log(`🔔 Batch sending reminders for ${invoiceIds.length} invoices`);

    for (const invoiceId of invoiceIds) {
      try {
        // Fetch invoice with patient details
        const invoice = await Billing.findOne({
          where: { id: invoiceId, is_active: true },
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

        if (!invoice) {
          throw new Error('Invoice not found');
        }

        // Check if patient has email
        if (!invoice.patient || !invoice.patient.email) {
          throw new Error('Patient has no email address');
        }

        // Check if invoice is actually overdue or unpaid
        if (invoice.status === 'PAID') {
          throw new Error('Invoice is already paid');
        }

        // Send reminder email
        await emailService.sendPaymentReminderEmail(invoice, invoice.patient);

        // Update invoice metadata to track reminder sent
        const remindersSent = invoice.reminders_sent || 0;
        await invoice.update({
          reminders_sent: remindersSent + 1,
          last_reminder_date: new Date()
        });

        results.successful.push({
          invoice_id: invoiceId,
          recipient: invoice.patient.email,
          invoice_number: invoice.invoice_number
        });

        // Audit log for individual reminder
        await auditService.log({
          user_id: user.id,
          username: user.username,
          action: 'SEND_REMINDER',
          resource_type: 'billing',
          resource_id: invoiceId,
          details: {
            invoice_number: invoice.invoice_number,
            patient_id: invoice.patient_id,
            recipient: invoice.patient.email,
            reminders_sent: remindersSent + 1
          },
          ip_address: requestMetadata.ip,
          user_agent: requestMetadata.userAgent
        });
      } catch (error) {
        console.error(`❌ Failed to send reminder for invoice ${invoiceId}:`, error.message);
        results.failed.push({
          invoice_id: invoiceId,
          error: error.message
        });
      }
    }

    // Audit log for batch operation
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'BATCH_SEND_REMINDERS',
      resource_type: 'billing',
      details: {
        total_requested: results.totalRequested,
        successful_count: results.successful.length,
        failed_count: results.failed.length,
        invoice_ids: invoiceIds
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return results;
  } catch (error) {
    console.error('Error in sendReminderBatch:', error);
    throw error;
  }
}

/**
 * Update payment amount (admin override)
 * Allows modifying the amount_paid and recalculates amount_due and status
 *
 * @param {string} invoiceId - Invoice UUID
 * @param {number} newAmountPaid - New total amount paid
 * @param {Object} user - Authenticated user object
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Updated invoice
 */
async function updatePaymentAmount(invoiceId, newAmountPaid, user, requestMetadata = {}) {
  try {
    const invoice = await Billing.findOne({
      where: { id: invoiceId, is_active: true },
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

    if (!invoice) {
      const error = new Error('Invoice not found');
      error.statusCode = 404;
      throw error;
    }

    const amount = parseFloat(newAmountPaid);
    if (isNaN(amount) || amount < 0) {
      const error = new Error('Invalid payment amount');
      error.statusCode = 400;
      throw error;
    }

    const amountTotal = parseFloat(invoice.amount_total);
    if (amount > amountTotal) {
      const error = new Error('Payment amount cannot exceed total amount');
      error.statusCode = 400;
      throw error;
    }

    const oldAmountPaid = parseFloat(invoice.amount_paid);
    const oldAmountDue = parseFloat(invoice.amount_due);
    const oldStatus = invoice.status;

    // Calculate new amount_due
    const newAmountDue = Math.max(0, amountTotal - amount);

    // Determine new status
    let newStatus = invoice.status;
    if (newAmountDue === 0 && amount >= amountTotal) {
      newStatus = 'PAID';
    } else if (newAmountDue > 0) {
      // Check if overdue
      if (new Date() > new Date(invoice.due_date)) {
        newStatus = 'OVERDUE';
      } else if (oldStatus === 'PAID') {
        // If was paid but now has balance, set to SENT
        newStatus = 'SENT';
      }
    }

    // Update invoice
    await invoice.update({
      amount_paid: amount,
      amount_due: newAmountDue,
      status: newStatus
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE_PAYMENT_AMOUNT',
      resource_type: 'billing',
      resource_id: invoiceId,
      changes: {
        action: 'update_payment_amount',
        old_amount_paid: oldAmountPaid,
        new_amount_paid: amount,
        old_amount_due: oldAmountDue,
        new_amount_due: newAmountDue,
        old_status: oldStatus,
        new_status: newStatus,
        invoice_number: invoice.invoice_number
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    console.log(`✅ Invoice ${invoice.invoice_number} payment updated: €${oldAmountPaid} → €${amount}`);

    return invoice;
  } catch (error) {
    console.error('Error in updatePaymentAmount:', error);
    throw error;
  }
}

/**
 * Change invoice status (admin override)
 * Allows changing invoice status even if already PAID
 *
 * @param {string} invoiceId - Invoice UUID
 * @param {string} newStatus - New status (DRAFT, SENT, PAID, OVERDUE, CANCELLED)
 * @param {Object} user - Authenticated user object
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Updated invoice
 */
async function changeInvoiceStatus(invoiceId, newStatus, user, requestMetadata = {}) {
  try {
    const invoice = await Billing.findOne({
      where: { id: invoiceId, is_active: true },
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

    if (!invoice) {
      const error = new Error('Invoice not found');
      error.statusCode = 404;
      throw error;
    }

    // Validate new status
    const validStatuses = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];
    if (!validStatuses.includes(newStatus)) {
      const error = new Error('Invalid status value');
      error.statusCode = 400;
      throw error;
    }

    const oldStatus = invoice.status;

    // Don't update if status is the same
    if (oldStatus === newStatus) {
      return invoice;
    }

    // Update status
    await invoice.update({
      status: newStatus
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'CHANGE_STATUS',
      resource_type: 'billing',
      resource_id: invoiceId,
      changes: {
        action: 'change_invoice_status',
        old_status: oldStatus,
        new_status: newStatus,
        invoice_number: invoice.invoice_number
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    console.log(`✅ Invoice ${invoice.invoice_number} status changed: ${oldStatus} → ${newStatus}`);

    return invoice;
  } catch (error) {
    console.error('Error in changeInvoiceStatus:', error);
    throw error;
  }
}

/**
 * Change payment status (PAID/CANCELLED)
 * When cancelled, recalculates invoice amounts to exclude this payment
 *
 * @param {string} paymentId - Payment UUID
 * @param {string} newStatus - New status (PAID, CANCELLED)
 * @param {Object} user - Authenticated user object
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Updated payment and invoice
 */
async function changePaymentStatus(paymentId, newStatus, user, requestMetadata = {}) {
  try {
    // Validate status
    const validStatuses = ['PAID', 'CANCELLED'];
    if (!validStatuses.includes(newStatus)) {
      const error = new Error('Invalid payment status');
      error.statusCode = 400;
      throw error;
    }

    // Find payment with invoice details
    const payment = await Payment.findOne({
      where: { id: paymentId },
      include: [
        {
          model: Billing,
          as: 'invoice',
          required: true,
          include: [
            {
              model: Patient,
              as: 'patient',
              attributes: ['id', 'first_name', 'last_name', 'email'],
              where: { is_active: true },
              required: true
            }
          ]
        }
      ]
    });

    if (!payment) {
      const error = new Error('Payment not found');
      error.statusCode = 404;
      throw error;
    }

    const oldStatus = payment.status;

    // Don't update if status is the same
    if (oldStatus === newStatus) {
      return { payment, invoice: payment.invoice };
    }

    // Update payment status
    await payment.update({ status: newStatus });

    // Recalculate invoice amounts
    // Get all PAID payments for this invoice
    const allPayments = await Payment.findAll({
      where: {
        billing_id: payment.billing_id,
        status: 'PAID'
      }
    });

    // Calculate total paid amount (only PAID payments)
    const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const invoice = payment.invoice;
    const amountTotal = parseFloat(invoice.amount_total);
    const newAmountDue = Math.max(0, amountTotal - totalPaid);

    // Determine new invoice status
    let newInvoiceStatus = invoice.status;
    if (newAmountDue === 0 && totalPaid >= amountTotal) {
      newInvoiceStatus = 'PAID';
    } else if (newAmountDue > 0) {
      // Check if overdue
      if (new Date() > new Date(invoice.due_date)) {
        newInvoiceStatus = 'OVERDUE';
      } else if (invoice.status === 'PAID') {
        // If was paid but now has balance, set to SENT
        newInvoiceStatus = 'SENT';
      }
    }

    // Update invoice
    await invoice.update({
      amount_paid: totalPaid,
      amount_due: newAmountDue,
      status: newInvoiceStatus
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'CHANGE_PAYMENT_STATUS',
      resource_type: 'payment',
      resource_id: paymentId,
      changes: {
        action: 'change_payment_status',
        old_status: oldStatus,
        new_status: newStatus,
        payment_amount: parseFloat(payment.amount),
        invoice_id: payment.billing_id,
        invoice_number: invoice.invoice_number,
        new_amount_paid: totalPaid,
        new_amount_due: newAmountDue,
        new_invoice_status: newInvoiceStatus
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    console.log(`✅ Payment ${paymentId} status changed: ${oldStatus} → ${newStatus}`);
    console.log(`   Invoice ${invoice.invoice_number} updated: €${invoice.amount_paid} paid, €${newAmountDue} due`);

    // Reload invoice with all payments to return complete data
    const updatedInvoice = await Billing.findOne({
      where: { id: payment.billing_id },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          where: { is_active: true },
          required: true
        },
        {
          model: Payment,
          as: 'payments',
          attributes: ['id', 'amount', 'payment_method', 'payment_date', 'notes', 'status', 'recorded_by', 'created_at'],
          include: [
            {
              model: User,
              as: 'recorder',
              attributes: ['id', 'username', 'first_name', 'last_name'],
              required: false
            }
          ],
          order: [['payment_date', 'DESC']],
          required: false
        }
      ]
    });

    return { payment, invoice: updatedInvoice };
  } catch (error) {
    console.error('Error in changePaymentStatus:', error);
    throw error;
  }
}

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  recordPayment,
  deleteInvoice,
  sendInvoiceEmail,
  markAsPaid,
  sendInvoiceBatch,
  sendReminderBatch,
  changeInvoiceStatus,
  updatePaymentAmount,
  changePaymentStatus
};