import api from './api';

export const createNote = async (data) => {
  const response = await api.post('/consultation-notes', data);
  return response.data;
};

export const getNotes = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.visit_id) params.append('visit_id', filters.visit_id);
  if (filters.patient_id) params.append('patient_id', filters.patient_id);
  if (filters.status) params.append('status', filters.status);
  const qs = params.toString();
  const response = await api.get(`/consultation-notes${qs ? `?${qs}` : ''}`);
  return response.data;
};

export const getNoteById = async (id) => {
  const response = await api.get(`/consultation-notes/${id}`);
  return response.data;
};

export const saveNoteValues = async (id, payload) => {
  const response = await api.put(`/consultation-notes/${id}/values`, payload);
  return response.data;
};

export const completeNote = async (id) => {
  const response = await api.put(`/consultation-notes/${id}/complete`);
  return response.data;
};

export const deleteNote = async (id) => {
  const response = await api.delete(`/consultation-notes/${id}`);
  return response.data;
};

export default {
  createNote,
  getNotes,
  getNoteById,
  saveNoteValues,
  completeNote,
  deleteNote
};
