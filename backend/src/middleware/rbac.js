/**
 * RBAC (Role-Based Access Control) Middleware
 * 
 * Provides 8 middleware functions for authorization:
 * 1. requirePermission(permission) - Single permission
 * 2. requireAnyPermission([...]) - At least one permission (OR)
 * 3. requireAllPermissions([...]) - All permissions (AND)
 * 4. requireRole(roleName) - Specific role
 * 5. requireAnyRole([...]) - At least one role
 * 6. requireOwnerOrPermission(field, permission) - Owner or has permission
 * 7. requireAssignedDietitian() - For patient data access
 * 8. Helper functions: hasPermission, hasRole, isAdmin
 */

/**
 * Check if user has a specific permission
 * @param {Object} user - User object with Role and Permissions
 * @param {string} permission - Permission code (e.g., 'patients.read')
 * @returns {boolean}
 */
function hasPermission(user, permission) {
  if (!user || !user.role || !user.role.permissions) {
    return false;
  }

  return user.role.permissions.some(p => p.code === permission);
}

/**
 * Check if user has a specific role
 * @param {Object} user - User object with Role
 * @param {string} roleName - Role name (e.g., 'ADMIN', 'DIETITIAN')
 * @returns {boolean}
 */
function hasRole(user, roleName) {
  if (!user || !user.role) {
    return false;
  }

  return user.role.name === roleName;
}

/**
 * Check if user is an admin
 * @param {Object} user - User object with Role
 * @returns {boolean}
 */
function isAdmin(user) {
  return hasRole(user, 'ADMIN');
}

/**
 * Middleware: Require a single permission
 * @param {string} permission - Permission code (e.g., 'patients.read')
 * @returns {Function} Express middleware
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (hasPermission(req.user, permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Missing required permission: ${permission}`
    });
  };
}

/**
 * Middleware: Require at least one permission (OR logic)
 * @param {Array<string>} permissions - Array of permission codes
 * @returns {Function} Express middleware
 */
function requireAnyPermission(permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const hasAny = permissions.some(permission => hasPermission(req.user, permission));

    if (hasAny) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Missing required permissions. Need one of: ${permissions.join(', ')}`
    });
  };
}

/**
 * Middleware: Require all permissions (AND logic)
 * @param {Array<string>} permissions - Array of permission codes
 * @returns {Function} Express middleware
 */
function requireAllPermissions(permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const missingPermissions = permissions.filter(permission => !hasPermission(req.user, permission));

    if (missingPermissions.length === 0) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Missing required permissions: ${missingPermissions.join(', ')}`
    });
  };
}

/**
 * Middleware: Require a specific role
 * @param {string} roleName - Role name (e.g., 'ADMIN', 'DIETITIAN')
 * @returns {Function} Express middleware
 */
function requireRole(roleName) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (hasRole(req.user, roleName)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Required role: ${roleName}`
    });
  };
}

/**
 * Middleware: Require at least one role (OR logic)
 * @param {Array<string>} roleNames - Array of role names
 * @returns {Function} Express middleware
 */
function requireAnyRole(roleNames) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const hasAnyRole = roleNames.some(roleName => hasRole(req.user, roleName));

    if (hasAnyRole) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Required role. Need one of: ${roleNames.join(', ')}`
    });
  };
}

/**
 * Middleware: Require user owns the resource OR has permission
 * @param {string} field - Field name to check (e.g., 'user_id', 'created_by')
 * @param {string} permission - Permission code if not owner
 * @returns {Function} Express middleware
 */
function requireOwnerOrPermission(field, permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user owns the resource
    const resourceUserId = req.body[field] || req.params[field] || req.query[field];

    if (resourceUserId === req.user.id) {
      return next();
    }

    // Check if user has the permission
    if (hasPermission(req.user, permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Access denied. Must be owner or have appropriate permission'
    });
  };
}

/**
 * Middleware: Require user is assigned dietitian for patient OR has permission
 * Used for patient data access
 * @returns {Function} Express middleware
 */
function requireAssignedDietitian() {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Admins can access all patient data
    if (isAdmin(req.user)) {
      return next();
    }

    // Check if user has general patients.read permission
    if (hasPermission(req.user, 'patients.read')) {
      // Dietitians with patients.read can only access their assigned patients
      // This logic will be enforced in the service layer
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Access denied. Must be assigned dietitian or have appropriate permission'
    });
  };
}

/**
 * Middleware: Require user is a staff member (not a PATIENT)
 * Use this to protect staff-only routes from patient access
 * @returns {Function} Express middleware
 */
function requireStaffRole() {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (hasRole(req.user, 'PATIENT')) {
      return res.status(403).json({
        success: false,
        error: 'This resource is not accessible from the patient portal'
      });
    }

    return next();
  };
}

module.exports = {
  // Middleware functions
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireAnyRole,
  requireOwnerOrPermission,
  requireAssignedDietitian,
  requireStaffRole,

  // Helper functions
  hasPermission,
  hasRole,
  isAdmin
};
