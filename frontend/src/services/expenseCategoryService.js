/**
 * Expense Category Service
 * API client for the configurable expense categories list.
 */

import api from './api';

export const getAllExpenseCategories = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.is_active !== undefined) params.append('is_active', filters.is_active);
  if (filters.search) params.append('search', filters.search);
  const qs = params.toString();
  const response = await api.get(`/expense-categories${qs ? `?${qs}` : ''}`);
  return response.data;
};

export const createExpenseCategory = async (data) => {
  const response = await api.post('/expense-categories', data);
  return response.data;
};

export const updateExpenseCategory = async (id, data) => {
  const response = await api.put(`/expense-categories/${id}`, data);
  return response.data;
};

export const deleteExpenseCategory = async (id) => {
  const response = await api.delete(`/expense-categories/${id}`);
  return response.data;
};

export const reorderExpenseCategories = async (order) => {
  const response = await api.put('/expense-categories/reorder', { order });
  return response.data;
};

export default {
  getAllExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  reorderExpenseCategories
};
