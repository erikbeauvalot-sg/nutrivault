/**
 * Auto Sync Service
 *
 * Handles automatic Google Calendar synchronization with rate limiting
 * to prevent excessive API calls while keeping data synchronized.
 * Now includes conflict-aware syncing and smart sync capabilities.
 */

const googleCalendarService = require('./googleCalendar.service');

// Cache to track last sync time per user
const lastSyncCache = new Map();
const SYNC_COOLDOWN_MS = 2 * 1000; // 2 seconds cooldown (allows ~5 syncs per 10 seconds)
const { MAX_SYNC_ERROR_COUNT } = googleCalendarService;

/**
 * Check if user can sync (rate limiting)
 * @param {string} userId - User ID
 * @returns {boolean} True if sync is allowed
 */
function canSync(userId) {
  const lastSync = lastSyncCache.get(userId);
  const now = Date.now();

  if (!lastSync || (now - lastSync) >= SYNC_COOLDOWN_MS) {
    lastSyncCache.set(userId, now);
    return true;
  }

  return false;
}

/**
 * Auto-sync visits to Google Calendar for a user
 * Only syncs if user has Google Calendar enabled and rate limit allows
 * @param {Object} user - User object with role information
 * @param {Object} options - Sync options
 * @returns {Promise<Object|null>} Sync result or null if not synced
 */
async function autoSyncVisitsToCalendar(user, options = {}) {
  try {
    // Check if user has Google Calendar enabled
    if (!user.google_calendar_sync_enabled || !user.google_access_token) {
      return null; // No sync needed
    }

    // Check rate limiting
    if (!canSync(user.id)) {
      console.log(`⏰ Auto-sync skipped for user ${user.username} (rate limited)`);
      return null;
    }

    console.log(`🔄 Auto-syncing visits to Google Calendar for user ${user.username}`);

    // Determine if admin should sync all dietitians
    const isAdmin = user.role && user.role.name === 'ADMIN';
    const syncAllDietitians = isAdmin && options.syncAllDietitians !== false;

    const params = {
      since: options.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days by default
      calendarId: user.google_calendar_id || 'primary'
    };

    // Only pass syncAllDietitians if it's true (admins only)
    if (syncAllDietitians) {
      params.syncAllDietitians = syncAllDietitians;
    }

    const result = await googleCalendarService.syncVisitsToCalendar(user.id, params);

    console.log(`✅ Auto-synced ${result.synced} visits for user ${user.username}`);
    return result;

  } catch (error) {
    // Log error but don't throw - auto sync should not break main operations
    console.error(`❌ Auto-sync failed for user ${user.username}:`, error.message);
    return null;
  }
}

/**
 * Auto-sync after visit creation/update
 * @param {Object} user - User who performed the action
 * @param {Object} visit - The visit that was created/updated
 * @param {string} action - 'create' or 'update'
 */
async function autoSyncAfterVisitChange(user, visit, action) {
  try {
    console.log(`📅 Auto-sync triggered by visit ${action}: ${visit.id}`);

    // For visit changes, sync only the current user's visits
    // This ensures the change is immediately reflected in their calendar
    await autoSyncVisitsToCalendar(user, {
      syncAllDietitians: false, // Don't sync all for individual changes
      since: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    });

  } catch (error) {
    console.error(`❌ Auto-sync after visit ${action} failed:`, error.message);
  }
}

/**
 * Auto-sync when accessing agenda/visits
 * @param {Object} user - User accessing the agenda
 */
async function autoSyncOnAgendaAccess(user) {
  try {
    console.log(`📊 Auto-sync on agenda access for user ${user.username}`);

    // For agenda access, use bidirectional sync to get latest changes from Google
    await bidirectionalSync(user, {
      since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
    });

  } catch (error) {
    console.error('❌ Auto-sync on agenda access failed:', error.message);
  }
}

/**
 * Force sync (bypasses rate limiting)
 * Used for manual sync operations - now bidirectional
 * @param {Object} user - User object
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync result
 */
