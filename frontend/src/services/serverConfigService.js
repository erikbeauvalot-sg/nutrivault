/**
 * Server Configuration Service
 * Manages a list of servers on native apps with one active at a time.
 * Uses @capacitor/preferences for persistence across app restarts.
 * On web, always uses VITE_API_URL (no user-configurable URL).
 */

import { isNative } from '../utils/platform';

const SERVERS_KEY = 'nv_servers';
const OLD_PREF_KEY = 'nv_server_url';
const DEFAULT_URL = 'https://nutrivault.beauvalot.com/api';
const PREF_TIMEOUT = 3000;

let Preferences = null;
let migrationDone = false;

async function getPreferences() {
  if (!Preferences) {
    const mod = await import('@capacitor/preferences');
    Preferences = mod.Preferences;
  }
  return Preferences;
}

/** Wrap a promise with a timeout */
function withTimeout(promise, ms = PREF_TIMEOUT) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Preferences timeout')), ms)),
  ]);
}

/** Generate a simple unique id */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
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
 * Migrate old single-URL preference to the new multi-server list.
 * Runs once per app session.
 */
async function migrateIfNeeded() {
  if (migrationDone || !isNative) return;
  migrationDone = true;

  try {
    const prefs = await getPreferences();

    // Check if new key already exists
    const existing = await withTimeout(prefs.get({ key: SERVERS_KEY }));
    if (existing.value) return; // Already migrated

    // Check for old single-URL key
    const old = await withTimeout(prefs.get({ key: OLD_PREF_KEY }));
    if (old.value) {
      const servers = [{
        id: generateId(),
        name: 'Server',
        url: old.value,
        isActive: true,
      }];
      await withTimeout(prefs.set({ key: SERVERS_KEY, value: JSON.stringify(servers) }));
      await withTimeout(prefs.remove({ key: OLD_PREF_KEY })).catch(() => {});
    }
  } catch {
    // Migration failed silently — will use defaults
  }
}

/**
 * Read the server list from Preferences.
 * @returns {Promise<Array>}
 */
export async function getServers() {
  if (!isNative) return [];

  await migrateIfNeeded();

  try {
    const prefs = await getPreferences();
    const { value } = await withTimeout(prefs.get({ key: SERVERS_KEY }));
    if (value) {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Fall through
  }
  return [];
}

/**
 * Persist the server list to Preferences.
 * @param {Array} servers
 */
async function saveServers(servers) {
  if (!isNative) return;
  const prefs = await getPreferences();
  await withTimeout(prefs.set({ key: SERVERS_KEY, value: JSON.stringify(servers) }));
}

/**
 * Add a new server to the list.
 * If it's the first server, automatically set it as active.
 * @param {string} name
 * @param {string} url
 * @returns {Promise<object>} The created server object
 */
export async function addServer(name, url) {
  const { valid, reason } = validateUrl(url);
  if (!valid) throw new Error(reason);

  const trimmedUrl = url.trim().replace(/\/+$/, '');
  const servers = await getServers();

  const server = {
    id: generateId(),
    name: name.trim() || 'Server',
    url: trimmedUrl,
    isActive: servers.length === 0, // First server is auto-active
  };

  servers.push(server);
  await saveServers(servers);
  return server;
}

/**
 * Update an existing server's name and/or URL.
 * @param {string} id
 * @param {{ name?: string, url?: string }} updates
 * @returns {Promise<object>} The updated server
 */
export async function updateServer(id, updates) {
  const servers = await getServers();
  const idx = servers.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error('Server not found');

  if (updates.url) {
    const { valid, reason } = validateUrl(updates.url);
    if (!valid) throw new Error(reason);
    servers[idx].url = updates.url.trim().replace(/\/+$/, '');
  }
  if (updates.name !== undefined) {
    servers[idx].name = updates.name.trim() || 'Server';
  }

  await saveServers(servers);
  return servers[idx];
}

/**
 * Delete a server from the list.
 * If the deleted server was active, the first remaining server becomes active.
 * @param {string} id
 */
export async function deleteServer(id) {
  let servers = await getServers();
  const toDelete = servers.find((s) => s.id === id);
  if (!toDelete) return;

  servers = servers.filter((s) => s.id !== id);

  // If deleted server was active, activate the first remaining
  if (toDelete.isActive && servers.length > 0) {
    servers[0].isActive = true;
  }

  await saveServers(servers);
}

/**
 * Set a server as the active one (deactivates all others).
 * @param {string} id
 * @returns {Promise<object>} The now-active server
 */
export async function setActiveServer(id) {
  const servers = await getServers();
  let activated = null;

  for (const s of servers) {
    s.isActive = s.id === id;
    if (s.isActive) activated = s;
  }

  if (!activated) throw new Error('Server not found');
  await saveServers(servers);
  return activated;
}

/**
 * Get the currently active server object.
 * @returns {Promise<object|null>}
 */
export async function getActiveServer() {
  const servers = await getServers();
  return servers.find((s) => s.isActive) || servers[0] || null;
}

/**
 * Get the current server URL (backward-compatible with api.js).
 * On native: returns the active server's URL.
 * On web: returns VITE_API_URL or '/api'.
 * @returns {Promise<string>}
 */
export async function getServerUrl() {
  if (!isNative) {
    return import.meta.env.VITE_API_URL || '/api';
  }

  try {
    const active = await getActiveServer();
    if (active) return active.url;
  } catch {
    // Fall through
  }

  return import.meta.env.VITE_API_URL || DEFAULT_URL;
}

/**
 * Save a custom server URL (backward-compatible).
 * Creates or updates the active server entry.
 * @param {string} url
 */
export async function setServerUrl(url) {
  const { valid, reason } = validateUrl(url);
  if (!valid) throw new Error(reason);

  const trimmed = url.trim().replace(/\/+$/, '');

  if (!isNative) return;

  const servers = await getServers();
  const active = servers.find((s) => s.isActive);

  if (active) {
    active.url = trimmed;
    await saveServers(servers);
  } else {
    await addServer('Server', trimmed);
  }
}

/**
 * Reset to default server URL (removes all custom servers).
 * @returns {Promise<string>} The default URL
 */
export async function resetServerUrl() {
  if (isNative) {
    try {
      await saveServers([]);
    } catch {
      // Ignore
    }
  }
  return import.meta.env.VITE_API_URL || DEFAULT_URL;
}

/**
 * Fetch with a hard timeout using Promise.race.
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
 * @param {string} baseUrl
 * @returns {Promise<{ ok: boolean, message?: string, version?: string }>}
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
 * Get the default URL constant (for display/reset purposes)
 */
export function getDefaultUrl() {
  return DEFAULT_URL;
}
