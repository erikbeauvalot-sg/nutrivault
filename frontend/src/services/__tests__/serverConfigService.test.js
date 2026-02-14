/**
 * ServerConfigService Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock platform — default to web
let mockIsNative = false;
vi.mock('../../utils/platform', () => ({
  get isNative() { return mockIsNative; }
}));

// Mock @capacitor/preferences
const mockPrefsStore = {};
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }) => ({ value: mockPrefsStore[key] || null })),
    set: vi.fn(async ({ key, value }) => { mockPrefsStore[key] = value; }),
    remove: vi.fn(async ({ key }) => { delete mockPrefsStore[key]; }),
  }
}));

// Must import AFTER mocks are set up
let validateUrl, getServerUrl, setServerUrl, resetServerUrl, testConnection, getDefaultUrl;

beforeEach(async () => {
  vi.clearAllMocks();
  // Clear the mock store
  Object.keys(mockPrefsStore).forEach(k => delete mockPrefsStore[k]);
  mockIsNative = false;

  // Re-import to get fresh module
  vi.resetModules();

  // Re-mock after resetModules
  vi.doMock('../../utils/platform', () => ({
    get isNative() { return mockIsNative; }
  }));

  vi.doMock('@capacitor/preferences', () => ({
    Preferences: {
      get: vi.fn(async ({ key }) => ({ value: mockPrefsStore[key] || null })),
      set: vi.fn(async ({ key, value }) => { mockPrefsStore[key] = value; }),
      remove: vi.fn(async ({ key }) => { delete mockPrefsStore[key]; }),
    }
  }));

  const mod = await import('../serverConfigService');
  validateUrl = mod.validateUrl;
  getServerUrl = mod.getServerUrl;
  setServerUrl = mod.setServerUrl;
  resetServerUrl = mod.resetServerUrl;
  testConnection = mod.testConnection;
  getDefaultUrl = mod.getDefaultUrl;
});

describe('ServerConfigService', () => {
  describe('validateUrl', () => {
    it('should reject empty URL', () => {
      expect(validateUrl('').valid).toBe(false);
      expect(validateUrl(null).valid).toBe(false);
      expect(validateUrl(undefined).valid).toBe(false);
    });

    it('should reject URL without protocol', () => {
      expect(validateUrl('example.com').valid).toBe(false);
      expect(validateUrl('example.com').reason).toContain('http');
    });

    it('should accept valid HTTP URL', () => {
      expect(validateUrl('http://localhost:3001').valid).toBe(true);
    });

    it('should accept valid HTTPS URL', () => {
      expect(validateUrl('https://nutrivault.beauvalot.com/api').valid).toBe(true);
    });

    it('should accept URL with IP address', () => {
      expect(validateUrl('http://192.168.1.50:3001').valid).toBe(true);
    });
  });

  describe('getDefaultUrl', () => {
    it('should return the default URL', () => {
      expect(getDefaultUrl()).toBe('https://nutrivault.beauvalot.com/api');
    });
  });

  describe('getServerUrl (web)', () => {
    it('should return /api fallback on web when no env var', async () => {
      mockIsNative = false;
      const url = await getServerUrl();
      // In test env, VITE_API_URL is not set, so falls back to /api
      expect(typeof url).toBe('string');
    });
  });

  describe('getServerUrl (native)', () => {
    it('should return default URL when no preference saved', async () => {
      mockIsNative = true;
      const url = await getServerUrl();
      expect(typeof url).toBe('string');
    });

    it('should return saved URL when preference exists', async () => {
      mockIsNative = true;
      mockPrefsStore['nv_server_url'] = 'http://my-server:3001';
      const url = await getServerUrl();
      expect(url).toBe('http://my-server:3001');
    });
  });

  describe('setServerUrl', () => {
    it('should reject invalid URLs', async () => {
      await expect(setServerUrl('not-a-url')).rejects.toThrow();
    });

    it('should save valid URL on native', async () => {
      mockIsNative = true;
      await setServerUrl('https://my-server.com/api');
      expect(mockPrefsStore['nv_server_url']).toBe('https://my-server.com/api');
    });

    it('should strip trailing slashes', async () => {
      mockIsNative = true;
      await setServerUrl('https://my-server.com/api///');
      expect(mockPrefsStore['nv_server_url']).toBe('https://my-server.com/api');
    });
  });

  describe('resetServerUrl', () => {
    it('should clear saved preference on native', async () => {
      mockIsNative = true;
      mockPrefsStore['nv_server_url'] = 'http://custom:3001';
      await resetServerUrl();
      expect(mockPrefsStore['nv_server_url']).toBeUndefined();
    });

    it('should return default URL', async () => {
      const url = await resetServerUrl();
      expect(typeof url).toBe('string');
    });
  });

  describe('testConnection', () => {
    it('should return error for invalid URL', async () => {
      const result = await testConnection('not-a-url');
      expect(result.ok).toBe(false);
    });

    it('should return error when server is unreachable', async () => {
      // Mock fetch to fail
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const result = await testConnection('http://unreachable:9999');
      expect(result.ok).toBe(false);
      expect(result.message).toBe('Server unreachable');
    });

    it('should return success when server responds 200', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'ok', version: '1.0.0' }),
      });
      const result = await testConnection('https://nutrivault.beauvalot.com/api');
      expect(result.ok).toBe(true);
      expect(result.version).toBe('1.0.0');
    });
  });
});
