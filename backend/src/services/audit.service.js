/**
 * Audit Logging Service
 *
 * Handles audit log creation and retrieval
 */

const db = require('../../../models');
const logger = require('../config/logger');

/**
 * Log audit event to database
 */
async function logAuditEvent({
  user_id = null,
  username = null,
  action,
  resource_type,
  resource_id = null,
  ip_address = null,
  user_agent = null,
  request_method = null,
  request_path = null,
  changes = null,
  status = 'SUCCESS',
  error_message = null,
  severity = 'INFO',
  session_id = null,
  api_key_id = null
}) {
  try {
    await db.AuditLog.create({
      user_id,
      username,
      action,
      resource_type,
      resource_id,
      ip_address,
      user_agent,
      request_method,
      request_path,
      changes,
      status,
      error_message,
      severity,
      session_id,
      api_key_id
    });

    // Also log to file for redundancy
    logger.info('Audit event', {
      user_id,
      username,
      action,
      resource_type,
      resource_id,
      status,
      severity
    });

  } catch (error) {
    // Don't throw error - log to file as fallback
    logger.error('Failed to create audit log', {
      error: error.message,
      event: { action, resource_type, user_id }
    });
  }
}

/**
 * Log authentication event
 */
async function logAuthEvent({
  user_id,
  username,
  action, // LOGIN, LOGOUT, FAILED_LOGIN, TOKEN_REFRESH, etc.
  ip_address,
  user_agent,
  status = 'SUCCESS',
  error_message = null
}) {
  const severity = status === 'FAILURE' ? 'WARN' : 'INFO';

  await logAuditEvent({
    user_id,
    username,
    action,
    resource_type: 'auth',
    ip_address,
    user_agent,
    request_method: 'POST',
    status,
    error_message,
    severity
  });
}

/**
 * Log authorization failure
 */
async function logAuthorizationFailure({
  user_id,
  username,
  action,
  resource_type,
  resource_id,
  ip_address,
  user_agent,
  request_method,
  request_path,
  reason
}) {
  await logAuditEvent({
    user_id,
    username,
    action: action || 'AUTHORIZATION_FAILURE',
    resource_type,
    resource_id,
    ip_address,
    user_agent,
    request_method,
    request_path,
    status: 'FAILURE',
    error_message: reason,
    severity: 'WARN'
  });
}

/**
 * Log CRUD operation
 */
async function logCrudEvent({
  user_id,
  username,
  action, // CREATE, READ, UPDATE, DELETE
  resource_type,
  resource_id,
  changes = null, // { before: {...}, after: {...} }
  ip_address,
  user_agent,
  request_method,
  request_path
}) {
  const severity = action === 'DELETE' ? 'WARN' : 'INFO';

  await logAuditEvent({
    user_id,
    username,
    action,
    resource_type,
    resource_id,
    changes,
    ip_address,
    user_agent,
    request_method,
    request_path,
    status: 'SUCCESS',
    severity
  });
}

/**
 * Log data access (for sensitive resources)
 */
async function logDataAccess({
  user_id,
  username,
  resource_type,
  resource_id,
  ip_address,
  user_agent,
  request_path
}) {
  await logAuditEvent({
    user_id,
    username,
    action: 'READ',
    resource_type,
    resource_id,
    ip_address,
    user_agent,
    request_method: 'GET',
    request_path,
    status: 'SUCCESS',
    severity: 'INFO'
  });
}

/**
 * Get audit logs with filtering
 */
async function getAuditLogs(filters = {}) {
  const {
    user_id,
    action,
    resource_type,
    resource_id,
    status,
    severity,
    from_date,
    to_date,
    limit = 100,
    offset = 0
  } = filters;

  const where = {};

  if (user_id) where.user_id = user_id;
  if (action) where.action = action;
  if (resource_type) where.resource_type = resource_type;
  if (resource_id) where.resource_id = resource_id;
  if (status) where.status = status;
  if (severity) where.severity = severity;

  if (from_date || to_date) {
    where.timestamp = {};
    if (from_date) where.timestamp[db.Sequelize.Op.gte] = new Date(from_date);
    if (to_date) where.timestamp[db.Sequelize.Op.lte] = new Date(to_date);
  }

  const logs = await db.AuditLog.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['timestamp', 'DESC']],
    include: [{
      model: db.User,
      as: 'user',
      attributes: ['id', 'username', 'email'],
      required: false
    }]
  });

  return {
    logs: logs.rows,
    total: logs.count,
    limit: parseInt(limit),
    offset: parseInt(offset)
  };
}

/**
 * Get audit log statistics
 */
async function getAuditStats(filters = {}) {
  const { from_date, to_date, user_id } = filters;

  const where = {};
  if (user_id) where.user_id = user_id;

  if (from_date || to_date) {
    where.timestamp = {};
    if (from_date) where.timestamp[db.Sequelize.Op.gte] = new Date(from_date);
    if (to_date) where.timestamp[db.Sequelize.Op.lte] = new Date(to_date);
  }

  const [
    totalLogs,
    byAction,
    byStatus,
    bySeverity,
    byResourceType
  ] = await Promise.all([
    db.AuditLog.count({ where }),
    db.AuditLog.findAll({
      where,
      attributes: [
        'action',
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
      ],
      group: ['action'],
      raw: true
    }),
    db.AuditLog.findAll({
      where,
      attributes: [
        'status',
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    }),
    db.AuditLog.findAll({
      where,
      attributes: [
        'severity',
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
      ],
      group: ['severity'],
      raw: true
    }),
    db.AuditLog.findAll({
      where,
      attributes: [
        'resource_type',
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
      ],
      group: ['resource_type'],
      raw: true
    })
  ]);

  return {
    total: totalLogs,
    by_action: byAction,
    by_status: byStatus,
    by_severity: bySeverity,
    by_resource_type: byResourceType
  };
}

module.exports = {
  logAuditEvent,
  logAuthEvent,
  logAuthorizationFailure,
  logCrudEvent,
  logDataAccess,
  getAuditLogs,
  getAuditStats
};
