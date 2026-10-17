/**
 * Finance Service
 * Composite service for finance dashboard: P&L, aging report, cash flow.
 * Queries Billing + Expense data with RBAC scoping.
 */

const db = require('../../../models');
const { Op } = db.Sequelize;
const { getScopedPatientIds, getScopedDietitianIds } = require('../helpers/scopeHelper');
const {
  toISODate,
  effectiveCashDate,
  secondOfNextMonth,
  nextDay,
  cashDateExpr,
  cashDateRangeWhere
} = require('../helpers/cashDate');
const auditService = require('./audit.service');
const { assertValidBankAccount, bankAccountAfterLocationChange } = require('../helpers/bankAccounts');

/**
 * Build billing scope where clause (via patient)
 */
async function buildBillingWhere(user, baseWhere = {}) {
  const patientIds = await getScopedPatientIds(user);
  if (patientIds === null) return baseWhere; // ADMIN
  if (patientIds.length === 0) return { ...baseWhere, id: null };
  return { ...baseWhere, patient_id: { [Op.in]: patientIds } };
}

/**
 * Build expense scope where clause (via created_by)
 */
async function buildExpenseWhere(user, baseWhere = {}) {
  const dietitianIds = await getScopedDietitianIds(user);
  if (dietitianIds === null) return baseWhere; // ADMIN
  if (dietitianIds.length === 0) return { ...baseWhere, id: null };
  return { ...baseWhere, created_by: { [Op.in]: dietitianIds } };
}

/**
 * Build accounting entry scope where clause (via created_by) — same as expense
 */
async function buildEntryWhere(user, baseWhere = {}) {
  const dietitianIds = await getScopedDietitianIds(user);
  if (dietitianIds === null) return baseWhere; // ADMIN
  if (dietitianIds.length === 0) return { ...baseWhere, id: null };
  return { ...baseWhere, created_by: { [Op.in]: dietitianIds } };
}

/**
 * Bank account filter: undefined/'' = all accounts, 'none' = not assigned, else an account code
 */
function bankAccountWhere(bankAccount) {
  if (!bankAccount) return {};
  return { bank_account_code: bankAccount === 'none' ? null : bankAccount };
}

/**
 * Get finance dashboard KPIs
 */
