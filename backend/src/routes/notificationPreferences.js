const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const db = require('../../../models');

/**
 * GET /api/notification-preferences — Get current user's notification preferences
 */
router.get('/', authenticate, async (req, res) => {
  try {
    let prefs = await db.NotificationPreference.findOne({
      where: { user_id: req.user.id },
    });

    // Create default preferences if none exist
    if (!prefs) {
      prefs = await db.NotificationPreference.create({
        user_id: req.user.id,
      });
    }

    res.json({
      data: {
        appointment_reminders: prefs.appointment_reminders,
        new_documents: prefs.new_documents,
        measure_alerts: prefs.measure_alerts,
      },
    });
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
    const { appointment_reminders, new_documents, measure_alerts } = req.body;

    const [prefs] = await db.NotificationPreference.findOrCreate({
      where: { user_id: req.user.id },
      defaults: { appointment_reminders, new_documents, measure_alerts },
    });

    const updates = {};
    if (typeof appointment_reminders === 'boolean') updates.appointment_reminders = appointment_reminders;
    if (typeof new_documents === 'boolean') updates.new_documents = new_documents;
    if (typeof measure_alerts === 'boolean') updates.measure_alerts = measure_alerts;

    if (Object.keys(updates).length > 0) {
      await prefs.update(updates);
    }

    res.json({
      data: {
        appointment_reminders: prefs.appointment_reminders,
        new_documents: prefs.new_documents,
        measure_alerts: prefs.measure_alerts,
      },
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

module.exports = router;
