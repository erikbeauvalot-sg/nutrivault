/**
 * Finance Controller
 * HTTP request handlers for finance dashboard, aging report, cash flow.
 */

const financeService = require('../services/finance.service');
const billingService = require('../services/billing.service');
const comptaExportService = require('../services/comptaExport.service');
const comptaFaithfulService = require('../services/comptaFaithful.service');

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

exports.getRevenue = async (req, res, next) => {
  try {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      page: req.query.page,
      limit: req.query.limit
    };
    const revenue = await financeService.getRevenue(req.user, filters);
    res.json({ success: true, data: revenue });
  } catch (error) {
    next(error);
  }
};

exports.getForecast = async (req, res, next) => {
  try {
    const filters = {
      end_date: req.query.end_date
    };
    const forecast = await financeService.getForecast(req.user, filters);
    res.json({ success: true, data: forecast });
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

/**
 * Resolve which export mode to use.
 * 'faithful' injects into the user's existing workbook (preserving TRÉSO,
 * TABLEAU DE BORD, charts); 'clean' regenerates a fresh workbook. 'auto' picks
 * faithful when a master file exists for the year, otherwise clean.
 */
function resolveMode(mode, year) {
  if (mode === 'faithful' || mode === 'clean') return mode;
  return comptaFaithfulService.masterExists(year) ? 'faithful' : 'clean';
}

/**
 * GET /api/finance/compta-export?year=YYYY&mode=auto|faithful|clean
 * Streams a fresh accounting workbook (.xlsx) built from live data.
 */
exports.exportCompta = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const mode = resolveMode(req.query.mode, year);
    const filename = `Comptabilite_${year}.xlsx`;

    let buffer;
    let warnings = [];
    if (mode === 'faithful') {
      const result = await comptaFaithfulService.exportBuffer(req.user, year);
      buffer = result.buffer;
      warnings = result.warnings;
    } else {
      buffer = Buffer.from(await comptaExportService.exportBuffer(req.user, year));
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Compta-Mode', mode);
    if (warnings.length) res.setHeader('X-Compta-Warnings', encodeURIComponent(JSON.stringify(warnings)));
    res.send(Buffer.from(buffer));
  } catch (error) {
    if (error.code === 'MASTER_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Master workbook not found for this year' });
    }
    next(error);
  }
};

/**
 * POST /api/finance/compta-export/write { year, mode }
 * Regenerates the accounting file on the server disk (never the master).
 */
exports.writeComptaToDisk = async (req, res, next) => {
  try {
    const year = parseInt(req.body.year, 10) || new Date().getFullYear();
    const mode = resolveMode(req.body.mode, year);

    let result;
    if (mode === 'faithful') {
      result = await comptaFaithfulService.exportToDisk(req.user, year);
    } else {
      const filePath = await comptaExportService.exportToDisk(req.user, year);
      result = { path: filePath, warnings: [] };
    }
    res.json({ success: true, data: { path: result.path, year, mode, warnings: result.warnings || [] } });
  } catch (error) {
    if (error.code === 'MASTER_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Master workbook not found for this year' });
    }
    next(error);
  }
};
