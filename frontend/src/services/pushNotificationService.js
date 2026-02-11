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
 * Navigate based on notification type
 */
function handleNotificationTap(data) {
  const type = data?.type;
  switch (type) {
    case 'journal_comment':
      window.location.href = '/portal/journal';
      break;
    case 'new_message':
      window.location.href = '/portal/messages';
      break;
    case 'appointment_reminder':
      window.location.href = '/portal/visits';
      break;
    case 'new_document':
      window.location.href = '/portal/documents';
      break;
    default:
      break;
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

  // Helper to send token to backend
  const sendTokenToBackend = async (tokenValue) => {
    try {
      await api.post('/device-tokens', {
        token: tokenValue,
        platform: 'ios',
      });
    } catch (err) {
      console.error('Failed to register device token with backend:', err);
    }
  };

  // FCM token from native Firebase Messaging (preferred — works with firebase-admin)
  window.addEventListener('fcmToken', async (e) => {
    const fcmToken = e.detail;
    if (fcmToken) {
      await sendTokenToBackend(fcmToken);
      if (onRegistration) onRegistration(fcmToken);
    }
  });

  // Fallback: APNs token from Capacitor plugin (used if Firebase SDK not present)
  push.addListener('registration', async (token) => {
    // Only use this if we haven't received an FCM token
    await sendTokenToBackend(token.value);
    if (onRegistration) onRegistration(token.value);
  });

  // Push received while app is in foreground
  push.addListener('pushNotificationReceived', (notification) => {
    if (onNotification) onNotification(notification);
  });

  // User tapped on a push notification
  push.addListener('pushNotificationActionPerformed', (action) => {
    const data = action?.notification?.data;
    handleNotificationTap(data);
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
