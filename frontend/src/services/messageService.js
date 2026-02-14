/**
 * Message Service (Dietitian side)
 * API calls for messaging conversations and messages.
 */

import api from './api';

export async function getConversations(params = {}) {
  const response = await api.get('/messages/conversations', { params });
  return response.data.data;
}

export async function createConversation(patientId) {
  const response = await api.post('/messages/conversations', { patient_id: patientId });
  return response.data.data;
}

export async function getMessages(conversationId, { before, limit, search } = {}) {
  const params = {};
  if (before) params.before = before;
  if (limit) params.limit = limit;
  if (search) params.search = search;
  const response = await api.get(`/messages/conversations/${conversationId}/messages`, { params });
  return response.data.data;
}

export async function sendMessage(conversationId, content) {
  const response = await api.post(`/messages/conversations/${conversationId}/messages`, { content });
  return response.data.data;
}

export async function editMessage(messageId, content) {
  const response = await api.put(`/messages/messages/${messageId}`, { content });
  return response.data.data;
}

export async function deleteMessage(messageId) {
  const response = await api.delete(`/messages/messages/${messageId}`);
  return response.data;
}

export async function updateConversation(conversationId, data) {
  const response = await api.put(`/messages/conversations/${conversationId}`, data);
  return response.data.data;
}

export async function addLabel(conversationId, label, color) {
  const response = await api.post(`/messages/conversations/${conversationId}/labels`, { label, color });
  return response.data.data;
}

export async function removeLabel(conversationId, labelId) {
  const response = await api.delete(`/messages/conversations/${conversationId}/labels/${labelId}`);
  return response.data;
}

export async function getDistinctLabels() {
  const response = await api.get('/messages/labels');
  return response.data.data;
}

export async function sendFromJournal(conversationId, journalEntryId, comment) {
  const response = await api.post(`/messages/conversations/${conversationId}/messages/from-journal`, {
    journal_entry_id: journalEntryId,
    comment,
  });
  return response.data.data;
}

export async function sendFromObjective(conversationId, objectiveNumber, comment) {
  const response = await api.post(`/messages/conversations/${conversationId}/messages/from-objective`, {
    objective_number: objectiveNumber,
    comment,
  });
  return response.data.data;
}

export async function getUnreadCount() {
  const response = await api.get('/messages/unread-count');
  return response.data.data.unread_count;
}
