/**
 * Document Management Service
 *
 * Business logic for file upload and document management
 * Supports polymorphic associations with patients, visits, and users
 */

const db = require('../../../models');
const { AppError } = require('../middleware/errorHandler');
const { logCrudEvent } = require('./audit.service');
const { deleteFile } = require('../config/multer');
const path = require('path');

/**
 * Upload document(s) for a resource
 */
async function uploadDocuments(files, documentData, requestingUser, requestMetadata) {
  if (!files || files.length === 0) {
    throw new AppError('No files provided', 400, 'NO_FILES');
  }

  const { resource_type, resource_id, document_type, title, description } = documentData;

  // Validate resource exists and user has access
  await validateResourceAccess(resource_type, resource_id, requestingUser);

  const documents = [];

  try {
    // Create document records for all uploaded files
    for (const file of files) {
      const documentRecord = await db.Document.create({
        resource_type,
        resource_id,
        document_type,
        original_filename: file.originalname,
        stored_filename: file.filename,
        file_path: file.path.replace(/\\/g, '/'), // Normalize path separators
        mime_type: file.mimetype,
        file_size: file.size,
        title: title || file.originalname,
        description,
        metadata: {
          uploaded_at: new Date().toISOString(),
          uploader_ip: requestMetadata.ip,
          uploader_user_agent: requestMetadata.userAgent
        },
        created_by: requestingUser.id,
        updated_by: requestingUser.id
      });

      documents.push(documentRecord);

      // Audit logging
      await logCrudEvent(
        'CREATE',
        'documents',
        documentRecord.id,
        requestingUser,
        requestMetadata,
        null,
        documentRecord.toJSON()
      );
    }

    return documents;
  } catch (error) {
    // Cleanup uploaded files on error
    files.forEach(file => {
      deleteFile(file.path);
    });
    throw error;
  }
}

/**
 * Get documents for a resource
 */
async function getDocumentsByResource(resource_type, resource_id, requestingUser, requestMetadata) {
  // Validate resource exists and user has access
  await validateResourceAccess(resource_type, resource_id, requestingUser);

  const documents = await db.Document.findAll({
    where: {
      resource_type,
      resource_id
    },
    include: [
      {
        model: db.User,
        as: 'creator',
        attributes: ['id', 'username', 'first_name', 'last_name']
      }
    ],
    order: [['created_at', 'DESC']]
  });

  // Audit logging (READ events for sensitive resources)
  if (resource_type === 'patients') {
    await logCrudEvent(
      'READ',
      'documents',
      null,
      requestingUser,
      requestMetadata,
      null,
      { resource_type, resource_id, count: documents.length }
    );
  }

  return documents;
}

/**
 * Get single document by ID
 */
async function getDocumentById(documentId, requestingUser, requestMetadata) {
  const document = await db.Document.findByPk(documentId, {
    include: [
      {
        model: db.User,
        as: 'creator',
        attributes: ['id', 'username', 'first_name', 'last_name']
      }
    ]
  });

  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  // Validate user has access to the parent resource
  await validateResourceAccess(document.resource_type, document.resource_id, requestingUser);

  // Audit logging
  if (document.resource_type === 'patients') {
    await logCrudEvent(
      'READ',
      'documents',
      documentId,
      requestingUser,
      requestMetadata,
      null,
      null
    );
  }

  return document;
}

/**
 * Update document metadata
 */
async function updateDocument(documentId, updates, requestingUser, requestMetadata) {
  const document = await db.Document.findByPk(documentId);

  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  // Validate user has access to the parent resource
  await validateResourceAccess(document.resource_type, document.resource_id, requestingUser);

  const oldData = document.toJSON();

  // Only allow updating certain fields
  const allowedUpdates = ['title', 'description', 'document_type'];
  const filteredUpdates = {};

  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  filteredUpdates.updated_by = requestingUser.id;

  await document.update(filteredUpdates);

  // Audit logging
  await logCrudEvent(
    'UPDATE',
    'documents',
    documentId,
    requestingUser,
    requestMetadata,
    oldData,
    document.toJSON()
  );

  return document;
}

/**
 * Delete document
 */
async function deleteDocument(documentId, requestingUser, requestMetadata) {
  const document = await db.Document.findByPk(documentId);

  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  // Validate user has access to the parent resource
  await validateResourceAccess(document.resource_type, document.resource_id, requestingUser);

  const documentData = document.toJSON();

  // Delete file from filesystem
  const fileDeleted = deleteFile(document.file_path);
  if (!fileDeleted) {
    console.warn(`Warning: Could not delete file at ${document.file_path}`);
  }

  // Delete database record
  await document.destroy();

  // Audit logging
  await logCrudEvent(
    'DELETE',
    'documents',
    documentId,
    requestingUser,
    requestMetadata,
    documentData,
    null
  );

  return { success: true, message: 'Document deleted successfully' };
}

/**
 * Validate that a resource exists and user has permission to access it
 */
async function validateResourceAccess(resource_type, resource_id, requestingUser) {
  let resource;

  switch (resource_type) {
    case 'patients':
      resource = await db.Patient.findByPk(resource_id);
      if (!resource) {
        throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
      }

      // Dietitians can only access their assigned patients
      if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
        if (resource.assigned_dietitian_id !== requestingUser.id) {
          throw new AppError(
            'Access denied: Not assigned to this patient',
            403,
            'NOT_ASSIGNED_DIETITIAN'
          );
        }
      }
      break;

    case 'visits':
      resource = await db.Visit.findByPk(resource_id, {
        include: [{ model: db.Patient, as: 'patient' }]
      });
      if (!resource) {
        throw new AppError('Visit not found', 404, 'VISIT_NOT_FOUND');
      }

      // Dietitians can only access visits for their assigned patients
      if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
        if (resource.patient.assigned_dietitian_id !== requestingUser.id) {
          throw new AppError(
            'Access denied: Not assigned to this patient',
            403,
            'NOT_ASSIGNED_DIETITIAN'
          );
        }
      }
      break;

    case 'users':
      resource = await db.User.findByPk(resource_id);
      if (!resource) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Users can only access their own profile documents unless admin
      if (
        requestingUser.id !== resource_id &&
        requestingUser.role &&
        requestingUser.role.name !== 'ADMIN'
      ) {
        throw new AppError('Access denied: Can only manage your own documents', 403, 'ACCESS_DENIED');
      }
      break;

    default:
      throw new AppError(`Invalid resource type: ${resource_type}`, 400, 'INVALID_RESOURCE_TYPE');
  }

  return resource;
}

/**
 * Get document statistics for a resource
 */
async function getDocumentStats(resource_type, resource_id, requestingUser) {
  await validateResourceAccess(resource_type, resource_id, requestingUser);

  const stats = await db.Document.findAll({
    where: {
      resource_type,
      resource_id
    },
    attributes: [
      'document_type',
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
      [db.sequelize.fn('SUM', db.sequelize.col('file_size')), 'total_size']
    ],
    group: ['document_type']
  });

  return stats;
}

module.exports = {
  uploadDocuments,
  getDocumentsByResource,
  getDocumentById,
  updateDocument,
  deleteDocument,
  getDocumentStats
};
