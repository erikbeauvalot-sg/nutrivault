/**
 * Auto Sync Service Tests
 */

const autoSyncService = require('../../src/services/autoSync.service');

// Mock the googleCalendar service
jest.mock('../../src/services/googleCalendar.service', () => ({
  syncVisitsToCalendar: jest.fn(),
  syncCalendarToVisits: jest.fn(),
  syncDeletedEvents: jest.fn(),
  smartSync: jest.fn(),
  MAX_SYNC_ERROR_COUNT: 3
}));

const googleCalendarService = require('../../src/services/googleCalendar.service');

describe('AutoSync Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    autoSyncService.clearSyncCache();
  });

  describe('bidirectionalSync', () => {
    it('should perform bidirectional sync when user has Google Calendar enabled', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        google_calendar_sync_enabled: true,
        google_access_token: 'token123',
        google_calendar_id: 'primary'
      };

      const deletedEventsResult = { total: 0, cancelled: 0 };
      const calendarToVisitsResult = { synced: 2, errors: 0, events: [] };
      const visitsToCalendarResult = { synced: 3, errors: 0, events: [] };

      googleCalendarService.syncDeletedEvents.mockResolvedValue(deletedEventsResult);
      googleCalendarService.syncCalendarToVisits.mockResolvedValue(calendarToVisitsResult);
      googleCalendarService.syncVisitsToCalendar.mockResolvedValue(visitsToCalendarResult);

      const result = await autoSyncService.bidirectionalSync(user);

      expect(result).not.toBeNull();
      expect(result.deletedEvents).toEqual(deletedEventsResult);
      expect(result.calendarToVisits).toEqual(calendarToVisitsResult);
      expect(result.visitsToCalendar).toEqual(visitsToCalendarResult);
      expect(result.totalSynced).toBe(5);
      expect(result.totalErrors).toBe(0);
    });

    it('should return null when user has Google Calendar disabled', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        google_calendar_sync_enabled: false,
        google_access_token: null
      };

      const result = await autoSyncService.bidirectionalSync(user);

      expect(result).toBeNull();
      expect(googleCalendarService.syncCalendarToVisits).not.toHaveBeenCalled();
    });

    it('should track conflicts in results', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        google_calendar_sync_enabled: true,
        google_access_token: 'token123',
        google_calendar_id: 'primary'
      };

      const deletedEventsResult = { total: 0, cancelled: 0 };
      const calendarToVisitsResult = {
        synced: 1,
        errors: 0,
        events: [{ status: 'conflict', visitId: 'v1' }]
      };
      const visitsToCalendarResult = { synced: 2, errors: 0, events: [] };

      googleCalendarService.syncDeletedEvents.mockResolvedValue(deletedEventsResult);
      googleCalendarService.syncCalendarToVisits.mockResolvedValue(calendarToVisitsResult);
      googleCalendarService.syncVisitsToCalendar.mockResolvedValue(visitsToCalendarResult);

      const result = await autoSyncService.bidirectionalSync(user);

      expect(result.totalConflicts).toBe(1);
    });

    it('should handle deleted events from Google Calendar', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        google_calendar_sync_enabled: true,
        google_access_token: 'token123',
        google_calendar_id: 'primary'
      };

      const deletedEventsResult = { total: 5, cancelled: 2 };
      const calendarToVisitsResult = { synced: 0, errors: 0, events: [] };
      const visitsToCalendarResult = { synced: 0, errors: 0, events: [] };

      googleCalendarService.syncDeletedEvents.mockResolvedValue(deletedEventsResult);
      googleCalendarService.syncCalendarToVisits.mockResolvedValue(calendarToVisitsResult);
      googleCalendarService.syncVisitsToCalendar.mockResolvedValue(visitsToCalendarResult);

      const result = await autoSyncService.bidirectionalSync(user);

      expect(result.deletedEvents.cancelled).toBe(2);
      expect(googleCalendarService.syncDeletedEvents).toHaveBeenCalledWith('user-1', expect.any(Object));
    });
  });

  describe('smartSyncVisit', () => {
    it('should skip visits in conflict state', async () => {
      const user = {
        id: 'user-1',
        google_calendar_sync_enabled: true,
        google_access_token: 'token123',
        google_calendar_id: 'primary'
      };

      const visit = {
        id: 'visit-1',
        sync_status: 'conflict',
        sync_error_count: 0
      };

      const result = await autoSyncService.smartSyncVisit(user, visit);

      expect(result.status).toBe('skipped');
      expect(result.reason).toBe('conflict');
      expect(googleCalendarService.smartSync).not.toHaveBeenCalled();
    });

    it('should skip visits with max errors reached', async () => {
      const user = {
        id: 'user-1',
        google_calendar_sync_enabled: true,
        google_access_token: 'token123',
        google_calendar_id: 'primary'
      };

      const visit = {
        id: 'visit-1',
        sync_status: 'error',
        sync_error_count: 3 // MAX_SYNC_ERROR_COUNT
      };

      const result = await autoSyncService.smartSyncVisit(user, visit);

      expect(result.status).toBe('skipped');
      expect(result.reason).toBe('max_errors');
    });

    it('should call smartSync for valid visits', async () => {
      const user = {
        id: 'user-1',
        google_calendar_sync_enabled: true,
        google_access_token: 'token123',
        google_calendar_id: 'primary'
      };

      const visit = {
        id: 'visit-1',
        sync_status: 'pending_to_google',
        sync_error_count: 0
      };

      googleCalendarService.smartSync.mockResolvedValue({ status: 'pushed_to_google' });

      const result = await autoSyncService.smartSyncVisit(user, visit);

      expect(result.status).toBe('pushed_to_google');
      expect(googleCalendarService.smartSync).toHaveBeenCalledWith(visit, user, 'primary');
    });

    it('should return null when user has no Google Calendar enabled', async () => {
      const user = {
        id: 'user-1',
        google_calendar_sync_enabled: false,
        google_access_token: null
      };

      const visit = { id: 'visit-1' };

      const result = await autoSyncService.smartSyncVisit(user, visit);

      expect(result).toBeNull();
    });
  });

  describe('Rate limiting', () => {
    it('should respect rate limiting between syncs', async () => {
      const user = {
        id: 'user-rate-test',
        username: 'rateuser',
        google_calendar_sync_enabled: true,
        google_access_token: 'token123',
        google_calendar_id: 'primary'
      };

      googleCalendarService.syncDeletedEvents.mockResolvedValue({ total: 0, cancelled: 0 });
      googleCalendarService.syncCalendarToVisits.mockResolvedValue({ synced: 0, errors: 0, events: [] });
      googleCalendarService.syncVisitsToCalendar.mockResolvedValue({ synced: 0, errors: 0, events: [] });

      // First sync should work
      const result1 = await autoSyncService.bidirectionalSync(user);
      expect(result1).not.toBeNull();

      // Immediate second sync should be rate limited
      const result2 = await autoSyncService.bidirectionalSync(user);
      expect(result2).toBeNull();
    });

    it('should track last sync time', async () => {
      const userId = 'user-time-test';

      // Initially no sync time
      expect(autoSyncService.getLastSyncTime(userId)).toBeNull();

      const user = {
        id: userId,
        username: 'timeuser',
        google_calendar_sync_enabled: true,
        google_access_token: 'token123',
        google_calendar_id: 'primary'
      };

      googleCalendarService.syncDeletedEvents.mockResolvedValue({ total: 0, cancelled: 0 });
      googleCalendarService.syncCalendarToVisits.mockResolvedValue({ synced: 0, errors: 0, events: [] });
      googleCalendarService.syncVisitsToCalendar.mockResolvedValue({ synced: 0, errors: 0, events: [] });

      await autoSyncService.bidirectionalSync(user);

      // Now should have a sync time
      const lastSync = autoSyncService.getLastSyncTime(userId);
      expect(lastSync).toBeInstanceOf(Date);
    });
  });

  describe('SYNC_COOLDOWN_MS', () => {
    it('should export SYNC_COOLDOWN_MS constant', () => {
      expect(autoSyncService.SYNC_COOLDOWN_MS).toBeDefined();
      expect(typeof autoSyncService.SYNC_COOLDOWN_MS).toBe('number');
    });
  });
});