/**
 * Alerts Controller
 *
 * HTTP request handlers for alerts management.
 */

const alertsService = require('../services/alerts.service');

/**
 * Extract request metadata for audit logging
 * @param {Object} req - Express request object
 * @returns {Object} Request metadata
 */
function getRequestMetadata(req) {
  return {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.originalUrl
  };
}

/**
 * GET /api/alerts - Get all alerts for current user
 */
exports.getAlerts = async (req, res, next) => {
  try {
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const alerts = await alertsService.getAlerts(user, requestMetadata);

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    next(error);
  }
};
