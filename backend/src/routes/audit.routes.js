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

/**
 * All audit log routes require authentication and audit_logs.read permission
 */

// Get audit logs with filtering
router.get('/',
  authenticate,
  requirePermission('audit_logs.read'),
  auditController.getAuditLogsHandler
);

// Get audit log statistics
router.get('/stats',
  authenticate,
  requirePermission('audit_logs.read'),
  auditController.getAuditStatsHandler
);

module.exports = router;
