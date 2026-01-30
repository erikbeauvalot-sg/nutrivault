/**
 * Google Calendar Controller
 *
 * Handles Google Calendar integration endpoints.
 * Manages OAuth flow and synchronization operations.
 */

const googleCalendarService = require('../services/googleCalendar.service');
const autoSyncService = require('../services/autoSync.service');
const auditService = require('../services/audit.service');

/**
 * Get Google OAuth authorization URL
 */
exports.getAuthUrl = async (req, res) => {
  try {
    const { user } = req;
    const authUrl = googleCalendarService.getAuthUrl(user.id);

    res.json({
      success: true,
      data: {
        authUrl,
        message: 'Redirect user to this URL to authorize Google Calendar access'
      }
    });
  } catch (error) {
    console.error('Error generating Google auth URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authorization URL'
    });
  }
};

/**
 * Handle Google OAuth callback and save tokens
 */
exports.handleCallback = async (req, res) => {
  try {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code or user ID'
      });
    }

    // Exchange code for tokens
    const tokens = await googleCalendarService.getTokensFromCode(code);

    // Save tokens for user
    const user = await googleCalendarService.saveUserTokens(userId, tokens);

    // Audit log
    await auditService.log({
      user_id: userId,
      username: user.username,
      action: 'UPDATE',
      resource_type: 'User',
      resource_id: userId,
      changes: {
        action: 'CONNECT_GOOGLE_CALENDAR',
        google_calendar_sync_enabled: true
      }
    });

    res.json({
      success: true,
      message: 'Google Calendar connected successfully',
      data: {
        google_calendar_sync_enabled: user.google_calendar_sync_enabled
      }
    });
  } catch (error) {
    console.error('Error handling Google callback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect Google Calendar'
    });
  }
};

/**
 * Get user's calendar list
 */
