/**
 * Document Management Routes
 *
 * Standalone routes for direct document operations
 */

const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  validateDocumentUpdate,
  validateDocumentId
} = require('../validators/document.validator');

/**
 * All routes require authentication and rate limiting
 */
router.use(authenticate);
router.use(apiLimiter);

/**
 * Get document by ID
 * GET /api/documents/:id
 */
router.get('/:id',
  requirePermission('documents.read'),
  validateDocumentId,
  documentController.getDocumentByIdHandler
);

/**
 * Download document file
 * GET /api/documents/:id/download
 */
router.get('/:id/download',
  requirePermission('documents.read'),
  validateDocumentId,
  documentController.downloadDocumentHandler
);

/**
 * Update document metadata
 * PATCH /api/documents/:id
 */
router.patch('/:id',
  requirePermission('documents.update'),
  validateDocumentUpdate,
  documentController.updateDocumentHandler
);

/**
 * Delete document
 * DELETE /api/documents/:id
 */
router.delete('/:id',
  requirePermission('documents.delete'),
  validateDocumentId,
  documentController.deleteDocumentHandler
);

module.exports = router;
