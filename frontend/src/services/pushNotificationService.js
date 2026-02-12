/**
 * Push Notification Service (Frontend)
 * Handles permission requests, token registration, and notification listeners.
 * No-ops on web.
 */

import { isNative } from '../utils/platform';
import api from './api';

let PushNotifications = null;
let setupDone = false;
let pendingFcmToken = null; // Captured before auth is ready

async function getPush() {
  if (!PushNotifications) {
    const mod = await import('@capacitor/push-notifications');
    PushNotifications = mod.PushNotifications;
  }
  return PushNotifications;
}

/**
 * Send device token to backend
 */
async function sendTokenToBackend(tokenValue) {
  try {
    await api.post('/device-tokens', {
      token: tokenValue,
      platform: 'ios',
    });
    console.log('[Push] Token registered with backend');
  } catch (err) {
    console.error('[Push] Failed to register device token with backend:', err);
  }
}

// Capture FCM token immediately at module load — before auth is ready.
// The native AppDelegate dispatches this event ~2s after launch.
if (isNative) {
  window.addEventListener('fcmToken', (e) => {
    const token = e.detail;
    if (token) {
      console.log('[Push] FCM token captured from native');
      pendingFcmToken = token;
    }
  });
}

/**
 * Navigate based on notification type — detects role for correct prefix
 */
function handleNotificationTap(data) {
  const type = data?.type;
  // Detect role from stored user data
  let storedUser = null;
  try {
    const raw = localStorage.getItem('user');
    if (raw) storedUser = JSON.parse(raw);
  } catch { /* ignore */ }
  const isPatient = storedUser?.role === 'PATIENT';
  const prefix = isPatient ? '/portal' : '';

  switch (type) {
    case 'journal_comment':
      window.location.href = isPatient ? '/portal/journal' : '/dashboard';
      break;
    case 'new_message':
      window.location.href = `${prefix}/messages`;
      break;
    case 'appointment_reminder':
      window.location.href = isPatient ? '/portal/visits' : '/agenda';
      break;
    case 'new_document':
      window.location.href = `${prefix}/documents`;
      break;
    case 'measure_alert':
      window.location.href = isPatient ? '/portal/measures' : '/dashboard';
      break;
    default:
      // Default: go to notification center
      window.location.href = isPatient ? '/portal/notifications' : '/notifications';
      break;
  }
}

/**
 * Full push notification setup: send pending token, add listeners, register.
 * Safe to call multiple times — only runs once per app session.
 * Called after user is authenticated so we can send the token to backend.
 */
export async function setup() {
  if (!isNative || setupDone) return;
  setupDone = true;

  try {
    // If we already captured an FCM token before auth, send it now
    if (pendingFcmToken) {
      console.log('[Push] Sending pending FCM token to backend');
      await sendTokenToBackend(pendingFcmToken);
    }

    // Set up Capacitor push listeners for foreground notifications and taps
    const push = await getPush();

    // Capacitor registration event (fallback if fcmToken event was missed)
    push.addListener('registration', async (token) => {
      console.log('[Push] Capacitor registration token received');
      if (!pendingFcmToken) {
        await sendTokenToBackend(token.value);
      }
    });

    // Push received while app is in foreground — dispatch event for NotificationContext
    push.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Notification received in foreground:', notification.title);
      window.dispatchEvent(new CustomEvent('notificationReceived'));
    });

    // User tapped on a push notification
    push.addListener('pushNotificationActionPerformed', (action) => {
      const data = action?.notification?.data;
      handleNotificationTap(data);
    });

    // Registration error
    push.addListener('registrationError', (error) => {
      console.error('[Push] Registration error:', error);
    });

    // Call register to trigger Capacitor's registration flow
    await push.register();
    console.log('[Push] Setup complete');
  } catch (err) {
    console.error('[Push] Setup failed:', err);
    setupDone = false; // Allow retry
  }
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
