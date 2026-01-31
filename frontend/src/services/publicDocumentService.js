/**
 * Public Document Service
 * API calls for public document access via share links.
 * No authentication required for these endpoints.
 */

import axios from 'axios';

// Create axios instance without authentication
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL?.replace('/api', '') || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Get share information by token
 * @param {string} token - Share token (64 char hex)
 * @returns {Promise<object>} Share info with document details
 */
export const getShareInfo = async (token) => {
  const response = await publicApi.get(`/public/documents/${token}`);
  return response.data?.data || response.data;
};

/**
 * Verify password for a protected share
 * @param {string} token - Share token
 * @param {string} password - Password to verify
 * @returns {Promise<object>} Verification result
 */
export const verifyPassword = async (token, password) => {
  const response = await publicApi.post(`/public/documents/${token}/verify`, { password });
  return response.data?.data || response.data;
};

/**
 * Get the download URL for a shared document
 * @param {string} token - Share token
 * @param {string} password - Password if protected (optional)
 * @returns {string} Download URL
 */
export const getDownloadUrl = (token, password = null) => {
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
  let url = `${baseUrl}/public/documents/${token}/download`;
  if (password) {
    url += `?password=${encodeURIComponent(password)}`;
  }
  return url;
};

/**
 * Get the preview URL for a shared document
 * @param {string} token - Share token
 * @param {string} password - Password if protected (optional)
 * @returns {string} Preview URL
 */
export const getPreviewUrl = (token, password = null) => {
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
  let url = `${baseUrl}/public/documents/${token}/preview`;
  if (password) {
    url += `?password=${encodeURIComponent(password)}`;
  }
  return url;
};

/**
 * Download document via share token
 * @param {string} token - Share token
 * @param {string} password - Password if protected (optional)
 * @returns {Promise<Blob>} File blob for download
 */
export const downloadDocument = async (token, password = null) => {
  const url = getDownloadUrl(token, password);
  const response = await axios.get(url, { responseType: 'blob' });
  return response.data;
};

/**
 * Trigger file download in browser
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
 * @returns {string} Icon name
 */
export const getFileTypeIcon = (mimeType) => {
  if (mimeType?.startsWith('image/')) return 'file-image';
  if (mimeType === 'application/pdf') return 'file-pdf';
  if (mimeType?.includes('word') || mimeType?.includes('document')) return 'file-word';
  if (mimeType?.startsWith('text/')) return 'file-text';
  return 'file';
};

/**
 * Check if file can be previewed
 * @param {string} mimeType - MIME type of the file
 * @returns {boolean} Whether file can be previewed
 */
export const canPreviewFile = (mimeType) => {
  return mimeType?.startsWith('image/') || mimeType === 'application/pdf';
};
