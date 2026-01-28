/**
 * Appointment Reminder Service
 * API client for appointment reminder functionality
 */

import api from './api';

/**
 * Send appointment reminder manually for a specific visit
 * @param {string} visitId - Visit ID
 * @returns {Promise<Object>} API response
 */
export const sendReminderManually = async (visitId) => {
  const response = await api.post(`/appointment-reminders/send/${visitId}`);
  return response.data;
};

/**
 * Get appointment reminder statistics
 * @returns {Promise<Object>} Reminder stats
 */
export const getReminderStats = async () => {
  const response = await api.get('/appointment-reminders/stats');
  return response.data;
};

/**
 * Unsubscribe patient from appointment reminders
 * @param {string} token - Unsubscribe token
 * @returns {Promise<Object>} API response
 */
export const unsubscribeFromReminders = async (token) => {
  const response = await api.post(`/appointment-reminders/unsubscribe/${token}`);
  return response.data;
};

/**
 * Re-enable appointment reminders for a patient
 * @param {string} patientId - Patient ID
 * @returns {Promise<Object>} API response
 */
export const resubscribeToReminders = async (patientId) => {
  const response = await api.post('/appointment-reminders/resubscribe', {
    patientId
  });
  return response.data;
};

/**
 * Trigger batch reminder job manually (admin only)
 * @returns {Promise<Object>} Batch job results
 */
export const triggerBatchReminders = async () => {
  const response = await api.post('/appointment-reminders/batch/send-now');
  return response.data;
};

export default {
  sendReminderManually,
  getReminderStats,
  unsubscribeFromReminders,
  resubscribeToReminders,
  triggerBatchReminders
};
