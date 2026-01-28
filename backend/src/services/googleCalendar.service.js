/**
 * Google Calendar Service
 *
 * Handles synchronization between NutriVault visits and Google Calendar.
 * Supports bidirectional sync with conflict resolution.
 */

const { google } = require('googleapis');
const db = require('../../../models');
const User = db.User;
const Visit = db.Visit;
const Patient = db.Patient;
const auditService = require('./audit.service');

/**
 * Google Calendar scopes needed for calendar operations
 */
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

/**
 * Get Google OAuth2 client for a user
 *
 * @param {Object} user - User object with google tokens
 * @returns {OAuth2Client} Configured OAuth2 client
 */
function getOAuth2Client(user) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL}/settings/calendar-sync`
  );

  if (user.google_access_token) {
    oauth2Client.setCredentials({
      access_token: user.google_access_token,
      refresh_token: user.google_refresh_token,
      expiry_date: user.google_token_expiry
    });
  }

  return oauth2Client;
}

/**
 * Generate Google OAuth2 authorization URL
 *
 * @param {string} userId - User ID
 * @returns {string} Authorization URL
 */
function getAuthUrl(userId) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL}/settings/calendar-sync`
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: userId, // Pass user ID in state parameter
    prompt: 'consent' // Force consent screen to get refresh token
  });

  return authUrl;
}

/**
 * Exchange authorization code for tokens
 *
 * @param {string} code - Authorization code from Google
 * @returns {Promise<Object>} Token object
 */
