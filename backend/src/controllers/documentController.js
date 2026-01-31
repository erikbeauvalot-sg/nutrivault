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

/**
 * GET /api/documents/search - Search documents with advanced filters
 */
exports.searchDocuments = async (req, res, next) => {
  try {
    const user = req.user;
    const filters = {
      tags: req.query.tags ? (Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags]) : undefined,
      category: req.query.category,
      is_template: req.query.is_template ? req.query.is_template === 'true' : undefined,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit
    };
    const requestMetadata = getRequestMetadata(req);

    const result = await documentService.searchDocuments(user, filters, requestMetadata);

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
 * POST /api/documents/:id/tags - Add tags to document
 */
exports.addTags = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { tags } = req.body;
    const requestMetadata = getRequestMetadata(req);

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tags array is required'
      });
    }

    const document = await documentService.addTagsToDocument(user, id, tags, requestMetadata);

    res.json({
      success: true,
      data: document,
      message: 'Tags added successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/documents/:id/tags - Remove tags from document
 */
exports.removeTags = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { tags } = req.body;
    const requestMetadata = getRequestMetadata(req);

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tags array is required'
      });
    }

    const document = await documentService.removeTagsFromDocument(user, id, tags, requestMetadata);

    res.json({
      success: true,
      data: document,
      message: 'Tags removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/documents/:id/send-to-patient - Send document to a patient
 */
exports.sendToPatient = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { patient_id, sent_via, notes } = req.body;
    const requestMetadata = getRequestMetadata(req);

    if (!patient_id) {
      return res.status(400).json({
        success: false,
        error: 'patient_id is required'
      });
    }

    const share = await documentService.sendDocumentToPatient(
      user,
      id,
      patient_id,
      { sent_via, notes },
      requestMetadata
    );

    res.status(201).json({
      success: true,
      data: share,
      message: 'Document sent to patient successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/documents/:id/send-to-group - Send document to multiple patients
 */
exports.sendToGroup = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { patient_ids, sent_via, notes } = req.body;
    const requestMetadata = getRequestMetadata(req);

    if (!patient_ids || !Array.isArray(patient_ids) || patient_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'patient_ids array is required'
      });
    }

    const results = await documentService.sendDocumentToGroup(
      user,
      id,
      patient_ids,
      { sent_via, notes },
      requestMetadata
    );

    res.status(201).json({
      success: true,
      data: results,
      message: `Document sent to ${results.successful.length} out of ${patient_ids.length} patients`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/documents/:id/shares - Get document sharing history
 */
exports.getShares = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const requestMetadata = getRequestMetadata(req);

    const shares = await documentService.getDocumentShares(user, id, requestMetadata);

    res.json({
      success: true,
      data: shares
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/documents/:id/shares-with-logs - Get document shares with access logs
 */
exports.getSharesWithLogs = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const requestMetadata = getRequestMetadata(req);

    const shares = await documentService.getDocumentSharesWithLogs(user, id, requestMetadata);

    res.json({
      success: true,
      data: shares
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/documents/:id/create-share-link - Create public share link
 */
exports.createShareLink = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { patient_id, expires_at, password, max_downloads, notes } = req.body;
    const requestMetadata = getRequestMetadata(req);

    if (!patient_id) {
      return res.status(400).json({
        success: false,
        error: 'patient_id is required'
      });
    }

    const share = await documentService.createShareLink(
      user,
      id,
      {
        patient_id,
        expires_at: expires_at ? new Date(expires_at) : null,
        password,
        max_downloads,
        notes
      },
      requestMetadata
    );

    res.status(201).json({
      success: true,
      data: share,
      message: 'Share link created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/documents/shares/:shareId - Update share settings
 */
exports.updateShare = async (req, res, next) => {
  try {
    const user = req.user;
    const { shareId } = req.params;
    const updates = req.body;
    const requestMetadata = getRequestMetadata(req);

    // Convert expires_at string to Date if provided
    if (updates.expires_at && updates.expires_at !== null) {
      updates.expires_at = new Date(updates.expires_at);
    }

    const share = await documentService.updateShareSettings(
      user,
      shareId,
      updates,
      requestMetadata
    );

    res.json({
      success: true,
      data: share,
      message: 'Share updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/documents/shares/:shareId - Revoke share link
 */
exports.revokeShare = async (req, res, next) => {
  try {
    const user = req.user;
    const { shareId } = req.params;
    const requestMetadata = getRequestMetadata(req);

    await documentService.revokeShare(user, shareId, requestMetadata);

    res.json({
      success: true,
      message: 'Share link revoked successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/documents/:id/send-by-email - Send document as email attachment
 */
exports.sendByEmail = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { patient_id, message } = req.body;
    const requestMetadata = getRequestMetadata(req);

    if (!patient_id) {
      return res.status(400).json({
        success: false,
        error: 'patient_id is required'
      });
    }

    const result = await documentService.sendDocumentByEmail(
      user,
      id,
      patient_id,
      message || null,
      requestMetadata
    );

    res.status(200).json({
      success: true,
      data: result,
      message: 'Document sent by email successfully'
    });
  } catch (error) {
    if (error.message === 'Patient does not have an email address') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
};

exports.upload = upload;