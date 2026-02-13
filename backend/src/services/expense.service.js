/**
 * Expense Service
 * Business logic for expense management with RBAC scoping.
 */

const db = require('../../../models');
const Expense = db.Expense;
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

async function getExpenses(user, filters = {}, requestMetadata = {}) {
  const whereClause = { is_active: true };

  const hasAccess = await applyCreatorScope(whereClause, user);
  if (!hasAccess) {
    return { expenses: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  }

  if (filters.category) {
    whereClause.category = filters.category;
  }

  if (filters.is_recurring !== undefined && filters.is_recurring !== '') {
    whereClause.is_recurring = filters.is_recurring === 'true' || filters.is_recurring === true;
  }

  if (filters.start_date || filters.end_date) {
    whereClause.expense_date = {};
    if (filters.start_date) whereClause.expense_date[Op.gte] = filters.start_date;
    if (filters.end_date) whereClause.expense_date[Op.lte] = filters.end_date;
  }

  if (filters.search) {
    whereClause[Op.or] = [
      { description: { [Op.like]: `%${filters.search}%` } },
      { vendor: { [Op.like]: `%${filters.search}%` } }
    ];
  }

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const offset = (page - 1) * limit;

  const { count, rows } = await Expense.findAndCountAll({
    where: whereClause,
    include: [
      { model: db.User, as: 'creator', attributes: ['id', 'username', 'first_name', 'last_name'] }
    ],
    order: [['expense_date', 'DESC']],
    limit,
    offset
  });

  return {
    expenses: rows,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit)
  };
}

async function getExpenseById(id, user, requestMetadata = {}) {
  const whereClause = { id, is_active: true };
  const hasAccess = await applyCreatorScope(whereClause, user);
  if (!hasAccess) {
    const error = new Error('Access denied');
    error.statusCode = 403;
    throw error;
  }

  const expense = await Expense.findOne({
    where: whereClause,
    include: [
      { model: db.User, as: 'creator', attributes: ['id', 'username', 'first_name', 'last_name'] }
    ]
  });

  if (!expense) {
    const error = new Error('Expense not found');
    error.statusCode = 404;
    throw error;
  }

  return expense;
}

async function createExpense(user, data, requestMetadata = {}) {
  const expense = await Expense.create({
    ...data,
    created_by: user.id
  });

  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'CREATE',
    resource_type: 'expense',
    resource_id: expense.id,
    new_values: data,
    ...requestMetadata
  });

  return expense;
}

async function updateExpense(id, user, data, requestMetadata = {}) {
  const whereClause = { id, is_active: true };
  const hasAccess = await applyCreatorScope(whereClause, user);
  if (!hasAccess) {
    const error = new Error('Access denied');
    error.statusCode = 403;
    throw error;
  }

  const expense = await Expense.findOne({ where: whereClause });
  if (!expense) {
    const error = new Error('Expense not found');
    error.statusCode = 404;
    throw error;
  }

  const oldValues = expense.toJSON();
  await expense.update(data);

  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    resource_type: 'expense',
    resource_id: expense.id,
    old_values: oldValues,
    new_values: data,
    ...requestMetadata
  });

  return expense;
}

async function deleteExpense(id, user, requestMetadata = {}) {
  const expense = await Expense.findOne({ where: { id, is_active: true } });
  if (!expense) {
    const error = new Error('Expense not found');
    error.statusCode = 404;
    throw error;
  }

  await expense.update({ is_active: false });

  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'DELETE',
    resource_type: 'expense',
    resource_id: expense.id,
    ...requestMetadata
  });

  return { message: 'Expense deleted successfully' };
}

async function getExpenseSummary(user, filters = {}) {
  const whereClause = { is_active: true };

  const hasAccess = await applyCreatorScope(whereClause, user);
  if (!hasAccess) {
    return { byCategory: [], byMonth: [], total: 0 };
  }

  if (filters.start_date || filters.end_date) {
    whereClause.expense_date = {};
    if (filters.start_date) whereClause.expense_date[Op.gte] = filters.start_date;
    if (filters.end_date) whereClause.expense_date[Op.lte] = filters.end_date;
  }

  // Total by category
  const byCategory = await Expense.findAll({
    attributes: [
      'category',
      [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total'],
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
    ],
    where: whereClause,
    group: ['category'],
    raw: true
  });

  // Total by month
  const byMonth = await Expense.findAll({
    attributes: [
      [db.sequelize.fn('strftime', '%Y-%m', db.sequelize.col('expense_date')), 'month'],
      [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total'],
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
    ],
    where: whereClause,
    group: [db.sequelize.fn('strftime', '%Y-%m', db.sequelize.col('expense_date'))],
    order: [[db.sequelize.fn('strftime', '%Y-%m', db.sequelize.col('expense_date')), 'DESC']],
    raw: true
  });

  // Global total
  const totalResult = await Expense.findOne({
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
    ],
    where: whereClause,
    raw: true
  });

  return {
    byCategory: byCategory.map(c => ({
      category: c.category,
      total: parseFloat(c.total || 0),
      count: parseInt(c.count || 0, 10)
    })),
    byMonth: byMonth.map(m => ({
      month: m.month,
      total: parseFloat(m.total || 0),
      count: parseInt(m.count || 0, 10)
    })),
    total: parseFloat(totalResult?.total || 0)
  };
}

module.exports = {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary
};
