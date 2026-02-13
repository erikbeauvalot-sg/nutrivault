/**
 * Client Service
 * API calls for client management
 */

import api from './api';

export const getClients = async (filters = {}) => {
  const response = await api.get('/clients', { params: filters });
  return response;
};

export const getClientById = async (id) => {
  const response = await api.get(`/clients/${id}`);
  return response;
};

export const createClient = async (clientData) => {
  const response = await api.post('/clients', clientData);
  return response.data;
};

export const updateClient = async (id, clientData) => {
  const response = await api.put(`/clients/${id}`, clientData);
  return response.data;
};

export const deleteClient = async (id) => {
  const response = await api.delete(`/clients/${id}`);
  return response.data;
};

export const searchClients = async (query) => {
  const response = await api.get('/clients/search', { params: { q: query } });
  return response;
};

export const createClientFromPatient = async (patientId) => {
  const response = await api.post('/clients/from-patient', { patient_id: patientId });
  return response.data;
};