async function forceSyncVisitsToCalendar(user, options = {}) {
  try {
    console.log(`🔄 Force bidirectional sync for user ${user.username}`);

    // Perform bidirectional sync without rate limiting
    const results = {
      calendarToVisits: null,
      visitsToCalendar: null,
      totalSynced: 0,
      totalSkipped: 0,
      totalErrors: 0
    };

    // Determine sync parameters
    const isAdmin = user.role && user.role.name === 'ADMIN';
    const syncAllDietitians = isAdmin && options.syncAllDietitians !== false;
    const since = options.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

    // Step 1: Sync from Google Calendar to NutriVault
    try {
      console.log(`📥 Force syncing from Google Calendar to NutriVault for user ${user.username}`);
      results.calendarToVisits = await googleCalendarService.syncCalendarToVisits(user.id, {
        since,
        calendarId: options.calendarId || user.google_calendar_id || 'primary'
      });
      console.log(`✅ Force synced ${results.calendarToVisits.synced} events from Google Calendar`);
    } catch (error) {
      console.error(`❌ Calendar-to-visits force sync failed for user ${user.username}:`, error.message);
      results.calendarToVisits = { synced: 0, errors: 1, events: [] };
    }

    // Step 2: Sync from NutriVault to Google Calendar
    try {
      console.log(`📤 Force syncing from NutriVault to Google Calendar for user ${user.username}`);
      const params = {
        since,
        calendarId: options.calendarId || user.google_calendar_id || 'primary'
      };

      if (syncAllDietitians) {
        params.syncAllDietitians = syncAllDietitians;
      }

      results.visitsToCalendar = await googleCalendarService.syncVisitsToCalendar(user.id, params);
      console.log(`✅ Force synced ${results.visitsToCalendar.synced} visits to Google Calendar`);
    } catch (error) {
      console.error(`❌ Visits-to-calendar force sync failed for user ${user.username}:`, error.message);
      results.visitsToCalendar = { synced: 0, errors: 1, events: [] };
    }

    // Calculate totals
    results.totalSynced = (results.calendarToVisits?.synced || 0) + (results.visitsToCalendar?.synced || 0);
    results.totalSkipped = (results.calendarToVisits?.skipped || 0) + (results.visitsToCalendar?.skipped || 0);
    results.totalErrors = (results.calendarToVisits?.errors || 0) + (results.visitsToCalendar?.errors || 0);

    // Log detailed errors if any
    if (results.totalErrors > 0) {
      console.log(`🔍 [DEBUG] Detailed error breakdown for force sync user ${user.username}:`);

      // Log calendar-to-visits errors
      if (results.calendarToVisits?.events) {
        const calendarErrors = results.calendarToVisits.events.filter(event => event.status === 'error' || event.error);
        if (calendarErrors.length > 0) {
          console.log(`  📅 Calendar-to-visits errors (${calendarErrors.length}):`);
          calendarErrors.forEach((event, index) => {
            console.log(`    ${index + 1}. Event ID: ${event.eventId}, Visit ID: ${event.visitId}, Error: ${event.error || 'Unknown error'}`);
          });
        }
      }

      // Log visits-to-calendar errors
      if (results.visitsToCalendar?.events) {
        const visitErrors = results.visitsToCalendar.events.filter(event => event.status === 'error' || event.error);
        if (visitErrors.length > 0) {
          console.log(`  🏥 Visits-to-calendar errors (${visitErrors.length}):`);
          visitErrors.forEach((event, index) => {
            console.log(`    ${index + 1}. Visit ID: ${event.visitId}, Event ID: ${event.eventId}, Error: ${event.error || 'Unknown error'}`);
          });
        }
      }
    }

    // Update last sync time
    lastSyncCache.set(user.id, Date.now());

    console.log(`✅ Force bidirectional sync completed for user ${user.username}: ${results.totalSynced} total synced, ${results.totalSkipped} skipped, ${results.totalErrors} errors`);
    return results;

  } catch (error) {
    console.error(`❌ Force sync failed for user ${user.username}:`, error.message);
    throw error;
  }
}

