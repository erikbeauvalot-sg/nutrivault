/**
 * Server Configuration Service
 * Manages a list of servers on native apps with one active at a time.
 * Uses @capacitor/preferences for persistence across app restarts.
 * On web, always uses VITE_API_URL (no user-configurable URL).
 *
 * IMPORTANT: All mutations use an in-memory cache and persist to Preferences
 * fire-and-forget. This avoids the iOS Capacitor bridge hang where
 * Preferences.set() never resolves ("TO JS undefined" in logs).
 */

import { isNative } from '../utils/platform';

const SERVERS_KEY = 'nv_servers';
const OLD_PREF_KEY = 'nv_server_url';
const DEFAULT_URL = 'https://nutrivault.beauvalot.com/api';
const READ_TIMEOUT = 3000;

let Preferences = null;
let migrationDone = false;

/** In-memory cache — source of truth after initial load */
let cachedServers = null; // null = not loaded yet, [] = loaded empty

async function getPreferences() {
  if (!Preferences) {
    const mod = await import('@capacitor/preferences');
    Preferences = mod.Preferences;
  }
  return Preferences;
}

/** Wrap a promise with a timeout that resolves to fallback on expiry */
function readWithTimeout(promise, fallback = null, ms = READ_TIMEOUT) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/**
 * Fire-and-forget persist to Preferences.
 * Never awaited — prevents the iOS bridge hang from blocking the UI.
 */
function persistToPrefs(servers) {
  if (!isNative) return;
  (async () => {
    try {
      const prefs = await getPreferences();
      prefs.set({ key: SERVERS_KEY, value: JSON.stringify(servers) });
    } catch {
      // Persistence failed silently — in-memory cache is still correct
    }
  })();
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
    const existing = await readWithTimeout(prefs.get({ key: SERVERS_KEY }));
    if (existing && existing.value) return;

    // Check for old single-URL key
    const old = await readWithTimeout(prefs.get({ key: OLD_PREF_KEY }));
    if (old && old.value) {
      const servers = [{
        id: generateId(),
        name: 'Server',
        url: old.value,
        isActive: true,
      }];
      cachedServers = servers;
      // Fire-and-forget: write new key and remove old key
      persistToPrefs(servers);
      (async () => {
        try {
          const p = await getPreferences();
          p.remove({ key: OLD_PREF_KEY });
        } catch { /* ignore */ }
      })();
    }
  } catch {
    // Migration failed silently — will use defaults
  }
}

/**
 * Load servers from Preferences into memory cache (once).
 */
async function ensureLoaded() {
  if (cachedServers !== null) return;

  if (!isNative) {
    cachedServers = [];
    return;
  }

  await migrateIfNeeded();

  // If migration already set the cache, we're done
  if (cachedServers !== null) return;

  try {
    const prefs = await getPreferences();
    const result = await readWithTimeout(prefs.get({ key: SERVERS_KEY }));
    if (result && result.value) {
      const parsed = JSON.parse(result.value);
      if (Array.isArray(parsed)) {
        cachedServers = parsed;
        return;
      }
    }
  } catch {
    // Fall through
  }
  cachedServers = [];
}

/**
 * Read the server list.
 * @returns {Promise<Array>}
 */
export async function getServers() {
  await ensureLoaded();
  return [...cachedServers];
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

  await ensureLoaded();

  const trimmedUrl = url.trim().replace(/\/+$/, '');
  const server = {
    id: generateId(),
    name: name.trim() || 'Server',
    url: trimmedUrl,
    isActive: cachedServers.length === 0,
  };

  cachedServers.push(server);
  persistToPrefs(cachedServers);
  return server;
}

/**
 * Update an existing server's name and/or URL.
 * @param {string} id
 * @param {{ name?: string, url?: string }} updates
 * @returns {Promise<object>} The updated server
 */
export async function updateServer(id, updates) {
  await ensureLoaded();

  const server = cachedServers.find((s) => s.id === id);
  if (!server) throw new Error('Server not found');

  if (updates.url) {
    const { valid, reason } = validateUrl(updates.url);
    if (!valid) throw new Error(reason);
    server.url = updates.url.trim().replace(/\/+$/, '');
  }
  if (updates.name !== undefined) {
    server.name = updates.name.trim() || 'Server';
  }

  persistToPrefs(cachedServers);
  return server;
}

/**
 * Delete a server from the list.
 * If the deleted server was active, the first remaining server becomes active.
 * @param {string} id
 */
export async function deleteServer(id) {
  await ensureLoaded();

  const toDelete = cachedServers.find((s) => s.id === id);
  if (!toDelete) return;

  cachedServers = cachedServers.filter((s) => s.id !== id);

  if (toDelete.isActive && cachedServers.length > 0) {
    cachedServers[0].isActive = true;
  }

  persistToPrefs(cachedServers);
}

/**
 * Set a server as the active one (deactivates all others).
 * @param {string} id
 * @returns {Promise<object>} The now-active server
 */
export async function setActiveServer(id) {
  await ensureLoaded();

  let activated = null;
  for (const s of cachedServers) {
    s.isActive = s.id === id;
    if (s.isActive) activated = s;
  }

  if (!activated) throw new Error('Server not found');
  persistToPrefs(cachedServers);
  return activated;
}

/**
 * Get the currently active server object.
 * @returns {Promise<object|null>}
 */
export async function getActiveServer() {
  await ensureLoaded();
  return cachedServers.find((s) => s.isActive) || cachedServers[0] || null;
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

  await ensureLoaded();

  const active = cachedServers.find((s) => s.isActive);
  if (active) {
    active.url = trimmed;
    persistToPrefs(cachedServers);
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
    cachedServers = [];
    persistToPrefs(cachedServers);
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
