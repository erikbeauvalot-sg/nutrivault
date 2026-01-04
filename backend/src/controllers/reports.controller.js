/**
 * Reports Controller
 *
 * HTTP request handlers for reporting endpoints
 */

const reportsService = require('../services/reports.service');

/**
 * Get patient statistics report
 * GET /api/reports/patients
 */
async function getPatientStatsHandler(req, res, next) {
  try {
    const user = {
      ...req.user,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    };

    const stats = await reportsService.getPatientStats(user, req.query);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get visit analytics report
 * GET /api/reports/visits
 */
async function getVisitAnalyticsHandler(req, res, next) {
  try {
    const user = {
      ...req.user,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    };

    const analytics = await reportsService.getVisitAnalytics(user, req.query);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get billing report
 * GET /api/reports/billing
 */
async function getBillingReportHandler(req, res, next) {
  try {
    const user = {
      ...req.user,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    };

    const report = await reportsService.getBillingReport(user, req.query);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get practice overview dashboard
 * GET /api/reports/overview
 */
async function getPracticeOverviewHandler(req, res, next) {
  try {
    const user = {
      ...req.user,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    };

    const overview = await reportsService.getPracticeOverview(user, req.query);

    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPatientStatsHandler,
  getVisitAnalyticsHandler,
  getBillingReportHandler,
  getPracticeOverviewHandler
};
