/**
 * ServerConfigService Tests
 * Uses localStorage (mocked via jsdom) for persistence.
 *
 * The global test setup replaces localStorage with vi.fn() no-ops.
 * We configure the mocks to use a backing Map for real storage behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mutable mock — shared reference survives across tests
const { mockPlatform } = vi.hoisted(() => ({
  mockPlatform: { isNative: false, isIOS: false, isAndroid: false, isWeb: true },
}));

vi.mock('../../utils/platform', () => mockPlatform);

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async () => ({ value: null })),
    set: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
  }
}));

// Import once — the namespace import reads through mockPlatform
import {
  validateUrl,
  getServerUrl,
  setServerUrl,
  resetServerUrl,
  testConnection,
  getDefaultUrl,
  getServers,
  addServer,
  updateServer,
  deleteServer,
  setActiveServer,
  getActiveServer,
} from '../serverConfigService';

/**
 * Wire up the global localStorage mock (from tests/setup.js) to use
 * a real backing Map so setItem/getItem/removeItem/clear actually work.
 */
let store;

beforeEach(() => {
  vi.clearAllMocks();

  // Default to web mode
  mockPlatform.isNative = false;
  mockPlatform.isWeb = true;

  // Set up functional localStorage backed by a Map
  store = new Map();
  localStorage.getItem.mockImplementation((key) => store.get(key) ?? null);
  localStorage.setItem.mockImplementation((key, value) => store.set(key, String(value)));
  localStorage.removeItem.mockImplementation((key) => store.delete(key));
  localStorage.clear.mockImplementation(() => store.clear());
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
      const url = await getServerUrl();
      expect(typeof url).toBe('string');
    });
  });

  describe('getServerUrl (native)', () => {
    it('should return default URL when no servers saved', async () => {
      mockPlatform.isNative = true;
      const url = await getServerUrl();
      expect(typeof url).toBe('string');
    });

    it('should return active server URL when servers exist', async () => {
      mockPlatform.isNative = true;
      store.set('nv_servers', JSON.stringify([
        { id: 'a', name: 'Test', url: 'http://my-server:3001', isActive: true },
      ]));
      const url = await getServerUrl();
      expect(url).toBe('http://my-server:3001');
    });
  });

  describe('getServers', () => {
    it('should return empty array on web', () => {
      expect(getServers()).toEqual([]);
    });

    it('should return empty array when no servers saved', () => {
      mockPlatform.isNative = true;
      expect(getServers()).toEqual([]);
    });

    it('should return saved servers', () => {
      mockPlatform.isNative = true;
      store.set('nv_servers', JSON.stringify([
        { id: 'a', name: 'Prod', url: 'https://prod.com/api', isActive: true },
        { id: 'b', name: 'Dev', url: 'http://localhost:3001', isActive: false },
      ]));
      const servers = getServers();
      expect(servers).toHaveLength(2);
      expect(servers[0].name).toBe('Prod');
    });
  });

  describe('addServer', () => {
    it('should add a server and auto-activate if first', () => {
      mockPlatform.isNative = true;
      const server = addServer('Production', 'https://prod.com/api');
      expect(server.name).toBe('Production');
      expect(server.url).toBe('https://prod.com/api');
      expect(server.isActive).toBe(true);
      expect(server.id).toBeTruthy();

      // Verify persisted to localStorage
      const stored = JSON.parse(store.get('nv_servers'));
      expect(stored).toHaveLength(1);
    });

    it('should not auto-activate subsequent servers', () => {
      mockPlatform.isNative = true;
      addServer('First', 'https://first.com/api');
      const second = addServer('Second', 'https://second.com/api');
      expect(second.isActive).toBe(false);
    });

    it('should reject invalid URLs', () => {
      mockPlatform.isNative = true;
      expect(() => addServer('Bad', 'not-a-url')).toThrow();
    });

    it('should strip trailing slashes from URL', () => {
      mockPlatform.isNative = true;
      const server = addServer('Test', 'https://test.com/api///');
      expect(server.url).toBe('https://test.com/api');
    });
  });

  describe('updateServer', () => {
    it('should update server name and URL', () => {
      mockPlatform.isNative = true;
      const server = addServer('Old', 'https://old.com/api');
      const updated = updateServer(server.id, { name: 'New', url: 'https://new.com/api' });
      expect(updated.name).toBe('New');
      expect(updated.url).toBe('https://new.com/api');
    });

    it('should throw for non-existent server', () => {
      mockPlatform.isNative = true;
      expect(() => updateServer('fake-id', { name: 'Nope' })).toThrow('Server not found');
    });
  });

  describe('deleteServer', () => {
    it('should remove a server', () => {
      mockPlatform.isNative = true;
      const server = addServer('ToDelete', 'https://delete.com/api');
      deleteServer(server.id);
      expect(getServers()).toHaveLength(0);
    });

    it('should activate first remaining if active server deleted', () => {
      mockPlatform.isNative = true;
      const first = addServer('First', 'https://first.com/api');
      const second = addServer('Second', 'https://second.com/api');
      deleteServer(first.id);
      const servers = getServers();
      expect(servers).toHaveLength(1);
      expect(servers[0].isActive).toBe(true);
      expect(servers[0].id).toBe(second.id);
    });
  });

  describe('setActiveServer', () => {
    it('should set the specified server as active', () => {
      mockPlatform.isNative = true;
      addServer('First', 'https://first.com/api');
      const second = addServer('Second', 'https://second.com/api');
      setActiveServer(second.id);
      const servers = getServers();
      expect(servers.find(s => s.id === second.id).isActive).toBe(true);
      expect(servers.filter(s => s.isActive)).toHaveLength(1);
    });

    it('should throw for non-existent server', () => {
      mockPlatform.isNative = true;
      expect(() => setActiveServer('fake-id')).toThrow('Server not found');
    });
  });

  describe('getActiveServer', () => {
    it('should return null when no servers', () => {
      mockPlatform.isNative = true;
      expect(getActiveServer()).toBeNull();
    });

    it('should return active server', () => {
      mockPlatform.isNative = true;
      addServer('Prod', 'https://prod.com/api');
      const active = getActiveServer();
      expect(active.name).toBe('Prod');
      expect(active.isActive).toBe(true);
    });
  });

  describe('setServerUrl (backward compat)', () => {
    it('should reject invalid URLs', () => {
      expect(() => setServerUrl('not-a-url')).toThrow();
    });

    it('should update active server URL on native', () => {
      mockPlatform.isNative = true;
      addServer('Existing', 'https://old.com/api');
      setServerUrl('https://new.com/api');
      expect(getActiveServer().url).toBe('https://new.com/api');
    });

    it('should create a server if none exist', () => {
      mockPlatform.isNative = true;
      setServerUrl('https://brand-new.com/api');
      expect(getServers()).toHaveLength(1);
      expect(getServers()[0].url).toBe('https://brand-new.com/api');
    });
  });

  describe('resetServerUrl', () => {
    it('should clear all servers on native', () => {
      mockPlatform.isNative = true;
      addServer('Prod', 'https://prod.com/api');
      resetServerUrl();
      expect(getServers()).toHaveLength(0);
    });

    it('should return default URL', () => {
      const url = resetServerUrl();
      expect(typeof url).toBe('string');
    });
  });

  describe('testConnection', () => {
    it('should return error for invalid URL', async () => {
      const result = await testConnection('not-a-url');
      expect(result.ok).toBe(false);
    });

    it('should return error when server is unreachable', async () => {
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
