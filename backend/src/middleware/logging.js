/**
 * HTTP Request Logging Middleware
 *
 * Logs all API requests to audit log
 */

const logger = require('../config/logger');
const { logAuditEvent } = require('../services/audit.service');

/**
 * Extract IP address from request
 */
function getIpAddress(req) {
  return req.ip ||
         req.headers['x-forwarded-for'] ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         null;
}

/**
 * Extract user agent from request
 */
function getUserAgent(req) {
  return req.headers['user-agent'] || null;
}

/**
 * Determine if request should be logged to database
 * (Skip health checks, static files, etc.)
 */
function shouldLogToDatabase(req) {
  // Don't log health checks
  if (req.path === '/health') return false;

  // Don't log static files
  if (req.path.startsWith('/static')) return false;

  // Only log API requests
  if (!req.path.startsWith('/api')) return false;

  return true;
}

/**
 * Determine action from HTTP method and path
 */
function determineAction(method, path) {
  // Map HTTP methods to audit actions
  const methodMap = {
    'POST': 'CREATE',
    'GET': 'READ',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE'
  };

  // Special cases
  if (path.includes('/login')) return 'LOGIN';
  if (path.includes('/logout')) return 'LOGOUT';
  if (path.includes('/refresh')) return 'TOKEN_REFRESH';
  if (path.includes('/register')) return 'USER_REGISTRATION';

  return methodMap[method] || method;
}

/**
 * Determine resource type from path
 */
function determineResourceType(path) {
  // Extract resource from path (e.g., /api/patients -> patients)
  const match = path.match(/\/api\/([^/]+)/);
  if (match) {
    return match[1].replace(/-/g, '_');
  }
  return 'unknown';
}

/**
 * Extract resource ID from path
 */
function extractResourceId(path) {
  // Match UUIDs in path
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = path.match(uuidPattern);
  return match ? match[0] : null;
}

/**
 * Determine severity based on status code
 */
function determineSeverity(statusCode) {
  if (statusCode >= 500) return 'ERROR';
  if (statusCode >= 400) return 'WARN';
  if (statusCode >= 300) return 'INFO';
  return 'INFO';
}

/**
 * HTTP request logging middleware
 */
function requestLogger(req, res, next) {
  // Capture start time
  const startTime = Date.now();

  // Store original end function
  const originalEnd = res.end;

  // Override end function to log after response
  res.end = function(...args) {
    // Call original end
    originalEnd.apply(res, args);

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Log to console (via Winston)
    logger.http(`${req.method} ${req.path} ${res.statusCode} - ${responseTime}ms`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      ip: getIpAddress(req),
      userAgent: getUserAgent(req),
      user: req.user ? req.user.username : 'anonymous'
    });

    // Log to database (async, don't wait)
    if (shouldLogToDatabase(req)) {
      const action = determineAction(req.method, req.path);
      const resourceType = determineResourceType(req.path);
      const resourceId = extractResourceId(req.path);
      const severity = determineSeverity(res.statusCode);
      const status = res.statusCode < 400 ? 'SUCCESS' : 'FAILURE';

      // Don't await - fire and forget
      logAuditEvent({
        user_id: req.user ? req.user.id : null,
        username: req.user ? req.user.username : null,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        ip_address: getIpAddress(req),
        user_agent: getUserAgent(req),
        request_method: req.method,
        request_path: req.path,
        status,
        severity,
        api_key_id: req.apiKey ? req.apiKey.id : null
      }).catch(err => {
        logger.error('Failed to log audit event', { error: err.message });
      });
    }
  };

  next();
}

/**
 * Log authentication success
 */
function logAuthSuccess(req, user) {
  const { logAuthEvent } = require('../services/audit.service');

  logAuthEvent({
    user_id: user.id,
    username: user.username,
    action: 'LOGIN',
    ip_address: getIpAddress(req),
    user_agent: getUserAgent(req),
    status: 'SUCCESS'
  }).catch(err => {
    logger.error('Failed to log auth success', { error: err.message });
  });
}

/**
 * Log authentication failure
 */
function logAuthFailure(req, username, reason) {
  const { logAuthEvent } = require('../services/audit.service');

  logAuthEvent({
    user_id: null,
    username: username || 'unknown',
    action: 'FAILED_LOGIN',
    ip_address: getIpAddress(req),
    user_agent: getUserAgent(req),
    status: 'FAILURE',
    error_message: reason
  }).catch(err => {
    logger.error('Failed to log auth failure', { error: err.message });
  });
}

/**
 * Log authorization failure
 */
function logAuthzFailure(req, reason) {
  const { logAuthorizationFailure } = require('../services/audit.service');

  logAuthorizationFailure({
    user_id: req.user ? req.user.id : null,
    username: req.user ? req.user.username : null,
    action: 'AUTHORIZATION_FAILURE',
    resource_type: determineResourceType(req.path),
    resource_id: extractResourceId(req.path),
    ip_address: getIpAddress(req),
    user_agent: getUserAgent(req),
    request_method: req.method,
    request_path: req.path,
    reason
  }).catch(err => {
    logger.error('Failed to log authz failure', { error: err.message });
  });
}

module.exports = {
  requestLogger,
  logAuthSuccess,
  logAuthFailure,
  logAuthzFailure,
  getIpAddress,
  getUserAgent
};
