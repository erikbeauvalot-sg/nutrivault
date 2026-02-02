import api from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Analytics Service
 * Sprint 6: Advanced Data Visualization
 * + Public page view tracking
 */

// ==========================================
// Public Page View Tracking (no auth required)
// ==========================================

/**
 * Generate or retrieve visitor ID from localStorage
 */
const getVisitorId = () => {
  const VISITOR_ID_KEY = 'nv_visitor_id';
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);

  if (!visitorId) {
    visitorId = 'v_' + crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }

  return visitorId;
};

/**
 * Generate or retrieve session ID from sessionStorage
 */
const getSessionId = () => {
  const SESSION_ID_KEY = 'nv_session_id';
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);

  if (!sessionId) {
    sessionId = 's_' + crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }

  return sessionId;
};

/**
 * Check if analytics consent has been given
 */
export const hasAnalyticsConsent = () => {
  const consent = localStorage.getItem('nv_analytics_consent');
  return consent === 'true';
};

/**
 * Set analytics consent
 */
export const setAnalyticsConsent = (consent) => {
  localStorage.setItem('nv_analytics_consent', consent ? 'true' : 'false');
};

/**
 * Check if consent has been asked (user has made a choice)
 */
export const hasAskedConsent = () => {
  return localStorage.getItem('nv_analytics_consent') !== null;
};

/**
 * Get UTM parameters from URL
 */
const getUTMParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || null,
    utm_medium: params.get('utm_medium') || null,
    utm_campaign: params.get('utm_campaign') || null
  };
};

/**
 * Track a page view (public, no auth required)
 * @param {string} pagePath - The path being viewed
 */
export const trackPageView = async (pagePath) => {
  // Only track if consent has been given
  if (!hasAnalyticsConsent()) {
    return null;
  }

  try {
    const utmParams = getUTMParams();

    const response = await fetch(`${API_BASE_URL}/api/page-views/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        page_path: pagePath,
        visitor_id: getVisitorId(),
        session_id: getSessionId(),
        referrer: document.referrer || null,
        ...utmParams
      })
    });

    if (!response.ok) {
      console.error('Failed to track page view:', response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error tracking page view:', error);
    return null;
  }
};

/**
 * Get page view statistics (requires authentication)
 */
export const getPageViewStats = async (params = {}) => {
  const response = await api.get('/page-views/stats', { params });
  return response.data;
};

/**
 * Get recent page views (requires authentication)
 */
export const getRecentPageViews = async (params = {}) => {
  const response = await api.get('/page-views/recent', { params });
  return response.data;
};

// ==========================================
// Dashboard Analytics (auth required)
// ==========================================

/**
 * Get health trends analytics
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date filter (optional)
 * @param {string} params.endDate - End date filter (optional)
 */
export const getHealthTrends = async (params = {}) => {
  const response = await api.get('/analytics/health-trends', { params });
  return response.data;
};

/**
 * Get financial metrics analytics
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date filter (optional)
 * @param {string} params.endDate - End date filter (optional)
 */
export const getFinancialMetrics = async (params = {}) => {
  const response = await api.get('/analytics/financial-metrics', { params });
  return response.data;
};

/**
 * Get communication effectiveness analytics
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date filter (optional)
 * @param {string} params.endDate - End date filter (optional)
 */
export const getCommunicationEffectiveness = async (params = {}) => {
  const response = await api.get('/analytics/communication-effectiveness', { params });
  return response.data;
};

/**
 * Get patient health score
 * @param {string} patientId - Patient UUID
 */
export const getPatientHealthScore = async (patientId) => {
  const response = await api.get(`/analytics/patient-health-score/${patientId}`);
  return response.data;
};

export default {
  // Page view tracking
  trackPageView,
  hasAnalyticsConsent,
  setAnalyticsConsent,
  hasAskedConsent,
  getPageViewStats,
  getRecentPageViews,
  // Dashboard analytics
  getHealthTrends,
  getFinancialMetrics,
  getCommunicationEffectiveness,
  getPatientHealthScore
};
