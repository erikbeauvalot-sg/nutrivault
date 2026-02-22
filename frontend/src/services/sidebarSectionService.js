import api from './api';

export const getAllSections = async () => {
  const response = await api.get('/sidebar-sections');
  return response.data.data || response.data;
};

export const createSection = async (data) => {
  const response = await api.post('/sidebar-sections', data);
  return response.data.data || response.data;
};

export const updateSection = async (id, data) => {
  const response = await api.put(`/sidebar-sections/${id}`, data);
  return response.data.data || response.data;
};

export const deleteSection = async (id) => {
  const response = await api.delete(`/sidebar-sections/${id}`);
  return response.data;
};

export const reorderSections = async (orderedIds) => {
  const response = await api.put('/sidebar-sections/reorder', { orderedIds });
  return response.data.data || response.data;
};

export default { getAllSections, createSection, updateSection, deleteSection, reorderSections };
