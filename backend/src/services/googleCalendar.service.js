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
const { getTimezone } = require('../utils/timezone');

/**
 * Google Calendar scopes needed for calendar operations
 */
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

// Calendar-relevant fields for sync
const CALENDAR_RELEVANT_FIELDS = ['visit_date', 'visit_type', 'status', 'duration_minutes'];

// Max sync error count before giving up
const MAX_SYNC_ERROR_COUNT = 3;

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
    attributes: ['first_name', 'last_name', 'phone', 'email']
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
    description: `Rendez-vous avec ${patient.first_name} ${patient.last_name}${patient.phone ? `\nTéléphone: ${patient.phone}` : ''}${patient.email ? `\nEmail: ${patient.email}` : ''}\nType: ${visit.visit_type || 'Consultation'}\nStatut: ${visit.status}${dietitianName ? `\nDiététicien: ${dietitianName.trim()}` : ''}`,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: getTimezone()
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: getTimezone()
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

  // Update visit with sync tracking info
  await visit.update({
    google_event_etag: event.data.etag,
    sync_status: 'synced',
    last_sync_at: new Date(),
    last_sync_source: 'nutrivault',
    sync_error_count: 0,
    sync_error_message: null
  }, { hooks: false, fromSync: true });

  return event.data;
}

/**
 * Check if a Google Calendar event has changed since last sync
 *
 * @param {Object} visit - Visit object with google_event_id and google_event_etag
 * @param {OAuth2Client} calendar - Google Calendar API client
 * @param {string} calendarId - Google Calendar ID
 * @returns {Promise<Object|null>} Changed event data or null if unchanged/not found
 */
async function checkGoogleEventChanged(visit, calendar, calendarId) {
  if (!visit.google_event_id) {
    return null;
  }

  try {
    const response = await calendar.events.get({
      calendarId,
      eventId: visit.google_event_id
    });

    const event = response.data;

    // If ETag matches, event hasn't changed
    if (visit.google_event_etag && event.etag === visit.google_event_etag) {
      return null;
    }

    // Event has changed or we don't have an ETag to compare
    return event;
  } catch (error) {
    if (error.code === 404) {
      // Event was deleted in Google Calendar
      return { deleted: true, id: visit.google_event_id };
    }
    throw error;
  }
}

/**
 * Detect if there's a conflict between local and remote changes
 *
 * @param {Object} visit - Visit object with sync timestamps
 * @param {Object} googleEvent - Google Calendar event data
 * @returns {boolean} True if there's a conflict
 */
function detectConflict(visit, googleEvent) {
  // No conflict if this is the first sync
  if (!visit.last_sync_at) {
    return false;
  }

  const lastSyncAt = new Date(visit.last_sync_at);
  const googleModified = new Date(googleEvent.updated);
  const localModifiedAt = visit.local_modified_at ? new Date(visit.local_modified_at) : null;

  // Check if both sides modified after last sync
  const localModified = localModifiedAt && localModifiedAt > lastSyncAt;
  const remoteModified = googleModified > lastSyncAt;

  return localModified && remoteModified;
}

/**
 * Parse Google Calendar event to extract NutriVault visit fields
 *
 * @param {Object} event - Google Calendar event
 * @returns {Object} Parsed visit fields
 */
function parseGoogleEvent(event) {
  const result = {
    visit_date: new Date(event.start.dateTime || event.start.date),
    remote_modified_at: new Date(event.updated)
  };

  // Calculate duration from start/end times
  if (event.end && event.end.dateTime) {
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    result.duration_minutes = Math.round((end - start) / 60000);
  }

  // Parse visit_type from title: "Consultation - Patient Name (Type)"
  const typeMatch = event.summary?.match(/\(([^)]+)\)$/);
  if (typeMatch) {
    result.visit_type = typeMatch[1];
  }

  // Parse status from description: "Statut: STATUS" or "Status: STATUS"
  const statusMatch = event.description?.match(/Statut?\s*:\s*(\w+)/i);
  if (statusMatch) {
    result.status = mapGoogleStatusToVisit(statusMatch[1]);
  }

  return result;
}

