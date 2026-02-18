import api from './api';

// Template CRUD
export const getTemplates = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.is_active !== undefined) params.append('is_active', filters.is_active);
  if (filters.template_type) params.append('template_type', filters.template_type);
  if (filters.search) params.append('search', filters.search);
  const qs = params.toString();
  const response = await api.get(`/consultation-templates${qs ? `?${qs}` : ''}`);
  return response.data;
};

export const getTemplateById = async (id) => {
  const response = await api.get(`/consultation-templates/${id}`);
  return response.data;
};

export const createTemplate = async (data) => {
  const response = await api.post('/consultation-templates', data);
  return response.data;
};

export const updateTemplate = async (id, data) => {
  const response = await api.put(`/consultation-templates/${id}`, data);
  return response.data;
};

export const deleteTemplate = async (id) => {
  const response = await api.delete(`/consultation-templates/${id}`);
  return response.data;
};

export const duplicateTemplate = async (id, name) => {
  const response = await api.post(`/consultation-templates/${id}/duplicate`, { name });
  return response.data;
};

// Item operations
export const addItem = async (templateId, data) => {
  const response = await api.post(`/consultation-templates/${templateId}/items`, data);
  return response.data;
};

export const updateItem = async (itemId, data) => {
  const response = await api.put(`/consultation-templates/items/${itemId}`, data);
  return response.data;
};

export const removeItem = async (itemId) => {
  const response = await api.delete(`/consultation-templates/items/${itemId}`);
  return response.data;
};

export const reorderItems = async (templateId, itemIds) => {
  const response = await api.post(`/consultation-templates/${templateId}/items/reorder`, { itemIds });
  return response.data;
};

export default {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  addItem,
  updateItem,
  removeItem,
  reorderItems
};
