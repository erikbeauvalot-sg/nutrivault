# Agent 7: AUDIT LOGGING SPECIALIST

## Role
Comprehensive logging and audit trail implementation

## Current Phase
Phase 2: Backend Core (Standby)

## Responsibilities
- Implement Winston logging infrastructure
- Build audit logging service
- Create logging middleware for all API calls
- Implement different log levels (ERROR, WARN, INFO, DEBUG, TRACE)
- Design log storage and rotation strategy
- Build audit log viewer API endpoints
- Implement structured logging with correlation IDs
- Create log analysis utilities
- Ensure HIPAA/GDPR compliance in logging

## Phase 2 Deliverables
- [ ] Winston logger setup
- [ ] Application logger service
- [ ] Audit logger service
- [ ] Request logging middleware
- [ ] Log rotation configuration
- [ ] Correlation ID generation

## Phase 3 Deliverables
- [ ] Audit log API endpoints
- [ ] Log search and filtering
- [ ] Log export functionality

## Directory Structure
```
backend/src/
├── services/
│   ├── logger.js      # Winston logger
│   └── audit.js       # Audit logging service
├── middleware/
│   └── logging.js     # HTTP request logging
└── logs/              # Log files
    ├── app-YYYY-MM-DD.log
    ├── error-YYYY-MM-DD.log
    └── audit-YYYY-MM-DD.log
```

## Winston Logger Setup
```javascript
// services/logger.js
const winston = require('winston');
const path = require('path');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Application logs
    new winston.transports.File({
      filename: path.join('logs', `app-${new Date().toISOString().split('T')[0]}.log`),
      level: 'info'
    }),
    // Error logs
    new winston.transports.File({
      filename: path.join('logs', `error-${new Date().toISOString().split('T')[0]}.log`),
      level: 'error'
    })
  ]
});

// Console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
```

## Audit Logger Service
```javascript
// services/audit.js
const { AuditLog } = require('../models');
const logger = require('./logger');

class AuditLogger {
  async log({
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
    status = 'SUCCESS',
    error_message,
    severity = 'INFO',
    session_id,
    api_key_id
  }) {
    try {
      const auditEntry = await AuditLog.create({
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

      // Also log to Winston for file storage
      logger.info('Audit event', {
        audit_id: auditEntry.id,
        user_id,
        action,
        resource_type,
        resource_id,
        severity
      });

      return auditEntry;
    } catch (error) {
      logger.error('Failed to create audit log', { error: error.message });
    }
  }

  async logLogin(user, req, success = true) {
    return this.log({
      user_id: user.id,
      username: user.username,
      action: success ? 'LOGIN' : 'FAILED_LOGIN',
      resource_type: 'authentication',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: success ? 'SUCCESS' : 'FAILURE',
      severity: success ? 'INFO' : 'WARNING'
    });
  }

  async logDataChange(user, action, resourceType, resourceId, changes, req) {
    return this.log({
      user_id: user.id,
      username: user.username,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      changes,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      request_method: req.method,
      request_path: req.path,
      severity: 'INFO'
    });
  }
}

module.exports = new AuditLogger();
```

## Request Logging Middleware
```javascript
// middleware/logging.js
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const logger = require('../services/logger');
const auditLogger = require('../services/audit');

// Generate correlation ID for request tracking
const correlationId = (req, res, next) => {
  req.correlationId = uuidv4();
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
};

// Morgan HTTP logging
const httpLogger = morgan('combined', {
  stream: {
    write: (message) => logger.http(message.trim())
  }
});

// Audit middleware for sensitive operations
const auditMiddleware = (action) => {
  return async (req, res, next) => {
    const originalJson = res.json;

    res.json = function (data) {
      // Log after response
      if (req.user && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
        auditLogger.log({
          user_id: req.user.id,
          username: req.user.username,
          action: action || req.method,
          resource_type: req.baseUrl.split('/').pop(),
          resource_id: req.params.id,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          request_method: req.method,
          request_path: req.path,
          status: res.statusCode < 400 ? 'SUCCESS' : 'FAILURE',
          severity: res.statusCode < 400 ? 'INFO' : 'WARNING'
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

module.exports = {
  correlationId,
  httpLogger,
  auditMiddleware
};
```

## Log Rotation Configuration
```javascript
// Use winston-daily-rotate-file
const DailyRotateFile = require('winston-daily-rotate-file');

const transport = new DailyRotateFile({
  filename: 'logs/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '90d',
  zippedArchive: true
});
```

## Audit Log API Endpoints
```javascript
// routes/audit-logs.routes.js
router.get('/audit-logs',
  authenticate,
  requirePermission('audit_logs.read'),
  auditLogsController.getAll
);

// Controller
exports.getAll = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      user_id,
      action,
      resource_type,
      severity,
      from,
      to
    } = req.query;

    const where = {};
    if (user_id) where.user_id = user_id;
    if (action) where.action = action;
    if (resource_type) where.resource_type = resource_type;
    if (severity) where.severity = severity;
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp[Op.gte] = new Date(from);
      if (to) where.timestamp[Op.lte] = new Date(to);
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['timestamp', 'DESC']]
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit }
    });
  } catch (error) {
    next(error);
  }
};
```

## What to Log

### Always Log (INFO)
- User login/logout
- CREATE operations (patients, visits, billing)
- UPDATE operations (with before/after)
- DELETE operations
- Permission changes
- Role assignments

### Warning Level (WARN)
- Failed login attempts
- Authorization failures
- Invalid input data
- Rate limit violations

### Error Level (ERROR)
- Database errors
- Authentication failures
- Unhandled exceptions
- API errors

## Environment Variables
```
LOG_LEVEL=info
LOG_DIR=./logs
LOG_MAX_FILES=90d
```

## Current Status
⏸️ Standby

## Dependencies
- **Database Specialist**: AuditLog model
- **Backend Developer**: Integration in routes
- **Security Specialist**: Auth event logging
