/**
 * Push Notification Service (Frontend)
 * Handles permission requests, token registration, and notification listeners.
 * No-ops on web.
 */

import { isNative } from '../utils/platform';
import api from './api';

let PushNotifications = null;

async function getPush() {
  if (!PushNotifications) {
    const mod = await import('@capacitor/push-notifications');
    PushNotifications = mod.PushNotifications;
  }
  return PushNotifications;
}

/**
 * Request push notification permission and register for remote notifications
 * @returns {Promise<boolean>} true if permission granted
 */
export async function requestPermission() {
  if (!isNative) return false;
  try {
    const push = await getPush();
    const result = await push.requestPermissions();
    return result.receive === 'granted';
  } catch {
    return false;
  }
}

/**
 * Register device for push notifications.
 * Listens for the registration event and sends the token to the backend.
 */
export async function register() {
  if (!isNative) return;
  try {
    const push = await getPush();
    await push.register();
  } catch (err) {
    console.error('Push registration failed:', err);
  }
}

/**
 * Add push notification event listeners
 * @param {object} callbacks - { onRegistration, onNotification, onAction, onError }
 */
export async function addListeners({
  onRegistration,
  onNotification,
  onAction,
  onError,
} = {}) {
  if (!isNative) return;

  const push = await getPush();

  // Token received — send to backend
  push.addListener('registration', async (token) => {
    try {
      await api.post('/device-tokens', {
        token: token.value,
        platform: 'ios',
      });
    } catch (err) {
      console.error('Failed to register device token with backend:', err);
    }
    if (onRegistration) onRegistration(token.value);
  });

  // Push received while app is in foreground
  push.addListener('pushNotificationReceived', (notification) => {
    if (onNotification) onNotification(notification);
  });

  // User tapped on a push notification
  push.addListener('pushNotificationActionPerformed', (action) => {
    if (onAction) onAction(action);
  });

  // Registration error
  push.addListener('registrationError', (error) => {
    console.error('Push registration error:', error);
    if (onError) onError(error);
  });
}

/**
 * Unregister device token from backend (e.g., on logout)
 * @param {string} token - The FCM token to unregister
 */
export async function unregister(token) {
  if (!isNative || !token) return;
  try {
    await api.delete('/device-tokens', { data: { token } });
  } catch {
    // Non-critical
  }
}
