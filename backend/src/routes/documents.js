/**
 * Document Routes
 *
 * All routes require authentication and appropriate permissions.
 * RBAC enforced via middleware and service layer.
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const documentController = require('../controllers/documentController');
const { upload } = require('../controllers/documentController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

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
 * Validation rules for document ID parameter
 */
const documentIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid document ID format')
];

/**
 * Validation rules for uploading documents
 */
const uploadValidation = [
  body('resource_type')
    .optional()
    .isIn(['patient', 'visit', 'user'])
    .withMessage('Resource type must be patient, visit, or user'),

  body('resource_id')
    .optional()
    .isUUID()
    .withMessage('Resource ID must be a valid UUID'),

  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
];

/**
 * Validation rules for updating documents
 */
const updateValidation = [
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
];

/**
 * Validation rules for document queries
 */
const queryValidation = [
  query('resource_type')
    .optional()
    .isIn(['patient', 'visit', 'user'])
    .withMessage('Resource type must be patient, visit, or user'),

  query('resource_id')
    .optional()
    .isUUID()
    .withMessage('Resource ID must be a valid UUID'),

  query('search')
    .optional()
    .custom((value) => {
      // Allow empty string or string between 1 and 100 characters
      if (value === '' || (typeof value === 'string' && value.length >= 1 && value.length <= 100)) {
        return true;
      }
      throw new Error('Search term must be between 1 and 100 characters');
    }),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * Validation rules for advanced search
 */
const searchValidation = [
  query('tags')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) {
        return value.every(tag => typeof tag === 'string' && tag.length <= 50);
      }
      return typeof value === 'string' && value.length <= 50;
    })
    .withMessage('Tags must be strings with max length 50'),

  query('category')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Category must be less than 100 characters'),

  query('is_template')
    .optional()
    .isBoolean()
    .withMessage('is_template must be a boolean'),

  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search term must be less than 100 characters'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * Validation rules for tag operations
 */
const tagsValidation = [
  body('tags')
    .isArray({ min: 1 })
    .withMessage('Tags must be a non-empty array'),

  body('tags.*')
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be a string between 1 and 50 characters')
];

/**
 * Validation rules for sending to patient
 */
const sendToPatientValidation = [
  body('patient_id')
    .isUUID()
    .withMessage('patient_id must be a valid UUID'),

  body('sent_via')
    .optional()
    .isIn(['email', 'portal', 'sms', 'other'])
    .withMessage('sent_via must be email, portal, sms, or other'),

  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
];

/**
 * Validation rules for sending to group
 */
const sendToGroupValidation = [
  body('patient_ids')
    .isArray({ min: 1 })
    .withMessage('patient_ids must be a non-empty array'),

  body('patient_ids.*')
    .isUUID()
    .withMessage('Each patient_id must be a valid UUID'),

  body('sent_via')
    .optional()
    .isIn(['email', 'portal', 'sms', 'other'])
    .withMessage('sent_via must be email, portal, sms, or other'),

  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
];

// GET /api/documents - Get all documents
router.get(
  '/',
  authenticate,
  requirePermission('documents.read'),
  queryValidation,
  validate,
  documentController.getDocuments
);

// GET /api/documents/stats - Get document statistics
router.get(
  '/stats',
  authenticate,
  requirePermission('documents.read'),
  documentController.getDocumentStats
);

// GET /api/documents/search - Search documents with advanced filters
router.get(
  '/search',
  authenticate,
  requirePermission('documents.read'),
  searchValidation,
  validate,
  documentController.searchDocuments
);

// GET /api/documents/:id - Get single document
router.get(
  '/:id',
  authenticate,
  requirePermission('documents.read'),
  documentIdValidation,
  validate,
  documentController.getDocumentById
);

// GET /api/documents/:id/download - Download document file
router.get(
  '/:id/download',
  authenticate,
  requirePermission('documents.download'),
  documentIdValidation,
  validate,
  documentController.downloadDocument
);

// POST /api/documents - Upload new document
router.post(
  '/',
  authenticate,
  requirePermission('documents.upload'),
  uploadValidation,
  validate,
  ...documentController.uploadDocument
);

// PUT /api/documents/:id - Update document metadata
router.put(
  '/:id',
  authenticate,
  requirePermission('documents.update'),
  documentIdValidation,
  updateValidation,
  validate,
  documentController.updateDocument
);

// DELETE /api/documents/:id - Delete document
router.delete(
  '/:id',
  authenticate,
  requirePermission('documents.delete'),
  documentIdValidation,
  validate,
  documentController.deleteDocument
);

