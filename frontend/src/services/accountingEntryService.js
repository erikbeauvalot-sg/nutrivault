/**
 * Accounting Entry Service
 * API calls for accounting entries management
 */

import api from './api';

export const getEntries = async (filters = {}) => {
  const response = await api.get('/accounting-entries', { params: filters });
  return response;
};

export const getEntryById = async (id) => {
  const response = await api.get(`/accounting-entries/${id}`);
  return response;
};

export const createEntry = async (data) => {
  const response = await api.post('/accounting-entries', data);
  return response.data;
};

export const updateEntry = async (id, data) => {
  const response = await api.put(`/accounting-entries/${id}`, data);
  return response.data;
};

export const deleteEntry = async (id) => {
  const response = await api.delete(`/accounting-entries/${id}`);
  return response.data;
};

export const getEntrySummary = async (filters = {}) => {
  const response = await api.get('/accounting-entries/summary', { params: filters });
  return response;
};
