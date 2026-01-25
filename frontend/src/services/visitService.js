/**
 * Visit Service
 * API wrapper for visit management endpoints
 */

import api from './api';

/**
 * Get all visits with optional filters
 * @param {Object} filters - Query parameters (search, patient_id, dietitian_id, status, start_date, end_date, page, limit)
 * @returns {Promise} API response
 */
export const getVisits = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  
  const response = await api.get(`/api/visits?${params.toString()}`);
  return response;
};

/**
 * Get visit by ID
 * @param {string} id - Visit UUID
 * @returns {Promise} API response
 */
export const getVisitById = async (id) => {
  const response = await api.get(`/api/visits/${id}`);
  return response;
};

/**
 * Create new visit
 * @param {Object} visitData - Visit data
 * @returns {Promise} API response
 */
export const createVisit = async (visitData) => {
  const response = await api.post('/api/visits', visitData);
  return response;
};

/**
 * Update visit
 * @param {string} id - Visit UUID
 * @param {Object} updateData - Update data
 * @returns {Promise} API response
 */
export const updateVisit = async (id, updateData) => {
  const response = await api.put(`/api/visits/${id}`, updateData);
  return response;
};

/**
 * Delete visit
 * @param {string} id - Visit UUID
 * @returns {Promise} API response
 */
export const deleteVisit = async (id) => {
  const response = await api.delete(`/api/visits/${id}`);
  return response;
};

/**
 * Finish visit and generate invoice with email
 * Completes the visit, auto-generates invoice, and optionally sends email to patient
 * @param {string} id - Visit UUID
 * @param {Object} options - Options for the action
 * @param {boolean} options.markCompleted - Mark visit as COMPLETED (default: true)
 * @param {boolean} options.generateInvoice - Generate invoice automatically (default: true)
 * @param {boolean} options.sendEmail - Send invoice email to patient (default: false)
 * @returns {Promise} API response with visit, invoice, and email status
 */
export const finishAndInvoice = async (id, options = {}) => {
  const response = await api.post(`/api/visits/${id}/finish-and-invoice`, options);
  return response;
};

export default {
  getVisits,
  getVisitById,
  createVisit,
  updateVisit,
  deleteVisit,
  finishAndInvoice
};
