/**
 * Role Controller
 *
 * HTTP request handlers for role and permission management.
 * Thin controllers that delegate business logic to role service.
 */

const roleService = require('../services/role.service');

/**
 * Extract request metadata for audit logging
 * @param {Object} req - Express request object
 * @returns {Object} Request metadata
 */
function getRequestMetadata(req) {
  return {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.originalUrl
  };
}

/**
 * GET /api/roles - Get all roles
 */
exports.getRoles = async (req, res, next) => {
  try {
    const roles = await roleService.getRoles();
    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/roles/:id - Get role by ID with permissions
 */
exports.getRoleById = async (req, res, next) => {
  try {
    const roleId = req.params.id;
    const role = await roleService.getRoleById(roleId);

    res.json({
      success: true,
      data: role
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/roles - Create new role (Admin only)
 */
exports.createRole = async (req, res, next) => {
  try {
    const user = req.user;
    const roleData = req.body;
    const requestMetadata = getRequestMetadata(req);

    const role = await roleService.createRole(user, roleData, requestMetadata);

    res.status(201).json({
      success: true,
      data: role,
      message: 'Role created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/roles/:id - Update role (Admin only)
 */
exports.updateRole = async (req, res, next) => {
  try {
    const user = req.user;
    const roleId = req.params.id;
    const updateData = req.body;
    const requestMetadata = getRequestMetadata(req);

    const role = await roleService.updateRole(user, roleId, updateData, requestMetadata);

    res.json({
      success: true,
      data: role,
      message: 'Role updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/roles/:id/permissions - Update role permissions (Admin only)
 */
exports.updateRolePermissions = async (req, res, next) => {
  try {
    const user = req.user;
    const roleId = req.params.id;
    const { permission_ids } = req.body;
    const requestMetadata = getRequestMetadata(req);

    const role = await roleService.updateRolePermissions(user, roleId, permission_ids, requestMetadata);

    res.json({
      success: true,
      data: role,
      message: 'Role permissions updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/roles/:id - Delete role (Admin only)
 */
exports.deleteRole = async (req, res, next) => {
  try {
    const user = req.user;
    const roleId = req.params.id;
    const requestMetadata = getRequestMetadata(req);

    await roleService.deleteRole(user, roleId, requestMetadata);

    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/roles/all/permissions - Get all permissions (Admin only)
 */
exports.getAllPermissions = async (req, res, next) => {
  try {
    const permissions = await roleService.getAllPermissions();

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    next(error);
  }
};
