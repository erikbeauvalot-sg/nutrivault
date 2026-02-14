/**
 * Server Configuration Service
 * Allows users to configure a custom server URL on native apps.
 * Uses @capacitor/preferences for persistence across app restarts.
 * On web, always uses VITE_API_URL (no user-configurable URL).
 */

import { isNative } from '../utils/platform';

const PREF_KEY = 'nv_server_url';
const DEFAULT_URL = 'https://nutrivault.beauvalot.com/api';

let Preferences = null;

async function getPreferences() {
  if (!Preferences) {
    const mod = await import('@capacitor/preferences');
    Preferences = mod.Preferences;
  }
  return Preferences;
}

/**
 * Validate a server URL format
 * @param {string} url
 * @returns {{ valid: boolean, reason?: string }}
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
 * Get the current server URL.
 * On native: reads from Preferences, falls back to VITE_API_URL, then DEFAULT_URL.
 * On web: returns VITE_API_URL or '/api'.
 * @returns {Promise<string>}
 */
export async function getServerUrl() {
  if (!isNative) {
    return import.meta.env.VITE_API_URL || '/api';
  }

  try {
    const prefs = await getPreferences();
    const { value } = await prefs.get({ key: PREF_KEY });
    if (value) return value;
  } catch {
    // Preferences unavailable, fall through
  }

  return import.meta.env.VITE_API_URL || DEFAULT_URL;
}

/**
 * Save a custom server URL (native only).
 * @param {string} url
 * @returns {Promise<void>}
 */
export async function setServerUrl(url) {
  const { valid, reason } = validateUrl(url);
  if (!valid) throw new Error(reason);

  const trimmed = url.trim().replace(/\/+$/, ''); // Remove trailing slashes

  if (isNative) {
    const prefs = await getPreferences();
    await prefs.set({ key: PREF_KEY, value: trimmed });
  }
}

/**
 * Reset to default server URL (removes custom preference).
 * @returns {Promise<string>} The default URL that will now be used
 */
export async function resetServerUrl() {
  if (isNative) {
    try {
      const prefs = await getPreferences();
      await prefs.remove({ key: PREF_KEY });
    } catch {
      // Ignore
    }
  }
  return import.meta.env.VITE_API_URL || DEFAULT_URL;
}

/**
 * Test connection to a server by hitting its /health endpoint.
 * @param {string} baseUrl - The API base URL to test
 * @returns {Promise<{ ok: boolean, message?: string, version?: string }>}
 */
export async function testConnection(baseUrl) {
  const { valid, reason } = validateUrl(baseUrl);
  if (!valid) return { ok: false, message: reason };

  const trimmed = baseUrl.trim().replace(/\/+$/, '');

  // Try /health first (direct backend), then /api/health (behind reverse proxy)
  const endpoints = [
    `${trimmed}/health`,
    trimmed.endsWith('/api') ? null : `${trimmed}/api/health`,
  ].filter(Boolean);

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);

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
