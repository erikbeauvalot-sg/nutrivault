const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const db = require('../../../models');

const PREF_FIELDS = [
  'appointment_reminders',
  'new_documents',
  'measure_alerts',
  'journal_comments',
  'new_messages',
  'reminder_times_hours',
];

/**
 * GET /api/notification-preferences — Get current user's notification preferences
 */
router.get('/', authenticate, async (req, res) => {
  try {
    let prefs = await db.NotificationPreference.findOne({
      where: { user_id: req.user.id },
    });

    if (!prefs) {
      prefs = await db.NotificationPreference.create({
        user_id: req.user.id,
      });
    }

    const data = {};
    for (const key of PREF_FIELDS) {
      data[key] = prefs[key];
    }

    res.json({ data });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

/**
 * PUT /api/notification-preferences — Update notification preferences
 */
router.put('/', authenticate, async (req, res) => {
  try {
    const [prefs] = await db.NotificationPreference.findOrCreate({
      where: { user_id: req.user.id },
    });

    const updates = {};
    const booleanKeys = ['appointment_reminders', 'new_documents', 'measure_alerts', 'journal_comments', 'new_messages'];
    for (const key of booleanKeys) {
      if (typeof req.body[key] === 'boolean') {
        updates[key] = req.body[key];
      }
    }

    // Handle reminder_times_hours (array of numbers or null)
    if (req.body.reminder_times_hours !== undefined) {
      const val = req.body.reminder_times_hours;
      if (val === null) {
        updates.reminder_times_hours = null;
      } else if (Array.isArray(val) && val.every(h => typeof h === 'number' && h > 0)) {
        updates.reminder_times_hours = val;
      }
    }

    if (Object.keys(updates).length > 0) {
      await prefs.update(updates);
    }

    const data = {};
    for (const key of PREF_FIELDS) {
      data[key] = prefs[key];
    }

    res.json({ data });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

module.exports = router;
