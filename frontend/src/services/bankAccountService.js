/**
 * Bank Account Service
 * API client for the configurable bank accounts list.
 */

import api from './api';

export const getAllBankAccounts = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.is_active !== undefined) params.append('is_active', filters.is_active);
  const qs = params.toString();
  const response = await api.get(`/bank-accounts${qs ? `?${qs}` : ''}`);
  return response.data;
};

export const createBankAccount = async (data) => {
  const response = await api.post('/bank-accounts', data);
  return response.data;
};

export const updateBankAccount = async (id, data) => {
  const response = await api.put(`/bank-accounts/${id}`, data);
  return response.data;
};

export const deleteBankAccount = async (id) => {
  const response = await api.delete(`/bank-accounts/${id}`);
  return response.data;
};


export default {
  getAllBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount
};
