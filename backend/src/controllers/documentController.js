/**
 * Document Controller
 *
 * HTTP request handlers for document management.
 * Thin controllers that delegate business logic to document service.
 */

const multer = require('multer');
const path = require('path');
const documentService = require('../services/document.service');

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
 * Configure multer for file uploads
 */
const upload = multer({
  dest: path.join(__dirname, '../../temp_uploads'),
  limits: {
    fileSize: documentService.MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (documentService.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

/**
 * GET /api/documents - Get all documents
 */
exports.getDocuments = async (req, res, next) => {
  try {
    const user = req.user;
    const filters = {
      resource_type: req.query.resource_type,
      resource_id: req.query.resource_id,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit
    };
    const requestMetadata = getRequestMetadata(req);

    const result = await documentService.getDocuments(user, filters, requestMetadata);

    res.json({
      success: true,
      data: result.documents,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/documents/stats - Get document statistics
 */
exports.getDocumentStats = async (req, res, next) => {
  try {
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const stats = await documentService.getDocumentStats(user, requestMetadata);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/documents/:id - Get single document
 */
exports.getDocumentById = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const requestMetadata = getRequestMetadata(req);

    const document = await documentService.getDocumentById(user, id, requestMetadata);

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/documents/:id/download - Download document file
 */
exports.downloadDocument = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const requestMetadata = getRequestMetadata(req);

    const result = await documentService.downloadDocument(user, id, requestMetadata);

    // Set headers for file download
    res.setHeader('Content-Type', result.document.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${result.document.file_name}"`);
    res.setHeader('Content-Length', result.document.file_size);

    // Stream file to response
    const fs = require('fs');
    const fileStream = fs.createReadStream(result.filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Error downloading file'
        });
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/documents - Upload new document
 */
exports.uploadDocument = [
  upload.single('file'),
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
];

/**
 * PUT /api/documents/:id - Update document metadata
 */
exports.updateDocument = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const updates = req.body;
    const requestMetadata = getRequestMetadata(req);

    const document = await documentService.updateDocument(user, id, updates, requestMetadata);

    res.json({
      success: true,
      data: document,
      message: 'Document updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/documents/:id - Delete document
 */
exports.deleteDocument = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const requestMetadata = getRequestMetadata(req);

    await documentService.deleteDocument(user, id, requestMetadata);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.upload = upload;