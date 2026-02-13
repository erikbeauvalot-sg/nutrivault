/**
 * Expense Service
 * API calls for expense management
 */

import api from './api';

export const getExpenses = async (filters = {}) => {
  const response = await api.get('/expenses', { params: filters });
  return response;
};

export const getExpenseById = async (id) => {
  const response = await api.get(`/expenses/${id}`);
  return response;
};

export const createExpense = async (data) => {
  const response = await api.post('/expenses', data);
  return response.data;
};

export const updateExpense = async (id, data) => {
  const response = await api.put(`/expenses/${id}`, data);
  return response.data;
};

export const deleteExpense = async (id) => {
  const response = await api.delete(`/expenses/${id}`);
  return response.data;
};

export const getExpenseSummary = async (filters = {}) => {
  const response = await api.get('/expenses/summary', { params: filters });
  return response;
};
