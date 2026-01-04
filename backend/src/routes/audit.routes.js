/**
 * Audit Log Routes
 *
 * Routes for audit log endpoints
 */

const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { apiLimiter } = require('../middleware/rateLimiter');

/**
 * All audit log routes require authentication and rate limiting
 */
router.use(authenticate);
router.use(apiLimiter);

// Get audit logs with filtering
router.get('/',
  requirePermission('audit_logs.read'),
  auditController.getAuditLogsHandler
);

// Get audit log statistics
router.get('/stats',
  requirePermission('audit_logs.read'),
  auditController.getAuditStatsHandler
);

module.exports = router;
