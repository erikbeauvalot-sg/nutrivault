/**
 * Analytics Controller
 * Sprint 6: Advanced Data Visualization
 *
 * Endpoints for dashboard analytics:
 * - Health trends
 * - Financial metrics
 * - Communication effectiveness
 * - Patient health scores
 */

const analyticsService = require('../services/analytics.service');

/**
 * GET /api/analytics/health-trends
 * Get health trends analytics
 */
exports.getHealthTrends = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const data = await analyticsService.getHealthTrends({
      startDate,
      endDate
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/financial-metrics
 * Get financial metrics analytics
 */
exports.getFinancialMetrics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const data = await analyticsService.getFinancialMetrics({
      startDate,
      endDate
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/communication-effectiveness
 * Get communication effectiveness analytics
 */
exports.getCommunicationEffectiveness = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const data = await analyticsService.getCommunicationEffectiveness({
      startDate,
      endDate
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/patient-health-score/:patientId
 * Get health score for a specific patient
 */
exports.getPatientHealthScore = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const data = await analyticsService.calculatePatientHealthScore(patientId);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};
