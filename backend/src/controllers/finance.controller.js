/**
 * Finance Controller
 * HTTP request handlers for finance dashboard, aging report, cash flow.
 */

const financeService = require('../services/finance.service');
const billingService = require('../services/billing.service');

function getRequestMetadata(req) {
  return {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.originalUrl
  };
}

exports.getDashboard = async (req, res, next) => {
  try {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };
    const dashboard = await financeService.getDashboard(req.user, filters);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
};

exports.getAgingReport = async (req, res, next) => {
  try {
    const report = await financeService.getAgingReport(req.user);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

exports.getCashFlow = async (req, res, next) => {
  try {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };
    const cashFlow = await financeService.getCashFlow(req.user, filters);
    res.json({ success: true, data: cashFlow });
  } catch (error) {
    next(error);
  }
};

exports.sendReminders = async (req, res, next) => {
  try {
    const { invoice_ids } = req.body;
    const result = await billingService.sendReminderBatch(invoice_ids, req.user, getRequestMetadata(req));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
