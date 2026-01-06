/**
 * Patient Service
 * API calls for patient management
 */

import api from './api';

export const patientService = {
  /**
   * Get all patients with filters and pagination
   */
  async getPatients(filters = {}, page = 1, limit = 25) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });

      const response = await api.get(`/patients?${params}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch patients';
      throw new Error(message);
    }
  },

  /**
   * Get single patient by ID
   */
  async getPatient(id) {
    try {
      const response = await api.get(`/patients/${id}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch patient';
      throw new Error(message);
    }
  },

  /**
   * Create new patient
   */
  async createPatient(data) {
    try {
      const response = await api.post('/patients', data);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create patient';
      throw new Error(message);
    }
  },

  /**
   * Update existing patient
   */
  async updatePatient(id, data) {
    try {
      const response = await api.put(`/patients/${id}`, data);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update patient';
      throw new Error(message);
    }
  },

  /**
   * Delete patient
   */
  async deletePatient(id) {
    try {
      const response = await api.delete(`/patients/${id}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete patient';
      throw new Error(message);
    }
  },

  /**
   * Search patients by query
   */
  async searchPatients(query) {
    try {
      const response = await api.get(`/patients/search?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to search patients';
      throw new Error(message);
    }
  }
};

export default patientService;
