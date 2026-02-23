import api from './api';

export async function getSessions(filters = {}) {
  const params = new URLSearchParams();
  if (filters.page)    params.set('page', filters.page);
  if (filters.limit)   params.set('limit', filters.limit);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.userId)  params.set('userId', filters.userId);
  if (filters.search)  params.set('search', filters.search);

  const { data } = await api.get(`/sessions?${params.toString()}`);
  return data.data;
}

export async function getStats() {
  const { data } = await api.get('/sessions/stats');
  return data.data;
}

export async function revokeSession(id) {
  const { data } = await api.delete(`/sessions/${id}`);
  return data;
}

export async function revokeUserSessions(userId) {
  const { data } = await api.delete(`/sessions/user/${userId}`);
  return data;
}