async function getDashboard(user, filters = {}) {
  const dateFilter = {};
  if (filters.start_date) dateFilter[Op.gte] = filters.start_date;
  if (filters.end_date) dateFilter[Op.lte] = filters.end_date;

  const billingDateWhere = (filters.start_date || filters.end_date)
    ? { invoice_date: dateFilter }
    : {};
  const expenseDateWhere = (filters.start_date || filters.end_date)
    ? { expense_date: dateFilter }
    : {};
  const entryDateWhere = (filters.start_date || filters.end_date)
    ? { entry_date: dateFilter }
    : {};

  // Total revenue (amount_paid from billing), bucketed by cash date (date d'encaissement)
  const revenueResult = await db.Billing.findOne({
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('amount_paid')), 'total']
    ],
    where: await buildBillingWhere(user, {
      ...cashDateRangeWhere(filters.start_date, filters.end_date),
      is_active: true
    }),
    raw: true
  });
  const totalRevenue = parseFloat(revenueResult?.total || 0);

  // Total expenses
  const expenseResult = await db.Expense.findOne({
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
    ],
    where: await buildExpenseWhere(user, { ...expenseDateWhere, is_active: true }),
    raw: true
  });
  const totalExpenses = parseFloat(expenseResult?.total || 0);

  // Total adjustments (sum of signed amounts from accounting entries)
  const adjustmentResult = await db.AccountingEntry.findOne({
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
    ],
    where: await buildEntryWhere(user, { ...entryDateWhere, is_active: true }),
    raw: true
  });
  const totalAdjustments = parseFloat(adjustmentResult?.total || 0);

  // Net profit
  const netProfit = totalRevenue - totalExpenses + totalAdjustments;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  // Total billed (amount_total)
  const billedResult = await db.Billing.findOne({
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('amount_total')), 'total']
    ],
    where: await buildBillingWhere(user, { ...billingDateWhere, is_active: true }),
    raw: true
  });
  const totalBilled = parseFloat(billedResult?.total || 0);

  // Collection rate
  const collectionRate = totalBilled > 0 ? ((totalRevenue / totalBilled) * 100).toFixed(1) : '100.0';

  // Overdue invoices
  const overdueResult = await db.Billing.findOne({
    attributes: [
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
      [db.sequelize.fn('SUM', db.sequelize.col('amount_due')), 'total']
    ],
    where: await buildBillingWhere(user, {
      status: { [Op.in]: ['SENT', 'OVERDUE'] },
      amount_due: { [Op.gt]: 0 },
      is_active: true
    }),
    raw: true
  });

  // Average payment days (from invoices that are PAID)
  const paidInvoices = await db.Billing.findAll({
    attributes: ['invoice_date', 'updated_at'],
    where: await buildBillingWhere(user, {
      status: 'PAID',
      is_active: true,
      ...billingDateWhere
    }),
    raw: true,
    limit: 200
  });

  let avgPaymentDays = 0;
  if (paidInvoices.length > 0) {
    const totalDays = paidInvoices.reduce((sum, inv) => {
      const invoiceDate = new Date(inv.invoice_date);
      const paidDate = new Date(inv.updated_at);
      const days = Math.max(0, Math.floor((paidDate - invoiceDate) / 86400000));
      return sum + days;
    }, 0);
    avgPaymentDays = Math.round(totalDays / paidInvoices.length);
  }

  return {
    totalRevenue,
    totalExpenses,
    totalAdjustments,
    netProfit,
    profitMargin: parseFloat(profitMargin),
    collectionRate: parseFloat(collectionRate),
    overdueCount: parseInt(overdueResult?.count || 0, 10),
    overdueAmount: parseFloat(overdueResult?.total || 0),
    avgPaymentDays,
    totalBilled
  };
}

/**
 * Get aging report — unpaid invoices + accounting entries grouped by age brackets
 */