/**
 * Map Google Calendar status string to Visit status
 *
 * @param {string} googleStatus - Status string from Google Calendar
 * @returns {string} Visit status
 */
function mapGoogleStatusToVisit(googleStatus) {
  const statusMap = {
    'scheduled': 'SCHEDULED',
    'planifie': 'SCHEDULED',
    'planifié': 'SCHEDULED',
    'completed': 'COMPLETED',
    'termine': 'COMPLETED',
    'terminé': 'COMPLETED',
    'cancelled': 'CANCELLED',
    'annule': 'CANCELLED',
    'annulé': 'CANCELLED',
    'noshow': 'NO_SHOW',
    'no_show': 'NO_SHOW',
    'absent': 'NO_SHOW'
  };

  const normalized = googleStatus.toLowerCase().replace(/[éè]/g, 'e');
  return statusMap[normalized] || 'SCHEDULED';
}

/**
 * Handle a Google Calendar event deletion
 *
 * @param {Object} visit - Visit object
 * @returns {Promise<Object>} Updated visit
 */
async function handleGoogleDeletion(visit) {
  console.log(`🗑️ [SOURCE: Google Calendar] Event ${visit.google_event_id} was deleted, cancelling visit ${visit.id}`);

  await visit.update({
    status: 'CANCELLED',
    google_event_deleted: true,
    sync_status: 'synced',
    last_sync_at: new Date(),
    last_sync_source: 'google'
  }, { hooks: false, fromSync: true });

  return visit;
}

/**
 * Mark a visit as having a sync conflict
 *
 * @param {Object} visit - Visit object
 * @param {Object} googleEvent - Google Calendar event data
 * @returns {Promise<Object>} Updated visit
 */
async function markAsConflict(visit, googleEvent) {
  const googleData = parseGoogleEvent(googleEvent);

  console.log(`⚠️ [CONFLICT] Visit ${visit.id} has conflicting changes:`);
  console.log(`   Local: date=${visit.visit_date}, modified=${visit.local_modified_at}`);
  console.log(`   Google: date=${googleData.visit_date}, modified=${googleData.remote_modified_at}`);

  await visit.update({
    sync_status: 'conflict',
    remote_modified_at: googleData.remote_modified_at,
    google_event_etag: googleEvent.etag
  }, { hooks: false, fromSync: true });

  return { conflict: true, visit, googleData, googleEvent };
}

/**
 * Pull changes from Google Calendar to a visit
 *
 * @param {Object} visit - Visit object
 * @param {Object} googleEvent - Google Calendar event data
 * @returns {Promise<Object>} Updated visit
 */
async function pullFromGoogle(visit, googleEvent) {
  const googleData = parseGoogleEvent(googleEvent);

  console.log(`📥 [SOURCE: Google Calendar] Pulling changes for visit ${visit.id}`);

  await visit.update({
    ...googleData,
    google_event_etag: googleEvent.etag,
    sync_status: 'synced',
    last_sync_at: new Date(),
    last_sync_source: 'google',
    sync_error_count: 0,
    sync_error_message: null
  }, { hooks: false, fromSync: true });

  return visit;
}

/**
 * Perform smart bidirectional sync for a visit
 *
 * @param {Object} visit - Visit object
 * @param {Object} user - User object with Google tokens
 * @param {string} calendarId - Google Calendar ID
 * @returns {Promise<Object>} Sync result
 */
