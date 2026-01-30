/**
 * Visit Service
 * API wrapper for visit management endpoints
 */

import api from './api';
import { extractData, extractPagination } from '../utils/apiResponse';

/**
 * Get all visits with optional filters
 * @param {Object} filters - Query parameters (search, patient_id, dietitian_id, status, start_date, end_date, page, limit)
 * @returns {Promise<{data: Array, pagination: object|null}>} Visits array and pagination info
 */
export const getVisits = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });

  const response = await api.get(`/visits?${params.toString()}`);
  return {
    data: extractData(response, []),
    pagination: extractPagination(response)
  };
};

/**
 * Get visit by ID
 * @param {string} id - Visit UUID
 * @returns {Promise<object>} Visit object
 */
export const getVisitById = async (id) => {
  const response = await api.get(`/visits/${id}`);
  return extractData(response);
};

/**
 * Create new visit
 * @param {Object} visitData - Visit data
 * @returns {Promise<object>} Created visit
 */
export const createVisit = async (visitData) => {
  const response = await api.post('/visits', visitData);
  return extractData(response);
};

/**
 * Update visit
 * @param {string} id - Visit UUID
 * @param {Object} updateData - Update data
 * @returns {Promise<object>} Updated visit
 */
export const updateVisit = async (id, updateData) => {
  const response = await api.put(`/visits/${id}`, updateData);
  return extractData(response);
};

/**
 * Delete visit
 * @param {string} id - Visit UUID
 * @returns {Promise<object>} Deletion result
 */
export const deleteVisit = async (id) => {
  const response = await api.delete(`/visits/${id}`);
  return extractData(response);
};

/**
 * Finish visit and generate invoice with email
 * Completes the visit, auto-generates invoice, and optionally sends email to patient
 * @param {string} id - Visit UUID
 * @param {Object} options - Options for the action
 * @param {boolean} options.markCompleted - Mark visit as COMPLETED (default: true)
 * @param {boolean} options.generateInvoice - Generate invoice automatically (default: true)
 * @param {boolean} options.sendEmail - Send invoice email to patient (default: false)
 * @returns {Promise<object>} Result with visit, invoice, and email status
 */
export const finishAndInvoice = async (id, options = {}) => {
  const response = await api.post(`/visits/${id}/finish-and-invoice`, options);
  return extractData(response);
};

export default {
  getVisits,
  getVisitById,
  createVisit,
  updateVisit,
  deleteVisit,
  finishAndInvoice
};
