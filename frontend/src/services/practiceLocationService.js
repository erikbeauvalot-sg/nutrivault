/**
 * Practice Location Service
 * API client for the configurable consultation locations list.
 */

import api from './api';

export const getAllPracticeLocations = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.is_active !== undefined) params.append('is_active', filters.is_active);
  const qs = params.toString();
  const response = await api.get(`/practice-locations${qs ? `?${qs}` : ''}`);
  return response.data;
};

export const createPracticeLocation = async (data) => {
  const response = await api.post('/practice-locations', data);
  return response.data;
};

export const updatePracticeLocation = async (id, data) => {
  const response = await api.put(`/practice-locations/${id}`, data);
  return response.data;
};

export const deletePracticeLocation = async (id) => {
  const response = await api.delete(`/practice-locations/${id}`);
  return response.data;
};

export const reorderPracticeLocations = async (order) => {
  const response = await api.put('/practice-locations/reorder', { order });
  return response.data;
};

export default {
  getAllPracticeLocations,
  createPracticeLocation,
  updatePracticeLocation,
  deletePracticeLocation,
  reorderPracticeLocations
};
