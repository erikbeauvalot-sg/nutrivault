/**
 * Offline Cache Service
 * Uses @capacitor/preferences for structured storage on native.
 * Falls back to localStorage on web.
 */

import { isNative } from '../utils/platform';

const CACHE_PREFIX = 'nv_cache_';

let Preferences = null;

async function getPreferences() {
  if (!Preferences) {
    const mod = await import('@capacitor/preferences');
    Preferences = mod.Preferences;
  }
  return Preferences;
}

/**
 * Store data in cache with a TTL
 * @param {string} key - Cache key
 * @param {*} data - Data to cache (will be JSON-serialized)
 * @param {number} ttlMs - Time-to-live in milliseconds
 */
export async function set(key, data, ttlMs) {
  const entry = {
    data,
    expires: Date.now() + ttlMs,
  };
  const serialized = JSON.stringify(entry);
  const cacheKey = CACHE_PREFIX + key;

  if (isNative) {
    try {
      const prefs = await getPreferences();
      await prefs.set({ key: cacheKey, value: serialized });
    } catch {
      localStorage.setItem(cacheKey, serialized);
    }
  } else {
    localStorage.setItem(cacheKey, serialized);
  }
}

/**
 * Get data from cache
 * @param {string} key - Cache key
 * @returns {Promise<*|null>} Cached data, or null if expired/missing
 */
export async function get(key) {
  const cacheKey = CACHE_PREFIX + key;
  let raw = null;

  if (isNative) {
    try {
      const prefs = await getPreferences();
      const result = await prefs.get({ key: cacheKey });
      raw = result.value;
    } catch {
      raw = localStorage.getItem(cacheKey);
    }
  } else {
    raw = localStorage.getItem(cacheKey);
  }

  if (!raw) return null;

  try {
    const entry = JSON.parse(raw);
    if (entry.expires && Date.now() > entry.expires) {
      // Expired — clean up
      await remove(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Remove a cached entry
 */
export async function remove(key) {
  const cacheKey = CACHE_PREFIX + key;

  if (isNative) {
    try {
      const prefs = await getPreferences();
      await prefs.remove({ key: cacheKey });
    } catch {
      localStorage.removeItem(cacheKey);
    }
  } else {
    localStorage.removeItem(cacheKey);
  }
}

/**
 * Clear all cached entries
 */
export async function clear() {
  if (isNative) {
    try {
      const prefs = await getPreferences();
      // Preferences API doesn't have a prefix-based clear,
      // so clear all preferences (cache only uses prefixed keys)
      const { keys } = await prefs.keys();
      for (const key of keys) {
        if (key.startsWith(CACHE_PREFIX)) {
          await prefs.remove({ key });
        }
      }
    } catch {
      // Fallback: clear localStorage cache entries
      clearLocalStorageCache();
    }
  } else {
    clearLocalStorageCache();
  }
}

function clearLocalStorageCache() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}
