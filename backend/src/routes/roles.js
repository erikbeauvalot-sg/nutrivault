/**
 * Role Routes
 *
 * Role and permission management routes (Admin only).
 */

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const roleController = require('../controllers/roleController');
const authenticate = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');
const db = require('../../../models');

// Free-form role name, normalized (uppercase, no accents, underscores) before validation
const roleNameValidation = (field) => field
  .customSanitizer(value => db.Role.normalizeName(value))
  .matches(/^[A-Z][A-Z0-9_]{1,49}$/)
  .withMessage('Role name must be 2-50 characters: letters, digits and underscores, starting with a letter');

const homePageValidation = () => body('home_page')
  .optional({ nullable: true })
  .isString()
  .isLength({ min: 1, max: 100 })
  .withMessage('home_page must be a menu entry key');

const dataScopeValidation = () => body('data_scope')
  .optional()
  .isIn(db.Role.DATA_SCOPES)
  .withMessage(`data_scope must be one of: ${db.Role.DATA_SCOPES.join(', ')}`);

/**
 * Validation middleware - check for validation errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * Routes
 */

// GET /api/roles/all/permissions - Get all permissions (Admin only)
// Note: Must be before /:id to avoid route conflict
router.get(
  '/all/permissions',
  authenticate,
  requireRole('ADMIN'),
  roleController.getAllPermissions
);

// GET /api/roles - Get all roles (Admin only)
router.get(
  '/',
  authenticate,
  requireRole('ADMIN'),
  roleController.getRoles
);

// GET /api/roles/:id - Get role by ID with permissions (Admin only)
router.get(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  param('id').isUUID().withMessage('ID must be a valid UUID'),
  validate,
  roleController.getRoleById
);

// POST /api/roles - Create new role (Admin only)
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  [
    roleNameValidation(
      body('name')
        .trim()
        .notEmpty()
        .withMessage('Role name is required')
        .bail()
    ),
    dataScopeValidation(),
    homePageValidation(),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters')
  ],
  validate,
  roleController.createRole
);

// PUT /api/roles/:id - Update role (Admin only)
router.put(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  [
    param('id').isUUID().withMessage('ID must be a valid UUID'),
    roleNameValidation(
      body('name')
        .optional()
        .trim()
    ),
    dataScopeValidation(),
    homePageValidation(),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean')
  ],
  validate,
  roleController.updateRole
);

// PUT /api/roles/:id/permissions - Update role permissions (Admin only)
router.put(
  '/:id/permissions',
  authenticate,
  requireRole('ADMIN'),
  [
    param('id').isUUID().withMessage('ID must be a valid UUID'),
    body('permission_ids')
      .isArray()
      .withMessage('permission_ids must be an array'),
    body('permission_ids.*')
      .notEmpty()
      .withMessage('Permission ID cannot be empty')
  ],
  validate,
  roleController.updateRolePermissions
);

// GET /api/roles/:id/menu-items - Sidebar entries visible to the role (Admin only)
router.get(
  '/:id/menu-items',
  authenticate,
  requireRole('ADMIN'),
  param('id').isUUID().withMessage('ID must be a valid UUID'),
  validate,
  roleController.getRoleMenuItems
);

// PUT /api/roles/:id/menu-items - Set the sidebar entries visible to the role (Admin only)
router.put(
  '/:id/menu-items',
  authenticate,
  requireRole('ADMIN'),
  [
    param('id').isUUID().withMessage('ID must be a valid UUID'),
    body('item_keys')
      .isArray({ max: 200 })
      .withMessage('item_keys must be an array'),
    body('item_keys.*')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Invalid menu entry')
  ],
  validate,
  roleController.updateRoleMenuItems
);

// DELETE /api/roles/:id - Delete role (Admin only)
router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  param('id').isUUID().withMessage('ID must be a valid UUID'),
  validate,
  roleController.deleteRole
);

module.exports = router;
