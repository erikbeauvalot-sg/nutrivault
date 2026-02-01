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
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Role name is required')
      .isIn(['ADMIN', 'DIETITIAN', 'ASSISTANT', 'VIEWER'])
      .withMessage('Role name must be one of: ADMIN, DIETITIAN, ASSISTANT, VIEWER'),
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
    body('name')
      .optional()
      .trim()
      .isIn(['ADMIN', 'DIETITIAN', 'ASSISTANT', 'VIEWER'])
      .withMessage('Role name must be one of: ADMIN, DIETITIAN, ASSISTANT, VIEWER'),
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
