/**
 * Audit Service
 * 
 * Handles audit logging for all CRUD operations.
 * Records user actions, changes, and request metadata for compliance.
 */

const db = require('../../../models');
const AuditLog = db.AuditLog;

/**
 * Create an audit log entry
 * 
 * @param {Object} auditData - Audit log data
 * @param {string} auditData.user_id - User UUID
 * @param {string} auditData.username - Username
 * @param {string} auditData.action - Action: CREATE, READ, UPDATE, DELETE
 * @param {string} auditData.resource_type - Resource: patients, visits, users, etc.
 * @param {string} auditData.resource_id - Resource UUID
 * @param {Object} auditData.changes - Before/after data: { before: {...}, after: {...} }
 * @param {string} auditData.ip_address - Request IP address
 * @param {string} auditData.user_agent - Request user agent
 * @param {string} auditData.request_method - HTTP method
 * @param {string} auditData.request_path - Request path
 * @param {number} auditData.status_code - HTTP status code (optional)
 * @param {string} auditData.error_message - Error message if operation failed
 * @returns {Promise<Object>} Created audit log entry
 */
async function log(auditData) {
  try {
    const auditLog = await AuditLog.create({
      user_id: auditData.user_id,
      username: auditData.username,
      action: auditData.action,
      resource_type: auditData.resource_type,
      resource_id: auditData.resource_id || null,
      changes: auditData.changes ? JSON.stringify(auditData.changes) : null,
      ip_address: auditData.ip_address,
      user_agent: auditData.user_agent,
      request_method: auditData.request_method,
      request_path: auditData.request_path,
      status_code: auditData.status_code || null,
      error_message: auditData.error_message || null
    });

    return auditLog;
  } catch (error) {
    // If audit logging fails, log to console but don't break the request
    console.error('❌ Audit logging failed:', error.message);
    return null;
  }
}

/**
 * Get audit logs with filtering
 * 
 * @param {Object} filters - Filter criteria
 * @param {string} filters.user_id - Filter by user ID
 * @param {string} filters.resource_type - Filter by resource type
 * @param {string} filters.resource_id - Filter by resource ID
 * @param {string} filters.action - Filter by action
 * @param {Date} filters.start_date - Filter by start date
 * @param {Date} filters.end_date - Filter by end date
 * @param {number} filters.limit - Limit results (default 100)
 * @param {number} filters.offset - Offset for pagination
 * @returns {Promise<Object>} Audit logs and total count
 */
async function getAuditLogs(filters = {}) {
  try {
    const whereClause = {};

    if (filters.user_id) whereClause.user_id = filters.user_id;
    if (filters.resource_type) whereClause.resource_type = filters.resource_type;
    if (filters.resource_id) whereClause.resource_id = filters.resource_id;
    if (filters.action) whereClause.action = filters.action;

    if (filters.start_date || filters.end_date) {
      whereClause.created_at = {};
      if (filters.start_date) whereClause.created_at[db.Sequelize.Op.gte] = filters.start_date;
      if (filters.end_date) whereClause.created_at[db.Sequelize.Op.lte] = filters.end_date;
    }

    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const { count, rows } = await AuditLog.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    return {
      auditLogs: rows,
      total: count,
      limit,
      offset
    };
  } catch (error) {
    console.error('❌ Failed to retrieve audit logs:', error.message);
    throw error;
  }
}

module.exports = {
  log,
  getAuditLogs
};
