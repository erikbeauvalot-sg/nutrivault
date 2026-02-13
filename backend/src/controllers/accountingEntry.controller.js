/**
 * Accounting Entry Controller
 * HTTP request handlers for accounting entries management.
 */

const accountingEntryService = require('../services/accountingEntry.service');

function getRequestMetadata(req) {
  return {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.originalUrl
  };
}

exports.getAllEntries = async (req, res, next) => {
  try {
    const filters = {
      entry_type: req.query.entry_type,
      category: req.query.category,
      search: req.query.search,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      page: req.query.page,
      limit: req.query.limit
    };
    const result = await accountingEntryService.getEntries(req.user, filters, getRequestMetadata(req));
    res.json({
      success: true,
      data: result.entries,
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

exports.getEntryById = async (req, res, next) => {
  try {
    const entry = await accountingEntryService.getEntryById(req.params.id, req.user, getRequestMetadata(req));
    res.json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

exports.createEntry = async (req, res, next) => {
  try {
    const entry = await accountingEntryService.createEntry(req.user, req.body, getRequestMetadata(req));
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

exports.updateEntry = async (req, res, next) => {
  try {
    const entry = await accountingEntryService.updateEntry(req.params.id, req.user, req.body, getRequestMetadata(req));
    res.json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

exports.deleteEntry = async (req, res, next) => {
  try {
    const result = await accountingEntryService.deleteEntry(req.params.id, req.user, getRequestMetadata(req));
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.getSummary = async (req, res, next) => {
  try {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };
    const summary = await accountingEntryService.getEntrySummary(req.user, filters);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};
