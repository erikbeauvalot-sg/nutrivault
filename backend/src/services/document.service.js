/**
 * Document Service
 *
 * Business logic for document management with RBAC and audit logging.
 * Handles file uploads, downloads, and metadata management.
 */

const db = require('../../../models');
const Document = db.Document;
const User = db.User;
const Patient = db.Patient;
const Visit = db.Visit;
const auditService = require('./audit.service');
const fs = require('fs').promises;
const path = require('path');
const { Op } = db.Sequelize;

/**
 * Allowed MIME types for file uploads
 */
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/rtf'
];

/**
 * Maximum file size (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Upload directory relative to project root
 */
const UPLOAD_DIR = 'uploads';

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
 * Validate file upload
 * @param {Object} file - Multer file object
 * @throws {Error} If file is invalid
 */
function validateFile(file) {
  if (!file) {
    throw new Error('No file provided');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds maximum limit of 10MB');
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error('File type not allowed. Allowed types: PDF, JPEG, PNG, GIF, DOC, DOCX, TXT, RTF');
  }
}

/**
 * Generate file path for storage
 * @param {string} resourceType - Type of resource (patient, visit, user)
 * @param {string} resourceId - Resource ID
 * @param {string} filename - Original filename
 * @returns {string} Relative file path
 */
function generateFilePath(resourceType, resourceId, filename) {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return path.join(resourceType, date, `${resourceId}_${Date.now()}_${sanitizedFilename}`);
}

/**
 * Ensure upload directory exists
 * @param {string} filePath - Relative file path
 */
async function ensureUploadDirectory(filePath) {
  const fullPath = path.join(process.cwd(), UPLOAD_DIR, path.dirname(filePath));
  await fs.mkdir(fullPath, { recursive: true });
}

/**
 * Upload a document
 * @param {Object} user - Authenticated user object
 * @param {Object} file - Multer file object
 * @param {Object} metadata - Document metadata
 * @param {string} metadata.resource_type - Type of resource
 * @param {string} metadata.resource_id - Resource ID
 * @param {string} metadata.description - Optional description
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Created document
 */
