/**
 * Patient Service
 * API calls for patient management
 */

import api from './api';
import { extractData, extractPagination } from '../utils/apiResponse';

/**
 * Get all patients with optional filters
 * @param {object} filters - Filter parameters (page, limit, search, etc.)
 * @returns {Promise<{data: Array, pagination: object|null}>} Patients array and pagination info
 */
export const getPatients = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null) {
      // Allow empty string for is_active (needed for "All Status" filter)
      if (key === 'is_active' || filters[key] !== '') {
        params.append(key, filters[key]);
      }
    }
  });

  const response = await api.get(`/patients?${params.toString()}`);
  return {
    data: extractData(response, []),
    pagination: extractPagination(response)
  };
};

/**
 * Get single patient by ID
 * @param {string} id - Patient UUID
 * @returns {Promise<object>} Patient object
 */
export const getPatientById = async (id) => {
  const response = await api.get(`/patients/${id}`);
  return extractData(response);
};

/**
 * Get patient details with visits and measurements for graphical display
 * @param {string} id - Patient UUID
 * @returns {Promise<object>} Patient object with visits and measurements
 */
export const getPatientDetails = async (id) => {
  const response = await api.get(`/patients/${id}/details`);
  return extractData(response);
};

/**
 * Create new patient
 * @param {object} patientData - Patient information
 * @returns {Promise<object>} Created patient
 */
export const createPatient = async (patientData) => {
  const response = await api.post('/patients', patientData);
  return extractData(response);
};

/**
 * Update existing patient
 * @param {string} id - Patient UUID
 * @param {object} patientData - Updated patient information
 * @returns {Promise<object>} Updated patient
 */
export const updatePatient = async (id, patientData) => {
  const response = await api.put(`/patients/${id}`, patientData);
  return extractData(response);
};

/**
 * Delete patient (soft delete)
 * @param {string} id - Patient UUID
 * @returns {Promise<object>} Deletion result
 */
export const deletePatient = async (id) => {
  const response = await api.delete(`/patients/${id}`);
  return extractData(response);
};
