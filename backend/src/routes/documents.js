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
  upload.single('file'),
  uploadValidation,
  validate,
  async (req, res, next) => {
    try {
      const user = req.user;
      const file = req.file;
      const metadata = {
        resource_type: req.body.resource_type,
        resource_id: req.body.resource_id,
        description: req.body.description
      };
      const requestMetadata = getRequestMetadata(req);

      const document = await documentService.uploadDocument(user, file, metadata, requestMetadata);

      res.status(201).json({
        success: true,
        data: document,
        message: 'Document uploaded successfully'
      });
    } catch (error) {
      next(error);
    }
  }
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

module.exports = router;