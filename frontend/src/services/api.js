/**
 * Axios Instance with Interceptors
 * Handles automatic token injection, token refresh on 401 errors,
 * and offline caching for GET requests.
 * Supports dynamic server URL configuration on native apps.
 */

import axios from 'axios';
import * as tokenStorage from '../utils/tokenStorage';
import * as offlineCache from './offlineCache';
import { getServerUrl } from './serverConfigService';

// Create axios instance with base configuration
// Nginx proxies /api/* requests to backend:3001
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Initialize the API base URL from saved preferences (native only).
 * Call this once at app startup before any API calls.
 */
export async function initApiBaseUrl() {
  try {
    const url = await getServerUrl();
    api.defaults.baseURL = url;
  } catch {
    // Keep the default baseURL
  }
}

/**
 * Update the API base URL at runtime (e.g. after user changes server config).
 * @param {string} url
 */
export function setApiBaseUrl(url) {
  api.defaults.baseURL = url;
}

/**
 * Get the current API base URL.
 * @returns {string}
 */
export function getApiBaseUrl() {
  return api.defaults.baseURL;
}

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue = [];
// Flag to prevent showing errors when redirecting to login
let isRedirectingToLogin = false;

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

// Endpoint-specific TTL configuration (in milliseconds)
const CACHE_TTL = {
  '/portal/profile': 7 * 24 * 60 * 60 * 1000,    // 7 days
  '/portal/measures': 4 * 60 * 60 * 1000,          // 4 hours
  '/portal/visits': 12 * 60 * 60 * 1000,           // 12 hours
  '/portal/documents': 24 * 60 * 60 * 1000,        // 24 hours
  '/portal/recipes': 7 * 24 * 60 * 60 * 1000,      // 7 days
  '/portal/journal': 4 * 60 * 60 * 1000,           // 4 hours
};

const DEFAULT_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours default

/**
 * Get cache TTL for a given URL
 */
function getCacheTTL(url) {
  for (const [pattern, ttl] of Object.entries(CACHE_TTL)) {
    if (url.includes(pattern)) return ttl;
  }
  return DEFAULT_CACHE_TTL;
}

/**
 * Generate a cache key from a request config
 */
function getCacheKey(config) {
  const url = config.url || '';
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${url}${params}`;
}

// Request interceptor: Add Authorization header (synchronous — no network checks)
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

// Response interceptor: Handle 401 errors, token refresh, and cache successful GETs
api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses (fire-and-forget, non-blocking)
    if (
      response.config &&
      (response.config.method === 'get' || !response.config.method) &&
      response.status === 200
    ) {
      const cacheKey = getCacheKey(response.config);
      const ttl = getCacheTTL(response.config.url || '');
      offlineCache.set(cacheKey, response.data, ttl).catch(() => {});
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Network error (no response = server unreachable / offline):
    // try serving from cache as fallback
    if (
      !error.response &&
      originalRequest &&
      (originalRequest.method === 'get' || !originalRequest.method)
    ) {
      try {
        const cacheKey = getCacheKey(originalRequest);
        const cached = await offlineCache.get(cacheKey);
        if (cached) {
          return {
            data: cached,
            status: 200,
            statusText: 'OK (cached)',
            headers: {},
            config: originalRequest,
          };
        }
      } catch {
        // Cache read failed, fall through to normal error handling
      }
    }

    // If already redirecting to login, reject silently (don't show error messages)
    if (isRedirectingToLogin) {
      return new Promise(() => {}); // Never resolve - page is redirecting
    }

    // Skip token refresh logic for auth endpoints (login, register, etc.)
    // These endpoints should return errors directly without triggering redirects
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
                           originalRequest.url?.includes('/auth/register') ||
                           originalRequest.url?.includes('/auth/refresh');

    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

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
      isRedirectingToLogin = true;
      tokenStorage.clearTokens();
      window.location.href = '/login';
      return new Promise(() => {}); // Never resolve - page is redirecting
    }

    try {
      // Attempt to refresh token — use current dynamic baseURL
      const baseURL = api.defaults.baseURL;
      const { data } = await axios.post(
        `${baseURL}/auth/refresh`,
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
      isRedirectingToLogin = true;
      processQueue(refreshError, null);
      tokenStorage.clearTokens();
      window.location.href = '/login';
      return new Promise(() => {}); // Never resolve - page is redirecting
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
