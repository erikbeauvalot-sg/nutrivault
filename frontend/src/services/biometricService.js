/**
 * Biometric Authentication Service
 * Wraps @capgo/capacitor-native-biometric for Face ID / Touch ID.
 * All methods are no-ops on web.
 */

import { isNative } from '../utils/platform';

const CREDENTIALS_SERVER = 'com.beauvalot.nutrivault';
const BIOMETRIC_ENABLED_KEY = 'nutrivault_biometric_enabled';
const BIOMETRIC_DONT_ASK_KEY = 'nutrivault_biometric_dont_ask';

// Eager import — resolved once, reused everywhere
const biometricReady = isNative
  ? import('@capgo/capacitor-native-biometric').then(mod => mod.NativeBiometric).catch(() => null)
  : Promise.resolve(null);

/**
 * Check if biometric authentication is available on this device
 * @returns {Promise<{ isAvailable: boolean, biometryType: number }>}
 *   biometryType: 1 = Touch ID, 2 = Face ID, 3 = Iris, 0 = none
 */
export async function isAvailable() {
  if (!isNative) return { isAvailable: false, biometryType: 0 };
  try {
    const bio = await biometricReady;
    if (!bio) return { isAvailable: false, biometryType: 0 };
    const result = await bio.isAvailable();
    return result;
  } catch {
    return { isAvailable: false, biometryType: 0 };
  }
}

/**
 * Prompt the user for biometric authentication
 * @param {string} reason - Reason displayed to the user
 * @returns {Promise<boolean>} true if authenticated
 */
export async function authenticate(reason = 'Verify your identity') {
  if (!isNative) return false;
  try {
    const bio = await biometricReady;
    await bio.verifyIdentity({ reason });
    return true;
  } catch {
    return false;
  }
}

/**
 * Save credentials (username + refreshToken) in iOS Keychain
 */
export async function saveCredentials(username, refreshToken) {
  if (!isNative) return;
  try {
    const bio = await biometricReady;
    await bio.setCredentials({
      username,
      password: refreshToken,
      server: CREDENTIALS_SERVER,
    });
  } catch (err) {
    console.error('Failed to save biometric credentials:', err);
  }
}

/**
 * Retrieve credentials from iOS Keychain
 * @returns {Promise<{ username: string, password: string } | null>}
 */
export async function getCredentials() {
  if (!isNative) return null;
  try {
    const bio = await biometricReady;
    const creds = await bio.getCredentials({ server: CREDENTIALS_SERVER });
    return creds;
  } catch {
    return null;
  }
}

/**
 * Delete stored credentials from Keychain
 */
export async function deleteCredentials() {
  if (!isNative) return;
  try {
    const bio = await biometricReady;
    await bio.deleteCredentials({ server: CREDENTIALS_SERVER });
  } catch {
    // Ignore — credentials may not exist
  }
}

/**
 * Check if user has enabled biometric login
 */
export function isBiometricEnabled() {
  return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
}

/**
 * Set biometric enabled state
 */
export function setBiometricEnabled(enabled) {
  localStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
}

/**
 * Check if user chose "Don't ask again"
 */
export function isDontAskAgain() {
  return localStorage.getItem(BIOMETRIC_DONT_ASK_KEY) === 'true';
}

/**
 * Set "Don't ask again" flag
 */
export function setDontAskAgain(value) {
  localStorage.setItem(BIOMETRIC_DONT_ASK_KEY, value ? 'true' : 'false');
}

/**
 * Clear all biometric preferences (on logout)
 */
export function clearBiometricPrefs() {
  localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
  localStorage.removeItem(BIOMETRIC_DONT_ASK_KEY);
}
