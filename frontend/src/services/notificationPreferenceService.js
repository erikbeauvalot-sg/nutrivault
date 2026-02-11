/**
 * Notification Preference Service
 * Manages user notification preferences via backend API.
 */

import api from './api';

/**
 * Get current user's notification preferences
 * @returns {Promise<object>} { appointment_reminders, new_documents, measure_alerts }
 */
export async function getPreferences() {
  const response = await api.get('/notification-preferences');
  return response.data.data;
}

/**
 * Update notification preferences
 * @param {object} prefs - Partial preferences to update
 * @returns {Promise<object>} Updated preferences
 */
export async function updatePreferences(prefs) {
  const response = await api.put('/notification-preferences', prefs);
  return response.data.data;
}
