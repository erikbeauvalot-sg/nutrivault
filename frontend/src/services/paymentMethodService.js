/**
 * Payment Method Service
 * API client for the configurable billing payment methods list.
 */

import api from './api';

export const getAllPaymentMethods = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.is_active !== undefined) params.append('is_active', filters.is_active);
  if (filters.search) params.append('search', filters.search);
  const qs = params.toString();
  const response = await api.get(`/payment-methods${qs ? `?${qs}` : ''}`);
  return response.data;
};

export const createPaymentMethod = async (data) => {
  const response = await api.post('/payment-methods', data);
  return response.data;
};

export const updatePaymentMethod = async (id, data) => {
  const response = await api.put(`/payment-methods/${id}`, data);
  return response.data;
};

export const deletePaymentMethod = async (id) => {
  const response = await api.delete(`/payment-methods/${id}`);
  return response.data;
};

export const reorderPaymentMethods = async (order) => {
  const response = await api.put('/payment-methods/reorder', { order });
  return response.data;
};

export default {
  getAllPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  reorderPaymentMethods
};
