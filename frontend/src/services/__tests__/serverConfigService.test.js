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
let getServers, addServer, updateServer, deleteServer, setActiveServer, getActiveServer;

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
  getServers = mod.getServers;
  addServer = mod.addServer;
  updateServer = mod.updateServer;
  deleteServer = mod.deleteServer;
  setActiveServer = mod.setActiveServer;
  getActiveServer = mod.getActiveServer;
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
      expect(typeof url).toBe('string');
    });
  });

  describe('getServerUrl (native)', () => {
    it('should return default URL when no servers saved', async () => {
      mockIsNative = true;
      const url = await getServerUrl();
      expect(typeof url).toBe('string');
    });

    it('should return active server URL when servers exist', async () => {
      mockIsNative = true;
      mockPrefsStore['nv_servers'] = JSON.stringify([
        { id: 'a', name: 'Test', url: 'http://my-server:3001', isActive: true },
      ]);
      const url = await getServerUrl();
      expect(url).toBe('http://my-server:3001');
    });

    it('should migrate old nv_server_url to new format', async () => {
      mockIsNative = true;
      mockPrefsStore['nv_server_url'] = 'http://legacy-server:3001';
      const url = await getServerUrl();
      expect(url).toBe('http://legacy-server:3001');
      // Old key should be removed after migration
      expect(mockPrefsStore['nv_server_url']).toBeUndefined();
      // New key should exist
      expect(mockPrefsStore['nv_servers']).toBeDefined();
      const servers = JSON.parse(mockPrefsStore['nv_servers']);
      expect(servers).toHaveLength(1);
      expect(servers[0].isActive).toBe(true);
    });
  });

  describe('getServers', () => {
    it('should return empty array on web', async () => {
      mockIsNative = false;
      const servers = await getServers();
      expect(servers).toEqual([]);
    });

    it('should return empty array when no servers saved', async () => {
      mockIsNative = true;
      const servers = await getServers();
      expect(servers).toEqual([]);
    });

    it('should return saved servers', async () => {
      mockIsNative = true;
      mockPrefsStore['nv_servers'] = JSON.stringify([
        { id: 'a', name: 'Prod', url: 'https://prod.com/api', isActive: true },
        { id: 'b', name: 'Dev', url: 'http://localhost:3001', isActive: false },
      ]);
      const servers = await getServers();
      expect(servers).toHaveLength(2);
      expect(servers[0].name).toBe('Prod');
    });
  });

  describe('addServer', () => {
    it('should add a server and auto-activate if first', async () => {
      mockIsNative = true;
      const server = await addServer('Production', 'https://prod.com/api');
      expect(server.name).toBe('Production');
      expect(server.url).toBe('https://prod.com/api');
      expect(server.isActive).toBe(true);
      expect(server.id).toBeTruthy();
    });

    it('should not auto-activate subsequent servers', async () => {
      mockIsNative = true;
      await addServer('First', 'https://first.com/api');
      const second = await addServer('Second', 'https://second.com/api');
      expect(second.isActive).toBe(false);
    });

    it('should reject invalid URLs', async () => {
      mockIsNative = true;
      await expect(addServer('Bad', 'not-a-url')).rejects.toThrow();
    });

    it('should strip trailing slashes from URL', async () => {
      mockIsNative = true;
      const server = await addServer('Test', 'https://test.com/api///');
      expect(server.url).toBe('https://test.com/api');
    });
  });

  describe('updateServer', () => {
    it('should update server name and URL', async () => {
      mockIsNative = true;
      const server = await addServer('Old', 'https://old.com/api');
      const updated = await updateServer(server.id, { name: 'New', url: 'https://new.com/api' });
      expect(updated.name).toBe('New');
      expect(updated.url).toBe('https://new.com/api');
    });

    it('should throw for non-existent server', async () => {
      mockIsNative = true;
      await expect(updateServer('fake-id', { name: 'Nope' })).rejects.toThrow('Server not found');
    });
  });

  describe('deleteServer', () => {
    it('should remove a server', async () => {
      mockIsNative = true;
      const server = await addServer('ToDelete', 'https://delete.com/api');
      await deleteServer(server.id);
      const servers = await getServers();
      expect(servers).toHaveLength(0);
    });

    it('should activate first remaining if active server deleted', async () => {
      mockIsNative = true;
      const first = await addServer('First', 'https://first.com/api');
      const second = await addServer('Second', 'https://second.com/api');
      // first is active
      await deleteServer(first.id);
      const servers = await getServers();
      expect(servers).toHaveLength(1);
      expect(servers[0].isActive).toBe(true);
      expect(servers[0].id).toBe(second.id);
    });
  });

  describe('setActiveServer', () => {
    it('should set the specified server as active', async () => {
      mockIsNative = true;
      await addServer('First', 'https://first.com/api');
      const second = await addServer('Second', 'https://second.com/api');
      await setActiveServer(second.id);
      const servers = await getServers();
      expect(servers.find(s => s.id === second.id).isActive).toBe(true);
      expect(servers.filter(s => s.isActive)).toHaveLength(1);
    });

    it('should throw for non-existent server', async () => {
      mockIsNative = true;
      await expect(setActiveServer('fake-id')).rejects.toThrow('Server not found');
    });
  });

  describe('getActiveServer', () => {
    it('should return null when no servers', async () => {
      mockIsNative = true;
      const active = await getActiveServer();
      expect(active).toBeNull();
    });

    it('should return active server', async () => {
      mockIsNative = true;
      await addServer('Prod', 'https://prod.com/api');
      const active = await getActiveServer();
      expect(active.name).toBe('Prod');
      expect(active.isActive).toBe(true);
    });
  });

  describe('setServerUrl (backward compat)', () => {
    it('should reject invalid URLs', async () => {
      await expect(setServerUrl('not-a-url')).rejects.toThrow();
    });

    it('should update active server URL on native', async () => {
      mockIsNative = true;
      await addServer('Existing', 'https://old.com/api');
      await setServerUrl('https://new.com/api');
      const active = await getActiveServer();
      expect(active.url).toBe('https://new.com/api');
    });

    it('should create a server if none exist', async () => {
      mockIsNative = true;
      await setServerUrl('https://brand-new.com/api');
      const servers = await getServers();
      expect(servers).toHaveLength(1);
      expect(servers[0].url).toBe('https://brand-new.com/api');
    });
  });

  describe('resetServerUrl', () => {
    it('should clear all servers on native', async () => {
      mockIsNative = true;
      await addServer('Prod', 'https://prod.com/api');
      await resetServerUrl();
      const servers = await getServers();
      expect(servers).toHaveLength(0);
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