async function getAgingReport(user) {
  const now = new Date();

  const invoices = await db.Billing.findAll({
    where: await buildBillingWhere(user, {
      status: { [Op.in]: ['SENT', 'OVERDUE'] },
      amount_due: { [Op.gt]: 0 },
      is_active: true
    }),
    include: [
      { model: db.Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name'] },
      { model: db.InvoiceEmail, as: 'email_history', attributes: ['id', 'sent_at'], required: false }
    ],
    order: [['due_date', 'ASC']]
  });

  const makeBrackets = () => [
    { label: '0-30', min: 0, max: 30, count: 0, totalDue: 0, invoices: [] },
    { label: '31-60', min: 31, max: 60, count: 0, totalDue: 0, invoices: [] },
    { label: '61-90', min: 61, max: 90, count: 0, totalDue: 0, invoices: [] },
    { label: '90+', min: 91, max: Infinity, count: 0, totalDue: 0, invoices: [] }
  ];

  const brackets = makeBrackets();
  let totalOverdue = 0;
  let totalAmount = 0;

  for (const inv of invoices) {
    const dueDate = new Date(inv.due_date || inv.invoice_date);
    const daysOverdue = Math.max(0, Math.floor((now - dueDate) / 86400000));
    const amountDue = parseFloat(inv.amount_due || 0);

    totalOverdue++;
    totalAmount += amountDue;

    const invoiceData = {
      id: inv.id,
      invoice_number: inv.invoice_number,
      patient: inv.patient ? {
        id: inv.patient.id,
        first_name: inv.patient.first_name,
        last_name: inv.patient.last_name
      } : null,
      due_date: inv.due_date || inv.invoice_date,
      amount_due: amountDue,
      days_overdue: daysOverdue,
      reminders_sent: inv.email_history ? inv.email_history.length : 0,
      last_reminder: inv.email_history && inv.email_history.length > 0
        ? inv.email_history[inv.email_history.length - 1].sent_at
        : null
    };

    for (const bracket of brackets) {
      if (daysOverdue >= bracket.min && daysOverdue <= bracket.max) {
        bracket.count++;
        bracket.totalDue += amountDue;
        bracket.invoices.push(invoiceData);
        break;
      }
    }
  }

  // Draft invoices — not yet sent
  const draftInvoices = await db.Billing.findAll({
    where: await buildBillingWhere(user, {
      status: 'DRAFT',
      is_active: true
    }),
    include: [
      { model: db.Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name'] }
    ],
    order: [['invoice_date', 'DESC']]
  });

  const draftList = draftInvoices.map(inv => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    patient: inv.patient ? {
      id: inv.patient.id,
      first_name: inv.patient.first_name,
      last_name: inv.patient.last_name
    } : null,
    invoice_date: inv.invoice_date,
    amount_total: parseFloat(inv.amount_total || 0)
  }));
  const totalDraftAmount = draftList.reduce((sum, inv) => sum + inv.amount_total, 0);

  // Accounting entries — grouped by age from entry_date
  const entryBrackets = makeBrackets();
  let totalEntries = 0;
  let totalEntriesAmount = 0;

  const entries = await db.AccountingEntry.findAll({
    where: await buildEntryWhere(user, { is_active: true }),
    order: [['entry_date', 'ASC']]
  });

  for (const entry of entries) {
    const entryDate = new Date(entry.entry_date);
    const daysOld = Math.max(0, Math.floor((now - entryDate) / 86400000));
    const amount = parseFloat(entry.amount || 0);

    totalEntries++;
    totalEntriesAmount += amount;

    const entryData = {
      id: entry.id,
      entry_date: entry.entry_date,
      description: entry.description,
      entry_type: entry.entry_type,
      category: entry.category,
      reference: entry.reference,
      amount,
      days_old: daysOld
    };

    for (const bracket of entryBrackets) {
      if (daysOld >= bracket.min && daysOld <= bracket.max) {
        bracket.count++;
        bracket.totalDue += amount;
        bracket.invoices.push(entryData);
        break;
      }
    }
  }

  return {
    brackets: brackets.map(b => ({
      label: b.label,
      count: b.count,
      totalDue: parseFloat(b.totalDue.toFixed(2)),
      invoices: b.invoices
    })),
    totalOverdue,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    draftInvoices: draftList,
    totalDraftCount: draftList.length,
    totalDraftAmount: parseFloat(totalDraftAmount.toFixed(2)),
    entryBrackets: entryBrackets.map(b => ({
      label: b.label,
      count: b.count,
      totalAmount: parseFloat(b.totalDue.toFixed(2)),
      entries: b.invoices
    })),
    totalEntries,
    totalEntriesAmount: parseFloat(totalEntriesAmount.toFixed(2))
  };
}

/**
 * Get revenue — paid invoices list with optional date range filter
 */