async function smartSync(visit, user, calendarId) {
  const oauth2Client = getOAuth2Client(user);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Skip if in conflict state (needs manual resolution)
  if (visit.sync_status === 'conflict') {
    return { status: 'skipped', reason: 'conflict', visit };
  }

  // Skip if too many errors
  if (visit.sync_error_count >= MAX_SYNC_ERROR_COUNT) {
    return { status: 'skipped', reason: 'max_errors', visit };
  }

  try {
    // 1. Check if Google event has changed
    const googleEvent = await checkGoogleEventChanged(visit, calendar, calendarId);

    if (googleEvent) {
      // Handle deletion
      if (googleEvent.deleted) {
        await handleGoogleDeletion(visit);
        return { status: 'deleted_from_google', visit };
      }

      // 2. Detect conflict
      if (detectConflict(visit, googleEvent)) {
        const result = await markAsConflict(visit, googleEvent);
        return { status: 'conflict', ...result };
      }

      // 3. If Google is more recent, pull changes
      const googleModified = new Date(googleEvent.updated);
      const localModified = visit.local_modified_at ? new Date(visit.local_modified_at) : new Date(0);

      if (googleModified > localModified) {
        await pullFromGoogle(visit, googleEvent);
        return { status: 'pulled_from_google', visit };
      }
    }

    // 4. Push to Google if local changes pending
    if (!visit.google_event_id || visit.sync_status === 'pending_to_google') {
      await createOrUpdateCalendarEvent(visit, user, calendarId);
      return { status: 'pushed_to_google', visit };
    }

    return { status: 'unchanged', visit };
  } catch (error) {
    console.error(`❌ Smart sync error for visit ${visit.id}:`, error.message);

    await visit.update({
      sync_status: 'error',
      sync_error_message: error.message,
      sync_error_count: (visit.sync_error_count || 0) + 1
    }, { hooks: false, fromSync: true });

    return { status: 'error', error: error.message, visit };
  }
}

/**
 * Get all visits with sync issues (conflicts or errors)
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Visits with issues
 */
async function getSyncIssues(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const { Op } = require('sequelize');

  const whereClause = {
    dietitian_id: userId,
    sync_status: {
      [Op.in]: ['conflict', 'error']
    }
  };

  const visits = await Visit.findAll({
    where: whereClause,
    include: [{
      model: Patient,
      as: 'patient',
      attributes: ['first_name', 'last_name']
    }],
    order: [['updated_at', 'DESC']]
  });

  const conflicts = visits.filter(v => v.sync_status === 'conflict');
  const errors = visits.filter(v => v.sync_status === 'error');

  return {
    total: visits.length,
    conflicts: conflicts.length,
    errors: errors.length,
    visits: visits.map(v => ({
      id: v.id,
      patient: v.patient ? `${v.patient.first_name} ${v.patient.last_name}` : 'Unknown',
      visit_date: v.visit_date,
      status: v.status,
      sync_status: v.sync_status,
      sync_error_message: v.sync_error_message,
      sync_error_count: v.sync_error_count,
      local_modified_at: v.local_modified_at,
      remote_modified_at: v.remote_modified_at,
      google_event_id: v.google_event_id
    }))
  };
}

/**
 * Resolve a sync conflict
 *
 * @param {string} visitId - Visit ID
 * @param {string} userId - User ID
 * @param {string} resolution - 'keep_local' | 'keep_remote' | 'merge'
 * @param {Object} mergedData - Merged data if resolution is 'merge'
 * @returns {Promise<Object>} Resolved visit
 */
async function resolveConflict(visitId, userId, resolution, mergedData = null) {
  const user = await User.findByPk(userId);
  if (!user || !user.google_access_token) {
    throw new Error('User not connected to Google Calendar');
  }

  const visit = await Visit.findOne({
    where: {
      id: visitId,
      dietitian_id: userId,
      sync_status: 'conflict'
    }
  });

  if (!visit) {
    throw new Error('Visit not found or not in conflict state');
  }

  const oauth2Client = getOAuth2Client(user);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const calendarId = user.google_calendar_id || 'primary';

  try {
    if (resolution === 'keep_local') {
      // Push local changes to Google
      await createOrUpdateCalendarEvent(visit, user, calendarId);
      console.log(`✅ Conflict resolved: kept local changes for visit ${visitId}`);
      return { status: 'resolved', resolution: 'keep_local', visit };
    }

    if (resolution === 'keep_remote') {
      // Pull Google changes
      const googleEvent = await calendar.events.get({
        calendarId,
        eventId: visit.google_event_id
      });
      await pullFromGoogle(visit, googleEvent.data);
      console.log(`✅ Conflict resolved: kept remote changes for visit ${visitId}`);
      return { status: 'resolved', resolution: 'keep_remote', visit };
    }

    if (resolution === 'merge' && mergedData) {
      // Apply merged data
      await visit.update({
        ...mergedData,
        sync_status: 'pending_to_google',
        local_modified_at: new Date()
      }, { hooks: false, fromSync: true });

      // Push to Google
      await createOrUpdateCalendarEvent(visit, user, calendarId);
      console.log(`✅ Conflict resolved: merged changes for visit ${visitId}`);
      return { status: 'resolved', resolution: 'merge', visit };
    }

    throw new Error('Invalid resolution type');
  } catch (error) {
    console.error(`❌ Error resolving conflict for visit ${visitId}:`, error.message);
    throw error;
  }
}

