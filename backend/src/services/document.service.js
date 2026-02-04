/**
 * Document Service
 *
 * Business logic for document management with RBAC and audit logging.
 * Handles file uploads, downloads, and metadata management.
 */

const db = require('../../../models');
const Document = db.Document;
const DocumentShare = db.DocumentShare;
const DocumentAccessLog = db.DocumentAccessLog;
const User = db.User;
const Patient = db.Patient;
const Visit = db.Visit;
const auditService = require('./audit.service');
const emailService = require('./email.service');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Op } = db.Sequelize;
const { getScopedDietitianIds } = require('../helpers/scopeHelper');

const SALT_ROUNDS = 10;

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
    const hasUploadPermission = user.role?.permissions?.some(p => p.code === 'documents.upload');
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

    // Use copy + unlink instead of rename to handle cross-device (Docker volume) moves
    try {
      await fs.copyFile(file.path, fullFilePath);
      await fs.unlink(file.path);
    } catch (renameError) {
      // If copy fails, try to clean up and throw
      try {
        await fs.unlink(file.path);
      } catch (unlinkError) {
        // Ignore cleanup errors
      }
      throw renameError;
    }

    // Create document record
    const document = await Document.create({
      resource_type: metadata.resource_type,
      resource_id: metadata.resource_id,
      file_name: file.originalname,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.mimetype,
      uploaded_by: user.id,
      description: metadata.description || null,
      category: metadata.category || null
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

    // RBAC: Scope documents by uploader
    // DIETITIAN sees only their own uploads; ASSISTANT sees linked dietitians' uploads; ADMIN sees all
    const dietitianIds = await getScopedDietitianIds(user);
    if (dietitianIds !== null) {
      if (dietitianIds.length === 0) {
        return { documents: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      }
      const scopeCondition = { uploaded_by: { [Op.in]: dietitianIds } };
      // Merge with existing search OR if any
      if (whereClause[Op.or]) {
        const searchOr = whereClause[Op.or];
        delete whereClause[Op.or];
        whereClause[Op.and] = [
          { [Op.or]: searchOr },
          scopeCondition
        ];
      } else {
        Object.assign(whereClause, scopeCondition);
      }
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
    const hasReadPermission = user.role?.permissions?.some(p => p.code === 'documents.read');
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
    const hasDownloadPermission = user.role?.permissions?.some(p => p.code === 'documents.download');
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
    const hasUpdatePermission = user.role?.permissions?.some(p => p.code === 'documents.update');
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
    const hasDeletePermission = user.role?.permissions?.some(p => p.code === 'documents.delete');
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
    const hasReadPermission = user.role?.permissions?.some(p => p.code === 'documents.read');
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

/**
 * Search documents with advanced filters (tags, category, templates)
 * @param {Object} user - Authenticated user object
 * @param {Object} filters - Search filters
 * @param {string[]} filters.tags - Array of tags to filter by
 * @param {string} filters.category - Category to filter by
 * @param {boolean} filters.is_template - Filter templates only
 * @param {string} filters.search - Search by filename or description
 * @param {number} filters.page - Page number (default 1)
 * @param {number} filters.limit - Items per page (default 20)
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Documents, total count, and pagination info
 */
async function searchDocuments(user, filters = {}, requestMetadata = {}) {
  try {
    const whereClause = { is_active: true };

    // Filter by category
    if (filters.category) {
      whereClause.category = filters.category;
    }

    // Filter by template flag
    if (filters.is_template !== undefined) {
      whereClause.is_template = filters.is_template;
    }

    // Filter by tags (PostgreSQL JSON contains operator)
    if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
      // For PostgreSQL, check if any of the provided tags exist in the tags JSON array
      whereClause.tags = {
        [Op.contains]: filters.tags
      };
    }

    // Search by filename or description
    if (filters.search) {
      whereClause[Op.or] = [
        { file_name: { [Op.like]: `%${filters.search}%` } },
        { description: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    // RBAC: Scope by uploader (same as getDocuments)
    const dietitianIds = await getScopedDietitianIds(user);
    if (dietitianIds !== null) {
      if (dietitianIds.length === 0) {
        return { documents: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      }
      const scopeCondition = { uploaded_by: { [Op.in]: dietitianIds } };
      if (whereClause[Op.or]) {
        const searchOr = whereClause[Op.or];
        delete whereClause[Op.or];
        whereClause[Op.and] = [
          { [Op.or]: searchOr },
          scopeCondition
        ];
      } else {
        Object.assign(whereClause, scopeCondition);
      }
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
 * Add tags to a document
 * @param {Object} user - Authenticated user object
 * @param {string} documentId - Document UUID
 * @param {string[]} newTags - Array of tags to add
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Updated document
 */
async function addTagsToDocument(user, documentId, newTags, requestMetadata = {}) {
  try {
    const document = await getDocumentById(user, documentId, requestMetadata);

    // Check update permission
    const hasUpdatePermission = user.role?.permissions?.some(p => p.code === 'documents.update');
    if (!hasUpdatePermission && user.role.name !== 'ADMIN' && document.uploaded_by !== user.id) {
      throw new Error('Insufficient permissions to update this document');
    }

    // Merge existing tags with new tags (avoid duplicates)
    const existingTags = document.tags || [];
    const updatedTags = [...new Set([...existingTags, ...newTags])];

    await document.update({ tags: updatedTags });

    // Fetch updated document
    const updatedDocument = await getDocumentById(user, documentId, requestMetadata);

    // Audit log
    await auditService.log({
      user_id: user.id,
      action: 'UPDATE',
      resource_type: 'document',
      resource_id: documentId,
      details: { action: 'add_tags', added_tags: newTags, final_tags: updatedTags },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    return updatedDocument;
  } catch (error) {
    throw error;
  }
}

/**
 * Remove tags from a document
 * @param {Object} user - Authenticated user object
 * @param {string} documentId - Document UUID
 * @param {string[]} tagsToRemove - Array of tags to remove
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Updated document
 */
async function removeTagsFromDocument(user, documentId, tagsToRemove, requestMetadata = {}) {
  try {
    const document = await getDocumentById(user, documentId, requestMetadata);

    // Check update permission
    const hasUpdatePermission = user.role?.permissions?.some(p => p.code === 'documents.update');
    if (!hasUpdatePermission && user.role.name !== 'ADMIN' && document.uploaded_by !== user.id) {
      throw new Error('Insufficient permissions to update this document');
    }

    // Remove specified tags
    const existingTags = document.tags || [];
    const updatedTags = existingTags.filter(tag => !tagsToRemove.includes(tag));

    await document.update({ tags: updatedTags });

    // Fetch updated document
    const updatedDocument = await getDocumentById(user, documentId, requestMetadata);

    // Audit log
    await auditService.log({
      user_id: user.id,
      action: 'UPDATE',
      resource_type: 'document',
      resource_id: documentId,
      details: { action: 'remove_tags', removed_tags: tagsToRemove, final_tags: updatedTags },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    return updatedDocument;
  } catch (error) {
    throw error;
  }
}

/**
 * Send document to a patient
 * @param {Object} user - Authenticated user object
 * @param {string} documentId - Document UUID
 * @param {string} patientId - Patient UUID
 * @param {Object} shareData - Share metadata
 * @param {string} shareData.sent_via - Delivery method (email, portal, etc.)
 * @param {string} shareData.notes - Optional notes about why this was shared
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Document share record
 */
async function sendDocumentToPatient(user, documentId, patientId, shareData = {}, requestMetadata = {}) {
  try {
    // Verify document exists and user has access
    const document = await getDocumentById(user, documentId, requestMetadata);

    // Verify patient exists
    const patient = await Patient.findOne({
      where: { id: patientId, is_active: true }
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    // Check if user has permission to share documents
    const hasSharePermission = user.role?.permissions?.some(p => p.code === 'documents.share');
    if (!hasSharePermission && user.role.name !== 'ADMIN') {
      throw new Error('Insufficient permissions to share documents');
    }

    // Create document share record
    const documentShare = await DocumentShare.create({
      document_id: documentId,
      patient_id: patientId,
      shared_by: user.id,
      sent_via: shareData.sent_via || 'email',
      sent_at: new Date(),
      notes: shareData.notes || null
    });

    // Fetch complete share record with associations
    const completeShare = await DocumentShare.findByPk(documentShare.id, {
      include: [
        {
          model: Document,
          as: 'document',
          attributes: ['id', 'file_name', 'description', 'category']
        },
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'sharedByUser',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ]
    });

    // Send email notification if sent_via is email
    if (shareData.sent_via === 'email' || !shareData.sent_via) {
      console.log(`📄 Sending document share email to: ${patient.email}`);
      // Use new template-based email system
      await emailService.sendEmailFromTemplate({
        templateSlug: 'document_share_notification',
        to: patient.email,
        variables: {
          patient: patient,
          document: document,
          sharedBy: user,
          notes: shareData.notes
        },
        patient: patient,
        user: user
      });
    } else {
      console.log(`📄 Document shared with patient via ${shareData.sent_via}: ${patient.email}`);
    }

    // Audit log
    await auditService.log({
      user_id: user.id,
      action: 'SHARE',
      resource_type: 'document',
      resource_id: documentId,
      details: {
        action: 'share_with_patient',
        patient_id: patientId,
        sent_via: shareData.sent_via || 'email',
        notes: shareData.notes
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    return completeShare;
  } catch (error) {
    throw error;
  }
}

/**
 * Send document to multiple patients
 * @param {Object} user - Authenticated user object
 * @param {string} documentId - Document UUID
 * @param {string[]} patientIds - Array of patient UUIDs
 * @param {Object} shareData - Share metadata
 * @param {string} shareData.sent_via - Delivery method (email, portal, etc.)
 * @param {string} shareData.notes - Optional notes about why this was shared
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Array of document share records and error log
 */
async function sendDocumentToGroup(user, documentId, patientIds, shareData = {}, requestMetadata = {}) {
  try {
    // Verify document exists and user has access
    const document = await getDocumentById(user, documentId, requestMetadata);

    // Check if user has permission to share documents
    const hasSharePermission = user.role?.permissions?.some(p => p.code === 'documents.share');
    if (!hasSharePermission && user.role.name !== 'ADMIN') {
      throw new Error('Insufficient permissions to share documents');
    }

    const results = {
      successful: [],
      failed: []
    };

    // Send to each patient
    for (const patientId of patientIds) {
      try {
        const share = await sendDocumentToPatient(user, documentId, patientId, shareData, requestMetadata);
        results.successful.push(share);
      } catch (error) {
        results.failed.push({
          patient_id: patientId,
          error: error.message
        });
      }
    }

    // Audit log for group send
    await auditService.log({
      user_id: user.id,
      action: 'SHARE',
      resource_type: 'document',
      resource_id: documentId,
      details: {
        action: 'share_with_group',
        total_patients: patientIds.length,
        successful: results.successful.length,
        failed: results.failed.length,
        sent_via: shareData.sent_via || 'email'
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    return results;
  } catch (error) {
    throw error;
  }
}

/**
 * Get document sharing history
 * @param {Object} user - Authenticated user object
 * @param {string} documentId - Document UUID
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Array>} Array of document share records
 */
async function getDocumentShares(user, documentId, requestMetadata = {}) {
  try {
    // Verify document exists and user has access
    const document = await getDocumentById(user, documentId, requestMetadata);

    // Check read permission
    const hasReadPermission = user.role?.permissions?.some(p => p.code === 'documents.read');
    if (!hasReadPermission && user.role.name !== 'ADMIN' && document.uploaded_by !== user.id) {
      throw new Error('Insufficient permissions to view document shares');
    }

    const shares = await DocumentShare.findAll({
      where: { document_id: documentId },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'sharedByUser',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ],
      order: [['sent_at', 'DESC']]
    });

    return shares;
  } catch (error) {
    throw error;
  }
}

/**
 * Generate a secure random share token
 * @returns {string} 64-character hex token
 */
function generateShareToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Build the public share URL
 * @param {string} token - Share token
 * @returns {string} Full share URL
 */
function buildShareUrl(token) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${frontendUrl}/shared/${token}`;
}

/**
 * Create a public share link for a document
 * @param {Object} user - Authenticated user object
 * @param {string} documentId - Document UUID
 * @param {Object} config - Share configuration
 * @param {string} config.patient_id - Patient UUID
 * @param {Date} config.expires_at - Expiration date (optional)
 * @param {string} config.password - Password protection (optional)
 * @param {number} config.max_downloads - Download limit (optional)
 * @param {string} config.notes - Notes about the share (optional)
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Created share with URL
 */
async function createShareLink(user, documentId, config = {}, requestMetadata = {}) {
  try {
    // Verify document exists and user has access
    const document = await getDocumentById(user, documentId, requestMetadata);

    // Verify patient exists
    const patient = await Patient.findOne({
      where: { id: config.patient_id, is_active: true }
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    // Check if user has permission to share documents
    const hasSharePermission = user.role?.permissions?.some(p => p.code === 'documents.share');
    if (!hasSharePermission && user.role.name !== 'ADMIN') {
      throw new Error('Insufficient permissions to share documents');
    }

    // Generate secure token
    const shareToken = generateShareToken();

    // Hash password if provided
    let passwordHash = null;
    if (config.password) {
      passwordHash = await bcrypt.hash(config.password, SALT_ROUNDS);
    }

    // Create document share record
    const documentShare = await DocumentShare.create({
      document_id: documentId,
      patient_id: config.patient_id,
      shared_by: user.id,
      sent_via: 'link',
      sent_at: new Date(),
      notes: config.notes || null,
      share_token: shareToken,
      expires_at: config.expires_at || null,
      password_hash: passwordHash,
      max_downloads: config.max_downloads || null,
      is_active: true
    });

    // Fetch complete share record with associations
    const completeShare = await DocumentShare.findByPk(documentShare.id, {
      include: [
        {
          model: Document,
          as: 'document',
          attributes: ['id', 'file_name', 'description', 'category', 'mime_type', 'file_size']
        },
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'sharedByUser',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ]
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      action: 'SHARE',
      resource_type: 'document',
      resource_id: documentId,
      details: {
        action: 'create_share_link',
        share_id: documentShare.id,
        patient_id: config.patient_id,
        has_password: !!config.password,
        has_expiration: !!config.expires_at,
        max_downloads: config.max_downloads
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    return {
      ...completeShare.toJSON(),
      share_url: buildShareUrl(shareToken),
      is_password_protected: !!passwordHash
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get share information by token (public - no auth required)
 * @param {string} token - Share token
 * @returns {Promise<Object>} Share info (without sensitive data)
 */
async function getShareByToken(token) {
  try {
    const share = await DocumentShare.findOne({
      where: { share_token: token },
      include: [
        {
          model: Document,
          as: 'document',
          attributes: ['id', 'file_name', 'description', 'category', 'mime_type', 'file_size']
        },
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });

    if (!share) {
      throw new Error('Share link not found');
    }

    // Check if share is accessible
    const isExpired = share.isExpired();
    const hasReachedLimit = share.hasReachedDownloadLimit();
    const isActive = share.is_active;

    return {
      id: share.id,
      document: share.document,
      patient: share.patient,
      is_password_protected: !!share.password_hash,
      expires_at: share.expires_at,
      max_downloads: share.max_downloads,
      download_count: share.download_count,
      is_active: isActive,
      is_expired: isExpired,
      has_reached_limit: hasReachedLimit,
      is_accessible: isActive && !isExpired && !hasReachedLimit
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Verify password for a protected share
 * @param {string} token - Share token
 * @param {string} password - Password to verify
 * @param {Object} metadata - Request metadata (ip, userAgent)
 * @returns {Promise<Object>} Verification result
 */
async function verifySharePassword(token, password, metadata = {}) {
  try {
    const share = await DocumentShare.findOne({
      where: { share_token: token }
    });

    if (!share) {
      throw new Error('Share link not found');
    }

    if (!share.password_hash) {
      return { valid: true, message: 'No password required' };
    }

    const isValid = await bcrypt.compare(password, share.password_hash);

    // Log the password attempt
    await logShareAccess(share.id, 'password_attempt', isValid, metadata);

    if (!isValid) {
      throw new Error('Invalid password');
    }

    return { valid: true };
  } catch (error) {
    throw error;
  }
}

/**
 * Download document via share token (public - no auth required)
 * @param {string} token - Share token
 * @param {Object} metadata - Request metadata (ip, userAgent)
 * @param {boolean} passwordVerified - Whether password was verified (for protected shares)
 * @returns {Promise<Object>} Document with file stream info
 */
async function downloadViaShareToken(token, metadata = {}, passwordVerified = false) {
  try {
    const share = await DocumentShare.findOne({
      where: { share_token: token },
      include: [
        {
          model: Document,
          as: 'document'
        }
      ]
    });

    if (!share) {
      throw new Error('Share link not found');
    }

    // Check if share is accessible
    if (!share.is_active) {
      await logShareAccess(share.id, 'download', false, metadata);
      throw new Error('This share link has been revoked');
    }

    if (share.isExpired()) {
      await logShareAccess(share.id, 'download', false, metadata);
      throw new Error('This share link has expired');
    }

    if (share.hasReachedDownloadLimit()) {
      await logShareAccess(share.id, 'download', false, metadata);
      throw new Error('Download limit reached for this share link');
    }

    // Check password if protected and not verified
    if (share.password_hash && !passwordVerified) {
      throw new Error('Password verification required');
    }

    const document = share.document;
    if (!document || !document.is_active) {
      await logShareAccess(share.id, 'download', false, metadata);
      throw new Error('Document not found or has been deleted');
    }

    const fullFilePath = path.join(process.cwd(), UPLOAD_DIR, document.file_path);

    // Check if file exists
    try {
      await fs.access(fullFilePath);
    } catch (error) {
      await logShareAccess(share.id, 'download', false, metadata);
      throw new Error('Document file not found on disk');
    }

    // Update share statistics
    await share.update({
      download_count: share.download_count + 1,
      last_accessed_at: new Date(),
      viewed_at: share.viewed_at || new Date()
    });

    // Log successful download
    await logShareAccess(share.id, 'download', true, metadata);

    return {
      document,
      filePath: fullFilePath
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Log access to a shared document
 * @param {string} shareId - Document share UUID
 * @param {string} action - Action type (view, download, password_attempt)
 * @param {boolean} success - Whether the action was successful
 * @param {Object} metadata - Request metadata (ip, userAgent)
 * @returns {Promise<Object>} Created access log
 */
async function logShareAccess(shareId, action, success, metadata = {}) {
  try {
    const log = await DocumentAccessLog.create({
      document_share_id: shareId,
      ip_address: metadata.ip || null,
      user_agent: metadata.userAgent || null,
      action,
      success
    });
    return log;
  } catch (error) {
    // Don't throw on logging errors - just log to console
    console.error('Error logging share access:', error);
    return null;
  }
}

/**
 * Revoke a share link
 * @param {Object} user - Authenticated user object
 * @param {string} shareId - Document share UUID
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Updated share
 */
async function revokeShare(user, shareId, requestMetadata = {}) {
  try {
    const share = await DocumentShare.findByPk(shareId, {
      include: [
        {
          model: Document,
          as: 'document'
        }
      ]
    });

    if (!share) {
      throw new Error('Share not found');
    }

    // Check permissions
    const hasSharePermission = user.role?.permissions?.some(p => p.code === 'documents.share');
    if (!hasSharePermission && user.role.name !== 'ADMIN' && share.shared_by !== user.id) {
      throw new Error('Insufficient permissions to revoke this share');
    }

    await share.update({ is_active: false });

    // Audit log
    await auditService.log({
      user_id: user.id,
      action: 'UPDATE',
      resource_type: 'document_share',
      resource_id: shareId,
      details: { action: 'revoke_share' },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    return share;
  } catch (error) {
    throw error;
  }
}

/**
 * Update share settings
 * @param {Object} user - Authenticated user object
 * @param {string} shareId - Document share UUID
 * @param {Object} updates - Fields to update
 * @param {Date} updates.expires_at - New expiration date
 * @param {number} updates.max_downloads - New download limit
 * @param {string} updates.password - New password (null to remove)
 * @param {boolean} updates.is_active - Activate/deactivate
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Updated share
 */
async function updateShareSettings(user, shareId, updates, requestMetadata = {}) {
  try {
    const share = await DocumentShare.findByPk(shareId);

    if (!share) {
      throw new Error('Share not found');
    }

    // Check permissions
    const hasSharePermission = user.role?.permissions?.some(p => p.code === 'documents.share');
    if (!hasSharePermission && user.role.name !== 'ADMIN' && share.shared_by !== user.id) {
      throw new Error('Insufficient permissions to update this share');
    }

    const updateData = {};

    if (updates.expires_at !== undefined) {
      updateData.expires_at = updates.expires_at;
    }

    if (updates.max_downloads !== undefined) {
      updateData.max_downloads = updates.max_downloads;
    }

    if (updates.is_active !== undefined) {
      updateData.is_active = updates.is_active;
    }

    // Handle password update
    if (updates.password !== undefined) {
      if (updates.password === null || updates.password === '') {
        updateData.password_hash = null;
      } else {
        updateData.password_hash = await bcrypt.hash(updates.password, SALT_ROUNDS);
      }
    }

    await share.update(updateData);

    // Fetch updated share with associations
    const updatedShare = await DocumentShare.findByPk(shareId, {
      include: [
        {
          model: Document,
          as: 'document',
          attributes: ['id', 'file_name', 'description', 'category', 'mime_type', 'file_size']
        },
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'sharedByUser',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ]
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      action: 'UPDATE',
      resource_type: 'document_share',
      resource_id: shareId,
      details: {
        action: 'update_share_settings',
        updated_fields: Object.keys(updates)
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    return {
      ...updatedShare.toJSON(),
      share_url: share.share_token ? buildShareUrl(share.share_token) : null,
      is_password_protected: !!updatedShare.password_hash
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get document shares with access logs
 * @param {Object} user - Authenticated user object
 * @param {string} documentId - Document UUID
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Array>} Array of document share records with access logs
 */
async function getDocumentSharesWithLogs(user, documentId, requestMetadata = {}) {
  try {
    // Verify document exists and user has access
    const document = await getDocumentById(user, documentId, requestMetadata);

    // Check read permission
    const hasReadPermission = user.role?.permissions?.some(p => p.code === 'documents.read');
    if (!hasReadPermission && user.role.name !== 'ADMIN' && document.uploaded_by !== user.id) {
      throw new Error('Insufficient permissions to view document shares');
    }

    const shares = await DocumentShare.findAll({
      where: { document_id: documentId },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'sharedByUser',
          attributes: ['id', 'username', 'first_name', 'last_name']
        },
        {
          model: DocumentAccessLog,
          as: 'accessLogs',
          order: [['created_at', 'DESC']],
          limit: 50 // Limit logs per share
        }
      ],
      order: [['sent_at', 'DESC']]
    });

    // Add computed fields to each share
    return shares.map(share => ({
      ...share.toJSON(),
      share_url: share.share_token ? buildShareUrl(share.share_token) : null,
      is_password_protected: !!share.password_hash,
      is_expired: share.isExpired(),
      has_reached_limit: share.hasReachedDownloadLimit(),
      is_accessible: share.isAccessible()
    }));
  } catch (error) {
    throw error;
  }
}

/**
 * Record a view access for a share (public)
 * @param {string} token - Share token
 * @param {Object} metadata - Request metadata (ip, userAgent)
 * @returns {Promise<void>}
 */
async function recordShareView(token, metadata = {}) {
  try {
    const share = await DocumentShare.findOne({
      where: { share_token: token }
    });

    if (share) {
      await share.update({
        last_accessed_at: new Date(),
        viewed_at: share.viewed_at || new Date()
      });
      await logShareAccess(share.id, 'view', true, metadata);
    }
  } catch (error) {
    console.error('Error recording share view:', error);
  }
}

/**
 * Send document as email attachment to a patient
 * @param {Object} user - User sending the document
 * @param {string} documentId - Document UUID
 * @param {string} patientId - Patient UUID
 * @param {string} message - Optional custom message
 * @param {Object} requestMetadata - Request metadata for audit
 * @returns {Promise<Object>} Email send result
 */
async function sendDocumentByEmail(user, documentId, patientId, message = null, requestMetadata = {}) {
  try {
    // Get document
    const document = await Document.findOne({
      where: { id: documentId, is_active: true }
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Get patient
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    if (!patient.email) {
      throw new Error('Patient does not have an email address');
    }

    // Get full file path
    const filePath = path.join(process.cwd(), UPLOAD_DIR, document.file_path);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      throw new Error('Document file not found on disk');
    }

    // Send email with attachment
    const emailResult = await emailService.sendDocumentAsAttachment(
      document,
      patient,
      user,
      filePath,
      message
    );

    // Create a document share record to track the send
    const share = await DocumentShare.create({
      document_id: documentId,
      patient_id: patientId,
      shared_by: user.id,
      sent_via: 'email_attachment',
      notes: message,
      sent_at: new Date()
    });

    // Log the action
    await auditService.log({
      userId: user.id,
      action: 'document.email_sent',
      resourceType: 'document',
      resourceId: documentId,
      ...requestMetadata,
      changes: {
        patient_id: patientId,
        patient_email: patient.email,
        file_name: document.file_name
      }
    });

    return {
      success: true,
      share_id: share.id,
      email_result: emailResult,
      sent_to: patient.email
    };
  } catch (error) {
    // Log the failed attempt
    await auditService.log({
      userId: user?.id,
      action: 'document.email_failed',
      resourceType: 'document',
      resourceId: documentId,
      ...requestMetadata,
      changes: { error: error.message }
    });

    throw error;
  }
}

/**
 * Get documents shared with a specific patient
 * @param {string} patientId - Patient UUID
 * @param {object} user - Current user
 * @param {object} requestMetadata - Request metadata
 * @returns {Promise<Array>} Array of document shares
 */
async function getPatientDocumentShares(patientId, user, requestMetadata = {}) {
  try {
    const shares = await DocumentShare.findAll({
      where: {
        patient_id: patientId,
        is_active: true
      },
      include: [
        {
          model: Document,
          as: 'document',
          attributes: ['id', 'file_name', 'mime_type', 'file_size', 'description']
        },
        {
          model: User,
          as: 'sharedByUser',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    await auditService.log({
      userId: user.id,
      action: 'document.list_patient_shares',
      resourceType: 'patient',
      resourceId: patientId,
      ...requestMetadata
    });

    return shares;
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
  searchDocuments,
  addTagsToDocument,
  removeTagsFromDocument,
  sendDocumentToPatient,
  sendDocumentToGroup,
  getDocumentShares,
  // Share link functions
  generateShareToken,
  buildShareUrl,
  createShareLink,
  getShareByToken,
  verifySharePassword,
  downloadViaShareToken,
  logShareAccess,
  revokeShare,
  updateShareSettings,
  getDocumentSharesWithLogs,
  recordShareView,
  sendDocumentByEmail,
  getPatientDocumentShares,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE
};