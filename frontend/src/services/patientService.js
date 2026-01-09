/**
 * Patient Service
 * API calls for patient management
 */

import api from './api';

/**
 * Get all patients with optional filters
 * @param {object} filters - Filter parameters (page, limit, search, etc.)
 * @returns {Promise<object>} Patients array and pagination info
 */
export const getPatients = async (filters = {}) => {
  const response = await api.get('/api/patients', { params: filters });
  return response.data;
};

/**
 * Get single patient by ID
 * @param {string} id - Patient UUID
 * @returns {Promise<object>} Patient object
 */
export const getPatientById = async (id) => {
  const response = await api.get(`/api/patients/${id}`);
  return response.data;
};

/**
 * Create new patient
 * @param {object} patientData - Patient information
 * @returns {Promise<object>} Created patient
 */
export const createPatient = async (patientData) => {
  const response = await api.post('/api/patients', patientData);
  return response.data;
};

/**
 * Update existing patient
 * @param {string} id - Patient UUID
 * @param {object} patientData - Updated patient information
 * @returns {Promise<object>} Updated patient
 */
export const updatePatient = async (id, patientData) => {
  const response = await api.put(`/api/patients/${id}`, patientData);
  return response.data;
};

/**
 * Delete patient (soft delete)
 * @param {string} id - Patient UUID
 * @returns {Promise<void>}
 */
export const deletePatient = async (id) => {
  const response = await api.delete(`/api/patients/${id}`);
  return response.data;
};
