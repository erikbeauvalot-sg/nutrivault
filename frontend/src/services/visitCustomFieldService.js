/**
 * Visit Custom Field Service
 * API service for managing visit custom field values
 */

import api from './api';

const visitCustomFieldService = {
  /**
   * Get all custom field values for a visit
   * @param {string} visitId - Visit UUID
   * @returns {Promise} API response with custom field categories and values
   */
  getVisitCustomFields: async (visitId) => {
    try {
      const response = await api.get(`/api/visits/${visitId}/custom-fields`);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('Error fetching visit custom fields:', error);
      throw error;
    }
  },

  /**
   * Bulk update custom field values for a visit
   * @param {string} visitId - Visit UUID
   * @param {Array} fields - Array of {definition_id, value} objects
   * @returns {Promise} API response
   */
  updateVisitCustomFields: async (visitId, fields) => {
    try {
      const response = await api.put(`/api/visits/${visitId}/custom-fields`, {
        fields
      });
      return response.data;
    } catch (error) {
      console.error('Error updating visit custom fields:', error);
      throw error;
    }
  },

  /**
   * Delete a custom field value for a visit
   * @param {string} visitId - Visit UUID
   * @param {string} fieldValueId - Field value UUID
   * @returns {Promise} API response
   */
  deleteVisitCustomField: async (visitId, fieldValueId) => {
    try {
      const response = await api.delete(`/api/visits/${visitId}/custom-fields/${fieldValueId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting visit custom field:', error);
      throw error;
    }
  }
};

export default visitCustomFieldService;