/**
 * Retry failed syncs for a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Retry results
 */
async function retryFailedSyncs(userId) {
  const user = await User.findByPk(userId);
  if (!user || !user.google_access_token) {
    throw new Error('User not connected to Google Calendar');
  }

  const { Op } = require('sequelize');

  const failedVisits = await Visit.findAll({
    where: {
      dietitian_id: userId,
      sync_status: 'error',
      sync_error_count: {
        [Op.lt]: MAX_SYNC_ERROR_COUNT
      }
    }
  });

  const calendarId = user.google_calendar_id || 'primary';
  const results = {
    total: failedVisits.length,
    successful: 0,
    failed: 0,
    details: []
  };

  for (const visit of failedVisits) {
    try {
      const result = await smartSync(visit, user, calendarId);
      if (result.status === 'error') {
        results.failed++;
      } else {
        results.successful++;
      }
      results.details.push({
        visitId: visit.id,
        ...result
      });
    } catch (error) {
      results.failed++;
      results.details.push({
        visitId: visit.id,
        status: 'error',
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Get sync statistics for a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Sync statistics
 */
async function getSyncStats(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const { Op, fn, col } = require('sequelize');

  const stats = await Visit.findAll({
    where: {
      dietitian_id: userId,
      google_event_id: {
        [Op.ne]: null
      }
    },
    attributes: [
      'sync_status',
      [fn('COUNT', col('id')), 'count']
    ],
    group: ['sync_status'],
    raw: true
  });

  const totalWithGoogle = await Visit.count({
    where: {
      dietitian_id: userId,
      google_event_id: {
        [Op.ne]: null
      }
    }
  });

  const totalVisits = await Visit.count({
    where: {
      dietitian_id: userId
    }
  });

  const lastSyncedVisit = await Visit.findOne({
    where: {
      dietitian_id: userId,
      last_sync_at: {
        [Op.ne]: null
      }
    },
    order: [['last_sync_at', 'DESC']],
    attributes: ['last_sync_at']
  });

  return {
    totalVisits,
    totalWithGoogle,
    lastSyncAt: lastSyncedVisit?.last_sync_at || null,
    byStatus: stats.reduce((acc, s) => {
      acc[s.sync_status || 'none'] = parseInt(s.count);
      return acc;
    }, {})
  };
}

/**
 * Check for deleted Google events and update visits
 *
 * @param {string} userId - User ID
 * @param {Object} options - Options
 * @returns {Promise<Object>} Results
 */
async function syncDeletedEvents(userId, options = {}) {
  const user = await User.findByPk(userId);
  if (!user || !user.google_access_token) {
    throw new Error('User not connected to Google Calendar');
  }

  const oauth2Client = getOAuth2Client(user);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const calendarId = user.google_calendar_id || 'primary';

  const since = options.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Get deleted events from Google
  const response = await calendar.events.list({
    calendarId,
    showDeleted: true,
    updatedMin: since.toISOString(),
    singleEvents: true
  });

  const deletedEvents = response.data.items.filter(e => e.status === 'cancelled');
  const results = {
    total: deletedEvents.length,
    processed: 0,
    cancelled: 0
  };

  const { Op } = require('sequelize');

  for (const event of deletedEvents) {
    const visit = await Visit.findOne({
      where: {
        google_event_id: event.id,
        google_event_deleted: false,
        status: {
          [Op.ne]: 'CANCELLED'
        }
      }
    });

    if (visit) {
      await handleGoogleDeletion(visit);
      results.cancelled++;
    }
    results.processed++;
  }

  return results;
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
 * @returns {Promise<Object>} Sync results
 */
async function syncVisitsToCalendar(userId, options = {}) {
  const user = await User.findByPk(userId);
  if (!user || !user.google_access_token) {
    throw new Error('User not connected to Google Calendar');
  }

  const since = options.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
  const calendarId = options.calendarId || user.google_calendar_id || 'primary';

  // Validate calendar access before proceeding
  const calendarAccessible = await validateCalendarAccess(user, calendarId);
  if (!calendarAccessible) {
    throw new Error(`Calendar ${calendarId} is not accessible. Please check that the calendar exists and you have write access to it.`);
  }

  // Build where clause for visits - always filter by this user's own visits
  const whereClause = {
    visit_date: {
      [db.Sequelize.Op.gte]: since
    },
    status: {
      [db.Sequelize.Op.in]: ['SCHEDULED', 'COMPLETED']
    },
    dietitian_id: userId
  };

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

      // Check for conflicts: if Google Calendar event exists and was modified more recently than the visit, skip sync
      if (visit.google_event_id) {
        try {
          const oauth2Client = getOAuth2Client(user);
          const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

          const existingEvent = await calendar.events.get({
            calendarId,
            eventId: visit.google_event_id
          });

          // Check if event was deleted/cancelled in Google Calendar
          if (existingEvent.data.status === 'cancelled') {
            console.log(`🗑️ [DELETION DETECTED] Google Calendar event ${visit.google_event_id} was deleted, marking visit ${visit.id} as CANCELLED`);
            await handleGoogleDeletion(visit);
            results.events.push({
              visitId: visit.id,
              eventId: visit.google_event_id,
              status: 'cancelled_from_google',
              source: 'google_calendar'
            });
            results.skipped++;
            continue; // Skip this visit - it's been cancelled
          }

          const eventLastModified = new Date(existingEvent.data.updated);
          const visitLastModified = visit.updated_at ? new Date(visit.updated_at) : new Date(0);

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
          // 404 means event was truly deleted (not just cancelled)
          if (error.code === 404) {
            console.log(`🗑️ [DELETION DETECTED] Google Calendar event ${visit.google_event_id} not found (404), marking visit ${visit.id} as CANCELLED`);
            await handleGoogleDeletion(visit);
            results.events.push({
              visitId: visit.id,
              eventId: visit.google_event_id,
              status: 'cancelled_from_google',
              source: 'google_calendar'
            });
            results.skipped++;
            continue; // Skip this visit - it's been cancelled
          }
          // For other errors, log and try to recreate
          console.log(`⚠️ Could not fetch existing Google Calendar event ${visit.google_event_id} for visit ${visit.id}, will recreate: ${error.message}`);
        }
      }

      const event = await createOrUpdateCalendarEvent(visit, user, calendarId);
      results.synced++;
      results.events.push({
        visitId: visit.id,
        eventId: event.id,
        dietitian: user.username,
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
          calendar_id: calendarId,
          dietitian_id: user.id
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
          const visitLastModified = visit.updated_at ? new Date(visit.updated_at) : new Date(0);

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
  getOAuth2Client,
  // New smart sync functions
  checkGoogleEventChanged,
  detectConflict,
  parseGoogleEvent,
  handleGoogleDeletion,
  markAsConflict,
  pullFromGoogle,
  smartSync,
  getSyncIssues,
  resolveConflict,
  retryFailedSyncs,
  getSyncStats,
  syncDeletedEvents,
  // Constants
  CALENDAR_RELEVANT_FIELDS,
  MAX_SYNC_ERROR_COUNT
};