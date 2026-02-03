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

// === Admin calendar management routes ===
router.get('/admin/dietitians', authenticate, requireAnyRole(['ADMIN']), googleCalendarController.getAdminDietitiansList);
router.get('/admin/auth-url/:userId', authenticate, requireAnyRole(['ADMIN']), googleCalendarController.getAdminAuthUrl);
router.get('/admin/sync-status/:userId', authenticate, requireAnyRole(['ADMIN']), googleCalendarController.getAdminSyncStatus);
router.get('/admin/sync-stats/:userId', authenticate, requireAnyRole(['ADMIN']), googleCalendarController.getAdminSyncStats);
router.get('/admin/calendars/:userId', authenticate, requireAnyRole(['ADMIN']), googleCalendarController.adminGetCalendars);
router.put('/admin/settings/:userId', authenticate, requireAnyRole(['ADMIN']), googleCalendarController.adminUpdateSettings);
router.post('/admin/sync/:userId', authenticate, requireAnyRole(['ADMIN']), googleCalendarController.adminSyncForDietitian);
router.post('/admin/sync-all', authenticate, requireAnyRole(['ADMIN']), googleCalendarController.adminSyncAll);
router.delete('/admin/disconnect/:userId', authenticate, requireAnyRole(['ADMIN']), googleCalendarController.adminDisconnect);

// === New endpoints for sync issues and conflict resolution ===

// Get sync issues (conflicts and errors)
router.get('/sync-issues', authenticate, googleCalendarController.getSyncIssues);

// Resolve a sync conflict
router.post('/resolve-conflict/:visitId', authenticate, googleCalendarController.resolveConflict);

// Retry failed syncs
router.post('/retry-failed', authenticate, googleCalendarController.retryFailedSyncs);

// Get sync statistics
router.get('/sync-stats', authenticate, googleCalendarController.getSyncStats);

// Get conflict details for a specific visit
router.get('/conflict/:visitId', authenticate, googleCalendarController.getConflictDetails);

module.exports = router;