/**
 * Bidirectional sync: Google Calendar ↔ NutriVault
 * First syncs from Google to NutriVault, then from NutriVault to Google
 * Now includes conflict detection and smart sync capabilities
 * @param {Object} user - User object with role information
 * @param {Object} options - Sync options
 * @returns {Promise<Object|null>} Combined sync results or null if not synced
 */
async function bidirectionalSync(user, options = {}) {
  try {
    // Check if user has Google Calendar enabled
    if (!user.google_calendar_sync_enabled || !user.google_access_token) {
      return null; // No sync needed
    }

    // Check rate limiting
    if (!canSync(user.id)) {
      console.log(`⏰ Bidirectional sync skipped for user ${user.username} (rate limited)`);
      return null;
    }

    console.log(`🔄 Starting bidirectional sync for user ${user.username}`);

    const results = {
      calendarToVisits: null,
      visitsToCalendar: null,
      deletedEvents: null,
      totalSynced: 0,
      totalSkipped: 0,
      totalErrors: 0,
      totalConflicts: 0
    };

    // Determine sync parameters
    const isAdmin = user.role && user.role.name === 'ADMIN';
    const syncAllDietitians = isAdmin && options.syncAllDietitians !== false;
    const since = options.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

    // Step 0: Check for deleted events in Google Calendar
    try {
      console.log(`🗑️ Checking for deleted Google Calendar events for user ${user.username}`);
      results.deletedEvents = await googleCalendarService.syncDeletedEvents(user.id, { since });
      if (results.deletedEvents.cancelled > 0) {
        console.log(`🗑️ Cancelled ${results.deletedEvents.cancelled} visits from deleted Google events`);
      }
    } catch (error) {
      console.error(`❌ Deleted events check failed for user ${user.username}:`, error.message);
      results.deletedEvents = { total: 0, cancelled: 0 };
    }

    // Step 1: Sync from Google Calendar to NutriVault (get changes from Google)
    try {
      console.log(`📥 Syncing from Google Calendar to NutriVault for user ${user.username}`);
      results.calendarToVisits = await googleCalendarService.syncCalendarToVisits(user.id, {
        since,
        calendarId: user.google_calendar_id || 'primary'
      });
      console.log(`✅ Synced ${results.calendarToVisits.synced} events from Google Calendar`);
    } catch (error) {
      console.error(`❌ Calendar-to-visits sync failed for user ${user.username}:`, error.message);
      results.calendarToVisits = { synced: 0, errors: 1, events: [] };
    }

    // Step 2: Sync from NutriVault to Google Calendar (push changes to Google)
    try {
      console.log(`📤 Syncing from NutriVault to Google Calendar for user ${user.username}`);
      const params = {
        since,
        calendarId: user.google_calendar_id || 'primary'
      };

      if (syncAllDietitians) {
        params.syncAllDietitians = syncAllDietitians;
      }

      results.visitsToCalendar = await googleCalendarService.syncVisitsToCalendar(user.id, params);
      console.log(`✅ Synced ${results.visitsToCalendar.synced} visits to Google Calendar`);
    } catch (error) {
      console.error(`❌ Visits-to-calendar sync failed for user ${user.username}:`, error.message);
      results.visitsToCalendar = { synced: 0, errors: 1, events: [] };
    }

    // Calculate totals
    results.totalSynced = (results.calendarToVisits?.synced || 0) + (results.visitsToCalendar?.synced || 0);
    results.totalSkipped = (results.calendarToVisits?.skipped || 0) + (results.visitsToCalendar?.skipped || 0);
    results.totalErrors = (results.calendarToVisits?.errors || 0) + (results.visitsToCalendar?.errors || 0);

    // Count conflicts from events
    if (results.calendarToVisits?.events) {
      results.totalConflicts += results.calendarToVisits.events.filter(e => e.status === 'conflict').length;
    }
    if (results.visitsToCalendar?.events) {
      results.totalConflicts += results.visitsToCalendar.events.filter(e => e.status === 'conflict').length;
    }

    // Log detailed errors if any
    if (results.totalErrors > 0) {
      console.log(`🔍 [DEBUG] Detailed error breakdown for user ${user.username}:`);

      // Log calendar-to-visits errors
      if (results.calendarToVisits?.events) {
        const calendarErrors = results.calendarToVisits.events.filter(event => event.status === 'error' || event.error);
        if (calendarErrors.length > 0) {
          console.log(`  📅 Calendar-to-visits errors (${calendarErrors.length}):`);
          calendarErrors.forEach((event, index) => {
            console.log(`    ${index + 1}. Event ID: ${event.eventId}, Visit ID: ${event.visitId}, Error: ${event.error || 'Unknown error'}`);
          });
        }
      }

      // Log visits-to-calendar errors
      if (results.visitsToCalendar?.events) {
        const visitErrors = results.visitsToCalendar.events.filter(event => event.status === 'error' || event.error);
        if (visitErrors.length > 0) {
          console.log(`  🏥 Visits-to-calendar errors (${visitErrors.length}):`);
          visitErrors.forEach((event, index) => {
            console.log(`    ${index + 1}. Visit ID: ${event.visitId}, Event ID: ${event.eventId}, Error: ${event.error || 'Unknown error'}`);
          });
        }
      }
    }

    // Log conflicts if any
    if (results.totalConflicts > 0) {
      console.log(`⚠️ [CONFLICTS] Found ${results.totalConflicts} sync conflicts for user ${user.username}`);
    }

    console.log(`✅ Bidirectional sync completed for user ${user.username}: ${results.totalSynced} total synced, ${results.totalSkipped} skipped, ${results.totalErrors} errors, ${results.totalConflicts} conflicts`);
    return results;

  } catch (error) {
    console.error(`❌ Bidirectional sync failed for user ${user.username}:`, error.message);
    return null;
  }
}

