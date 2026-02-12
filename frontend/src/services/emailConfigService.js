/**
 * Email Config Service
 * API calls for per-user SMTP configuration
 */

import api from './api';

export const getMyConfig = async () => {
  const response = await api.get('/email-config/me');
  return response;
};

export const updateMyConfig = async (data) => {
  const response = await api.put('/email-config/me', data);
  return response;
};

export const verifyMyConfig = async () => {
  const response = await api.post('/email-config/me/verify');
  return response;
};

export const sendTestEmail = async (recipient) => {
  const response = await api.post('/email-config/me/test', { recipient });
  return response;
};

export const deleteMyConfig = async () => {
  const response = await api.delete('/email-config/me');
  return response;
};

export default {
  getMyConfig,
  updateMyConfig,
  verifyMyConfig,
  sendTestEmail,
  deleteMyConfig
};
