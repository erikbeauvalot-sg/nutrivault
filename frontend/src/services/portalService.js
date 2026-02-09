/**
 * Portal Service
 * API calls for patient portal
 */

import api from './api';
import { extractData } from '../utils/apiResponse';

export const getProfile = async () => {
  const response = await api.get('/portal/me');
  return extractData(response);
};

export const updateProfile = async (data) => {
  const response = await api.put('/portal/me', data);
  return extractData(response);
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.put('/portal/password', { currentPassword, newPassword });
  return extractData(response);
};

export const getMeasures = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.measure_definition_id) query.append('measure_definition_id', params.measure_definition_id);
  const response = await api.get(`/portal/measures?${query.toString()}`);
  return extractData(response);
};

export const getVisits = async () => {
  const response = await api.get('/portal/visits');
  return extractData(response);
};

export const getDocuments = async () => {
  const response = await api.get('/portal/documents');
  return extractData(response);
};

export const downloadDocument = async (documentId) => {
  const response = await api.get(`/portal/documents/${documentId}/download`, {
    responseType: 'blob'
  });
  return response.data;
};

export const getRecipes = async () => {
  const response = await api.get('/portal/recipes');
  return extractData(response);
};

export const getRecipeDetail = async (id) => {
  const response = await api.get(`/portal/recipes/${id}`);
  return extractData(response);
};

export const updateTheme = async (themeId) => {
  const response = await api.put('/portal/theme', { theme_id: themeId });
  return extractData(response);
};

export const setPassword = async (token, password) => {
  const response = await api.post('/portal/set-password', { token, password });
  return extractData(response);
};
