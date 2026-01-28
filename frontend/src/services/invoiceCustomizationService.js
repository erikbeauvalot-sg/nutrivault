/**
 * Invoice Customization Service
 * API client for invoice template customization operations
 */

import api from './api';

/**
 * Get current user's customization settings
 */
export const getMyCustomization = async () => {
  const response = await api.get('/invoice-customizations/me');
  return response.data;
};

/**
 * Update customization settings
 */
export const updateCustomization = async (data) => {
  const response = await api.put('/invoice-customizations/me', data);
  return response.data;
};

/**
 * Upload logo image
 */
export const uploadLogo = async (file) => {
  const formData = new FormData();
  formData.append('logo', file);

  const response = await api.post('/invoice-customizations/me/logo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

/**
 * Delete logo image
 */
export const deleteLogo = async () => {
  const response = await api.delete('/invoice-customizations/me/logo');
  return response.data;
};

/**
 * Upload signature image
 */
export const uploadSignature = async (file) => {
  const formData = new FormData();
  formData.append('signature', file);

  const response = await api.post('/invoice-customizations/me/signature', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

/**
 * Delete signature image
 */
export const deleteSignature = async () => {
  const response = await api.delete('/invoice-customizations/me/signature');
  return response.data;
};

/**
 * Reset to default settings
 */
export const resetToDefaults = async () => {
  const response = await api.post('/invoice-customizations/me/reset');
  return response.data;
};

export default {
  getMyCustomization,
  updateCustomization,
  uploadLogo,
  deleteLogo,
  uploadSignature,
  deleteSignature,
  resetToDefaults
};
