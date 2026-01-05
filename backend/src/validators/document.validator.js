/**
 * Document Validation Rules
 *
 * Input validation for document/file upload endpoints
 */

const { body, param, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array().map(err => ({
          field: err.path || err.param,
          message: err.msg,
          value: err.value
        }))
      },
      timestamp: new Date().toISOString()
    });
  }

  next();
};

/**
 * Valid document types
 */
const VALID_DOCUMENT_TYPES = [
  'medical_record',
  'lab_result',
  'diet_plan',
  'profile_photo',
  'meal_plan',
  'progress_photo',
  'prescription',
  'insurance_card',
  'consent_form',
  'other'
];

/**
 * Validation rules for uploading documents
 */
const validateDocumentUpload = [
  param('id')
    .isUUID().withMessage('Invalid resource ID format'),

  body('document_type')
    .optional()
    .isIn(VALID_DOCUMENT_TYPES)
    .withMessage(`Document type must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`),

  body('title')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('Title must not exceed 255 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),

  handleValidationErrors
];

/**
 * Validation rules for updating document metadata
 */
const validateDocumentUpdate = [
  param('id')
    .isUUID().withMessage('Invalid document ID format'),

  body('document_type')
    .optional()
    .isIn(VALID_DOCUMENT_TYPES)
    .withMessage(`Document type must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`),

  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Title cannot be empty if provided')
    .isLength({ max: 255 }).withMessage('Title must not exceed 255 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),

  // Prevent updating file-related fields
  body('original_filename')
    .not().exists().withMessage('Cannot update original filename'),

  body('stored_filename')
    .not().exists().withMessage('Cannot update stored filename'),

  body('file_path')
    .not().exists().withMessage('Cannot update file path'),

  body('mime_type')
    .not().exists().withMessage('Cannot update MIME type'),

  body('file_size')
    .not().exists().withMessage('Cannot update file size'),

  body('resource_type')
    .not().exists().withMessage('Cannot update resource type'),

  body('resource_id')
    .not().exists().withMessage('Cannot update resource ID'),

  handleValidationErrors
];

/**
 * Validation for document ID parameter
 */
const validateDocumentId = [
  param('id')
    .isUUID().withMessage('Invalid document ID format'),

  handleValidationErrors
];

/**
 * Validation for resource ID parameter
 */
const validateResourceId = [
  param('id')
    .isUUID().withMessage('Invalid resource ID format'),

  handleValidationErrors
];

module.exports = {
  validateDocumentUpload,
  validateDocumentUpdate,
  validateDocumentId,
  validateResourceId,
  VALID_DOCUMENT_TYPES
};
