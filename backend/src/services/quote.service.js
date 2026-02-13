/**
 * Quote Service
 * Business logic for quote/estimate management with RBAC scoping.
 */

const db = require('../../../models');
const Quote = db.Quote;
const QuoteItem = db.QuoteItem;
const Client = db.Client;
const Billing = db.Billing;
const Patient = db.Patient;
const { Op } = db.Sequelize;
const { getScopedDietitianIds } = require('../helpers/scopeHelper');
const auditService = require('./audit.service');

/**
 * Apply created_by scoping based on user role.
 */
async function applyCreatorScope(whereClause, user) {
  const dietitianIds = await getScopedDietitianIds(user);
  if (dietitianIds === null) return true;
  if (dietitianIds.length === 0) return false;
  whereClause.created_by = { [Op.in]: dietitianIds };
  return true;
}

/**
 * Calculate totals from items and tax rate
 */
function calculateTotals(items, taxRate) {
  const subtotal = items.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity || 1) * parseFloat(item.unit_price || 0));
  }, 0);
  const rate = parseFloat(taxRate) || 0;
  const tax = subtotal * (rate / 100);
  return {
    amount_subtotal: parseFloat(subtotal.toFixed(2)),
    amount_tax: parseFloat(tax.toFixed(2)),
    amount_total: parseFloat((subtotal + tax).toFixed(2))
  };
}

async function getQuotes(user, filters = {}, requestMetadata = {}) {
  const whereClause = { is_active: true };

  const hasAccess = await applyCreatorScope(whereClause, user);
  if (!hasAccess) {
    return { quotes: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  }

  if (filters.client_id) whereClause.client_id = filters.client_id;
  if (filters.status) whereClause.status = filters.status;

  if (filters.search) {
    whereClause[Op.or] = [
      { quote_number: { [Op.like]: `%${filters.search}%` } },
      { subject: { [Op.like]: `%${filters.search}%` } }
    ];
  }

  if (filters.start_date || filters.end_date) {
    whereClause.quote_date = {};
    if (filters.start_date) whereClause.quote_date[Op.gte] = filters.start_date;
    if (filters.end_date) whereClause.quote_date[Op.lte] = filters.end_date;
  }

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const offset = (page - 1) * limit;

  const { count, rows } = await Quote.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Client, as: 'client',
        attributes: ['id', 'client_type', 'company_name', 'first_name', 'last_name', 'email']
      },
      {
        model: db.User, as: 'creator',
        attributes: ['id', 'username', 'first_name', 'last_name']
      }
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset
  });

  return {
    quotes: rows,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit)
  };
}

async function getQuoteById(id, user, requestMetadata = {}) {
  const whereClause = { id, is_active: true };
  const hasAccess = await applyCreatorScope(whereClause, user);
  if (!hasAccess) {
    const error = new Error('Access denied');
    error.statusCode = 403;
    throw error;
  }

  const quote = await Quote.findOne({
    where: whereClause,
    include: [
      {
        model: Client, as: 'client',
        attributes: ['id', 'client_type', 'company_name', 'first_name', 'last_name', 'email', 'phone',
          'address_line1', 'address_line2', 'city', 'postal_code', 'country', 'siret', 'vat_number', 'contact_person']
      },
      {
        model: QuoteItem, as: 'items',
        order: [['sort_order', 'ASC']]
      },
      {
        model: db.User, as: 'creator',
        attributes: ['id', 'username', 'first_name', 'last_name']
      },
      {
        model: Billing, as: 'invoice',
        attributes: ['id', 'invoice_number', 'status', 'amount_total'],
        required: false
      }
    ],
    order: [[{ model: QuoteItem, as: 'items' }, 'sort_order', 'ASC']]
  });

  if (!quote) {
    const error = new Error('Quote not found');
    error.statusCode = 404;
    throw error;
  }

  return quote;
}

