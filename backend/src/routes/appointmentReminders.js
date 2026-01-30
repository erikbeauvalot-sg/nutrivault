/**
 * Appointment Reminders Routes
 */

const express = require('express');
const router = express.Router();
const appointmentReminderController = require('../controllers/appointmentReminderController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

/**
 * POST /api/appointment-reminders/send/:visitId
 * Manual send reminder for specific visit (simple email)
 * Requires: authentication + visits.update permission
 */
router.post(
  '/send/:visitId',
  authenticate,
  requirePermission('visits.update'),
  appointmentReminderController.sendReminderManually
);

/**
 * POST /api/appointment-reminders/invite/:visitId
 * Send calendar invitation for specific visit (email with ICS - recognized by Gmail)
 * Requires: authentication + visits.update permission
 */
router.post(
  '/invite/:visitId',
  authenticate,
  requirePermission('visits.update'),
  appointmentReminderController.sendInvitationManually
);

/**
 * POST /api/appointment-reminders/batch/send-now
 * Trigger batch reminder job manually
 * Requires: authentication + admin permission (users.delete)
 */
router.post(
  '/batch/send-now',
  authenticate,
  requirePermission('users.delete'), // ADMIN only
  appointmentReminderController.sendBatchReminders
);

/**
 * GET /api/appointment-reminders/stats
 * Get reminder statistics
 * Requires: authentication
 */
router.get(
  '/stats',
  authenticate,
  appointmentReminderController.getReminderStats
);

/**
 * POST /api/appointment-reminders/unsubscribe/:token
 * Unsubscribe patient from reminders
 * Public endpoint (no authentication required)
 */
router.post(
  '/unsubscribe/:token',
  appointmentReminderController.unsubscribeFromReminders
);

/**
 * POST /api/appointment-reminders/resubscribe
 * Re-enable reminders for patient
 * Requires: authentication
 */
router.post(
  '/resubscribe',
  authenticate,
  appointmentReminderController.resubscribeToReminders
);

module.exports = router;
