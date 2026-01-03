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
  const filters = {
    user_id: req.query.user_id,
    action: req.query.action,
    resource_type: req.query.resource_type,
    resource_id: req.query.resource_id,
    status: req.query.status,
    severity: req.query.severity,
    from_date: req.query.from_date,
    to_date: req.query.to_date,
    limit: req.query.limit || 100,
    offset: req.query.offset || 0
  };

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
