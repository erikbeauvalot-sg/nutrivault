/**
 * Billing Controller
 *
 * HTTP request handlers for billing/invoice management.
 * Thin controllers that delegate business logic to billing service.
 */

const billingService = require('../services/billing.service');

/**
 * Extract request metadata for audit logging
 * @param {Object} req - Express request object
 * @returns {Object} Request metadata
 */
function getRequestMetadata(req) {
  return {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.originalUrl
  };
}

/**
 * GET /api/billing - Get all invoices
 */
exports.getAllInvoices = async (req, res, next) => {
  try {
    const user = req.user;
    const filters = {
      patient_id: req.query.patient_id,
      status: req.query.status,
      search: req.query.search,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      page: req.query.page,
      limit: req.query.limit
    };
    const requestMetadata = getRequestMetadata(req);

    const result = await billingService.getInvoices(user, filters, requestMetadata);

    res.json({
      success: true,
      data: result.invoices,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/billing/:id - Get invoice by ID
 */
exports.getInvoiceById = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const requestMetadata = getRequestMetadata(req);

    const invoice = await billingService.getInvoiceById(id, user, requestMetadata);

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/billing - Create new invoice
 */
exports.createInvoice = async (req, res, next) => {
  try {
    const user = req.user;
    const invoiceData = req.body;
    const requestMetadata = getRequestMetadata(req);

    const invoice = await billingService.createInvoice(invoiceData, user, requestMetadata);

    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Invoice created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/billing/:id - Update invoice
 */
exports.updateInvoice = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const updateData = req.body;
    const requestMetadata = getRequestMetadata(req);

    const invoice = await billingService.updateInvoice(id, updateData, user, requestMetadata);

    res.json({
      success: true,
      data: invoice,
      message: 'Invoice updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/billing/:id/payment - Record payment
 */
exports.recordPayment = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const paymentData = req.body;
    const requestMetadata = getRequestMetadata(req);

    const invoice = await billingService.recordPayment(id, paymentData, user, requestMetadata);

    res.json({
      success: true,
      data: invoice,
      message: 'Payment recorded successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/billing/:id - Delete invoice
 */
exports.deleteInvoice = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const requestMetadata = getRequestMetadata(req);

    await billingService.deleteInvoice(id, user, requestMetadata);

    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/billing/:id/send-email - Send invoice by email
 */
exports.sendInvoiceEmail = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const requestMetadata = getRequestMetadata(req);

    const result = await billingService.sendInvoiceEmail(id, user, requestMetadata);

    res.json({
      success: true,
      data: result,
      message: 'Invoice email sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/billing/:id/mark-paid - Mark invoice as paid
 */
exports.markAsPaid = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const requestMetadata = getRequestMetadata(req);

    const invoice = await billingService.markAsPaid(id, user, requestMetadata);

    res.json({
      success: true,
      data: invoice,
      message: 'Invoice marked as paid successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/billing/batch/send-invoices - Send multiple invoices by email
 */
exports.sendInvoiceBatch = async (req, res, next) => {
  try {
    const user = req.user;
    const { invoice_ids } = req.body;
    const requestMetadata = getRequestMetadata(req);

    if (!invoice_ids || !Array.isArray(invoice_ids) || invoice_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'invoice_ids array is required and must not be empty'
      });
    }

    const result = await billingService.sendInvoiceBatch(invoice_ids, user, requestMetadata);

    res.json({
      success: true,
      data: result,
      message: `Batch send completed: ${result.successful.length} successful, ${result.failed.length} failed`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/billing/batch/send-reminders - Send payment reminders for multiple invoices
 */
exports.sendReminderBatch = async (req, res, next) => {
  try {
    const user = req.user;
    const { invoice_ids } = req.body;
    const requestMetadata = getRequestMetadata(req);

    if (!invoice_ids || !Array.isArray(invoice_ids) || invoice_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'invoice_ids array is required and must not be empty'
      });
    }

    const result = await billingService.sendReminderBatch(invoice_ids, user, requestMetadata);

    res.json({
      success: true,
      data: result,
      message: `Batch reminders completed: ${result.successful.length} successful, ${result.failed.length} failed`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/billing/:id/status - Change invoice status (admin override)
 */
exports.changeInvoiceStatus = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { status } = req.body;
    const requestMetadata = getRequestMetadata(req);

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const invoice = await billingService.changeInvoiceStatus(id, status, user, requestMetadata);

    res.json({
      success: true,
      data: invoice,
      message: 'Invoice status changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/billing/:id/payment-amount - Update payment amount (admin override)
 */
exports.updatePaymentAmount = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { amount_paid } = req.body;
    const requestMetadata = getRequestMetadata(req);

    if (amount_paid === undefined || amount_paid === null) {
      return res.status(400).json({
        success: false,
        error: 'amount_paid is required'
      });
    }

    const invoice = await billingService.updatePaymentAmount(id, amount_paid, user, requestMetadata);

    res.json({
      success: true,
      data: invoice,
      message: 'Payment amount updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/billing/payments/:paymentId/status - Change payment status
 */
exports.changePaymentStatus = async (req, res, next) => {
  try {
    const user = req.user;
    const { paymentId } = req.params;
    const { status } = req.body;
    const requestMetadata = getRequestMetadata(req);

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const result = await billingService.changePaymentStatus(paymentId, status, user, requestMetadata);

    res.json({
      success: true,
      data: result,
      message: 'Payment status changed successfully'
    });
  } catch (error) {
    next(error);
  }
};