async function uploadDocument(user, file, metadata, requestMetadata = {}) {
  try {
    // Validate permissions
    if (!user || !user.role) {
      throw new Error('Authentication required');
    }

    // Check upload permission
    const hasUploadPermission = user.permissions?.some(p => p.code === 'documents.upload');
    if (!hasUploadPermission && user.role.name !== 'ADMIN') {
      throw new Error('Insufficient permissions to upload documents');
    }

    // Validate file
    validateFile(file);

    // Validate resource exists (only if resource_type and resource_id are provided)
    if (metadata.resource_type && metadata.resource_id) {
      await validateResourceExists(metadata.resource_type, metadata.resource_id);
    }

    // Generate file path and ensure directory exists
    const filePath = generateFilePath(metadata.resource_type, metadata.resource_id, file.originalname);
    await ensureUploadDirectory(filePath);

    // Move file to final location
    const fullFilePath = path.join(process.cwd(), UPLOAD_DIR, filePath);
    await fs.rename(file.path, fullFilePath);

    // Create document record
    const document = await Document.create({
      resource_type: metadata.resource_type,
      resource_id: metadata.resource_id,
      file_name: file.originalname,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.mimetype,
      uploaded_by: user.id,
      description: metadata.description || null
    });

    // Fetch complete document with uploader info
    const completeDocument = await Document.findByPk(document.id, {
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'username', 'first_name', 'last_name']
      }]
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      action: 'CREATE',
      resource_type: 'document',
      resource_id: document.id,
      details: {
        file_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        resource_type: metadata.resource_type,
        resource_id: metadata.resource_id
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    return completeDocument;
  } catch (error) {
    // Clean up uploaded file if it exists
    if (file && file.path) {
      try {
        await fs.unlink(file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    throw error;
  }
}

/**
 * Validate that a resource exists
 * @param {string} resourceType - Type of resource
 * @param {string} resourceId - Resource ID
 * @throws {Error} If resource doesn't exist
 */
async function validateResourceExists(resourceType, resourceId) {
  let model;
  switch (resourceType) {
    case 'patient':
      model = Patient;
      break;
    case 'visit':
      model = Visit;
      break;
    case 'user':
      model = User;
      break;
    default:
      throw new Error('Invalid resource type');
  }

  const resource = await model.findByPk(resourceId);
  if (!resource) {
    throw new Error(`${resourceType} with ID ${resourceId} not found`);
  }
}

/**
 * Get documents with filtering and pagination
 * @param {Object} user - Authenticated user object
 * @param {Object} filters - Filter criteria
 * @param {string} filters.resource_type - Filter by resource type
 * @param {string} filters.resource_id - Filter by resource ID
 * @param {string} filters.search - Search by filename or description
 * @param {number} filters.page - Page number (default 1)
 * @param {number} filters.limit - Items per page (default 20)
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Documents, total count, and pagination info
 */
async function getDocuments(user, filters = {}, requestMetadata = {}) {
  try {
    const whereClause = { is_active: true };

    // Apply filters
    if (filters.resource_type) {
      whereClause.resource_type = filters.resource_type;
    }

    if (filters.resource_id) {
      whereClause.resource_id = filters.resource_id;
    }

    if (filters.search) {
      whereClause[Op.or] = [
        { file_name: { [Op.like]: `%${filters.search}%` } },
        { description: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    // RBAC: Apply role-based filtering
    if (user && user.role) {
      if (user.role.name === 'VIEWER') {
        // VIEWER can only see documents they uploaded or public documents
        whereClause.uploaded_by = user.id;
      }
      // ADMIN, DIETITIAN, ASSISTANT can see all documents
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await Document.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    return {
      documents: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get single document by ID
 * @param {Object} user - Authenticated user object
 * @param {string} documentId - Document UUID
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Document object
 */
async function getDocumentById(user, documentId, requestMetadata = {}) {
  try {
    const document = await Document.findOne({
      where: {
        id: documentId,
        is_active: true
      },
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ]
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // RBAC: Check read permissions
    const hasReadPermission = user.permissions?.some(p => p.code === 'documents.read');
    if (!hasReadPermission && user.role.name !== 'ADMIN' && document.uploaded_by !== user.id) {
      throw new Error('Insufficient permissions to view this document');
    }

    return document;
  } catch (error) {
    throw error;
  }
}

/**
 * Download document file
 * @param {Object} user - Authenticated user object
 * @param {string} documentId - Document UUID
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Document with file stream info
 */
async function downloadDocument(user, documentId, requestMetadata = {}) {
  try {
    const document = await getDocumentById(user, documentId, requestMetadata);

    // Check download permission
    const hasDownloadPermission = user.permissions?.some(p => p.code === 'documents.download');
    if (!hasDownloadPermission && user.role.name !== 'ADMIN' && document.uploaded_by !== user.id) {
      throw new Error('Insufficient permissions to download this document');
    }

    const fullFilePath = path.join(process.cwd(), UPLOAD_DIR, document.file_path);

    // Check if file exists
    try {
      await fs.access(fullFilePath);
    } catch (error) {
      throw new Error('Document file not found on disk');
    }

    // Audit log download
    await auditService.log({
      user_id: user.id,
      action: 'READ',
      resource_type: 'document',
      resource_id: documentId,
      details: { action: 'download' },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    return {
      document,
      filePath: fullFilePath
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Update document metadata
 * @param {Object} user - Authenticated user object
 * @param {string} documentId - Document UUID
 * @param {Object} updates - Fields to update
 * @param {string} updates.description - New description
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Updated document
 */
async function updateDocument(user, documentId, updates, requestMetadata = {}) {
  try {
    const document = await getDocumentById(user, documentId, requestMetadata);

    // Check update permission
    const hasUpdatePermission = user.permissions?.some(p => p.code === 'documents.update');
    if (!hasUpdatePermission && user.role.name !== 'ADMIN' && document.uploaded_by !== user.id) {
      throw new Error('Insufficient permissions to update this document');
    }

    // Update document
    await document.update(updates);

    // Fetch updated document
    const updatedDocument = await getDocumentById(user, documentId, requestMetadata);

    // Audit log
    await auditService.log({
      user_id: user.id,
      action: 'UPDATE',
      resource_type: 'document',
      resource_id: documentId,
      details: updates,
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    return updatedDocument;
  } catch (error) {
    throw error;
  }
}

/**
 * Delete document (soft delete)
 * @param {Object} user - Authenticated user object
 * @param {string} documentId - Document UUID
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<boolean>} Success status
 */
async function deleteDocument(user, documentId, requestMetadata = {}) {
  try {
    const document = await getDocumentById(user, documentId, requestMetadata);

    // Check delete permission
    const hasDeletePermission = user.permissions?.some(p => p.code === 'documents.delete');
    if (!hasDeletePermission && user.role.name !== 'ADMIN' && document.uploaded_by !== user.id) {
      throw new Error('Insufficient permissions to delete this document');
    }

    // Soft delete
    await document.update({ is_active: false });

    // Optionally remove file from disk (commented out for audit purposes)
    // const fullFilePath = path.join(process.cwd(), UPLOAD_DIR, document.file_path);
    // try {
    //   await fs.unlink(fullFilePath);
    // } catch (error) {
    //   console.error('Error removing file from disk:', error);
    // }

    // Audit log
    await auditService.log({
      user_id: user.id,
      action: 'DELETE',
      resource_type: 'document',
      resource_id: documentId,
      details: { soft_delete: true },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Get document statistics
 * @param {Object} user - Authenticated user object
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Document statistics
 */
async function getDocumentStats(user, requestMetadata = {}) {
  try {
    // Check read permission
    const hasReadPermission = user.permissions?.some(p => p.code === 'documents.read');
    if (!hasReadPermission && user.role.name !== 'ADMIN') {
      throw new Error('Insufficient permissions to view document statistics');
    }

    const whereClause = { is_active: true };

    // Apply role-based filtering
    if (user.role.name === 'VIEWER') {
      whereClause.uploaded_by = user.id;
    }

    const stats = await Document.findAll({
      where: whereClause,
      attributes: [
        'resource_type',
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count'],
        [db.Sequelize.fn('SUM', db.Sequelize.col('file_size')), 'total_size']
      ],
      group: ['resource_type']
    });

    const totalDocuments = await Document.count({ where: whereClause });
    const totalSize = await Document.sum('file_size', { where: whereClause });

    return {
      totalDocuments,
      totalSize: totalSize || 0,
      byType: stats.map(stat => ({
        resource_type: stat.resource_type,
        count: parseInt(stat.dataValues.count),
        total_size: parseInt(stat.dataValues.total_size) || 0
      }))
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  uploadDocument,
  getDocuments,
  getDocumentById,
  downloadDocument,
  updateDocument,
  deleteDocument,
  getDocumentStats,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE
};