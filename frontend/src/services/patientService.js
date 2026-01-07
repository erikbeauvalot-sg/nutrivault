/**
 * Patient Service
 * API calls for patient management
 */

import api from './api';

/**
 * Get all patients with filters and pagination
 */
export const getPatients = async (filters = {}) => {
  try {
    const params = new URLSearchParams();

    if (filters.page) {
      params.append('page', filters.page);
    }
    if (filters.limit) {
      params.append('limit', filters.limit);
    }
    if (filters.search) {
      params.append('search', filters.search);
    }

    const response = await api.get(`/api/patients?${params.toString()}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to fetch patients';
    throw new Error(message);
  }
};

/**
 * Get single patient by ID
 */
export const getPatient = async (id) => {
  try {
    const response = await api.get(`/api/patients/${id}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to fetch patient';
    throw new Error(message);
  }
};

/**
 * Create new patient
 */
export const createPatient = async (data) => {
  try {
    const response = await api.post('/api/patients', data);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to create patient';
    throw new Error(message);
  }
};

/**
 * Update existing patient
 */
export const updatePatient = async (id, data) => {
  try {
    const response = await api.put(`/api/patients/${id}`, data);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to update patient';
    throw new Error(message);
  }
};

/**
 * Delete patient
 */
export const deletePatient = async (id) => {
  try {
    const response = await api.delete(`/api/patients/${id}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to delete patient';
    throw new Error(message);
  }
};

/**
 * Search patients by query
 */
export const searchPatients = async (query) => {
  try {
    const response = await api.get(`/api/patients/search?q=${encodeURIComponent(query)}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to search patients';
    throw new Error(message);
  }
};

export default {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  searchPatients
};
