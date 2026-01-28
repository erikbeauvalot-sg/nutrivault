/**
 * Follow-up Service
 * US-5.5.5: AI-Generated Follow-ups
 *
 * API client for generating and sending AI follow-up emails
 */

import api from './api';

/**
 * Check if AI service is available
 * @returns {Promise<Object>} AI status response
 */
export const getAIStatus = async () => {
  const response = await api.get('/followups/status');
  return response.data;
};

/**
 * Generate AI follow-up content for a visit
 * @param {string} visitId - Visit UUID
 * @param {Object} options - Generation options
 * @param {string} options.language - Output language (fr, en)
 * @param {string} options.tone - Email tone (professional, friendly, formal)
 * @param {boolean} options.includeNextSteps - Include next steps section
 * @param {boolean} options.includeNextAppointment - Include next appointment info
 * @returns {Promise<Object>} Generated content
 */
export const generateFollowup = async (visitId, options = {}) => {
  const response = await api.post(`/followups/generate/${visitId}`, options);
  return response.data;
};

/**
 * Send follow-up email to patient
 * @param {string} visitId - Visit UUID
 * @param {Object} emailData - Email data
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.body_html - HTML email body
 * @param {string} emailData.body_text - Plain text email body
 * @param {boolean} emailData.ai_generated - Whether content was AI-generated
 * @returns {Promise<Object>} Send result
 */
export const sendFollowup = async (visitId, emailData) => {
  const response = await api.post(`/followups/send/${visitId}`, emailData);
  return response.data;
};

/**
 * Get follow-up email history for a visit
 * @param {string} visitId - Visit UUID
 * @returns {Promise<Object>} Email history
 */
export const getFollowupHistory = async (visitId) => {
  const response = await api.get(`/followups/history/${visitId}`);
  return response.data;
};

export default {
  getAIStatus,
  generateFollowup,
  sendFollowup,
  getFollowupHistory
};
