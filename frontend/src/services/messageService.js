/**
 * Message Service (Dietitian side)
 * API calls for messaging conversations and messages.
 */

import api from './api';

export async function getConversations() {
  const response = await api.get('/messages/conversations');
  return response.data.data;
}

export async function createConversation(patientId) {
  const response = await api.post('/messages/conversations', { patient_id: patientId });
  return response.data.data;
}

export async function getMessages(conversationId, { before, limit } = {}) {
  const params = {};
  if (before) params.before = before;
  if (limit) params.limit = limit;
  const response = await api.get(`/messages/conversations/${conversationId}/messages`, { params });
  return response.data.data;
}

export async function sendMessage(conversationId, content) {
  const response = await api.post(`/messages/conversations/${conversationId}/messages`, { content });
  return response.data.data;
}

export async function getUnreadCount() {
  const response = await api.get('/messages/unread-count');
  return response.data.data.unread_count;
}
