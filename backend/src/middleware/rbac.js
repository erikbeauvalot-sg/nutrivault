/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Provides permission and role-based authorization
 */

const { AppError } = require('./errorHandler');
const { getUserPermissions } = require('./auth');
const { logAuthorizationFailure } = require('../services/audit.service');

/**
 * Require specific permission
 * Usage: requirePermission('patients.read')
 */
function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw new AppError(
          'Authentication required',
          401,
          'AUTHENTICATION_REQUIRED'
        );
      }

      // Get user permissions
      const userPermissions = getUserPermissions(req.user);

      // Check if user has the required permission
      if (!userPermissions.includes(permission)) {
        // Log authorization failure
        logAuthorizationFailure({
          user_id: req.user.id,
          username: req.user.username,
          action: 'PERMISSION_CHECK',
          resource_type: permission.split('.')[0],
          resource_id: null,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          request_method: req.method,
          request_path: req.path,
          reason: `Missing permission: ${permission}`
        }).catch(() => {}); // Don't block on logging error

        throw new AppError(
          `Permission denied. Required permission: ${permission}`,
          403,
          'PERMISSION_DENIED'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require any of the specified permissions (OR logic)
 * Usage: requireAnyPermission(['patients.read', 'patients.update'])
 */
function requireAnyPermission(permissions) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(
          'Authentication required',
          401,
          'AUTHENTICATION_REQUIRED'
        );
      }

      const userPermissions = getUserPermissions(req.user);

      // Check if user has at least one of the required permissions
      const hasPermission = permissions.some(permission =>
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        throw new AppError(
          `Permission denied. Required one of: ${permissions.join(', ')}`,
          403,
          'PERMISSION_DENIED'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require all of the specified permissions (AND logic)
 * Usage: requireAllPermissions(['patients.read', 'visits.read'])
 */
function requireAllPermissions(permissions) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(
          'Authentication required',
          401,
          'AUTHENTICATION_REQUIRED'
        );
      }

      const userPermissions = getUserPermissions(req.user);

      // Check if user has all required permissions
      const hasAllPermissions = permissions.every(permission =>
        userPermissions.includes(permission)
      );

      if (!hasAllPermissions) {
        const missingPermissions = permissions.filter(
          permission => !userPermissions.includes(permission)
        );
        throw new AppError(
          `Permission denied. Missing permissions: ${missingPermissions.join(', ')}`,
          403,
          'PERMISSION_DENIED'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require specific role
 * Usage: requireRole('ADMIN')
 */
function requireRole(roleName) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(
          'Authentication required',
          401,
          'AUTHENTICATION_REQUIRED'
        );
      }

      // Check if user has the required role
      if (!req.user.role || req.user.role.name !== roleName) {
        // Log authorization failure
        logAuthorizationFailure({
          user_id: req.user.id,
          username: req.user.username,
          action: 'ROLE_CHECK',
          resource_type: 'role',
          resource_id: null,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          request_method: req.method,
          request_path: req.path,
          reason: `Required role: ${roleName}, actual role: ${req.user.role?.name || 'none'}`
        }).catch(() => {});

        throw new AppError(
          `Access denied. Required role: ${roleName}`,
          403,
          'ROLE_REQUIRED'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require any of the specified roles (OR logic)
 * Usage: requireAnyRole(['ADMIN', 'DIETITIAN'])
 */
function requireAnyRole(roles) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(
          'Authentication required',
          401,
          'AUTHENTICATION_REQUIRED'
        );
      }

      if (!req.user.role || !roles.includes(req.user.role.name)) {
        throw new AppError(
          `Access denied. Required one of roles: ${roles.join(', ')}`,
          403,
          'ROLE_REQUIRED'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if user is the owner of the resource or has permission
 * Usage: requireOwnerOrPermission('userId', 'users.update')
 */
function requireOwnerOrPermission(ownerField, permission) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(
          'Authentication required',
          401,
          'AUTHENTICATION_REQUIRED'
        );
      }

      // Check if user is the owner
      const isOwner = req.params.id === req.user.id ||
                     req.body[ownerField] === req.user.id;

      if (isOwner) {
        return next();
      }

      // If not owner, check permission
      const userPermissions = getUserPermissions(req.user);
      if (!userPermissions.includes(permission)) {
        throw new AppError(
          'Access denied. You can only access your own resources',
          403,
          'ACCESS_DENIED'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if user can access resource based on assigned dietitian
 * For dietitians to only access their assigned patients
 */
function requireAssignedDietitian() {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(
          'Authentication required',
          401,
          'AUTHENTICATION_REQUIRED'
        );
      }

      // Admins can access all resources
      if (req.user.role && req.user.role.name === 'ADMIN') {
        return next();
      }

      // For other roles, check if they're the assigned dietitian
      // This will be validated in the controller/service layer
      // This middleware just ensures they have the basic permission

      const userPermissions = getUserPermissions(req.user);
      if (!userPermissions.includes('patients.read')) {
        throw new AppError(
          'Permission denied',
          403,
          'PERMISSION_DENIED'
        );
      }

      // Store the user's role for later checking in services
      req.requireAssignedCheck = true;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Permission helper - check if user has permission
 * Can be used in route handlers
 */
function hasPermission(user, permission) {
  const userPermissions = getUserPermissions(user);
  return userPermissions.includes(permission);
}

/**
 * Role helper - check if user has role
 * Can be used in route handlers
 */
function hasRole(user, roleName) {
  return user.role && user.role.name === roleName;
}

/**
 * Check if user is admin
 */
function isAdmin(user) {
  return hasRole(user, 'ADMIN');
}

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireAnyRole,
  requireOwnerOrPermission,
  requireAssignedDietitian,
  hasPermission,
  hasRole,
  isAdmin
};