async function getRevenue(user, filters = {}) {
  // Revenue is listed by cash date (date d'encaissement, defaults to invoice date)
  const billingWhere = await buildBillingWhere(user, {
    status: 'PAID',
    is_active: true,
    ...cashDateRangeWhere(filters.start_date, filters.end_date),
    ...bankAccountWhere(filters.bank_account)
  });

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 25;
  const offset = (page - 1) * limit;

  const { count, rows } = await db.Billing.findAndCountAll({
    where: billingWhere,
    include: [
      { model: db.Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name'] }
    ],
    order: [[cashDateExpr(), 'DESC'], ['invoice_date', 'DESC']],
    limit,
    offset,
    distinct: true
  });

  // Total over the whole filtered period, not only the current page
  const totalResult = await db.Billing.findOne({
    attributes: [[db.sequelize.fn('SUM', db.sequelize.col('amount_paid')), 'total']],
    where: billingWhere,
    raw: true
  });
  const totalPaid = parseFloat(totalResult?.total || 0);

  return {
    invoices: rows.map(inv => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      patient: inv.patient ? {
        id: inv.patient.id,
        first_name: inv.patient.first_name,
        last_name: inv.patient.last_name
      } : null,
      invoice_date: inv.invoice_date,
      payment_date: inv.payment_date,
      cash_date: effectiveCashDate(inv),
      cash_date_overridden: !!inv.cash_date,
      amount_total: parseFloat(inv.amount_total || 0),
      amount_paid: parseFloat(inv.amount_paid || 0),
      payment_method: inv.payment_method,
      location_code: inv.location_code || null,
      bank_account_code: inv.bank_account_code || null,
      service_description: inv.service_description || ''
    })),
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
    totalPaid: parseFloat(totalPaid.toFixed(2))
  };
}

/**
 * Get cash flow data — monthly revenue vs expenses for 12 months
 */
