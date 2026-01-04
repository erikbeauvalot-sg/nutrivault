/**
 * Audit Log Controller
 *
 * Handles HTTP requests for audit log endpoints
 */

const { getAuditLogs, getAuditStats } = require('../services/audit.service');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get audit logs with filtering
 * GET /api/audit-logs
 */
const getAuditLogsHandler = asyncHandler(async (req, res) => {
  // Pass all query parameters to service for QueryBuilder processing
  const filters = req.query;

  const result = await getAuditLogs(filters);

  res.json({
    success: true,
    data: result
  });
});

/**
 * Get audit log statistics
 * GET /api/audit-logs/stats
 */
const getAuditStatsHandler = asyncHandler(async (req, res) => {
  const filters = {
    from_date: req.query.from_date,
    to_date: req.query.to_date,
    user_id: req.query.user_id
  };

  const stats = await getAuditStats(filters);

  res.json({
    success: true,
    data: stats
  });
});

module.exports = {
  getAuditLogsHandler,
  getAuditStatsHandler
};
