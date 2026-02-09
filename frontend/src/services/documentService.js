/**
 * Document Service
 * API calls for document management
 */

import api from './api';

/**
 * Get all documents with optional filters
 * @param {object} filters - Filter parameters (resource_type, resource_id, search, page, limit)
 * @returns {Promise<object>} Documents array and pagination info
 */
export const getDocuments = async (filters = {}) => {
  const response = await api.get('/documents', { params: filters });
  return response.data;
};

/**
 * Get document statistics
 * @returns {Promise<object>} Document statistics
 */
export const getDocumentStatistics = async () => {
  const response = await api.get('/documents/stats');
  return response.data;
};

/**
 * Get single document by ID
 * @param {string} id - Document UUID
 * @returns {Promise<object>} Document object
 */
export const getDocumentById = async (id) => {
  const response = await api.get(`/documents/${id}`);
  return response.data;
};

/**
 * Download document file
 * @param {string} id - Document UUID
 * @returns {Promise<Blob>} File blob for download
 */
export const downloadDocument = async (id) => {
  const response = await api.get(`/documents/${id}/download`, {
    responseType: 'blob'
  });
  return response.data;
};

/**
 * Upload new document
 * @param {FormData} formData - Form data with file and metadata
 * @returns {Promise<object>} Created document
 */
export const uploadDocument = async (formData) => {
  const response = await api.post('/documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

/**
 * Update document metadata
 * @param {string} id - Document UUID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated document
 */
export const updateDocument = async (id, updates) => {
  const response = await api.put(`/documents/${id}`, updates);
  return response.data;
};

/**
 * Delete document
 * @param {string} id - Document UUID
 * @returns {Promise<object>} Success response
 */
export const deleteDocument = async (id) => {
  const response = await api.delete(`/documents/${id}`);
  return response.data;
};

/**
 * Get documents for a specific resource
 * @param {string} resourceType - Type of resource (patient, visit, user)
 * @param {string} resourceId - Resource ID
 * @returns {Promise<object>} Documents for the resource
 */
export const getDocumentsForResource = async (resourceType, resourceId) => {
  const response = await api.get('/documents', {
    params: { resource_type: resourceType, resource_id: resourceId }
  });
  return response.data;
};

/**
 * Search documents with advanced filters
 * @param {object} filters - Search filters (tags, category, is_template, search, page, limit)
 * @returns {Promise<object>} Documents array and pagination info
 */
export const searchDocuments = async (filters = {}) => {
  const response = await api.get('/documents/search', { params: filters });
  return response.data;
};

/**
 * Add tags to a document
 * @param {string} id - Document UUID
 * @param {string[]} tags - Array of tags to add
 * @returns {Promise<object>} Updated document
 */
export const addTags = async (id, tags) => {
  const response = await api.post(`/documents/${id}/tags`, { tags });
  return response.data;
};

/**
 * Remove tags from a document
 * @param {string} id - Document UUID
 * @param {string[]} tags - Array of tags to remove
 * @returns {Promise<object>} Updated document
 */
export const removeTags = async (id, tags) => {
  const response = await api.delete(`/documents/${id}/tags`, { data: { tags } });
  return response.data;
};

/**
 * Send document to a patient
 * @param {string} id - Document UUID
 * @param {string} patientId - Patient UUID
 * @param {object} options - Send options (sent_via, notes)
 * @returns {Promise<object>} Document share record
 */
export const sendToPatient = async (id, patientId, options = {}) => {
  const response = await api.post(`/documents/${id}/send-to-patient`, {
    patient_id: patientId,
    ...options
  });
  return response.data;
};

/**
 * Send document to multiple patients
 * @param {string} id - Document UUID
 * @param {string[]} patientIds - Array of patient UUIDs
 * @param {object} options - Send options (sent_via, notes)
 * @returns {Promise<object>} Results with successful and failed sends
 */
export const sendToGroup = async (id, patientIds, options = {}) => {
  const response = await api.post(`/documents/${id}/send-to-group`, {
    patient_ids: patientIds,
    ...options
  });
  return response.data;
};

/**
 * Get document sharing history
 * @param {string} id - Document UUID
 * @returns {Promise<array>} Array of document share records
 */
export const getDocumentShares = async (id) => {
  const response = await api.get(`/documents/${id}/shares`);
  return response.data;
};

/**
 * Get documents shared with a specific patient
 * @param {string} patientId - Patient UUID
 * @returns {Promise<array>} Array of document share records
 */
export const getPatientDocumentShares = async (patientId) => {
  const response = await api.get(`/documents/patient/${patientId}/shares`);
  return response.data?.data || response.data || [];
};

/**
 * Helper function to create FormData for file upload
 * @param {File} file - File object
 * @param {string} resourceType - Type of resource
 * @param {string} resourceId - Resource ID
 * @param {string} description - Optional description
 * @param {string} category - Optional category
 * @returns {FormData} FormData object ready for upload
 */
export const createUploadFormData = (file, resourceType, resourceId, description = '', category = '') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('resource_type', resourceType);
  formData.append('resource_id', resourceId);
  if (description) {
    formData.append('description', description);
  }
  if (category) {
    formData.append('category', category);
  }
  return formData;
};

/**
 * Helper function to trigger file download
 * @param {Blob} blob - File blob
 * @param {string} filename - Filename for download
 */
export const triggerFileDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file type icon based on MIME type
 * @param {string} mimeType - MIME type of the file
 * @returns {string} Icon name or emoji
 */
export const getFileTypeIcon = (mimeType) => {
  if (!mimeType) return '📎';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.startsWith('text/')) return '📄';
  return '📎';
};

