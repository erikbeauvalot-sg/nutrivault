/**
 * Google Calendar Controller
 *
 * Handles Google Calendar integration endpoints.
 * Manages OAuth flow and synchronization operations.
 */

const googleCalendarService = require('../services/googleCalendar.service');
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
    const { since, calendarId } = req.body;

    const results = await googleCalendarService.syncVisitsToCalendar(user.id, {
      since: since ? new Date(since) : undefined,
      calendarId
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