/**
 * Smart sync for a single visit - uses intelligent conflict detection
 * @param {Object} user - User object
 * @param {Object} visit - Visit object
 * @returns {Promise<Object|null>} Sync result or null if skipped
 */
async function smartSyncVisit(user, visit) {
  try {
    // Check if user has Google Calendar enabled
    if (!user.google_calendar_sync_enabled || !user.google_access_token) {
      return null;
    }

    // Skip if in conflict state
    if (visit.sync_status === 'conflict') {
      console.log(`⏭️ Smart sync skipped for visit ${visit.id} - in conflict state`);
      return { status: 'skipped', reason: 'conflict' };
    }

    // Skip if too many errors
    if (visit.sync_error_count >= MAX_SYNC_ERROR_COUNT) {
      console.log(`⏭️ Smart sync skipped for visit ${visit.id} - max errors reached (${visit.sync_error_count})`);
      return { status: 'skipped', reason: 'max_errors' };
    }

    const calendarId = user.google_calendar_id || 'primary';
    return await googleCalendarService.smartSync(visit, user, calendarId);
  } catch (error) {
    console.error(`❌ Smart sync failed for visit ${visit.id}:`, error.message);
    return { status: 'error', error: error.message };
  }
}

/**
 * Get last sync time for a user
 * @param {string} userId - User ID
 * @returns {Date|null} Last sync time or null
 */
function getLastSyncTime(userId) {
  const lastSync = lastSyncCache.get(userId);
  return lastSync ? new Date(lastSync) : null;
}

/**
 * Clear sync cache (useful for testing)
 */
function clearSyncCache() {
  lastSyncCache.clear();
}

module.exports = {
  autoSyncVisitsToCalendar,
  autoSyncAfterVisitChange,
  autoSyncOnAgendaAccess,
  forceSyncVisitsToCalendar,
  bidirectionalSync,
  smartSyncVisit,
  getLastSyncTime,
  clearSyncCache,
  SYNC_COOLDOWN_MS
};