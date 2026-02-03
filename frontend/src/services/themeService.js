import api from './api';

export const getThemes = async () => {
  const response = await api.get('/themes');
  return response;
};

export const getThemeById = async (id) => {
  const response = await api.get(`/themes/${id}`);
  return response;
};

export const createTheme = async (themeData) => {
  const response = await api.post('/themes', themeData);
  return response;
};

export const duplicateTheme = async (id) => {
  const response = await api.post(`/themes/${id}/duplicate`);
  return response;
};

export const updateTheme = async (id, updateData) => {
  const response = await api.put(`/themes/${id}`, updateData);
  return response;
};

export const deleteTheme = async (id) => {
  const response = await api.delete(`/themes/${id}`);
  return response;
};

export const updateUserThemePreference = async (themeId) => {
  const response = await api.put('/themes/user/preference', { theme_id: themeId });
  return response;
};

export const exportThemes = async (themeIds) => {
  const response = await api.post('/themes/export', { themeIds });
  return response;
};

export const importThemes = async (importData, options) => {
  const response = await api.post('/themes/import', { importData, options });
  return response;
};

export default {
  getThemes,
  getThemeById,
  createTheme,
  duplicateTheme,
  updateTheme,
  deleteTheme,
  updateUserThemePreference,
  exportThemes,
  importThemes
};
