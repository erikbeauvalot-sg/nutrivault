/**
 * Expense Controller
 * HTTP request handlers for expense management.
 */

const expenseService = require('../services/expense.service');

function getRequestMetadata(req) {
  return {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.originalUrl
  };
}

exports.getAllExpenses = async (req, res, next) => {
  try {
    const filters = {
      category: req.query.category,
      search: req.query.search,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      is_recurring: req.query.is_recurring,
      page: req.query.page,
      limit: req.query.limit
    };
    const result = await expenseService.getExpenses(req.user, filters, getRequestMetadata(req));
    res.json({
      success: true,
      data: result.expenses,
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

exports.getExpenseById = async (req, res, next) => {
  try {
    const expense = await expenseService.getExpenseById(req.params.id, req.user, getRequestMetadata(req));
    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

exports.createExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.createExpense(req.user, req.body, getRequestMetadata(req));
    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

exports.updateExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.updateExpense(req.params.id, req.user, req.body, getRequestMetadata(req));
    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const result = await expenseService.deleteExpense(req.params.id, req.user, getRequestMetadata(req));
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.getExpenseSummary = async (req, res, next) => {
  try {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };
    const summary = await expenseService.getExpenseSummary(req.user, filters);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};
