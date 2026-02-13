/**
 * Quote Service
 * API calls for quote/estimate management
 */

import api from './api';

export const getQuotes = async (filters = {}) => {
  const response = await api.get('/quotes', { params: filters });
  return response;
};

export const getQuoteById = async (id) => {
  const response = await api.get(`/quotes/${id}`);
  return response;
};

export const createQuote = async (quoteData) => {
  const response = await api.post('/quotes', quoteData);
  return response.data;
};

export const updateQuote = async (id, quoteData) => {
  const response = await api.put(`/quotes/${id}`, quoteData);
  return response.data;
};

export const deleteQuote = async (id) => {
  const response = await api.delete(`/quotes/${id}`);
  return response.data;
};

export const changeQuoteStatus = async (id, status, data = {}) => {
  const response = await api.patch(`/quotes/${id}/status`, { status, ...data });
  return response.data;
};

export const convertToInvoice = async (id) => {
  const response = await api.post(`/quotes/${id}/convert-to-invoice`);
  return response.data;
};

export const duplicateQuote = async (id) => {
  const response = await api.post(`/quotes/${id}/duplicate`);
  return response.data;
};

export const downloadQuotePDF = async (id, language = 'fr') => {
  const response = await api.get(`/quotes/${id}/pdf?lang=${language}`, {
    responseType: 'blob'
  });
  return response;
};

export const sendQuoteEmail = async (id) => {
  const response = await api.post(`/quotes/${id}/send-email`);
  return response.data;
};
