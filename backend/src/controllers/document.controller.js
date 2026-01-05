/**
 * Document Management Controller
 *
 * Handles HTTP requests for file upload and document management
 */

const {
  uploadDocuments,
  getDocumentsByResource,
  getDocumentById,
  updateDocument,
  deleteDocument,
  getDocumentStats
} = require('../services/document.service');
const { asyncHandler } = require('../middleware/errorHandler');
const { AppError } = require('../middleware/errorHandler');

/**
 * Upload document(s) for a resource
 * POST /api/patients/:id/documents
 * POST /api/visits/:id/documents
 * POST /api/users/:id/documents
 */
const uploadDocumentsHandler = asyncHandler(async (req, res) => {
  // Files are attached by multer middleware
  if (!req.files || req.files.length === 0) {
    throw new AppError('No files uploaded', 400, 'NO_FILES');
  }

  // Extract resource information from route params and body
  const resource_type = req.resourceType; // Set by middleware
  const resource_id = req.params.id;

  const documentData = {
    resource_type,
    resource_id,
    document_type: req.body.document_type || 'other',
    title: req.body.title,
    description: req.body.description
  };

  const requestMetadata = {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.path
  };

  const documents = await uploadDocuments(req.files, documentData, req.user, requestMetadata);

  res.status(201).json({
    success: true,
    message: `${documents.length} document(s) uploaded successfully`,
    data: { documents }
  });
});

/**
 * Get all documents for a resource
 * GET /api/patients/:id/documents
 * GET /api/visits/:id/documents
 * GET /api/users/:id/documents
 */
const getResourceDocumentsHandler = asyncHandler(async (req, res) => {
  const resource_type = req.resourceType;
  const resource_id = req.params.id;

  const requestMetadata = {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.path
  };

  const documents = await getDocumentsByResource(resource_type, resource_id, req.user, requestMetadata);

  res.json({
    success: true,
    data: { documents, count: documents.length }
  });
});

/**
 * Get single document by ID
 * GET /api/documents/:id
 */
const getDocumentByIdHandler = asyncHandler(async (req, res) => {
  const requestMetadata = {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.path
  };

  const document = await getDocumentById(req.params.id, req.user, requestMetadata);

  res.json({
    success: true,
    data: { document }
  });
});

/**
 * Download document file
 * GET /api/documents/:id/download
 */
const downloadDocumentHandler = asyncHandler(async (req, res) => {
  const requestMetadata = {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.path
  };

  const document = await getDocumentById(req.params.id, req.user, requestMetadata);

  // Send file for download
  res.download(document.file_path, document.original_filename, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
      throw new AppError('Error downloading file', 500, 'DOWNLOAD_ERROR');
    }
  });
});

/**
 * Update document metadata
 * PATCH /api/documents/:id
 */
const updateDocumentHandler = asyncHandler(async (req, res) => {
  const requestMetadata = {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.path
  };

  const document = await updateDocument(req.params.id, req.body, req.user, requestMetadata);

  res.json({
    success: true,
    message: 'Document updated successfully',
    data: { document }
  });
});

/**
 * Delete document
 * DELETE /api/documents/:id
 */
const deleteDocumentHandler = asyncHandler(async (req, res) => {
  const requestMetadata = {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.path
  };

  const result = await deleteDocument(req.params.id, req.user, requestMetadata);

  res.json({
    success: true,
    message: result.message
  });
});

/**
 * Get document statistics for a resource
 * GET /api/patients/:id/documents/stats
 * GET /api/visits/:id/documents/stats
 * GET /api/users/:id/documents/stats
 */
const getDocumentStatsHandler = asyncHandler(async (req, res) => {
  const resource_type = req.resourceType;
  const resource_id = req.params.id;

  const stats = await getDocumentStats(resource_type, resource_id, req.user);

  res.json({
    success: true,
    data: { stats }
  });
});

module.exports = {
  uploadDocumentsHandler,
  getResourceDocumentsHandler,
  getDocumentByIdHandler,
  downloadDocumentHandler,
  updateDocumentHandler,
  deleteDocumentHandler,
  getDocumentStatsHandler
};
