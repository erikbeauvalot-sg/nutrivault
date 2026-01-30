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
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL}/settings/calendar-sync`;

  // Debug logging for OAuth configuration
  console.log('[Google OAuth] Generating auth URL with config:', {
    clientId: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...` : 'NOT SET',
    redirectUri,
    GOOGLE_REDIRECT_URI_ENV: process.env.GOOGLE_REDIRECT_URI || 'NOT SET',
    FRONTEND_URL_ENV: process.env.FRONTEND_URL || 'NOT SET'
  });

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: userId, // Pass user ID in state parameter
    prompt: 'consent' // Force consent screen to get refresh token
  });

  console.log('[Google OAuth] Generated auth URL:', authUrl);
  return authUrl;
}

/**
 * Exchange authorization code for tokens
 *
 * @param {string} code - Authorization code from Google
 * @returns {Promise<Object>} Token object
 */
async function getTokensFromCode(code) {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL}/settings/calendar-sync`;

  // Debug logging for token exchange
  console.log('[Google OAuth] Exchanging code for tokens with config:', {
    redirectUri,
    GOOGLE_REDIRECT_URI_ENV: process.env.GOOGLE_REDIRECT_URI || 'NOT SET',
    codeLength: code ? code.length : 0
  });

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const { tokens } = await oauth2Client.getToken(code);
  console.log('[Google OAuth] Successfully obtained tokens');
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
async function createOrUpdateCalendarEvent(visit, user, calendarId = 'primary', includeDietitianName = false) {
  console.log(`📤 [SOURCE: NutriVault] Syncing visit ${visit.id} to Google Calendar for user ${user.username} (calendar: ${calendarId})`);

  const oauth2Client = getOAuth2Client(user);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Get patient and dietitian info
  const patient = await Patient.findByPk(visit.patient_id, {
    attributes: ['first_name', 'last_name']
  });

  if (!patient) {
    throw new Error('Patient not found');
  }

  // Get dietitian info if needed for title
  let dietitianName = '';
  if (includeDietitianName && visit.dietitian_id !== user.id) {
    const dietitian = await User.findByPk(visit.dietitian_id, {
      attributes: ['first_name', 'last_name', 'username']
    });
    if (dietitian) {
      dietitianName = ` (${dietitian.first_name} ${dietitian.last_name})`;
    }
  }

  // Calculate end time (default 60 minutes if not specified)
  const startDateTime = new Date(visit.visit_date);
  const endDateTime = new Date(startDateTime.getTime() + (visit.duration_minutes || 60) * 60000);

  const eventData = {
    summary: `Consultation - ${patient.first_name} ${patient.last_name}${dietitianName}`,
    description: `Rendez-vous avec ${patient.first_name} ${patient.last_name}\nType: ${visit.visit_type || 'Consultation'}\nStatut: ${visit.status}${dietitianName ? `\nDiététicien: ${dietitianName.trim()}` : ''}`,
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
        nutrivault_patient_id: visit.patient_id,
        nutrivault_dietitian_id: visit.dietitian_id
      }
    }
  };

  let event;
  if (visit.google_event_id) {
    try {
      // Try to update existing event
      console.log(`🔄 [SOURCE: NutriVault] Updating existing Google Calendar event ${visit.google_event_id} for visit ${visit.id}`);
      event = await calendar.events.update({
        calendarId,
        eventId: visit.google_event_id,
        resource: eventData
      });
    } catch (updateError) {
      // If the event doesn't exist anymore (404 Not Found), create a new one
      if (updateError.code === 404 || updateError.message.includes('Not Found')) {
        console.log(`⚠️ [SOURCE: NutriVault] Event ${visit.google_event_id} not found, creating new event for visit ${visit.id}`);
        event = await calendar.events.insert({
          calendarId,
          resource: eventData
        });

        // Update visit with new Google event ID
        await visit.update({ google_event_id: event.data.id });
      } else {
        // Re-throw other errors (permissions, API errors, etc.)
        throw updateError;
      }
    }
  } else {
    // Create new event
    console.log(`➕ [SOURCE: NutriVault] Creating new Google Calendar event for visit ${visit.id} (${patient.first_name} ${patient.last_name})`);
    event = await calendar.events.insert({
      calendarId,
      resource: eventData
    });

    // Update visit with Google event ID
    await visit.update({ google_event_id: event.data.id });
  }

  console.log(`✅ [SOURCE: NutriVault] Successfully synced visit ${visit.id} to Google Calendar event ${event.data.id}`);
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
 * Validate that user has access to the specified calendar
 *
 * @param {Object} user - User object
 * @param {string} calendarId - Google Calendar ID to validate
 * @returns {Promise<boolean>} True if calendar is accessible
 */
async function validateCalendarAccess(user, calendarId) {
  try {
    const oauth2Client = getOAuth2Client(user);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Try to get calendar info - this will fail if calendar doesn't exist or user doesn't have access
    await calendar.calendars.get({
      calendarId
    });

    return true;
  } catch (error) {
    console.error(`❌ [VALIDATION] Calendar ${calendarId} not accessible for user ${user.username}:`, error.message);
    return false;
  }
}

/**
 * Sync visits to Google Calendar
 *
 * @param {string} userId - User ID
 * @param {Object} options - Sync options
 * @param {Date} options.since - Sync visits since this date
 * @param {string} options.calendarId - Google Calendar ID
 * @param {boolean} options.syncAllDietitians - If true and user is admin, sync all dietitians' visits
 * @returns {Promise<Object>} Sync results
 */
async function syncVisitsToCalendar(userId, options = {}) {
  const user = await User.findByPk(userId, {
    include: [{
      model: db.Role,
      as: 'role'
    }]
  });
  if (!user || !user.google_access_token) {
    throw new Error('User not connected to Google Calendar');
  }

  const since = options.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
  const calendarId = options.calendarId || user.google_calendar_id || 'primary';
  const isAdmin = user.role && user.role.name === 'ADMIN';
  const syncAllDietitians = options.syncAllDietitians && isAdmin;

  // Validate calendar access before proceeding
  const calendarAccessible = await validateCalendarAccess(user, calendarId);
  if (!calendarAccessible) {
    throw new Error(`Calendar ${calendarId} is not accessible. Please check that the calendar exists and you have write access to it.`);
  }

  // Build where clause for visits
  const whereClause = {
    visit_date: {
      [db.Sequelize.Op.gte]: since
    },
    status: {
      [db.Sequelize.Op.in]: ['SCHEDULED', 'COMPLETED']
    }
  };

  // If not syncing all dietitians, filter by current user
  if (!syncAllDietitians) {
    whereClause.dietitian_id = userId;
  }

  // Get visits that need to be synced
  const visits = await Visit.findAll({
    where: whereClause,
    include: [{
      model: Patient,
      as: 'patient',
      attributes: ['first_name', 'last_name', 'email']
    }, {
      model: User,
      as: 'dietitian',
      attributes: ['username', 'first_name', 'last_name']
    }]
  });

  const results = {
    synced: 0,
    skipped: 0,
    errors: 0,
    events: []
  };

  for (const visit of visits) {
    try {
      console.log(`🔄 [SOURCE: NutriVault] Processing visit ${visit.id} (${visit.patient?.first_name} ${visit.patient?.last_name}) for sync to Google Calendar`);

      // For admin syncing all dietitians, use the admin's Google Calendar
      // For regular sync, use the current user's calendar
      const calendarUser = syncAllDietitians ? user : user;
      const eventCalendarId = syncAllDietitians ? (user.google_calendar_id || 'primary') : calendarId;

      // Skip if the calendar user (admin for global sync) doesn't have Google Calendar enabled
      if (!calendarUser.google_access_token) {
        results.events.push({
          visitId: visit.id,
          error: `Calendar user ${calendarUser.username} not connected to Google Calendar`,
          status: 'skipped'
        });
        continue;
      }

      // Check for conflicts: if Google Calendar event exists and was modified more recently than the visit, skip sync
      if (visit.google_event_id) {
        try {
          const oauth2Client = getOAuth2Client(calendarUser);
          const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

          const existingEvent = await calendar.events.get({
            calendarId: eventCalendarId,
            eventId: visit.google_event_id
          });

          const eventLastModified = new Date(existingEvent.data.updated);
          const visitLastModified = visit.updatedAt;

          // If the calendar event was modified more recently than the visit, don't overwrite it
          if (eventLastModified > visitLastModified) {
            console.log(`⏭️ [CONFLICT DETECTED] Skipping sync of visit ${visit.id} to Google Calendar - calendar event "${existingEvent.data.summary}" was modified more recently (${eventLastModified.toISOString()} > ${visitLastModified.toISOString()})`);
            results.events.push({
              visitId: visit.id,
              eventId: visit.google_event_id,
              status: 'skipped_calendar_newer',
              conflictResolved: true,
              source: 'google_calendar'
            });
            results.skipped++;
            continue; // Skip this visit
          }
        } catch (error) {
          // If we can't fetch the event, it might have been deleted, so we'll recreate it
          console.log(`⚠️ Could not fetch existing Google Calendar event ${visit.google_event_id} for visit ${visit.id}, will recreate: ${error.message}`);
        }
      }

      const event = await createOrUpdateCalendarEvent(visit, calendarUser, eventCalendarId, syncAllDietitians);
      results.synced++;
      results.events.push({
        visitId: visit.id,
        eventId: event.id,
        dietitian: calendarUser.username,
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
          calendar_id: eventCalendarId,
          dietitian_id: calendarUser.id
        }
      });
    } catch (error) {
      console.error(`❌ [ERROR] Failed to sync visit ${visit.id} (${visit.patient?.first_name} ${visit.patient?.last_name}) to Google Calendar for user ${user.username}:`, error.message);
      console.error(`   Stack:`, error.stack);
      results.errors++;
      results.events.push({
        visitId: visit.id,
        error: error.message,
        status: 'error',
        patientName: `${visit.patient?.first_name} ${visit.patient?.last_name}`,
        userId: user.id
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
    skipped: 0,
    errors: 0,
    events: []
  };

  for (const event of response.data.items) {
    try {
      console.log(`📥 [SOURCE: Google Calendar] Processing calendar event "${event.summary}" (${event.id}) for sync to NutriVault`);

      // Check if this is a NutriVault event
      const nutrivaultVisitId = event.extendedProperties?.private?.nutrivault_visit_id;

      if (nutrivaultVisitId) {
        // Update existing visit with conflict resolution
        const visit = await Visit.findByPk(nutrivaultVisitId);
        if (visit) {
          const startDateTime = new Date(event.start.dateTime || event.start.date);
          const endDateTime = new Date(event.end.dateTime || event.end.date);

          // Check for conflicts using timestamps
          const eventLastModified = new Date(event.updated);
          const visitLastModified = visit.updatedAt;

          // If the calendar event was modified more recently than the visit, update the visit
          if (eventLastModified > visitLastModified) {
            console.log(`🔄 [SOURCE: Google Calendar] Updating visit ${visit.id} from Google Calendar event "${event.summary}" (calendar modified: ${eventLastModified.toISOString()}, visit modified: ${visitLastModified.toISOString()})`);

            await visit.update({
              visit_date: startDateTime,
              duration_minutes: Math.round((endDateTime - startDateTime) / 60000)
            });

            results.updated++;
            results.events.push({
              eventId: event.id,
              visitId: visit.id,
              status: 'updated_from_calendar',
              conflictResolved: true,
              source: 'google_calendar'
            });
          } else {
            // Visit is more recent, keep NutriVault data
            console.log(`⏭️ [SOURCE: NutriVault] Skipping update of visit ${visit.id} from Google Calendar event "${event.summary}" (visit is more recent: ${visitLastModified.toISOString()} > ${eventLastModified.toISOString()})`);
            results.events.push({
              eventId: event.id,
              visitId: visit.id,
              status: 'skipped_visit_newer',
              conflictResolved: true,
              source: 'nutrivault'
            });
            results.skipped++;
          }
        } else {
          console.warn(`⚠️ [WARNING] Visit ${nutrivaultVisitId} not found for calendar event ${event.id} (${event.summary || 'Unknown title'}) - event may have been deleted from NutriVault`);
          results.events.push({
            eventId: event.id,
            visitId: nutrivaultVisitId,
            status: 'visit_not_found',
            error: 'Visit not found in database',
            eventTitle: event.summary,
            userId: user.id
          });
        }
      } else {
        // This might be a manually created calendar event that should become a visit
        // For now, we'll skip these to avoid creating visits from non-NutriVault events
        continue;
      }

      results.synced++;
    } catch (error) {
      console.error(`❌ [ERROR] Failed to sync calendar event ${event.id} (${event.summary || 'Unknown title'}) for user ${user.username}:`, error.message);
      console.error(`   Stack:`, error.stack);
      results.errors++;
      results.events.push({
        eventId: event.id,
        error: error.message,
        status: 'error',
        eventTitle: event.summary,
        userId: user.id
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

  // Filter to show calendars the user can access (not just write to)
  // Include calendars with reader, writer, or owner access
  const accessibleCalendars = response.data.items.filter(cal =>
    cal.accessRole === 'owner' || cal.accessRole === 'writer' || cal.accessRole === 'reader'
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
  validateCalendarAccess,
  syncVisitsToCalendar,
  syncCalendarToVisits,
  disconnectCalendar,
  getUserCalendars,
  getOAuth2Client
};