async function createQuote(user, quoteData, requestMetadata = {}) {
  const transaction = await db.sequelize.transaction();

  try {
    // Validate client exists
    const client = await Client.findOne({
      where: { id: quoteData.client_id, is_active: true },
      transaction
    });
    if (!client) {
      const error = new Error('Client not found');
      error.statusCode = 404;
      throw error;
    }

    // Generate quote number (DEV-YYYY-NNNN)
    const currentYear = new Date().getFullYear();
    const lastQuote = await Quote.findOne({
      where: { quote_number: { [Op.like]: `DEV-${currentYear}-%` } },
      order: [['quote_number', 'DESC']],
      transaction
    });

    let nextNumber = 1;
    if (lastQuote) {
      const lastNumber = parseInt(lastQuote.quote_number.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    const quoteNumber = `DEV-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;

    // Calculate totals from items
    const items = quoteData.items || [];
    const totals = calculateTotals(items, quoteData.tax_rate);

    // Default validity: 30 days
    const quoteDate = quoteData.quote_date ? new Date(quoteData.quote_date) : new Date();
    const validityDate = quoteData.validity_date
      ? new Date(quoteData.validity_date)
      : new Date(quoteDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const quote = await Quote.create({
      client_id: quoteData.client_id,
      quote_number: quoteNumber,
      quote_date: quoteDate,
      validity_date: validityDate,
      subject: quoteData.subject || null,
      notes: quoteData.notes || null,
      tax_rate: quoteData.tax_rate || 0,
      ...totals,
      status: 'DRAFT',
      created_by: user.id
    }, { transaction });

    // Create items
    if (items.length > 0) {
      const quoteItems = items.map((item, index) => ({
        quote_id: quote.id,
        item_name: item.item_name,
        description: item.description || null,
        quantity: item.quantity || 1,
        unit_price: item.unit_price,
        sort_order: item.sort_order ?? index
      }));
      await QuoteItem.bulkCreate(quoteItems, { transaction });
    }

    await transaction.commit();

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      resource_type: 'quote',
      resource_id: quote.id,
      new_values: { quote_number: quoteNumber, client_id: quoteData.client_id },
      ...requestMetadata
    });

    // Return with associations
    return getQuoteById(quote.id, user);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function updateQuote(id, user, quoteData, requestMetadata = {}) {
  const transaction = await db.sequelize.transaction();

  try {
    const whereClause = { id, is_active: true };
    const hasAccess = await applyCreatorScope(whereClause, user);
    if (!hasAccess) {
      const error = new Error('Access denied');
      error.statusCode = 403;
      throw error;
    }

    const quote = await Quote.findOne({ where: whereClause, transaction });
    if (!quote) {
      const error = new Error('Quote not found');
      error.statusCode = 404;
      throw error;
    }

    if (quote.status !== 'DRAFT') {
      const error = new Error('Only DRAFT quotes can be edited');
      error.statusCode = 400;
      throw error;
    }

    const oldValues = quote.toJSON();

    // Increment version suffix on quote_number
    // Base format: DEV-YYYY-NNNN → first edit: DEV-YYYY-NNNN-02, then -03, etc.
    const currentNumber = quote.quote_number;
    // Match base (DEV-YYYY-NNNN) + optional version suffix (-02, -03, ...)
    const parts = currentNumber.match(/^(.+-\d{4})-(\d{2})$/);
    let newQuoteNumber;
    if (parts) {
      // Already versioned: increment
      const nextVersion = parseInt(parts[2], 10) + 1;
      newQuoteNumber = `${parts[1]}-${nextVersion.toString().padStart(2, '0')}`;
    } else {
      // First revision
      newQuoteNumber = `${currentNumber}-02`;
    }

    // Recalculate totals if items provided
    const updateData = { ...quoteData, quote_number: newQuoteNumber };
    if (quoteData.items) {
      const totals = calculateTotals(quoteData.items, quoteData.tax_rate ?? quote.tax_rate);
      Object.assign(updateData, totals);

      // Replace items
      await QuoteItem.destroy({ where: { quote_id: id }, transaction });
      const quoteItems = quoteData.items.map((item, index) => ({
        quote_id: id,
        item_name: item.item_name,
        description: item.description || null,
        quantity: item.quantity || 1,
        unit_price: item.unit_price,
        sort_order: item.sort_order ?? index
      }));
      if (quoteItems.length > 0) {
        await QuoteItem.bulkCreate(quoteItems, { transaction });
      }
      delete updateData.items;
    }

    await quote.update(updateData, { transaction });
    await transaction.commit();

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      resource_type: 'quote',
      resource_id: id,
      old_values: oldValues,
      new_values: quoteData,
      ...requestMetadata
    });

    return getQuoteById(id, user);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function deleteQuote(id, user, requestMetadata = {}) {
  const quote = await Quote.findOne({ where: { id, is_active: true } });
  if (!quote) {
    const error = new Error('Quote not found');
    error.statusCode = 404;
    throw error;
  }

  await quote.update({ is_active: false });

  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'DELETE',
    resource_type: 'quote',
    resource_id: id,
    ...requestMetadata
  });

  return { message: 'Quote deleted successfully' };
}

async function changeQuoteStatus(id, user, status, data = {}, requestMetadata = {}) {
  const whereClause = { id, is_active: true };
  const hasAccess = await applyCreatorScope(whereClause, user);
  if (!hasAccess) {
    const error = new Error('Access denied');
    error.statusCode = 403;
    throw error;
  }

  const quote = await Quote.findOne({ where: whereClause });
  if (!quote) {
    const error = new Error('Quote not found');
    error.statusCode = 404;
    throw error;
  }

  // Validate transitions
  const validTransitions = {
    'DRAFT': ['SENT'],
    'SENT': ['ACCEPTED', 'DECLINED', 'EXPIRED'],
    'ACCEPTED': [],
    'DECLINED': [],
    'EXPIRED': []
  };

  if (!validTransitions[quote.status]?.includes(status)) {
    const error = new Error(`Cannot change status from ${quote.status} to ${status}`);
    error.statusCode = 400;
    throw error;
  }

  const updateData = { status };
  if (status === 'ACCEPTED') updateData.accepted_date = new Date();
  if (status === 'DECLINED') {
    updateData.declined_date = new Date();
    if (data.declined_reason) updateData.declined_reason = data.declined_reason;
  }

  const oldStatus = quote.status;
  await quote.update(updateData);

  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'STATUS_CHANGE',
    resource_type: 'quote',
    resource_id: id,
    old_values: { status: oldStatus },
    new_values: { status },
    ...requestMetadata
  });

  return quote;
}

async function convertToInvoice(id, user, requestMetadata = {}) {
  const transaction = await db.sequelize.transaction();

  try {
    const quote = await Quote.findOne({
      where: { id, is_active: true },
      include: [
        { model: QuoteItem, as: 'items' },
        { model: Client, as: 'client' }
      ],
      transaction
    });

    if (!quote) {
      const error = new Error('Quote not found');
      error.statusCode = 404;
      throw error;
    }

    if (quote.status !== 'ACCEPTED') {
      const error = new Error('Only ACCEPTED quotes can be converted to invoices');
      error.statusCode = 400;
      throw error;
    }

    if (quote.billing_id) {
      const error = new Error('Quote has already been converted to an invoice');
      error.statusCode = 400;
      throw error;
    }

    // If client has no patient_id, auto-create a patient
    let patientId = quote.client?.patient_id;
    if (!patientId) {
      const patient = await Patient.create({
        first_name: quote.client.client_type === 'person' ? quote.client.first_name : (quote.client.contact_person || quote.client.company_name),
        last_name: quote.client.client_type === 'person' ? quote.client.last_name : '',
        email: quote.client.email,
        phone: quote.client.phone,
        status: 'ACTIVE',
        assigned_dietitian_id: user.id
      }, { transaction });

      patientId = patient.id;

      // Link patient to client
      await quote.client.update({ patient_id: patientId }, { transaction });

      // Create PatientDietitian link
      await db.PatientDietitian.findOrCreate({
        where: { patient_id: patientId, dietitian_id: user.id },
        defaults: { patient_id: patientId, dietitian_id: user.id },
        transaction
      });
    }

    // Generate invoice number
    const currentYear = new Date().getFullYear();
    const lastInvoice = await Billing.findOne({
      where: { invoice_number: { [Op.like]: `INV-${currentYear}-%` } },
      order: [['invoice_number', 'DESC']],
      transaction
    });

    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoice_number.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    const invoiceNumber = `INV-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;

    // Build service description from items
    const serviceDesc = quote.items?.map(i => i.item_name).join(', ') || quote.subject || '';

    const invoice = await Billing.create({
      patient_id: patientId,
      invoice_number: invoiceNumber,
      invoice_date: new Date(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      service_description: serviceDesc,
      amount_total: quote.amount_total,
      amount_paid: 0,
      amount_due: quote.amount_total,
      status: 'DRAFT',
      notes: `Converted from quote ${quote.quote_number}`
    }, { transaction });

    // Link quote to invoice
    await quote.update({ billing_id: invoice.id }, { transaction });

    await transaction.commit();

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'CONVERT_TO_INVOICE',
      resource_type: 'quote',
      resource_id: id,
      new_values: { billing_id: invoice.id, invoice_number: invoiceNumber },
      ...requestMetadata
    });

    return { quote, invoice };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function duplicateQuote(id, user, requestMetadata = {}) {
  const original = await Quote.findOne({
    where: { id, is_active: true },
    include: [{ model: QuoteItem, as: 'items' }]
  });

  if (!original) {
    const error = new Error('Quote not found');
    error.statusCode = 404;
    throw error;
  }

  const items = (original.items || []).map(item => ({
    item_name: item.item_name,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    sort_order: item.sort_order
  }));

  return createQuote(user, {
    client_id: original.client_id,
    subject: original.subject,
    notes: original.notes,
    tax_rate: original.tax_rate,
    items
  }, requestMetadata);
}

async function sendQuoteEmail(id, user, requestMetadata = {}) {
  const quote = await Quote.findOne({
    where: { id, is_active: true },
    include: [
      { model: Client, as: 'client' },
      { model: QuoteItem, as: 'items' }
    ]
  });

  if (!quote) {
    const error = new Error('Quote not found');
    error.statusCode = 404;
    throw error;
  }

  if (!quote.client?.email) {
    const error = new Error('Client has no email address');
    error.statusCode = 400;
    throw error;
  }

  // Generate PDF
  const { generateQuotePDF } = require('./quotePDF.service');
  const pdfDoc = await generateQuotePDF(id, user.id, quote.client.language_preference || 'fr');

  // Collect PDF buffer
  const chunks = [];
  await new Promise((resolve, reject) => {
    pdfDoc.on('data', chunk => chunks.push(chunk));
    pdfDoc.on('end', resolve);
    pdfDoc.on('error', reject);
  });
  const pdfBuffer = Buffer.concat(chunks);

  // Send email via template system
  const emailService = require('./email.service');
  let emailStatus = 'SUCCESS';
  let errorMessage = null;

  try {
    await emailService.sendEmailFromTemplate({
      templateSlug: 'quote_notification',
      to: quote.client.email,
      variables: {
        quote: quote,
        client: quote.client,
        dietitian: user
      },
      user: user,
      sendingUserId: user.id,
      languageCode: quote.client.language_preference || 'fr',
      attachments: [{
        filename: `${quote.quote_number}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });
  } catch (emailError) {
    emailStatus = 'FAILED';
    errorMessage = emailError.message;
    console.error('❌ Quote email send failed:', emailError);
  }

  // Update status to SENT if currently DRAFT and email succeeded
  if (quote.status === 'DRAFT' && emailStatus === 'SUCCESS') {
    await quote.update({ status: 'SENT' });
  }

  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'SEND_EMAIL',
    resource_type: 'quote',
    resource_id: id,
    details: `Sent to ${quote.client.email}`,
    ...requestMetadata
  });

  if (emailStatus === 'FAILED') {
    const error = new Error('Failed to send quote email: ' + errorMessage);
    error.statusCode = 500;
    throw error;
  }

  return { message: 'Quote sent successfully', status: quote.status };
}

module.exports = {
  getQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  deleteQuote,
  changeQuoteStatus,
  convertToInvoice,
  duplicateQuote,
  sendQuoteEmail
};
