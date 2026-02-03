/**
 * Scheduler Service
 * API calls for scheduled tasks management
 */

import api from './api';

/**
 * Get all scheduled jobs with status
 */
export const getScheduledJobs = async () => {
  const response = await api.get('/scheduler/jobs');
  return response.data;
};

/**
 * Manually trigger a specific job
 */
export const triggerJob = async (name) => {
  const response = await api.post(`/scheduler/jobs/${name}/trigger`);
  return response.data;
};

/**
 * Update a job's cron schedule
 */
export const updateJob = async (name, data) => {
  const response = await api.put(`/scheduler/jobs/${name}`, data);
  return response.data;
};

/**
 * Enable or disable a job
 */
export const toggleJob = async (name, enabled) => {
  const response = await api.patch(`/scheduler/jobs/${name}/toggle`, { enabled });
  return response.data;
};
