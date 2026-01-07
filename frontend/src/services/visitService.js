import api from './api';

/**
 * Visit Service
 * Handles all API calls related to visit management
 */

/**
 * Get all visits with optional filtering, searching, and pagination
 * @param {Object} params - Query parameters
 * @param {string} params.search - Search term for patient name or notes
 * @param {string} params.patientId - Filter by patient ID
 * @param {string} params.visitType - Filter by visit type
 * @param {string} params.status - Filter by status
 * @param {string} params.startDate - Filter by start date (YYYY-MM-DD)
 * @param {string} params.endDate - Filter by end date (YYYY-MM-DD)
 * @param {number} params.page - Page number (1-indexed)
 * @param {number} params.limit - Number of items per page
 * @returns {Promise} Response with visits array and pagination data
 */
export const getVisits = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();

    if (params.search) {
      queryParams.append('search', params.search);
    }
    if (params.patientId) {
      queryParams.append('patientId', params.patientId);
    }
    if (params.visitType) {
      queryParams.append('visitType', params.visitType);
    }
    if (params.status) {
      queryParams.append('status', params.status);
    }
    if (params.startDate) {
      queryParams.append('startDate', params.startDate);
    }
    if (params.endDate) {
      queryParams.append('endDate', params.endDate);
    }
    if (params.page) {
      queryParams.append('page', params.page);
    }
    if (params.limit) {
      queryParams.append('limit', params.limit);
    }

    const response = await api.get(`/api/visits?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching visits:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch visits');
  }
};

/**
 * Get a single visit by ID
 * @param {number} id - Visit ID
 * @returns {Promise} Visit data
 */
export const getVisit = async (id) => {
  try {
    const response = await api.get(`/api/visits/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching visit ${id}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to fetch visit details');
  }
};

/**
 * Get all visits for a specific patient
 * @param {number} patientId - Patient ID
 * @param {Object} params - Additional query parameters (page, limit)
 * @returns {Promise} Response with patient visits array and pagination data
 */
export const getPatientVisits = async (patientId, params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) {
      queryParams.append('page', params.page);
    }
    if (params.limit) {
      queryParams.append('limit', params.limit);
    }

    const response = await api.get(`/api/patients/${patientId}/visits?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching visits for patient ${patientId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to fetch patient visits');
  }
};

/**
 * Create a new visit
 * @param {Object} visitData - Visit data
 * @param {number} visitData.patientId - Patient ID
 * @param {string} visitData.visitDate - Visit date (ISO 8601 format)
 * @param {string} visitData.visitType - Visit type (Initial, Follow-up, etc.)
 * @param {string} visitData.status - Status (Scheduled, Completed, Cancelled)
 * @param {string} visitData.notes - Visit notes
 * @param {Array} visitData.measurements - Array of measurements
 * @returns {Promise} Created visit data
 */
export const createVisit = async (visitData) => {
  try {
    const response = await api.post('/api/visits', visitData);
    return response.data;
  } catch (error) {
    console.error('Error creating visit:', error);
    throw new Error(error.response?.data?.message || 'Failed to create visit');
  }
};

/**
 * Update an existing visit
 * @param {number} id - Visit ID
 * @param {Object} visitData - Updated visit data
 * @returns {Promise} Updated visit data
 */
export const updateVisit = async (id, visitData) => {
  try {
    const response = await api.put(`/api/visits/${id}`, visitData);
    return response.data;
  } catch (error) {
    console.error(`Error updating visit ${id}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to update visit');
  }
};

/**
 * Update visit status
 * @param {number} id - Visit ID
 * @param {string} status - New status (Scheduled, Completed, Cancelled)
 * @returns {Promise} Updated visit data
 */
export const updateVisitStatus = async (id, status) => {
  try {
    const response = await api.patch(`/api/visits/${id}/status`, { status });
    return response.data;
  } catch (error) {
    console.error(`Error updating visit status ${id}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to update visit status');
  }
};

/**
 * Delete a visit
 * @param {number} id - Visit ID
 * @returns {Promise} Success message
 */
export const deleteVisit = async (id) => {
  try {
    const response = await api.delete(`/api/visits/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting visit ${id}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to delete visit');
  }
};

/**
 * Get measurement history for a patient
 * @param {number} patientId - Patient ID
 * @param {string} measurementType - Type of measurement (weight, height, bmi, etc.)
 * @returns {Promise} Array of measurement data with dates
 */
export const getPatientMeasurementHistory = async (patientId, measurementType) => {
  try {
    const response = await api.get(`/api/patients/${patientId}/measurements/${measurementType}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching measurement history for patient ${patientId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to fetch measurement history');
  }
};

export default {
  getVisits,
  getVisit,
  getPatientVisits,
  createVisit,
  updateVisit,
  updateVisitStatus,
  deleteVisit,
  getPatientMeasurementHistory
};
