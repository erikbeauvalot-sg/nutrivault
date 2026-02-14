/**
 * Portal Message Service (Patient side)
 * API calls for patient messaging.
 */

import api from './api';

export async function getConversations(params = {}) {
  const response = await api.get('/portal/messages/conversations', { params });
  return response.data.data;
}

export async function createConversation(dietitianId) {
  const response = await api.post('/portal/messages/conversations', { dietitian_id: dietitianId });
  return response.data.data;
}

export async function getMessages(conversationId, { before, limit, search } = {}) {
  const params = {};
  if (before) params.before = before;
  if (limit) params.limit = limit;
  if (search) params.search = search;
  const response = await api.get(`/portal/messages/conversations/${conversationId}/messages`, { params });
  return response.data.data;
}

export async function sendMessage(conversationId, content) {
  const response = await api.post(`/portal/messages/conversations/${conversationId}/messages`, { content });
  return response.data.data;
}

export async function editMessage(messageId, content) {
  const response = await api.put(`/portal/messages/messages/${messageId}`, { content });
  return response.data.data;
}

export async function deleteMessage(messageId) {
  const response = await api.delete(`/portal/messages/messages/${messageId}`);
  return response.data;
}

export async function updateConversation(conversationId, data) {
  const response = await api.put(`/portal/messages/conversations/${conversationId}`, data);
  return response.data.data;
}

export async function getUnreadCount() {
  const response = await api.get('/portal/messages/unread-count');
  return response.data.data.unread_count;
}
