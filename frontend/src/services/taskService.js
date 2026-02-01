/**
 * Task Service
 * API calls for task management
 */

import api from './api';

/**
 * Get all tasks with optional filters
 */
export const getTasks = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.patient_id) params.append('patient_id', filters.patient_id);
  if (filters.include_completed) params.append('include_completed', 'true');

  const response = await api.get(`/dashboard/tasks?${params.toString()}`);
  return response.data;
};

/**
 * Get a single task by ID
 */
export const getTask = async (id) => {
  const response = await api.get(`/dashboard/tasks/${id}`);
  return response.data;
};

/**
 * Create a new task
 */
export const createTask = async (data) => {
  const response = await api.post('/dashboard/tasks', data);
  return response.data;
};

/**
 * Update a task
 */
export const updateTask = async (id, data) => {
  const response = await api.put(`/dashboard/tasks/${id}`, data);
  return response.data;
};

/**
 * Mark a task as completed
 */
export const completeTask = async (id) => {
  const response = await api.put(`/dashboard/tasks/${id}/complete`);
  return response.data;
};

/**
 * Delete a task
 */
export const deleteTask = async (id) => {
  const response = await api.delete(`/dashboard/tasks/${id}`);
  return response.data;
};

/**
 * Get task statistics
 */
export const getTaskStats = async () => {
  const response = await api.get('/dashboard/tasks/stats');
  return response.data;
};

/**
 * Get tasks due soon
 */
export const getTasksDueSoon = async () => {
  const response = await api.get('/dashboard/tasks/due-soon');
  return response.data;
};

export default {
  getTasks,
  getTask,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  getTaskStats,
  getTasksDueSoon
};
