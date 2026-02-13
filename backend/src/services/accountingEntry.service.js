/**
 * Accounting Entry Service
 * Business logic for accounting entries (adjustments, corrections, refunds) with RBAC scoping.
 */

const db = require('../../../models');
const AccountingEntry = db.AccountingEntry;
const { Op } = db.Sequelize;
const { getScopedDietitianIds } = require('../helpers/scopeHelper');
const auditService = require('./audit.service');

/**
 * Apply created_by scoping based on user role.
 * ADMIN: no filter. DIETITIAN: own. ASSISTANT: linked dietitians.
 */
async function applyCreatorScope(whereClause, user) {
  const dietitianIds = await getScopedDietitianIds(user);
  if (dietitianIds === null) return true; // ADMIN
  if (dietitianIds.length === 0) return false;
  whereClause.created_by = { [Op.in]: dietitianIds };
  return true;
}

async function getEntries(user, filters = {}, requestMetadata = {}) {
  const whereClause = { is_active: true };

  const hasAccess = await applyCreatorScope(whereClause, user);
  if (!hasAccess) {
    return { entries: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  }

  if (filters.entry_type) {
    whereClause.entry_type = filters.entry_type;
  }

  if (filters.category) {
    whereClause.category = filters.category;
  }

  if (filters.start_date || filters.end_date) {
    whereClause.entry_date = {};
    if (filters.start_date) whereClause.entry_date[Op.gte] = filters.start_date;
    if (filters.end_date) whereClause.entry_date[Op.lte] = filters.end_date;
  }

  if (filters.search) {
    whereClause[Op.or] = [
      { description: { [Op.like]: `%${filters.search}%` } },
      { reference: { [Op.like]: `%${filters.search}%` } }
    ];
  }

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const offset = (page - 1) * limit;

  const { count, rows } = await AccountingEntry.findAndCountAll({
    where: whereClause,
    include: [
      { model: db.User, as: 'creator', attributes: ['id', 'username', 'first_name', 'last_name'] }
    ],
    order: [['entry_date', 'DESC']],
    limit,
    offset
  });

  return {
    entries: rows,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit)
  };
}

async function getEntryById(id, user, requestMetadata = {}) {
  const whereClause = { id, is_active: true };
  const hasAccess = await applyCreatorScope(whereClause, user);
  if (!hasAccess) {
    const error = new Error('Access denied');
    error.statusCode = 403;
    throw error;
  }

  const entry = await AccountingEntry.findOne({
    where: whereClause,
    include: [
      { model: db.User, as: 'creator', attributes: ['id', 'username', 'first_name', 'last_name'] }
    ]
  });

  if (!entry) {
    const error = new Error('Accounting entry not found');
    error.statusCode = 404;
    throw error;
  }

  return entry;
}

async function createEntry(user, data, requestMetadata = {}) {
  // Enforce sign based on entry_type
  let amount = parseFloat(data.amount);
  if (data.entry_type === 'DEBIT') {
    amount = -Math.abs(amount);
  } else {
    amount = Math.abs(amount);
  }

  const entry = await AccountingEntry.create({
    ...data,
    amount,
    created_by: user.id
  });

  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'CREATE',
    resource_type: 'accounting_entry',
    resource_id: entry.id,
    new_values: { ...data, amount },
    ...requestMetadata
  });

  return entry;
}

async function updateEntry(id, user, data, requestMetadata = {}) {
  const whereClause = { id, is_active: true };
  const hasAccess = await applyCreatorScope(whereClause, user);
  if (!hasAccess) {
    const error = new Error('Access denied');
    error.statusCode = 403;
    throw error;
  }

  const entry = await AccountingEntry.findOne({ where: whereClause });
  if (!entry) {
    const error = new Error('Accounting entry not found');
    error.statusCode = 404;
    throw error;
  }

  // Enforce sign if entry_type or amount changed
  if (data.amount !== undefined) {
    const entryType = data.entry_type || entry.entry_type;
    let amount = parseFloat(data.amount);
    if (entryType === 'DEBIT') {
      amount = -Math.abs(amount);
    } else {
      amount = Math.abs(amount);
    }
    data.amount = amount;
  }

  const oldValues = entry.toJSON();
  await entry.update(data);

  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    resource_type: 'accounting_entry',
    resource_id: entry.id,
    old_values: oldValues,
    new_values: data,
    ...requestMetadata
  });

  return entry;
}

async function deleteEntry(id, user, requestMetadata = {}) {
  const entry = await AccountingEntry.findOne({ where: { id, is_active: true } });
  if (!entry) {
    const error = new Error('Accounting entry not found');
    error.statusCode = 404;
    throw error;
  }

  await entry.update({ is_active: false });

  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'DELETE',
    resource_type: 'accounting_entry',
    resource_id: entry.id,
    ...requestMetadata
  });

  return { message: 'Accounting entry deleted successfully' };
}

async function getEntrySummary(user, filters = {}) {
  const whereClause = { is_active: true };

  const hasAccess = await applyCreatorScope(whereClause, user);
  if (!hasAccess) {
    return { totalCredits: 0, totalDebits: 0, netBalance: 0 };
  }

  if (filters.start_date || filters.end_date) {
    whereClause.entry_date = {};
    if (filters.start_date) whereClause.entry_date[Op.gte] = filters.start_date;
    if (filters.end_date) whereClause.entry_date[Op.lte] = filters.end_date;
  }

  // Credits total
  const creditResult = await AccountingEntry.findOne({
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
    ],
    where: { ...whereClause, entry_type: 'CREDIT' },
    raw: true
  });

  // Debits total (absolute value)
  const debitResult = await AccountingEntry.findOne({
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
    ],
    where: { ...whereClause, entry_type: 'DEBIT' },
    raw: true
  });

  const totalCredits = parseFloat(creditResult?.total || 0);
  const totalDebits = Math.abs(parseFloat(debitResult?.total || 0));
  const netBalance = totalCredits - totalDebits;

  return { totalCredits, totalDebits, netBalance };
}

module.exports = {
  getEntries,
  getEntryById,
  createEntry,
  updateEntry,
  deleteEntry,
  getEntrySummary
};
