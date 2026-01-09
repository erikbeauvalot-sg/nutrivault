import axios from 'axios';
import tokenManager from '../utils/tokenManager';

// Create axios instance with base config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

console.log('[API] Configured with baseURL:', import.meta.env.VITE_API_URL);

// Check if API URL changed and clear old tokens
const storedApiUrl = localStorage.getItem('apiUrl');
if (storedApiUrl && storedApiUrl !== import.meta.env.VITE_API_URL) {
  console.log('[API] API URL changed, clearing old tokens');
  tokenManager.clearAll();
}
localStorage.setItem('apiUrl', import.meta.env.VITE_API_URL);

// Request interceptor - add auth token to headers
api.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken(); // Use tokenManager instead of localStorage
    console.log(`[API] ${config.method.toUpperCase()} ${config.url}`, {
      hasToken: !!token,
      baseURL: config.baseURL
    });
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh on 401
api.interceptors.response.use(
  (response) => {
    console.log(`[API] Response ${response.status}:`, response.config.url);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    console.error(`[API] Response error ${error.response?.status}:`, {
      url: originalRequest?.url,
      message: error.message,
      data: error.response?.data
    });

    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('[API] 401 error, attempting token refresh');
      originalRequest._retry = true;
      const refreshToken = tokenManager.getRefreshToken(); // Use tokenManager

      if (refreshToken) {
        try {
          console.log('[API] Refreshing token...');
          const response = await axios.post(
            `${import.meta.env.VITE_API_URL}/auth/refresh`,
            { refresh_token: refreshToken }
          );

          const { access_token } = response.data;
          
          // Preserve rememberMe preference
          const rememberMe = localStorage.getItem('rememberMe') === 'true';
          tokenManager.setTokens(access_token, refreshToken, rememberMe);
          console.log('[API] Token refreshed successfully');

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.error('[API] Token refresh failed, redirecting to login');
          // Refresh failed, clear tokens and redirect to login
          tokenManager.clearAll();
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      } else {
        console.log('[API] No refresh token available, redirecting to login');
        // No refresh token, clear everything and redirect
        tokenManager.clearAll();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