exports.getCalendars = async (req, res) => {
  try {
    const { user } = req;
    const calendars = await googleCalendarService.getUserCalendars(user.id);

    res.json({
      success: true,
      data: calendars
    });
  } catch (error) {
    console.error('Error getting user calendars:', error);

    let statusCode = 500;
    let errorMessage = 'Failed to get calendars';

    if (error.message === 'User not connected to Google Calendar') {
      statusCode = 400;
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Sync visits to Google Calendar
 */
exports.syncToCalendar = async (req, res) => {
  try {
    const { user } = req;
    const { since, calendarId, syncAllDietitians } = req.body;

    // Check if user is admin when trying to sync all dietitians
    if (syncAllDietitians && user.role.name !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can sync visits from all dietitians'
      });
    }

    const results = await autoSyncService.forceSyncVisitsToCalendar(user, {
      since: since ? new Date(since) : undefined,
      calendarId,
      syncAllDietitians: syncAllDietitians && user.role.name === 'ADMIN'
    });

    res.json({
      success: true,
      message: `Synced ${results.synced} visits to Google Calendar`,
      data: results
    });
  } catch (error) {
    console.error('Error syncing to calendar:', error);

    let statusCode = 500;
    let errorMessage = 'Failed to sync visits to calendar';

    if (error.message === 'User not connected to Google Calendar') {
      statusCode = 400;
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Sync Google Calendar events to visits
 */
exports.syncFromCalendar = async (req, res) => {
  try {
    const { user } = req;
    const { since, calendarId } = req.body;

    const results = await googleCalendarService.syncCalendarToVisits(user.id, {
      since: since ? new Date(since) : undefined,
      calendarId
    });

    res.json({
      success: true,
      message: `Synced ${results.synced} events from Google Calendar`,
      data: results
    });
  } catch (error) {
    console.error('Error syncing from calendar:', error);

    let statusCode = 500;
    let errorMessage = 'Failed to sync events from calendar';

    if (error.message === 'User not connected to Google Calendar') {
      statusCode = 400;
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Get Google Calendar sync status
 */
exports.getSyncStatus = async (req, res) => {
  try {
    const { user } = req;

    res.json({
      success: true,
      data: {
        google_calendar_sync_enabled: user.google_calendar_sync_enabled || false,
        google_calendar_id: user.google_calendar_id || 'primary'
      }
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status'
    });
  }
};

/**
 * Update Google Calendar settings
 */
exports.updateSettings = async (req, res) => {
  try {
    const { user } = req;
    const { calendarId, syncEnabled } = req.body;

    const updateData = {};
    if (calendarId !== undefined) {
      updateData.google_calendar_id = calendarId;
    }
    if (syncEnabled !== undefined) {
      updateData.google_calendar_sync_enabled = syncEnabled;
    }

    await user.update(updateData);

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      resource_type: 'User',
      resource_id: user.id,
      changes: {
        action: 'UPDATE_GOOGLE_CALENDAR_SETTINGS',
        ...updateData
      }
    });

    res.json({
      success: true,
      message: 'Google Calendar settings updated',
      data: {
        google_calendar_sync_enabled: user.google_calendar_sync_enabled,
        google_calendar_id: user.google_calendar_id
      }
    });
  } catch (error) {
    console.error('Error updating calendar settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update calendar settings'
    });
  }
};

/**
 * Disconnect Google Calendar
 */
exports.disconnect = async (req, res) => {
  try {
    const { user } = req;

    await googleCalendarService.disconnectCalendar(user.id);

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      resource_type: 'User',
      resource_id: user.id,
      changes: {
        action: 'DISCONNECT_GOOGLE_CALENDAR',
        google_calendar_sync_enabled: false
      }
    });

    res.json({
      success: true,
      message: 'Google Calendar disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect Google Calendar'
    });
  }
};

/**
 * Get sync issues (conflicts and errors)
 */
exports.getSyncIssues = async (req, res) => {
  try {
    const { user } = req;
    const issues = await googleCalendarService.getSyncIssues(user.id);

    res.json({
      success: true,
      data: issues
    });
  } catch (error) {
    console.error('Error getting sync issues:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync issues'
    });
  }
};

/**
 * Resolve a sync conflict
 */
exports.resolveConflict = async (req, res) => {
  try {
    const { user } = req;
    const { visitId } = req.params;
    const { resolution, mergedData } = req.body;

    if (!resolution || !['keep_local', 'keep_remote', 'merge'].includes(resolution)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid resolution type. Must be: keep_local, keep_remote, or merge'
      });
    }

    if (resolution === 'merge' && !mergedData) {
      return res.status(400).json({
        success: false,
        error: 'Merged data is required for merge resolution'
      });
    }

    const result = await googleCalendarService.resolveConflict(visitId, user.id, resolution, mergedData);

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      resource_type: 'Visit',
      resource_id: visitId,
      changes: {
        action: 'RESOLVE_SYNC_CONFLICT',
        resolution
      }
    });

    res.json({
      success: true,
      message: `Conflict resolved using ${resolution}`,
      data: result
    });
  } catch (error) {
    console.error('Error resolving conflict:', error);

    let statusCode = 500;
    let errorMessage = 'Failed to resolve conflict';

    if (error.message === 'Visit not found or not in conflict state') {
      statusCode = 404;
      errorMessage = error.message;
    } else if (error.message === 'User not connected to Google Calendar') {
      statusCode = 400;
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Retry failed syncs
 */
exports.retryFailedSyncs = async (req, res) => {
  try {
    const { user } = req;
    const results = await googleCalendarService.retryFailedSyncs(user.id);

    res.json({
      success: true,
      message: `Retried ${results.total} failed syncs: ${results.successful} successful, ${results.failed} failed`,
      data: results
    });
  } catch (error) {
    console.error('Error retrying failed syncs:', error);

    let statusCode = 500;
    let errorMessage = 'Failed to retry syncs';

    if (error.message === 'User not connected to Google Calendar') {
      statusCode = 400;
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Get sync statistics
 */
exports.getSyncStats = async (req, res) => {
  try {
    const { user } = req;
    const stats = await googleCalendarService.getSyncStats(user.id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting sync stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync statistics'
    });
  }
};

/**
 * Get conflict details for a specific visit
 */
exports.getConflictDetails = async (req, res) => {
  try {
    const { user } = req;
    const { visitId } = req.params;

    // Get the visit
    const db = require('../../../models');
    const visit = await db.Visit.findOne({
      where: {
        id: visitId,
        dietitian_id: user.id
      },
      include: [{
        model: db.Patient,
        as: 'patient',
        attributes: ['first_name', 'last_name']
      }]
    });

    if (!visit) {
      return res.status(404).json({
        success: false,
        error: 'Visit not found'
      });
    }

    // Get Google Calendar event if exists
    let googleEventData = null;
    if (visit.google_event_id && user.google_access_token) {
      try {
        const oauth2Client = googleCalendarService.getOAuth2Client(user);
        const { google } = require('googleapis');
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const calendarId = user.google_calendar_id || 'primary';

        const response = await calendar.events.get({
          calendarId,
          eventId: visit.google_event_id
        });

        googleEventData = {
          summary: response.data.summary,
          start: response.data.start,
          end: response.data.end,
          description: response.data.description,
          updated: response.data.updated,
          etag: response.data.etag
        };
      } catch (error) {
        console.error('Error fetching Google event:', error.message);
        // Event might have been deleted
        googleEventData = { deleted: true };
      }
    }

    res.json({
      success: true,
      data: {
        local: {
          id: visit.id,
          patient: visit.patient ? `${visit.patient.first_name} ${visit.patient.last_name}` : 'Unknown',
          visit_date: visit.visit_date,
          visit_type: visit.visit_type,
          status: visit.status,
          duration_minutes: visit.duration_minutes,
          local_modified_at: visit.local_modified_at
        },
        remote: googleEventData,
        sync_status: visit.sync_status,
        sync_error_message: visit.sync_error_message,
        last_sync_at: visit.last_sync_at
      }
    });
  } catch (error) {
    console.error('Error getting conflict details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conflict details'
    });
  }
};