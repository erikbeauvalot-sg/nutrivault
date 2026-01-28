/**
 * Formula Service
 * API calls for formula validation and preview
 */

import api from './api';

const formulaService = {
  /**
   * Validate a formula syntax
   * @param {string} formula - Formula to validate
   * @returns {Promise<Object>} { valid, error, dependencies }
   */
  async validateFormula(formula) {
    try {
      const response = await api.post('/formulas/validate', { formula });
      return response.data.data;
    } catch (error) {
      console.error('Error validating formula:', error);
      throw error;
    }
  },

  /**
   * Preview formula evaluation with sample data
   * @param {string} formula - Formula to evaluate
   * @param {Object} values - Map of variable names to values
   * @param {number} decimalPlaces - Number of decimal places (0-4)
   * @returns {Promise<Object>} { success, result, error }
   */
  async previewFormula(formula, values, decimalPlaces = 2) {
    try {
      const response = await api.post('/formulas/preview', {
        formula,
        values,
        decimalPlaces
      });
      return response.data.data;
    } catch (error) {
      console.error('Error previewing formula:', error);
      throw error;
    }
  },

  /**
   * Get available operators and functions
   * @returns {Promise<Object>} { operators, functions }
   */
  async getOperators() {
    try {
      const response = await api.get('/formulas/operators');
      return response.data.data;
    } catch (error) {
      console.error('Error getting operators:', error);
      throw error;
    }
  },

  /**
   * Get all available formula templates
   * @returns {Promise<Array>} Array of template objects
   */
  async getTemplates() {
    try {
      const response = await api.get('/formulas/templates');
      return response.data.data;
    } catch (error) {
      console.error('Error getting templates:', error);
      throw error;
    }
  },

  /**
   * Apply a template with field mapping
   * @param {string} templateId - Template ID
   * @param {Object} fieldMapping - Map of template variables to field names
   * @returns {Promise<Object>} Applied template data
   */
  async applyTemplate(templateId, fieldMapping = {}) {
    try {
      const response = await api.post('/formulas/templates/apply', {
        templateId,
        fieldMapping
      });
      return response.data.data;
    } catch (error) {
      console.error('Error applying template:', error);
      throw error;
    }
  }
};

export default formulaService;