async function getTokensFromCode(code) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL}/settings/calendar-sync`
  );

  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Save Google tokens for a user
 *
 * @param {string} userId - User ID
 * @param {Object} tokens - Google OAuth tokens
 * @returns {Promise<User>} Updated user
 */
async function saveUserTokens(userId, tokens) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }

  await user.update({
    google_access_token: tokens.access_token,
    google_refresh_token: tokens.refresh_token,
    google_token_expiry: tokens.expiry_date,
    google_calendar_sync_enabled: true
  });

  return user;
}

/**
 * Create or update a Google Calendar event for a visit
 *
 * @param {Object} visit - Visit object with patient info
 * @param {Object} user - User object
 * @param {string} calendarId - Google Calendar ID (default: primary)
 * @returns {Promise<Object>} Google Calendar event
 */
async function createOrUpdateCalendarEvent(visit, user, calendarId = 'primary') {
  const oauth2Client = getOAuth2Client(user);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Get patient info for event title
  const patient = await Patient.findByPk(visit.patient_id, {
    attributes: ['first_name', 'last_name']
  });

  if (!patient) {
    throw new Error('Patient not found');
  }

  // Calculate end time (default 60 minutes if not specified)
  const startDateTime = new Date(visit.visit_date);
  const endDateTime = new Date(startDateTime.getTime() + (visit.duration_minutes || 60) * 60000);

  const eventData = {
    summary: `Consultation - ${patient.first_name} ${patient.last_name}`,
    description: `Rendez-vous avec ${patient.first_name} ${patient.last_name}\nType: ${visit.visit_type || 'Consultation'}\nStatut: ${visit.status}`,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'Europe/Paris' // Default timezone, could be configurable
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'Europe/Paris'
    },
    attendees: [], // Could add patient email if available
    reminders: {
      useDefault: true
    },
    // Store NutriVault visit ID in extended properties
    extendedProperties: {
      private: {
        nutrivault_visit_id: visit.id,
        nutrivault_patient_id: visit.patient_id
      }
    }
  };

  let event;
  if (visit.google_event_id) {
    // Update existing event
    event = await calendar.events.update({
      calendarId,
      eventId: visit.google_event_id,
      resource: eventData
    });
  } else {
    // Create new event
    event = await calendar.events.insert({
      calendarId,
      resource: eventData
    });

    // Update visit with Google event ID
    await visit.update({ google_event_id: event.data.id });
  }

  return event.data;
}

/**
 * Delete a Google Calendar event
 *
 * @param {string} eventId - Google Calendar event ID
 * @param {Object} user - User object
 * @param {string} calendarId - Google Calendar ID
 * @returns {Promise<void>}
 */
async function deleteCalendarEvent(eventId, user, calendarId = 'primary') {
  const oauth2Client = getOAuth2Client(user);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  await calendar.events.delete({
    calendarId,
    eventId
  });
}

/**
 * Sync visits to Google Calendar
 *
 * @param {string} userId - User ID
 * @param {Object} options - Sync options
 * @param {Date} options.since - Sync visits since this date
 * @param {string} options.calendarId - Google Calendar ID
 * @returns {Promise<Object>} Sync results
 */
async function syncVisitsToCalendar(userId, options = {}) {
  const user = await User.findByPk(userId);
  if (!user || !user.google_access_token) {
    throw new Error('User not connected to Google Calendar');
  }

  const since = options.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
  const calendarId = options.calendarId || user.google_calendar_id || 'primary';

  // Get visits that need to be synced
  const visits = await Visit.findAll({
    where: {
      dietitian_id: userId,
      visit_date: {
        [db.Sequelize.Op.gte]: since
      },
      status: {
        [db.Sequelize.Op.in]: ['SCHEDULED', 'COMPLETED']
      }
    },
    include: [{
      model: Patient,
      as: 'patient',
      attributes: ['first_name', 'last_name', 'email']
    }]
  });

  const results = {
    synced: 0,
    errors: 0,
    events: []
  };

  for (const visit of visits) {
    try {
      const event = await createOrUpdateCalendarEvent(visit, user, calendarId);
      results.synced++;
      results.events.push({
        visitId: visit.id,
        eventId: event.id,
        status: 'synced'
      });

      // Audit log
      await auditService.log({
        user_id: userId,
        username: user.username,
        action: 'CREATE',
        resource_type: 'GoogleCalendarEvent',
        resource_id: event.id,
        changes: {
          action: 'SYNC_VISIT',
          visit_id: visit.id,
          calendar_id: calendarId
        }
      });
    } catch (error) {
      console.error(`Failed to sync visit ${visit.id}:`, error.message);
      results.errors++;
      results.events.push({
        visitId: visit.id,
        error: error.message,
        status: 'error'
      });
    }
  }

  return results;
}

/**
 * Sync Google Calendar events to visits
 *
 * @param {string} userId - User ID
 * @param {Object} options - Sync options
 * @param {Date} options.since - Sync events since this date
 * @param {string} options.calendarId - Google Calendar ID
 * @returns {Promise<Object>} Sync results
 */
async function syncCalendarToVisits(userId, options = {}) {
  const user = await User.findByPk(userId);
  if (!user || !user.google_access_token) {
    throw new Error('User not connected to Google Calendar');
  }

  const oauth2Client = getOAuth2Client(user);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const since = options.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
  const calendarId = options.calendarId || user.google_calendar_id || 'primary';

  // Get calendar events
  const response = await calendar.events.list({
    calendarId,
    timeMin: since.toISOString(),
    singleEvents: true,
    orderBy: 'startTime'
  });

  const results = {
    synced: 0,
    created: 0,
    updated: 0,
    errors: 0,
    events: []
  };

  for (const event of response.data.items) {
    try {
      // Check if this is a NutriVault event
      const nutrivaultVisitId = event.extendedProperties?.private?.nutrivault_visit_id;

      if (nutrivaultVisitId) {
        // Update existing visit
        const visit = await Visit.findByPk(nutrivaultVisitId);
        if (visit) {
          const startDateTime = new Date(event.start.dateTime || event.start.date);
          const endDateTime = new Date(event.end.dateTime || event.end.date);

          await visit.update({
            visit_date: startDateTime,
            duration_minutes: Math.round((endDateTime - startDateTime) / 60000)
          });

          results.updated++;
          results.events.push({
            eventId: event.id,
            visitId: visit.id,
            status: 'updated'
          });
        }
      } else {
        // This might be a manually created calendar event that should become a visit
        // For now, we'll skip these to avoid creating visits from non-NutriVault events
        continue;
      }

      results.synced++;
    } catch (error) {
      console.error(`Failed to sync calendar event ${event.id}:`, error.message);
      results.errors++;
      results.events.push({
        eventId: event.id,
        error: error.message,
        status: 'error'
      });
    }
  }

  return results;
}

/**
 * Disconnect Google Calendar integration for a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<User>} Updated user
 */
async function disconnectCalendar(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }

  await user.update({
    google_access_token: null,
    google_refresh_token: null,
    google_token_expiry: null,
    google_calendar_sync_enabled: false,
    google_calendar_id: 'primary'
  });

  return user;
}

/**
 * Get user's Google Calendar list
 *
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of calendars
 */
async function getUserCalendars(userId) {
  const user = await User.findByPk(userId);
  if (!user || !user.google_access_token) {
    throw new Error('User not connected to Google Calendar');
  }

  const oauth2Client = getOAuth2Client(user);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendar.calendarList.list();

  // Filter to show only calendars where user can create events
  const accessibleCalendars = response.data.items.filter(cal =>
    cal.accessRole === 'owner' || cal.accessRole === 'writer'
  );

  return accessibleCalendars.map(cal => ({
    id: cal.id,
    summary: cal.summary,
    primary: cal.primary || false,
    accessRole: cal.accessRole,
    backgroundColor: cal.backgroundColor,
    foregroundColor: cal.foregroundColor
  }));
}

module.exports = {
  getAuthUrl,
  getTokensFromCode,
  saveUserTokens,
  createOrUpdateCalendarEvent,
  deleteCalendarEvent,
  syncVisitsToCalendar,
  syncCalendarToVisits,
  disconnectCalendar,
  getUserCalendars,
  getOAuth2Client
};