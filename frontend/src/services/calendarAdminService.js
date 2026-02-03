import api from './api';

export const getDietitianCalendarStatuses = () =>
  api.get('/calendar/admin/dietitians');

export const getAuthUrlForDietitian = (userId) =>
  api.get(`/calendar/admin/auth-url/${userId}`);

export const getSyncStatsForDietitian = (userId) =>
  api.get(`/calendar/admin/sync-stats/${userId}`);

export const syncForDietitian = (userId) =>
  api.post(`/calendar/admin/sync/${userId}`);

export const syncAllDietitians = () =>
  api.post('/calendar/admin/sync-all');

export const disconnectDietitian = (userId) =>
  api.delete(`/calendar/admin/disconnect/${userId}`);

export const getCalendarsForDietitian = (userId) =>
  api.get(`/calendar/admin/calendars/${userId}`);

export const updateDietitianSettings = (userId, data) =>
  api.put(`/calendar/admin/settings/${userId}`, data);
