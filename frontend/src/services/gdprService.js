/**
 * GDPR Service
 *
 * API service for RGPD compliance operations
 */

import api from './api';

/**
 * Export patient data (RGPD - Right to Data Portability)
 * @param {string} patientId - Patient UUID
 * @param {string} format - 'json' or 'csv'
 * @returns {Promise} Export data
 */
export const exportPatientData = async (patientId, format = 'json') => {
  const response = await api.get(`/gdpr/patients/${patientId}/export`, {
    params: { format },
    responseType: format === 'json' ? 'json' : 'blob'
  });

  if (format === 'csv' || format === 'json') {
    // Create download link
    const blob = new Blob([JSON.stringify(response.data, null, 2)], {
      type: format === 'json' ? 'application/json' : 'text/csv'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patient_${patientId}_export_${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  return response.data;
};

/**
 * Permanently delete patient (RGPD - Right to be Forgotten)
 * @param {string} patientId - Patient UUID
 * @returns {Promise} Deletion result
 */
export const deletePatientPermanently = async (patientId) => {
  const response = await api.delete(`/gdpr/patients/${patientId}/permanent`, {
    data: {
      confirm: 'DELETE_PERMANENTLY'
    }
  });
  return response.data;
};
