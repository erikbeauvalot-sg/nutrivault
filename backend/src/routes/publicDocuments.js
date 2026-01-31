/**
 * Public Document Routes
 *
 * Public routes for accessing shared documents via share tokens.
 * No authentication required for these endpoints.
 */

const express = require('express');
const router = express.Router();
const { param, body, validationResult } = require('express-validator');
const publicDocumentController = require('../controllers/publicDocumentController');

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
 * Validation rules for token parameter
 */
const tokenValidation = [
  param('token')
    .isLength({ min: 64, max: 64 })
    .isHexadecimal()
    .withMessage('Invalid share token format')
];

/**
 * Validation rules for password verification
 */
const passwordValidation = [
  body('password')
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('Password is required and must be between 1 and 255 characters')
];

// GET /public/documents/:token - Get share information
router.get(
  '/:token',
  tokenValidation,
  validate,
  publicDocumentController.getShareInfo
);

// POST /public/documents/:token/verify - Verify password for protected share
router.post(
  '/:token/verify',
  tokenValidation,
  passwordValidation,
  validate,
  publicDocumentController.verifyPassword
);

// GET /public/documents/:token/download - Download document via share token
router.get(
  '/:token/download',
  tokenValidation,
  validate,
  publicDocumentController.downloadDocument
);

// GET /public/documents/:token/preview - Preview document (images/PDFs)
router.get(
  '/:token/preview',
  tokenValidation,
  validate,
  publicDocumentController.previewDocument
);

module.exports = router;
