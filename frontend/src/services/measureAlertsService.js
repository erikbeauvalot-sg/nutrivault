/**
 * Measure Alerts Service
 * API wrapper for measure alerts endpoints
 * Sprint 4: US-5.4.3 - Normal Ranges & Alerts
 */

import api from './api';

/**
 * Get all unacknowledged measure alerts
 * @param {Object} options - Query options
 * @param {string} options.severity - Filter by severity (critical/warning/info)
 * @param {number} options.limit - Maximum number of results
 * @returns {Promise} API response with alerts
 */
export const getAllMeasureAlerts = async (options = {}) => {
  const params = {};
  if (options.severity) params.severity = options.severity;
  if (options.limit) params.limit = options.limit;

  const response = await api.get('/measure-alerts', { params });
  return response;
};

/**
 * Get measure alerts for a specific patient
 * @param {string} patientId - Patient UUID
 * @param {Object} options - Query options
 * @param {boolean} options.includeAcknowledged - Include acknowledged alerts
 * @param {number} options.limit - Maximum number of results
 * @returns {Promise} API response with alerts
 */
export const getPatientMeasureAlerts = async (patientId, options = {}) => {
  const params = {};
  if (options.includeAcknowledged) params.include_acknowledged = 'true';
  if (options.limit) params.limit = options.limit;

  const response = await api.get(`/patients/${patientId}/measure-alerts`, { params });
  return response;
};

/**
 * Acknowledge a single measure alert
 * @param {string} alertId - Alert UUID
 * @returns {Promise} API response
 */
export const acknowledgeMeasureAlert = async (alertId) => {
  const response = await api.patch(`/measure-alerts/${alertId}/acknowledge`);
  return response;
};

/**
 * Acknowledge multiple measure alerts for a patient
 * @param {string} patientId - Patient UUID
 * @param {Object} options - Options
 * @param {string} options.severity - Only acknowledge alerts of this severity
 * @param {string} options.measureDefinitionId - Only acknowledge alerts for this measure
 * @returns {Promise} API response
 */
export const acknowledgePatientAlerts = async (patientId, options = {}) => {
  const body = {};
  if (options.severity) body.severity = options.severity;
  if (options.measureDefinitionId) body.measure_definition_id = options.measureDefinitionId;

  const response = await api.post(`/patients/${patientId}/measure-alerts/acknowledge`, body);
  return response;
};

export default {
  getAllMeasureAlerts,
  getPatientMeasureAlerts,
  acknowledgeMeasureAlert,
  acknowledgePatientAlerts
};
