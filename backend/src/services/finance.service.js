/**
 * Finance Service
 * Composite service for finance dashboard: P&L, aging report, cash flow.
 * Queries Billing + Expense data with RBAC scoping.
 */

const db = require('../../../models');
const { Op } = db.Sequelize;
const { getScopedPatientIds, getScopedDietitianIds } = require('../helpers/scopeHelper');

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

  // Total revenue (amount_paid from billing)
  const revenueResult = await db.Billing.findOne({
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('amount_paid')), 'total']
    ],
    where: await buildBillingWhere(user, { ...billingDateWhere, is_active: true }),
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
 * Get aging report — unpaid invoices grouped by age brackets
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

  const brackets = [
    { label: '0-30', min: 0, max: 30, count: 0, totalDue: 0, invoices: [] },
    { label: '31-60', min: 31, max: 60, count: 0, totalDue: 0, invoices: [] },
    { label: '61-90', min: 61, max: 90, count: 0, totalDue: 0, invoices: [] },
    { label: '90+', min: 91, max: Infinity, count: 0, totalDue: 0, invoices: [] }
  ];

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

  return {
    brackets: brackets.map(b => ({
      label: b.label,
      count: b.count,
      totalDue: parseFloat(b.totalDue.toFixed(2)),
      invoices: b.invoices
    })),
    totalOverdue,
    totalAmount: parseFloat(totalAmount.toFixed(2))
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
    const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    // Revenue for this month
    const revenueResult = await db.Billing.findOne({
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('amount_paid')), 'total']
      ],
      where: await buildBillingWhere(user, {
        invoice_date: { [Op.gte]: startDate, [Op.lte]: endDate },
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

module.exports = {
  getDashboard,
  getAgingReport,
  getCashFlow
};
