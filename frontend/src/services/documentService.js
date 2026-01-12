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
  const response = await api.get('/api/documents', { params: filters });
  return response.data;
};

/**
 * Get document statistics
 * @returns {Promise<object>} Document statistics
 */
export const getDocumentStatistics = async () => {
  const response = await api.get('/api/documents/stats');
  return response.data;
};

/**
 * Get single document by ID
 * @param {string} id - Document UUID
 * @returns {Promise<object>} Document object
 */
export const getDocumentById = async (id) => {
  const response = await api.get(`/api/documents/${id}`);
  return response.data;
};

/**
 * Download document file
 * @param {string} id - Document UUID
 * @returns {Promise<Blob>} File blob for download
 */
export const downloadDocument = async (id) => {
  const response = await api.get(`/api/documents/${id}/download`, {
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
  const response = await api.post('/api/documents', formData, {
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
  const response = await api.put(`/api/documents/${id}`, updates);
  return response.data;
};

/**
 * Delete document
 * @param {string} id - Document UUID
 * @returns {Promise<object>} Success response
 */
export const deleteDocument = async (id) => {
  const response = await api.delete(`/api/documents/${id}`);
  return response.data;
};

/**
 * Get documents for a specific resource
 * @param {string} resourceType - Type of resource (patient, visit, user)
 * @param {string} resourceId - Resource ID
 * @returns {Promise<object>} Documents for the resource
 */
export const getDocumentsForResource = async (resourceType, resourceId) => {
  const response = await api.get('/api/documents', {
    params: { resource_type: resourceType, resource_id: resourceId }
  });
  return response.data;
};

/**
 * Helper function to create FormData for file upload
 * @param {File} file - File object
 * @param {string} resourceType - Type of resource
 * @param {string} resourceId - Resource ID
 * @param {string} description - Optional description
 * @returns {FormData} FormData object ready for upload
 */
export const createUploadFormData = (file, resourceType, resourceId, description = '') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('resource_type', resourceType);
  formData.append('resource_id', resourceId);
  if (description) {
    formData.append('description', description);
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