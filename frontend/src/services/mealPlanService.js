/**
 * Meal Plan Service
 * API calls for personalized meal plan management
 */

import api from './api';
import { extractData, extractPagination } from '../utils/apiResponse';

/**
 * Get all meal plans with optional filters
 */
export const getMealPlans = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });

  const response = await api.get(`/meal-plans?${params.toString()}`);
  return {
    data: extractData(response, []),
    pagination: extractPagination(response)
  };
};

/**
 * Get meal plan by ID (with full days/meals/items)
 */
export const getMealPlanById = async (id) => {
  const response = await api.get(`/meal-plans/${id}`);
  return extractData(response);
};

/**
 * Create a new meal plan
 */
export const createMealPlan = async (data) => {
  const response = await api.post('/meal-plans', data);
  return extractData(response);
};

/**
 * Update meal plan metadata
 */
export const updateMealPlan = async (id, data) => {
  const response = await api.put(`/meal-plans/${id}`, data);
  return extractData(response);
};

/**
 * Delete (soft-delete) a meal plan
 */
export const deleteMealPlan = async (id) => {
  const response = await api.delete(`/meal-plans/${id}`);
  return extractData(response);
};

/**
 * Replace the full day/meal/item structure of a meal plan
 */
export const replaceDays = async (id, days) => {
  const response = await api.put(`/meal-plans/${id}/days`, { days });
  return extractData(response);
};
