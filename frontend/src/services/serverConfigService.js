/**
 * Server Configuration Service
 * Manages a list of servers on native apps with one active at a time.
 *
 * Uses localStorage for persistence — works reliably in Capacitor WKWebView
 * (unlike @capacitor/preferences whose native bridge hangs on iOS).
 * On web, always uses VITE_API_URL (no user-configurable URL).
 */

import * as platform from '../utils/platform';

const STORAGE_KEY = 'nv_servers';
const OLD_PREF_KEY = 'nv_server_url';
const DEFAULT_URL = 'https://nutrivault.beauvalot.com/api';

let migrationDone = false;

/** Generate a simple unique id */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Read servers from localStorage (synchronous).
 */
function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Corrupted data
  }
  return [];
}

/**
 * Write servers to localStorage (synchronous).
 */
function writeStorage(servers) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
  } catch {
    // Storage full or unavailable — data is still in memory
  }
}

/**
 * Migrate old Capacitor Preferences key to localStorage (once per session).
 * Also migrates old localStorage nv_server_url single-value if present.
 */
function migrateIfNeeded() {
  if (migrationDone || !platform.isNative) return;
  migrationDone = true;

  // If we already have servers in new format, skip
  if (readStorage().length > 0) return;

  // Check for old single-URL in localStorage
  try {
    const oldUrl = localStorage.getItem(OLD_PREF_KEY);
    if (oldUrl) {
      const servers = [{
        id: generateId(),
        name: 'Server',
        url: oldUrl,
        isActive: true,
      }];
      writeStorage(servers);
      localStorage.removeItem(OLD_PREF_KEY);
      return;
    }
  } catch {
    // Ignore
  }

  // Try migrating from Capacitor Preferences (fire-and-forget, best-effort)
  (async () => {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const result = await Promise.race([
        Preferences.get({ key: OLD_PREF_KEY }),
        new Promise((resolve) => setTimeout(() => resolve(null), 2000)),
      ]);
      if (result && result.value && readStorage().length === 0) {
        const servers = [{
          id: generateId(),
          name: 'Server',
          url: result.value,
          isActive: true,
        }];
        writeStorage(servers);
        Preferences.remove({ key: OLD_PREF_KEY }).catch(() => {});
      }
    } catch {
      // Migration from Preferences failed — not critical
    }
  })();
}

/**
 * Validate a server URL format
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, reason: 'URL is required' };
  }
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return { valid: false, reason: 'URL must start with http:// or https://' };
  }
  try {
    new URL(trimmed);
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

/**
 * Get all servers. Synchronous read from localStorage.
 */
export function getServers() {
  if (!platform.isNative) return [];
  migrateIfNeeded();
  return readStorage();
}

/**
 * Add a new server. First server is auto-activated.
 */
export function addServer(name, url) {
  const { valid, reason } = validateUrl(url);
  if (!valid) throw new Error(reason);

  const servers = getServers();
  const trimmedUrl = url.trim().replace(/\/+$/, '');
  const server = {
    id: generateId(),
    name: name.trim() || 'Server',
    url: trimmedUrl,
    isActive: servers.length === 0,
  };

  servers.push(server);
  writeStorage(servers);
  return server;
}

/**
 * Update a server's name and/or URL.
 */
export function updateServer(id, updates) {
  const servers = getServers();
  const server = servers.find((s) => s.id === id);
  if (!server) throw new Error('Server not found');

  if (updates.url) {
    const { valid, reason } = validateUrl(updates.url);
    if (!valid) throw new Error(reason);
    server.url = updates.url.trim().replace(/\/+$/, '');
  }
  if (updates.name !== undefined) {
    server.name = updates.name.trim() || 'Server';
  }

  writeStorage(servers);
  return server;
}

/**
 * Delete a server. If it was active, the first remaining becomes active.
 */
export function deleteServer(id) {
  let servers = getServers();
  const toDelete = servers.find((s) => s.id === id);
  if (!toDelete) return;

  servers = servers.filter((s) => s.id !== id);
  if (toDelete.isActive && servers.length > 0) {
    servers[0].isActive = true;
  }

  writeStorage(servers);
}

/**
 * Set a server as active (deactivates all others).
 */
export function setActiveServer(id) {
  const servers = getServers();
  let activated = null;
  for (const s of servers) {
    s.isActive = s.id === id;
    if (s.isActive) activated = s;
  }

  if (!activated) throw new Error('Server not found');
  writeStorage(servers);
  return activated;
}

/**
 * Get the active server object.
 */
export function getActiveServer() {
  const servers = getServers();
  return servers.find((s) => s.isActive) || servers[0] || null;
}

/**
 * Get the current server URL (backward-compatible with api.js).
 * On native: returns active server URL.
 * On web: returns VITE_API_URL or '/api'.
 */
export async function getServerUrl() {
  if (!platform.isNative) {
    return import.meta.env.VITE_API_URL || '/api';
  }

  try {
    const active = getActiveServer();
    if (active) return active.url;
  } catch {
    // Fall through
  }

  return import.meta.env.VITE_API_URL || DEFAULT_URL;
}

/**
 * Save a custom server URL (backward-compatible).
 */
export function setServerUrl(url) {
  const { valid, reason } = validateUrl(url);
  if (!valid) throw new Error(reason);

  const trimmed = url.trim().replace(/\/+$/, '');
  if (!platform.isNative) return;

  const servers = getServers();
  const active = servers.find((s) => s.isActive);
  if (active) {
    active.url = trimmed;
    writeStorage(servers);
  } else {
    addServer('Server', trimmed);
  }
}

/**
 * Reset to default (clears all servers).
 */
export function resetServerUrl() {
  if (platform.isNative) {
    writeStorage([]);
  }
  return import.meta.env.VITE_API_URL || DEFAULT_URL;
}

/**
 * Fetch with a hard timeout.
 */
function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    ),
  ]);
}

/**
 * Test connection to a server by hitting its /health endpoint.
 */
export async function testConnection(baseUrl) {
  const { valid, reason } = validateUrl(baseUrl);
  if (!valid) return { ok: false, message: reason };

  const trimmed = baseUrl.trim().replace(/\/+$/, '');

  const endpoints = [
    `${trimmed}/health`,
    trimmed.endsWith('/api') ? null : `${trimmed}/api/health`,
  ].filter(Boolean);

  for (const endpoint of endpoints) {
    try {
      const response = await fetchWithTimeout(endpoint, { method: 'GET' }, 5000);
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return { ok: true, message: 'Connected', version: data.version };
      }
    } catch {
      // Try next endpoint
    }
  }

  return { ok: false, message: 'Server unreachable' };
}

/**
 * Get the default URL constant.
 */
export function getDefaultUrl() {
  return DEFAULT_URL;
}
