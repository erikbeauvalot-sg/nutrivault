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

// =============================================
// Portal Management (Dietitian side)
// =============================================

export const getPortalStatus = async (patientId) => {
  const response = await api.get(`/patients/${patientId}/portal/status`);
  return extractData(response);
};

export const activatePortal = async (patientId) => {
  const response = await api.post(`/patients/${patientId}/portal/activate`);
  return extractData(response);
};

export const deactivatePortal = async (patientId) => {
  const response = await api.post(`/patients/${patientId}/portal/deactivate`);
  return extractData(response);
};

export const reactivatePortal = async (patientId) => {
  const response = await api.post(`/patients/${patientId}/portal/reactivate`);
  return extractData(response);
};

// =============================================
// Journal (Dietitian side)
// =============================================

export const getPatientJournal = async (patientId, params = {}) => {
  const query = new URLSearchParams();
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.entry_type) query.append('entry_type', params.entry_type);
  if (params.mood) query.append('mood', params.mood);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  const response = await api.get(`/patients/${patientId}/journal?${query.toString()}`);
  return response.data;
};

export const createPatientJournalEntry = async (patientId, data) => {
  const response = await api.post(`/patients/${patientId}/journal`, data);
  return extractData(response);
};

export const updatePatientJournalEntry = async (patientId, entryId, data) => {
  const response = await api.put(`/patients/${patientId}/journal/${entryId}`, data);
  return extractData(response);
};

export const deletePatientJournalEntry = async (patientId, entryId) => {
  const response = await api.delete(`/patients/${patientId}/journal/${entryId}`);
  return extractData(response);
};

export const addJournalComment = async (patientId, entryId, data) => {
  const response = await api.post(`/patients/${patientId}/journal/${entryId}/comments`, data);
  return extractData(response);
};

export const deleteJournalComment = async (patientId, commentId) => {
  const response = await api.delete(`/patients/${patientId}/journal/comments/${commentId}`);
  return extractData(response);
};

export const resendPortalInvitation = async (patientId) => {
  const response = await api.post(`/patients/${patientId}/portal/resend`);
  return extractData(response);
};

export const sendPortalPasswordReset = async (patientId) => {
  const response = await api.post(`/patients/${patientId}/portal/reset-password`);
  return extractData(response);
};
