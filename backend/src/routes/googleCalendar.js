/**
 * Google Calendar Routes
 *
 * Defines API endpoints for Google Calendar integration.
 */

const express = require('express');
const router = express.Router();
const googleCalendarController = require('../controllers/googleCalendarController');
const authenticate = require('../middleware/authenticate');
const { requireAnyRole } = require('../middleware/rbac');

// Handle OAuth callback (public route for Google redirect - BEFORE authentication middleware)
router.get('/callback', googleCalendarController.handleCallback);

// All other routes require authentication
router.use(authenticate);

// Get Google OAuth authorization URL
router.get('/auth-url', authenticate, googleCalendarController.getAuthUrl);

// Get user's calendar list
router.get('/calendars', authenticate, googleCalendarController.getCalendars);

// Sync visits to Google Calendar
router.post('/sync-to-calendar', authenticate, googleCalendarController.syncToCalendar);

// Sync Google Calendar events to visits
router.post('/sync-from-calendar', authenticate, googleCalendarController.syncFromCalendar);

// Get sync status
router.get('/sync-status', authenticate, googleCalendarController.getSyncStatus);

// Update calendar settings
router.put('/settings', authenticate, googleCalendarController.updateSettings);

// Disconnect Google Calendar
router.delete('/disconnect', authenticate, googleCalendarController.disconnect);

module.exports = router;