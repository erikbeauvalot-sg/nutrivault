/**
 * Axios Instance with Interceptors
 * Handles automatic token injection and token refresh on 401 errors
 */

import axios from 'axios';
import * as tokenStorage from '../utils/tokenStorage';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor: Add Authorization header if token exists
api.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle 401 errors and token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If error is not 401 or request already retried, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch(err => {
          return Promise.reject(err);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = tokenStorage.getRefreshToken();

    if (!refreshToken) {
      // No refresh token available, redirect to login
      tokenStorage.clearTokens();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    try {
      // Attempt to refresh token
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/refresh`,
        { refreshToken }
      );

      // Store new tokens
      tokenStorage.setTokens(
        data.accessToken,
        data.refreshToken,
        tokenStorage.isRemembered()
      );

      // Update authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

      // Process queued requests
      processQueue(null, data.accessToken);

      // Retry original request
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed, clear tokens and redirect to login
      processQueue(refreshError, null);
      tokenStorage.clearTokens();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