async function getCashFlow(user, filters = {}) {
  const now = new Date();
  const data = [];

  for (let i = 11; i >= 0; i--) {
    const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const pad = (n) => String(n).padStart(2, '0');
    const monthStart = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-01`;
    const monthEnd = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;

    // Revenue for this month, by cash date (date d'encaissement)
    const revenueResult = await db.Billing.findOne({
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('amount_paid')), 'total']
      ],
      where: await buildBillingWhere(user, {
        ...cashDateRangeWhere(monthStart, monthEnd),
        ...bankAccountWhere(filters.bank_account),
        is_active: true
      }),
      raw: true
    });

    // Expenses for this month
    const expenseResult = await db.Expense.findOne({
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
      ],
      where: await buildExpenseWhere(user, {
        expense_date: { [Op.gte]: startDate, [Op.lte]: endDate },
        ...bankAccountWhere(filters.bank_account),
        is_active: true
      }),
      raw: true
    });

    // Adjustments for this month
    const adjustmentResult = await db.AccountingEntry.findOne({
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
      ],
      where: await buildEntryWhere(user, {
        entry_date: { [Op.gte]: startDate, [Op.lte]: endDate },
        ...bankAccountWhere(filters.bank_account),
        is_active: true
      }),
      raw: true
    });

    const revenue = parseFloat(revenueResult?.total || 0);
    const expenses = parseFloat(expenseResult?.total || 0);
    const adjustments = parseFloat(adjustmentResult?.total || 0);

    data.push({
      month: startDate.toISOString().slice(0, 7),
      monthLabel: startDate.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      revenue,
      expenses,
      adjustments,
      net: revenue - expenses + adjustments
    });
  }

  return data;
}

/**
 * Get forecast — upcoming scheduled visits with estimated revenue
 * Groups by month and uses VisitType.default_price (or existing invoice amount) per visit
 */
async function getForecast(user, filters = {}) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Default: next 3 months (end of day on last day); honour explicit end_date filter
  const endDate = filters.end_date
    ? new Date(filters.end_date)
    : new Date(now.getFullYear(), now.getMonth() + 4, 0, 23, 59, 59);

  const visitWhere = {
    visit_date: { [Op.gte]: today, [Op.lte]: endDate },
    status: { [Op.in]: ['SCHEDULED', 'REQUESTED'] }
  };

  // RBAC scope
  const dietitianIds = await getScopedDietitianIds(user);
  if (dietitianIds !== null) {
    if (dietitianIds.length === 0) return { visits: [], byMonth: [], totalExpected: 0 };
    visitWhere.dietitian_id = { [Op.in]: dietitianIds };
  }

  const visits = await db.Visit.findAll({
    where: visitWhere,
    include: [
      { model: db.Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name'] },
      { model: db.Billing, as: 'billing', required: false, attributes: ['id', 'amount_total', 'status'] }
    ],
    order: [['visit_date', 'ASC']]
  });

  // Batch-load all needed VisitTypes in one query
  const visitTypeNames = [...new Set(visits.map(v => v.visit_type).filter(Boolean))];
  const visitTypes = visitTypeNames.length > 0
    ? await db.VisitType.findAll({
        where: { name: { [Op.in]: visitTypeNames }, is_active: true },
        attributes: ['name', 'default_price']
      })
    : [];
  const priceByType = {};
  visitTypes.forEach(vt => { priceByType[vt.name] = parseFloat(vt.default_price || 0); });

  // Build visit list with estimated amount
  const visitList = visits.map(v => {
    // Use existing invoice amount if available; otherwise VisitType default_price
    const estimatedAmount = v.billing
      ? parseFloat(v.billing.amount_total || 0)
      : (v.visit_type ? (priceByType[v.visit_type] || 0) : 0);

    return {
      id: v.id,
      visit_date: v.visit_date,
      visit_type: v.visit_type,
      status: v.status,
      patient: v.patient ? {
        id: v.patient.id,
        first_name: v.patient.first_name,
        last_name: v.patient.last_name
      } : null,
      estimated_amount: parseFloat(estimatedAmount.toFixed(2)),
      has_invoice: !!v.billing,
      invoice_status: v.billing?.status || null
    };
  });

  // Group by month
  const byMonthMap = {};
  let totalExpected = 0;
  for (const v of visitList) {
    const d = new Date(v.visit_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonthMap[key]) {
      byMonthMap[key] = {
        month: key,
        monthLabel: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        count: 0,
        expectedRevenue: 0
      };
    }
    byMonthMap[key].count++;
    byMonthMap[key].expectedRevenue += v.estimated_amount;
    totalExpected += v.estimated_amount;
  }

  const byMonth = Object.values(byMonthMap).map(m => ({
    ...m,
    expectedRevenue: parseFloat(m.expectedRevenue.toFixed(2))
  }));

  return {
    visits: visitList,
    byMonth,
    totalExpected: parseFloat(totalExpected.toFixed(2)),
    totalVisits: visitList.length
  };
}

/**
 * Load invoices the user may change the cash date of
 * @returns {Promise<Array>} Billing records (throws 404 if any is missing or out of scope)
 */
async function findScopedInvoices(user, billingIds) {
  const uniqueIds = [...new Set(billingIds)];
  const invoices = await db.Billing.findAll({
    where: await buildBillingWhere(user, { id: { [Op.in]: uniqueIds }, is_active: true })
  });
  if (invoices.length !== uniqueIds.length) {
    const error = new Error('Invoice not found');
    error.statusCode = 404;
    throw error;
  }
  return invoices;
}

/**
 * Apply a new cash date to each invoice, tracking the change in update_log and audit
 * @param {Function} computeDate - (invoice) => YYYY-MM-DD or null (reset to invoice date)
 */
async function applyCashDates(user, billingIds, computeDate, action, requestMetadata = {}) {
  const invoices = await findScopedInvoices(user, billingIds);
  const now = new Date().toISOString();

  const updated = await db.sequelize.transaction(async (transaction) => {
    const results = [];
    for (const invoice of invoices) {
      const oldEffective = effectiveCashDate(invoice);
      const newValue = computeDate(invoice);
      // Store NULL when the date matches the invoice date, so it keeps following it
      const stored = newValue && newValue !== toISODate(invoice.invoice_date) ? newValue : null;

      if (stored !== (invoice.cash_date || null)) {
        const log = invoice.update_log || [];
        log.push({
          field: 'cash_date',
          old_value: oldEffective,
          new_value: stored || toISODate(invoice.invoice_date),
          changed_by: { id: user.id, username: user.username },
          changed_at: now
        });
        await invoice.update({ cash_date: stored, update_log: log }, { transaction });
      }

      results.push({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        cash_date: effectiveCashDate(invoice),
        cash_date_overridden: !!invoice.cash_date
      });
    }
    return results;
  });

  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    resource_type: 'billing',
    resource_id: updated.length === 1 ? updated[0].id : null,
    changes: { action, invoices: updated.map(inv => ({ id: inv.id, cash_date: inv.cash_date })) },
    ip_address: requestMetadata.ip,
    user_agent: requestMetadata.userAgent
  });

  return updated;
}

/**
 * Set the cash date (date d'encaissement) of invoices
 * @param {string|null} cashDate - YYYY-MM-DD, or null to reset to the invoice date
 */
async function setCashDate(user, billingIds, cashDate, requestMetadata = {}) {
  const value = cashDate ? toISODate(cashDate) : null;
  return applyCashDates(user, billingIds, () => value, 'set_cash_date', requestMetadata);
}

/**
 * Move the cash date of invoices to the 2nd of the month after their current cash date
 */
async function shiftCashDateToNextMonth(user, billingIds, requestMetadata = {}) {
  return applyCashDates(
    user,
    billingIds,
    (invoice) => secondOfNextMonth(effectiveCashDate(invoice)),
    'shift_cash_date_next_month',
    requestMetadata
  );
}

/**
 * Set the practice location of several invoices (null clears it)
 */
async function setLocation(user, billingIds, locationCode, requestMetadata = {}) {
  if (!(await db.PracticeLocation.isValidCode(locationCode))) {
    const error = new Error('Location not found');
    error.statusCode = 400;
    throw error;
  }
  const invoices = await findScopedInvoices(user, billingIds);
  const now = new Date().toISOString();

  const updated = await db.sequelize.transaction(async (transaction) => {
    const results = [];
    for (const invoice of invoices) {
      if ((invoice.location_code || null) !== locationCode) {
        const changes = {
          location_code: locationCode,
          // The account follows the location unless it was chosen by hand
          bank_account_code: await bankAccountAfterLocationChange(invoice, locationCode)
        };
        const log = changeLog(invoice, changes, user, now);
        await invoice.update({ ...changes, update_log: log }, { transaction });
      }
      results.push({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        location_code: invoice.location_code || null,
        bank_account_code: invoice.bank_account_code || null
      });
    }
    return results;
  });

  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    resource_type: 'billing',
    resource_id: updated.length === 1 ? updated[0].id : null,
    changes: { action: 'set_location', location_code: locationCode, invoices: updated.map(inv => inv.id) },
    ip_address: requestMetadata.ip,
    user_agent: requestMetadata.userAgent
  });

  return updated;
}

/**
 * update_log entries for the fields of `changes` that differ from the invoice
 */
function changeLog(invoice, changes, user, now) {
  const log = [...(invoice.update_log || [])];
  for (const [field, value] of Object.entries(changes)) {
    const oldValue = field === 'cash_date' ? effectiveCashDate(invoice) : (invoice[field] ?? null);
    const newValue = field === 'cash_date' ? (value || toISODate(invoice.invoice_date)) : (value ?? null);
    if (String(oldValue ?? '') !== String(newValue ?? '')) {
      log.push({
        field,
        old_value: oldValue,
        new_value: newValue,
        changed_by: { id: user.id, username: user.username },
        changed_at: now
      });
    }
  }
  return log;
}

/**
 * Set the bank account of several invoices (null clears it)
 */
async function setBankAccount(user, billingIds, bankAccountCode, requestMetadata = {}) {
  await assertValidBankAccount(bankAccountCode);
  const invoices = await findScopedInvoices(user, billingIds);
  const now = new Date().toISOString();

  const updated = await db.sequelize.transaction(async (transaction) => {
    const results = [];
    for (const invoice of invoices) {
      if ((invoice.bank_account_code || null) !== bankAccountCode) {
        const changes = { bank_account_code: bankAccountCode };
        await invoice.update({ ...changes, update_log: changeLog(invoice, changes, user, now) }, { transaction });
      }
      results.push({ id: invoice.id, invoice_number: invoice.invoice_number, bank_account_code: invoice.bank_account_code || null });
    }
    return results;
  });

  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    resource_type: 'billing',
    resource_id: updated.length === 1 ? updated[0].id : null,
    changes: { action: 'set_bank_account', bank_account_code: bankAccountCode, invoices: updated.map(inv => inv.id) },
    ip_address: requestMetadata.ip,
    user_agent: requestMetadata.userAgent
  });

  return updated;
}

/**
 * Edit a revenue (paid invoice) from the revenue page.
 *
 * `amount` changes the invoice total AND the amount received together (the
 * invoice stays fully paid); the last payment absorbs the difference.
 * `cash_date` equal to the invoice date (or null) follows the invoice date.
 *
 * @param {Object} data - { amount, cash_date, payment_method, location_code, bank_account_code, service_description }
 */
async function updateRevenue(user, billingId, data, requestMetadata = {}) {
  const [invoice] = await findScopedInvoices(user, [billingId]);
  if (invoice.status !== 'PAID') {
    const error = new Error('Only paid invoices can be edited as revenue');
    error.statusCode = 400;
    throw error;
  }
  if (data.location_code !== undefined && !(await db.PracticeLocation.isValidCode(data.location_code))) {
    const error = new Error('Location not found');
    error.statusCode = 400;
    throw error;
  }
  await assertValidBankAccount(data.bank_account_code);

  const changes = {};
  for (const field of ['payment_method', 'location_code', 'bank_account_code', 'service_description']) {
    if (data[field] !== undefined) changes[field] = data[field];
  }
  if (data.cash_date !== undefined) {
    const value = data.cash_date ? toISODate(data.cash_date) : null;
    changes.cash_date = value && value !== toISODate(invoice.invoice_date) ? value : null;
  }
  // A new location brings its bank account, unless one is given explicitly
  if (changes.location_code !== undefined && changes.bank_account_code === undefined
    && (changes.location_code || null) !== (invoice.location_code || null)) {
    changes.bank_account_code = await bankAccountAfterLocationChange(invoice, changes.location_code);
  }

  const now = new Date().toISOString();
  await db.sequelize.transaction(async (transaction) => {
    const amountChanges = {};
    if (data.amount !== undefined) {
      const amount = Math.round(parseFloat(data.amount) * 100) / 100;
      const delta = Math.round((amount - parseFloat(invoice.amount_paid || 0)) * 100) / 100;
      if (delta !== 0) {
        const payments = await db.Payment.findAll({
          where: { billing_id: invoice.id, status: 'PAID' },
          order: [['payment_date', 'ASC'], ['created_at', 'ASC']],
          transaction
        });
        const last = payments[payments.length - 1];
        if (last) {
          const newPayment = Math.round((parseFloat(last.amount) + delta) * 100) / 100;
          if (newPayment <= 0) {
            const error = new Error('The amount is lower than the other payments of this invoice');
            error.statusCode = 400;
            throw error;
          }
          await last.update({ amount: newPayment }, { transaction });
        }
      }
      if (amount !== parseFloat(invoice.amount_total)) amountChanges.amount_total = amount;
      if (amount !== parseFloat(invoice.amount_paid)) amountChanges.amount_paid = amount;
      amountChanges.amount_due = 0;
    }

    const loggable = { ...changes };
    if (amountChanges.amount_paid !== undefined) loggable.amount_paid = amountChanges.amount_paid;
    const log = changeLog(invoice, loggable, user, now);
    await invoice.update({ ...changes, ...amountChanges, update_log: log }, { transaction });
  });

  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    resource_type: 'billing',
    resource_id: invoice.id,
    changes: { action: 'update_revenue', ...data },
    ip_address: requestMetadata.ip,
    user_agent: requestMetadata.userAgent
  });

  return {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    amount_total: parseFloat(invoice.amount_total),
    amount_paid: parseFloat(invoice.amount_paid),
    cash_date: effectiveCashDate(invoice),
    cash_date_overridden: !!invoice.cash_date,
    payment_method: invoice.payment_method,
    location_code: invoice.location_code || null,
    bank_account_code: invoice.bank_account_code || null,
    service_description: invoice.service_description || ''
  };
}

/**
 * Treasury per bank account: flows of the period and balance at its end.
 * Balances are cumulated flows (no opening balance field: an accounting entry
 * dated on the opening day sets it). Records without account form their own line.
 *
 * @param {Object} filters - { start_date, end_date } (YYYY-MM-DD, default: current year to today)
 */
async function getTreasury(user, filters = {}) {
  const today = toISODate(new Date());
  const end = filters.end_date || today;
  const start = filters.start_date || `${end.slice(0, 4)}-01-01`;
  const endExclusive = nextDay(end);

  const sumBy = async (model, column, where) => {
    const rows = await model.findAll({
      attributes: ['bank_account_code', [db.sequelize.fn('SUM', db.sequelize.col(column)), 'total']],
      where,
      group: ['bank_account_code'],
      raw: true
    });
    return Object.fromEntries(rows.map(r => [r.bank_account_code || 'none', parseFloat(r.total || 0)]));
  };
  const flows = async (from) => {
    const billingDate = from ? cashDateRangeWhere(from, end) : cashDateRangeWhere(undefined, end);
    const dateRange = (field) => ({ [field]: from ? { [Op.gte]: from, [Op.lt]: endExclusive } : { [Op.lt]: endExclusive } });
    return {
      revenue: await sumBy(db.Billing, 'amount_paid', await buildBillingWhere(user, { is_active: true, ...billingDate })),
      expenses: await sumBy(db.Expense, 'amount', await buildExpenseWhere(user, { is_active: true, ...dateRange('expense_date') })),
      adjustments: await sumBy(db.AccountingEntry, 'amount', await buildEntryWhere(user, { is_active: true, ...dateRange('entry_date') }))
    };
  };

  const period = await flows(start);
  const cumulated = await flows(null);
  const round = (n) => Math.round(n * 100) / 100;

  const accounts = await db.BankAccount.findAll({ order: [['display_order', 'ASC'], ['label', 'ASC']] });
  const lines = accounts.map(a => ({ code: a.code, label: a.label, is_active: a.is_active }));
  const usedCodes = new Set([...Object.values(period), ...Object.values(cumulated)].flatMap(m => Object.keys(m)));
  if (usedCodes.has('none')) lines.push({ code: 'none', label: null, is_active: true });

  const result = lines.map(line => {
    const key = line.code;
    const revenue = round(period.revenue[key] || 0);
    const expenses = round(period.expenses[key] || 0);
    const adjustments = round(period.adjustments[key] || 0);
    const balance = round((cumulated.revenue[key] || 0) - (cumulated.expenses[key] || 0) + (cumulated.adjustments[key] || 0));
    return { ...line, revenue, expenses, adjustments, net: round(revenue - expenses + adjustments), balance };
  }).filter(line => line.is_active || line.revenue || line.expenses || line.adjustments || line.balance);

  const total = result.reduce((acc, line) => ({
    revenue: round(acc.revenue + line.revenue),
    expenses: round(acc.expenses + line.expenses),
    adjustments: round(acc.adjustments + line.adjustments),
    net: round(acc.net + line.net),
    balance: round(acc.balance + line.balance)
  }), { revenue: 0, expenses: 0, adjustments: 0, net: 0, balance: 0 });

  return { start_date: start, end_date: end, accounts: result, total };
}

module.exports = {
  setBankAccount,
  updateRevenue,
  getTreasury,
  setLocation,
  setCashDate,
  shiftCashDateToNextMonth,
  getDashboard,
  getAgingReport,
  getRevenue,
  getCashFlow,
  getForecast
};
