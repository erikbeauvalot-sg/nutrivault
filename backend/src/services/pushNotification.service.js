/**
 * Push Notification Service
 * Sends push notifications via Firebase Cloud Messaging (FCM).
 * Handles token management and notification preferences.
 */

const path = require('path');
const db = require('../../../models');
const { formatDateTimeLong } = require('../utils/timezone');

let admin = null;
let initialized = false;

/**
 * Initialize Firebase Admin SDK
 * Call once at server startup. Silently skips if config is missing.
 */
async function initialize() {
  try {
    const configPath = path.join(__dirname, '../../../config/firebase-service-account.json');
    const fs = require('fs');

    if (!fs.existsSync(configPath)) {
      console.log('[PushNotification] Firebase config not found — push notifications disabled');
      return;
    }

    const firebaseAdmin = require('firebase-admin');
    const serviceAccount = require(configPath);

    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(serviceAccount),
    });

    admin = firebaseAdmin;
    initialized = true;
    console.log('[PushNotification] Firebase Admin SDK initialized');
  } catch (error) {
    console.error('[PushNotification] Failed to initialize:', error.message);
  }
}

/**
 * Send a push notification to a specific user
 * Checks notification preferences and sends to all active device tokens.
 * @param {string} userId - Target user ID
 * @param {object} notification - { title, body, data }
 * @param {string} [preferenceKey] - Optional preference key to check (e.g., 'appointment_reminders')
 */
async function sendToUser(userId, { title, body, data = {} }, preferenceKey = null) {
  try {
    // Check notification preferences if a key is specified
    if (preferenceKey) {
      const prefs = await db.NotificationPreference.findOne({
        where: { user_id: userId },
      });
      if (prefs && prefs[preferenceKey] === false) {
        return; // User disabled this notification type
      }
    }

    // Persist notification in DB (always, even if push is disabled)
    try {
      await db.Notification.create({
        user_id: userId,
        type: data.type || 'general',
        title,
        body,
        data,
      });
    } catch (dbErr) {
      console.error('[PushNotification] Failed to persist notification:', dbErr.message);
    }

    if (!initialized) return;

    // Get all active device tokens for this user
    const tokens = await db.DeviceToken.findAll({
      where: { user_id: userId, is_active: true },
    });

    if (tokens.length === 0) return;

    // Get dynamic unread count for iOS badge
    const unreadCount = await db.Notification.count({
      where: { user_id: userId, is_read: false },
    });

    // Send to each token
    const results = await Promise.allSettled(
      tokens.map(async (deviceToken) => {
        try {
          await admin.messaging().send({
            token: deviceToken.token,
            notification: { title, body },
            data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
            apns: {
              payload: {
                aps: {
                  alert: { title, body },
                  sound: 'default',
                  badge: unreadCount,
                },
              },
            },
          });

          // Update last used timestamp
          await deviceToken.update({ last_used_at: new Date() });
        } catch (sendError) {
          // Deactivate stale/invalid tokens
          if (
            sendError.code === 'messaging/invalid-registration-token' ||
            sendError.code === 'messaging/registration-token-not-registered'
          ) {
            await deviceToken.update({ is_active: false });
            console.log(`[PushNotification] Deactivated stale token for user ${userId}`);
          } else {
            throw sendError;
          }
        }
      })
    );

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      console.error(`[PushNotification] ${failures.length} send failures for user ${userId}`);
    }
  } catch (error) {
    console.error('[PushNotification] sendToUser error:', error.message);
  }
}

/**
 * Send appointment reminder push notification
 */
async function sendAppointmentReminder(visit) {
  if (!visit?.patient?.user_id) return;

  const dateStr = formatDateTimeLong(visit.visit_date, 'fr');

  await sendToUser(
    visit.patient.user_id,
    {
      title: 'Rappel de rendez-vous',
      body: `Vous avez un rendez-vous le ${dateStr}`,
      data: { type: 'appointment_reminder', visit_id: visit.id },
    },
    'appointment_reminders'
  );
}

/**
 * Send new document notification
 */
async function sendNewDocumentNotification(userId, docName) {
  await sendToUser(
    userId,
    {
      title: 'Nouveau document',
      body: `Un nouveau document "${docName}" est disponible`,
      data: { type: 'new_document' },
    },
    'new_documents'
  );
}

/**
 * Send measure alert notification
 */
async function sendMeasureAlert(userId, details) {
  await sendToUser(
    userId,
    {
      title: 'Alerte mesure',
      body: details || 'Une de vos mesures requiert votre attention',
      data: { type: 'measure_alert' },
    },
    'measure_alerts'
  );
}

/**
 * Send journal comment notification
 */
async function sendJournalCommentNotification(userId, authorName, entryTitle) {
  const body = entryTitle
    ? `${authorName} a commenté l'entrée "${entryTitle}"`
    : `${authorName} a commenté votre journal`;

  await sendToUser(
    userId,
    {
      title: 'Nouveau commentaire',
      body,
      data: { type: 'journal_comment' },
    },
    'journal_comments'
  );
}

/**
 * Send journal note notification (dietitian added a note for the patient)
 */
async function sendJournalNoteNotification(patientUserId, authorName, noteTitle) {
  const body = noteTitle
    ? `${authorName} a ajouté une note "${noteTitle}" dans votre journal`
    : `${authorName} a ajouté une note dans votre journal`;

  await sendToUser(
    patientUserId,
    {
      title: 'Nouvelle note',
      body,
      data: { type: 'journal_comment' },
    },
    'journal_comments'
  );
}

/**
 * Send new message notification
 */
async function sendNewMessageNotification(userId, senderName, preview) {
  await sendToUser(
    userId,
    {
      title: `Message de ${senderName}`,
      body: preview || 'Vous avez un nouveau message',
      data: { type: 'new_message' },
    },
    'new_messages'
  );
}

/**
 * Reset iOS badge to 0 via silent push to all user devices
 */
async function resetBadge(userId) {
  if (!initialized) return;

  try {
    const tokens = await db.DeviceToken.findAll({
      where: { user_id: userId, is_active: true },
    });

    if (tokens.length === 0) return;

    await Promise.allSettled(
      tokens.map(async (deviceToken) => {
        try {
          await admin.messaging().send({
            token: deviceToken.token,
            apns: {
              payload: {
                aps: {
                  badge: 0,
                  'content-available': 1,
                },
              },
            },
          });
        } catch (sendError) {
          if (
            sendError.code === 'messaging/invalid-registration-token' ||
            sendError.code === 'messaging/registration-token-not-registered'
          ) {
            await deviceToken.update({ is_active: false });
          }
        }
      })
    );
  } catch (error) {
    console.error('[PushNotification] resetBadge error:', error.message);
  }
}

module.exports = {
  initialize,
  sendToUser,
  sendAppointmentReminder,
  sendNewDocumentNotification,
  sendMeasureAlert,
  sendJournalCommentNotification,
  sendJournalNoteNotification,
  sendNewMessageNotification,
  resetBadge,
};
