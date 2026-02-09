/**
 * Discord Webhook Service (Frontend)
 * API client for managing Discord webhook settings
 */

import api from './api';

export const getDiscordSettings = async () => {
  const response = await api.get('/discord/settings');
  return response.data;
};

export const updateDiscordSettings = async (settings) => {
  const response = await api.put('/discord/settings', settings);
  return response.data;
};

export const testDiscordWebhook = async (webhookUrl) => {
  const response = await api.post('/discord/test', { webhookUrl });
  return response.data;
};
