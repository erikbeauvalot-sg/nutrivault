/**
 * Auto Sync Service Tests
 */

const autoSyncService = require('../../src/services/autoSync.service');

// Mock the googleCalendar service
jest.mock('../../src/services/googleCalendar.service', () => ({
  syncVisitsToCalendar: jest.fn(),
  syncCalendarToVisits: jest.fn()
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

      const calendarToVisitsResult = { synced: 2, errors: 0, events: [] };
      const visitsToCalendarResult = { synced: 3, errors: 0, events: [] };

      googleCalendarService.syncCalendarToVisits.mockResolvedValue(calendarToVisitsResult);
      googleCalendarService.syncVisitsToCalendar.mockResolvedValue(visitsToCalendarResult);

      const result = await autoSyncService.bidirectionalSync(user);

      expect(result).not.toBeNull();
      expect(result.calendarToVisits).toEqual(calendarToVisitsResult);
      expect(result.visitsToCalendar).toEqual(visitsToCalendarResult);
      expect(result.totalSynced).toBe(5);
      expect(result.totalErrors).toBe(0);
    });
  });
});