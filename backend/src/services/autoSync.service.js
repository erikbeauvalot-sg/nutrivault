/**
 * Auto Sync Service
 *
 * Handles automatic Google Calendar synchronization with rate limiting
 * to prevent excessive API calls while keeping data synchronized.
 */

const googleCalendarService = require('./googleCalendar.service');

// Cache to track last sync time per user
const lastSyncCache = new Map();
const SYNC_COOLDOWN_MS = 60 * 1000; // 1 minute cooldown

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

    const result = await googleCalendarService.syncVisitsToCalendar(user.id, {
      since: options.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days by default
      calendarId: user.google_calendar_id || 'primary',
      syncAllDietitians
    });

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

    // For agenda access, use normal sync behavior (admin syncs all, others sync own)
    await autoSyncVisitsToCalendar(user, {
      since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
    });

  } catch (error) {
    console.error('❌ Auto-sync on agenda access failed:', error.message);
  }
}

/**
 * Force sync (bypasses rate limiting)
 * Used for manual sync operations
 * @param {Object} user - User object
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync result
 */
async function forceSyncVisitsToCalendar(user, options = {}) {
  try {
    console.log(`🔄 Force-syncing visits to Google Calendar for user ${user.username}`);

    const isAdmin = user.role && user.role.name === 'ADMIN';
    const syncAllDietitians = isAdmin && options.syncAllDietitians !== false;

    const result = await googleCalendarService.syncVisitsToCalendar(user.id, {
      since: options.since,
      calendarId: options.calendarId || user.google_calendar_id || 'primary',
      syncAllDietitians
    });

    // Update last sync time
    lastSyncCache.set(user.id, Date.now());

    console.log(`✅ Force-synced ${result.synced} visits for user ${user.username}`);
    return result;

  } catch (error) {
    console.error(`❌ Force-sync failed for user ${user.username}:`, error.message);
    throw error;
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
  getLastSyncTime,
  clearSyncCache,
  SYNC_COOLDOWN_MS
};