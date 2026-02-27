/**
 * Analytics Service Tests
 * Tests for analytics API service functions and consent management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api';
import {
  hasAnalyticsConsent,
  setAnalyticsConsent,
  hasAskedConsent,
  trackPageView,
  getPageViewStats,
  getRecentPageViews,
  getHealthTrends,
  getFinancialMetrics,
  getCommunicationEffectiveness,
  getPatientHealthScore,
  getQuoteMetrics
} from '../analyticsService';

// Mock the API module
vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('analyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all localStorage/sessionStorage mock return values to null by default
    window.localStorage.getItem.mockReturnValue(null);
    window.sessionStorage.getItem.mockReturnValue(null);
    // Reset fetch mock
    global.fetch = vi.fn();
    // Mock crypto.randomUUID for deterministic IDs
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid-1234');
  });

  // ==========================================
  // hasAnalyticsConsent
  // ==========================================

  describe('hasAnalyticsConsent()', () => {
    it('returns false when localStorage has no entry (null)', () => {
      window.localStorage.getItem.mockReturnValue(null);
      expect(hasAnalyticsConsent()).toBe(false);
    });

    it('returns false when localStorage value is "false"', () => {
      window.localStorage.getItem.mockReturnValue('false');
      expect(hasAnalyticsConsent()).toBe(false);
    });

    it('returns false when localStorage value is an arbitrary non-"true" string', () => {
      window.localStorage.getItem.mockReturnValue('yes');
      expect(hasAnalyticsConsent()).toBe(false);
    });

    it('returns true when localStorage value is "true"', () => {
      window.localStorage.getItem.mockReturnValue('true');
      expect(hasAnalyticsConsent()).toBe(true);
    });

    it('reads from the correct localStorage key', () => {
      hasAnalyticsConsent();
      expect(window.localStorage.getItem).toHaveBeenCalledWith('nv_analytics_consent');
    });
  });

  // ==========================================
  // setAnalyticsConsent
  // ==========================================

  describe('setAnalyticsConsent()', () => {
    it('stores "true" when called with true', () => {
      setAnalyticsConsent(true);
      expect(window.localStorage.setItem).toHaveBeenCalledWith('nv_analytics_consent', 'true');
    });

    it('stores "false" when called with false', () => {
      setAnalyticsConsent(false);
      expect(window.localStorage.setItem).toHaveBeenCalledWith('nv_analytics_consent', 'false');
    });

    it('stores "false" when called with a falsy value (0)', () => {
      setAnalyticsConsent(0);
      expect(window.localStorage.setItem).toHaveBeenCalledWith('nv_analytics_consent', 'false');
    });

    it('stores "true" when called with a truthy non-boolean value', () => {
      setAnalyticsConsent(1);
      expect(window.localStorage.setItem).toHaveBeenCalledWith('nv_analytics_consent', 'true');
    });

    it('writes to the correct localStorage key', () => {
      setAnalyticsConsent(true);
      const [key] = window.localStorage.setItem.mock.calls[0];
      expect(key).toBe('nv_analytics_consent');
    });
  });

  // ==========================================
  // hasAskedConsent
  // ==========================================

  describe('hasAskedConsent()', () => {
    it('returns false when localStorage has no entry (null)', () => {
      window.localStorage.getItem.mockReturnValue(null);
      expect(hasAskedConsent()).toBe(false);
    });

    it('returns true when localStorage value is "true"', () => {
      window.localStorage.getItem.mockReturnValue('true');
      expect(hasAskedConsent()).toBe(true);
    });

    it('returns true when localStorage value is "false" (user explicitly declined)', () => {
      window.localStorage.getItem.mockReturnValue('false');
      expect(hasAskedConsent()).toBe(true);
    });

    it('returns true for any non-null value', () => {
      window.localStorage.getItem.mockReturnValue('anything');
      expect(hasAskedConsent()).toBe(true);
    });

    it('reads from the correct localStorage key', () => {
      hasAskedConsent();
      expect(window.localStorage.getItem).toHaveBeenCalledWith('nv_analytics_consent');
    });
  });

  // ==========================================
  // trackPageView
  // ==========================================

  describe('trackPageView()', () => {
    it('returns null immediately when consent has not been given', async () => {
      window.localStorage.getItem.mockReturnValue(null); // no consent
      const result = await trackPageView('/some-page');
      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns null when consent is explicitly set to "false"', async () => {
      window.localStorage.getItem.mockReturnValue('false');
      const result = await trackPageView('/some-page');
      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('calls fetch with the correct endpoint when consent is given', async () => {
      // First call: nv_analytics_consent → consent check
      // Second call: nv_visitor_id → visitor id
      window.localStorage.getItem
        .mockReturnValueOnce('true')   // nv_analytics_consent
        .mockReturnValueOnce(null);    // nv_visitor_id (not yet set)

      window.sessionStorage.getItem.mockReturnValue(null); // nv_session_id not yet set

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tracked: true })
      });

      await trackPageView('/dashboard');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/page-views/track',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('includes visitor_id, session_id, and page_path in POST body', async () => {
      window.localStorage.getItem
        .mockReturnValueOnce('true')          // nv_analytics_consent
        .mockReturnValueOnce('v_existing');   // nv_visitor_id already exists

      window.sessionStorage.getItem.mockReturnValue('s_existing'); // nv_session_id already exists

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tracked: true })
      });

      await trackPageView('/patients');

      const fetchCall = global.fetch.mock.calls[0];
      const bodyParsed = JSON.parse(fetchCall[1].body);

      expect(bodyParsed.visitor_id).toBe('v_existing');
      expect(bodyParsed.session_id).toBe('s_existing');
      expect(bodyParsed.page_path).toBe('/patients');
    });

    it('generates and stores a new visitor_id when none exists', async () => {
      window.localStorage.getItem
        .mockReturnValueOnce('true')  // nv_analytics_consent
        .mockReturnValueOnce(null);   // nv_visitor_id missing

      window.sessionStorage.getItem.mockReturnValue('s_abc');

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tracked: true })
      });

      await trackPageView('/page');

      // Should generate and persist the new visitor ID
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'nv_visitor_id',
        'v_test-uuid-1234'
      );

      const bodyParsed = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(bodyParsed.visitor_id).toBe('v_test-uuid-1234');
    });

    it('generates and stores a new session_id when none exists', async () => {
      window.localStorage.getItem
        .mockReturnValueOnce('true')        // nv_analytics_consent
        .mockReturnValueOnce('v_existing'); // nv_visitor_id exists

      window.sessionStorage.getItem.mockReturnValue(null); // nv_session_id missing

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tracked: true })
      });

      await trackPageView('/page');

      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'nv_session_id',
        's_test-uuid-1234'
      );

      const bodyParsed = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(bodyParsed.session_id).toBe('s_test-uuid-1234');
    });

    it('returns the parsed JSON response on success', async () => {
      window.localStorage.getItem
        .mockReturnValueOnce('true')
        .mockReturnValueOnce('v_abc');

      window.sessionStorage.getItem.mockReturnValue('s_abc');

      const mockResponseData = { id: 'pv-1', page_path: '/home' };
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponseData
      });

      const result = await trackPageView('/home');

      expect(result).toEqual(mockResponseData);
    });

    it('returns null when response.ok is false', async () => {
      window.localStorage.getItem
        .mockReturnValueOnce('true')
        .mockReturnValueOnce('v_abc');

      window.sessionStorage.getItem.mockReturnValue('s_abc');

      global.fetch.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error'
      });

      const result = await trackPageView('/page');

      expect(result).toBeNull();
    });

    it('returns null and does not throw when fetch rejects', async () => {
      window.localStorage.getItem
        .mockReturnValueOnce('true')
        .mockReturnValueOnce('v_abc');

      window.sessionStorage.getItem.mockReturnValue('s_abc');

      global.fetch.mockRejectedValue(new Error('Network failure'));

      const result = await trackPageView('/page');

      expect(result).toBeNull();
    });
  });

  // ==========================================
  // getPageViewStats
  // ==========================================

  describe('getPageViewStats()', () => {
    it('calls api.get with the correct endpoint', async () => {
      const mockData = { totalViews: 1200 };
      api.get.mockResolvedValue({ data: mockData });

      await getPageViewStats();

      expect(api.get).toHaveBeenCalledWith('/page-views/stats', { params: {} });
    });

    it('forwards params to api.get', async () => {
      api.get.mockResolvedValue({ data: {} });

      await getPageViewStats({ startDate: '2026-01-01', endDate: '2026-01-31' });

      expect(api.get).toHaveBeenCalledWith('/page-views/stats', {
        params: { startDate: '2026-01-01', endDate: '2026-01-31' }
      });
    });

    it('returns response.data', async () => {
      const mockData = { totalViews: 42 };
      api.get.mockResolvedValue({ data: mockData });

      const result = await getPageViewStats();

      expect(result).toEqual(mockData);
    });
  });

  // ==========================================
  // getRecentPageViews
  // ==========================================

  describe('getRecentPageViews()', () => {
    it('calls api.get with the correct endpoint', async () => {
      api.get.mockResolvedValue({ data: [] });

      await getRecentPageViews();

      expect(api.get).toHaveBeenCalledWith('/page-views/recent', { params: {} });
    });

    it('forwards params to api.get', async () => {
      api.get.mockResolvedValue({ data: [] });

      await getRecentPageViews({ limit: 10 });

      expect(api.get).toHaveBeenCalledWith('/page-views/recent', { params: { limit: 10 } });
    });

    it('returns response.data', async () => {
      const mockData = [{ id: 'pv-1', page_path: '/dashboard' }];
      api.get.mockResolvedValue({ data: mockData });

      const result = await getRecentPageViews();

      expect(result).toEqual(mockData);
    });
  });

  // ==========================================
  // getHealthTrends
  // ==========================================

  describe('getHealthTrends()', () => {
    it('calls api.get with the correct endpoint', async () => {
      api.get.mockResolvedValue({ data: {} });

      await getHealthTrends();

      expect(api.get).toHaveBeenCalledWith('/analytics/health-trends', { params: {} });
    });

    it('forwards params (startDate, endDate) to api.get', async () => {
      api.get.mockResolvedValue({ data: {} });

      await getHealthTrends({ startDate: '2026-01-01', endDate: '2026-01-31' });

      expect(api.get).toHaveBeenCalledWith('/analytics/health-trends', {
        params: { startDate: '2026-01-01', endDate: '2026-01-31' }
      });
    });

    it('returns response.data', async () => {
      const mockData = { averageBmi: 22.5, trends: [] };
      api.get.mockResolvedValue({ data: mockData });

      const result = await getHealthTrends();

      expect(result).toEqual(mockData);
    });

    it('uses an empty params object when none are supplied', async () => {
      api.get.mockResolvedValue({ data: {} });

      await getHealthTrends();

      const [, options] = api.get.mock.calls[0];
      expect(options.params).toEqual({});
    });
  });

  // ==========================================
  // getFinancialMetrics
  // ==========================================

  describe('getFinancialMetrics()', () => {
    it('calls api.get with the correct endpoint', async () => {
      api.get.mockResolvedValue({ data: {} });

      await getFinancialMetrics();

      expect(api.get).toHaveBeenCalledWith('/analytics/financial-metrics', { params: {} });
    });

    it('forwards params to api.get', async () => {
      api.get.mockResolvedValue({ data: {} });

      await getFinancialMetrics({ startDate: '2026-01-01' });

      expect(api.get).toHaveBeenCalledWith('/analytics/financial-metrics', {
        params: { startDate: '2026-01-01' }
      });
    });

    it('returns response.data', async () => {
      const mockData = { totalRevenue: 5000, invoiceCount: 12 };
      api.get.mockResolvedValue({ data: mockData });

      const result = await getFinancialMetrics();

      expect(result).toEqual(mockData);
    });
  });

  // ==========================================
  // getCommunicationEffectiveness
  // ==========================================

  describe('getCommunicationEffectiveness()', () => {
    it('calls api.get with the correct endpoint', async () => {
      api.get.mockResolvedValue({ data: {} });

      await getCommunicationEffectiveness();

      expect(api.get).toHaveBeenCalledWith('/analytics/communication-effectiveness', { params: {} });
    });

    it('forwards params to api.get', async () => {
      api.get.mockResolvedValue({ data: {} });

      await getCommunicationEffectiveness({ startDate: '2026-02-01', endDate: '2026-02-28' });

      expect(api.get).toHaveBeenCalledWith('/analytics/communication-effectiveness', {
        params: { startDate: '2026-02-01', endDate: '2026-02-28' }
      });
    });

    it('returns response.data', async () => {
      const mockData = { emailOpenRate: 0.45, clickRate: 0.12 };
      api.get.mockResolvedValue({ data: mockData });

      const result = await getCommunicationEffectiveness();

      expect(result).toEqual(mockData);
    });
  });

  // ==========================================
  // getPatientHealthScore
  // ==========================================

  describe('getPatientHealthScore()', () => {
    const PATIENT_ID = 'patient-uuid-abc';

    it('calls api.get with the correct patient-scoped endpoint', async () => {
      api.get.mockResolvedValue({ data: {} });

      await getPatientHealthScore(PATIENT_ID);

      expect(api.get).toHaveBeenCalledWith(`/analytics/patient-health-score/${PATIENT_ID}`);
    });

    it('interpolates the patient ID into the URL correctly', async () => {
      api.get.mockResolvedValue({ data: {} });

      await getPatientHealthScore('other-id-999');

      expect(api.get).toHaveBeenCalledWith('/analytics/patient-health-score/other-id-999');
    });

    it('returns response.data', async () => {
      const mockData = { score: 87, grade: 'B+', details: [] };
      api.get.mockResolvedValue({ data: mockData });

      const result = await getPatientHealthScore(PATIENT_ID);

      expect(result).toEqual(mockData);
    });

    it('does not pass any additional params object', async () => {
      api.get.mockResolvedValue({ data: {} });

      await getPatientHealthScore(PATIENT_ID);

      // The call should only have 1 argument (no params object)
      expect(api.get.mock.calls[0].length).toBe(1);
    });
  });

  // ==========================================
  // getQuoteMetrics
  // ==========================================

  describe('getQuoteMetrics()', () => {
    it('calls api.get with the correct endpoint', async () => {
      api.get.mockResolvedValue({ data: {} });

      await getQuoteMetrics();

      expect(api.get).toHaveBeenCalledWith('/analytics/quote-metrics', { params: {} });
    });

    it('forwards params to api.get', async () => {
      api.get.mockResolvedValue({ data: {} });

      await getQuoteMetrics({ startDate: '2026-01-01', status: 'ACCEPTED' });

      expect(api.get).toHaveBeenCalledWith('/analytics/quote-metrics', {
        params: { startDate: '2026-01-01', status: 'ACCEPTED' }
      });
    });

    it('returns response.data', async () => {
      const mockData = { totalQuotes: 30, acceptedRate: 0.7 };
      api.get.mockResolvedValue({ data: mockData });

      const result = await getQuoteMetrics();

      expect(result).toEqual(mockData);
    });

    it('uses an empty params object when none are supplied', async () => {
      api.get.mockResolvedValue({ data: {} });

      await getQuoteMetrics();

      const [, options] = api.get.mock.calls[0];
      expect(options.params).toEqual({});
    });
  });
});