/**
 * Check if file can be previewed
 * @param {string} mimeType - MIME type of the file
 * @returns {boolean} Whether file can be previewed
 */
export const canPreviewFile = (mimeType) => {
  if (!mimeType) return false;
  return mimeType.startsWith('image/') || mimeType === 'application/pdf';
};

/**
 * Get preview URL for a document
 * @param {string} id - Document ID
 * @returns {string} Preview URL
 */
export const getDocumentPreviewUrl = (id) => {
  return `${api.defaults.baseURL}/api/documents/${id}/download`;
};

// ==========================================
// Share Link Management Functions
// ==========================================

/**
 * Create a public share link for a document
 * @param {string} documentId - Document UUID
 * @param {object} options - Share options
 * @param {string} options.patient_id - Patient UUID
 * @param {string} options.expires_at - Expiration date (ISO string)
 * @param {string} options.password - Password protection
 * @param {number} options.max_downloads - Download limit
 * @param {string} options.notes - Notes about the share
 * @returns {Promise<object>} Created share with URL
 */
export const createShareLink = async (documentId, options) => {
  const response = await api.post(`/documents/${documentId}/create-share-link`, options);
  return response.data;
};

/**
 * Update share link settings
 * @param {string} shareId - Share UUID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated share
 */
export const updateShareSettings = async (shareId, updates) => {
  const response = await api.put(`/documents/shares/${shareId}`, updates);
  return response.data;
};

/**
 * Revoke a share link
 * @param {string} shareId - Share UUID
 * @returns {Promise<object>} Success response
 */
export const revokeShareLink = async (shareId) => {
  const response = await api.delete(`/documents/shares/${shareId}`);
  return response.data;
};

/**
 * Get document shares with access logs
 * @param {string} documentId - Document UUID
 * @returns {Promise<array>} Array of shares with logs
 */
export const getSharesWithLogs = async (documentId) => {
  const response = await api.get(`/documents/${documentId}/shares-with-logs`);
  return response.data;
};

/**
 * Send document as email attachment to a patient
 * @param {string} documentId - Document UUID
 * @param {string} patientId - Patient UUID
 * @param {string} message - Optional message to include in email
 * @returns {Promise<object>} Send result
 */
export const sendDocumentByEmail = async (documentId, patientId, message = null) => {
  const response = await api.post(`/documents/${documentId}/send-by-email`, {
    patient_id: patientId,
    message
  });
  return response.data;
};

/**
 * Generate consultation guide PDFs
 * Creates PDF documents for each consultation type.
 * Idempotent - skips guides that already exist.
 * @returns {Promise<object>} Result with created and existing guides
 */
export const generateConsultationGuides = async () => {
  const response = await api.post('/documents/generate-guides');
  return response.data;
};

/**
 * Regenerate a single consultation guide PDF
 * @param {string} slug - Guide slug (e.g., 'menopause', 'sii')
 * @returns {Promise<object>} Regenerated document
 */
export const regenerateGuide = async (slug) => {
  const response = await api.post(`/documents/generate-guides/${slug}`);
  return response.data;
};

/**
 * Get all consultation guide documents
 * @returns {Promise<object>} Guide documents
 */
export const getConsultationGuides = async () => {
  const response = await api.get('/documents/search', {
    params: { category: 'guides', is_template: true, limit: 50 }
  });
  return response.data;
};