// POST /api/documents/:id/tags - Add tags to document
router.post(
  '/:id/tags',
  authenticate,
  requirePermission('documents.update'),
  documentIdValidation,
  tagsValidation,
  validate,
  documentController.addTags
);

// DELETE /api/documents/:id/tags - Remove tags from document
router.delete(
  '/:id/tags',
  authenticate,
  requirePermission('documents.update'),
  documentIdValidation,
  tagsValidation,
  validate,
  documentController.removeTags
);

// GET /api/documents/patient/:patientId/shares - Get documents shared with a patient
router.get(
  '/patient/:patientId/shares',
  authenticate,
  requirePermission('documents.read'),
  [
    param('patientId')
      .isUUID()
      .withMessage('Invalid patient ID format')
  ],
  validate,
  documentController.getPatientDocumentShares
);

// POST /api/documents/:id/send-to-patient - Send document to patient
router.post(
  '/:id/send-to-patient',
  authenticate,
  requirePermission('documents.share'),
  documentIdValidation,
  sendToPatientValidation,
  validate,
  documentController.sendToPatient
);

// POST /api/documents/:id/send-to-group - Send document to group
router.post(
  '/:id/send-to-group',
  authenticate,
  requirePermission('documents.share'),
  documentIdValidation,
  sendToGroupValidation,
  validate,
  documentController.sendToGroup
);

// GET /api/documents/:id/shares - Get document sharing history
router.get(
  '/:id/shares',
  authenticate,
  requirePermission('documents.read'),
  documentIdValidation,
  validate,
  documentController.getShares
);

// GET /api/documents/:id/shares-with-logs - Get document shares with access logs
router.get(
  '/:id/shares-with-logs',
  authenticate,
  requirePermission('documents.read'),
  documentIdValidation,
  validate,
  documentController.getSharesWithLogs
);

/**
 * Validation rules for creating share link
 */
const createShareLinkValidation = [
  body('patient_id')
    .isUUID()
    .withMessage('patient_id must be a valid UUID'),

  body('expires_at')
    .optional()
    .isISO8601()
    .withMessage('expires_at must be a valid ISO 8601 date'),

  body('password')
    .optional()
    .isString()
    .isLength({ min: 4, max: 255 })
    .withMessage('Password must be between 4 and 255 characters'),

  body('max_downloads')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('max_downloads must be between 1 and 1000'),

  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
];

// POST /api/documents/:id/create-share-link - Create public share link
router.post(
  '/:id/create-share-link',
  authenticate,
  requirePermission('documents.share'),
  documentIdValidation,
  createShareLinkValidation,
  validate,
  documentController.createShareLink
);

/**
 * Validation rules for share ID parameter
 */
const shareIdValidation = [
  param('shareId')
    .isUUID()
    .withMessage('Invalid share ID format')
];

/**
 * Validation rules for updating share
 */
const updateShareValidation = [
  body('expires_at')
    .optional()
    .custom((value) => {
      if (value === null || value === '') return true;
      return !isNaN(Date.parse(value));
    })
    .withMessage('expires_at must be a valid date or null'),

  body('password')
    .optional()
    .custom((value) => {
      if (value === null || value === '') return true;
      return typeof value === 'string' && value.length >= 4 && value.length <= 255;
    })
    .withMessage('Password must be between 4 and 255 characters or null to remove'),

  body('max_downloads')
    .optional()
    .custom((value) => {
      if (value === null) return true;
      return Number.isInteger(value) && value >= 1 && value <= 1000;
    })
    .withMessage('max_downloads must be between 1 and 1000 or null for unlimited'),

  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

// PUT /api/documents/shares/:shareId - Update share settings
router.put(
  '/shares/:shareId',
  authenticate,
  requirePermission('documents.share'),
  shareIdValidation,
  updateShareValidation,
  validate,
  documentController.updateShare
);

// DELETE /api/documents/shares/:shareId - Revoke share link
router.delete(
  '/shares/:shareId',
  authenticate,
  requirePermission('documents.share'),
  shareIdValidation,
  validate,
  documentController.revokeShare
);

/**
 * Validation rules for sending document by email
 */
const sendByEmailValidation = [
  body('patient_id')
    .isUUID()
    .withMessage('patient_id must be a valid UUID'),

  body('message')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Message must be less than 1000 characters')
];

// POST /api/documents/:id/send-by-email - Send document as email attachment
router.post(
  '/:id/send-by-email',
  authenticate,
  requirePermission('documents.share'),
  documentIdValidation,
  sendByEmailValidation,
  validate,
  documentController.sendByEmail
);

module.exports = router;