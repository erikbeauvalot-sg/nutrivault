/**
 * Google Calendar Service Tests
 *
 * Tests for Google Calendar integration functionality
 */

const googleCalendarService = require('../../src/services/googleCalendar.service');
const { User, Visit, Patient } = require('../../../models');
const { google } = require('googleapis');

// Mock Google APIs
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
        generateAuthUrl: jest.fn().mockReturnValue('https://mock-auth-url.com'),
        getToken: jest.fn().mockResolvedValue({
          tokens: {
            access_token: 'mock_access_token',
            refresh_token: 'mock_refresh_token',
            expiry_date: Date.now() + 3600000
          }
        })
      }))
    },
    calendar: jest.fn().mockReturnValue({
      events: {
        insert: jest.fn().mockResolvedValue({ data: { id: 'mock_event_id' } }),
        update: jest.fn().mockResolvedValue({ data: { id: 'mock_event_id' } }),
        delete: jest.fn().mockResolvedValue({}),
        list: jest.fn().mockResolvedValue({
          data: {
            items: [
              {
                id: 'event1',
                summary: 'Visit with John Doe',
                start: { dateTime: '2024-01-01T10:00:00Z' },
                end: { dateTime: '2024-01-01T11:00:00Z' }
              }
            ]
          }
        })
      },
      calendars: {
        get: jest.fn().mockResolvedValue({
          data: {
            id: 'primary',
            summary: 'Primary Calendar'
          }
        })
      },
      calendarList: {
        list: jest.fn().mockResolvedValue({
          data: {
            items: [
              { id: 'primary', summary: 'Primary Calendar', accessRole: 'owner' },
              { id: 'work', summary: 'Work Calendar', accessRole: 'writer' }
            ]
          }
        })
      }
    })
  }
}));

describe('Google Calendar Service', () => {
  let mockUser;
  let mockVisit;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock user
    mockUser = {
      id: 'user-123',
      username: 'testuser',
      google_access_token: 'mock_access_token',
      google_refresh_token: 'mock_refresh_token',
      google_token_expiry: new Date(Date.now() + 3600000),
      google_calendar_sync_enabled: true,
      google_calendar_id: 'primary'
    };

    // Mock visit
    mockVisit = {
      id: 'visit-123',
      patient_id: 'patient-123',
      dietitian_id: 'user-123',
      visit_date: new Date('2024-01-01T10:00:00Z'),
      visit_type: 'Follow-up',
      status: 'SCHEDULED',
      duration_minutes: 60,
      google_event_id: null,
      save: jest.fn().mockResolvedValue(),
      update: jest.fn().mockResolvedValue()
    };

    // Mock database queries
    User.findByPk = jest.fn().mockResolvedValue(mockUser);
    Visit.findAll = jest.fn().mockResolvedValue([mockVisit]);
    Patient.findByPk = jest.fn().mockResolvedValue({
      first_name: 'John',
      last_name: 'Doe'
    });
  });

  describe('getAuthUrl', () => {
    it('should generate OAuth authorization URL', async () => {
      const authUrl = await googleCalendarService.getAuthUrl('user-123');

      expect(authUrl).toBe('https://mock-auth-url.com');
    });
  });

  describe('getTokensFromCode', () => {
    it('should exchange authorization code for tokens', async () => {
      const tokens = await googleCalendarService.getTokensFromCode('auth-code-123');

      expect(tokens).toEqual({
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        expiry_date: expect.any(Number)
      });
    });
  });

  describe('saveUserTokens', () => {
    it('should save Google tokens for user', async () => {
      const tokens = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expiry_date: Date.now() + 3600000
      };

      mockUser.update = jest.fn().mockResolvedValue({
        ...mockUser,
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        google_token_expiry: new Date(tokens.expiry_date),
        google_calendar_sync_enabled: true
      });

      const updatedUser = await googleCalendarService.saveUserTokens('user-123', tokens);

      expect(mockUser.update).toHaveBeenCalledWith({
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        google_token_expiry: tokens.expiry_date,
        google_calendar_sync_enabled: true
      });
      expect(updatedUser.google_calendar_sync_enabled).toBe(true);
    });
  });

  describe('getUserCalendars', () => {
    it('should return user calendars', async () => {
      const calendars = await googleCalendarService.getUserCalendars('user-123');

      expect(calendars).toEqual([
        { id: 'primary', summary: 'Primary Calendar', accessRole: 'owner', primary: false, backgroundColor: undefined, foregroundColor: undefined },
        { id: 'work', summary: 'Work Calendar', accessRole: 'writer', primary: false, backgroundColor: undefined, foregroundColor: undefined }
      ]);
    });

    it('should throw error if user not connected', async () => {
      User.findByPk.mockResolvedValue({
        ...mockUser,
        google_access_token: null,
        google_calendar_sync_enabled: false
      });

      await expect(googleCalendarService.getUserCalendars('user-123'))
        .rejects
        .toThrow('User not connected to Google Calendar');
    });
  });

  describe('createOrUpdateCalendarEvent', () => {
    it('should create new calendar event for visit', async () => {
      const result = await googleCalendarService.createOrUpdateCalendarEvent(mockVisit, mockUser);

      expect(result.id).toBe('mock_event_id');
      expect(mockVisit.update).toHaveBeenCalledWith({
        google_event_id: 'mock_event_id'
      });
    });

    it('should update existing calendar event', async () => {
      const visitWithEvent = { ...mockVisit, google_event_id: 'existing_event_id' };

      const result = await googleCalendarService.createOrUpdateCalendarEvent(visitWithEvent, mockUser);

      expect(result.id).toBe('mock_event_id');
    });
  });

  describe('syncVisitsToCalendar', () => {
    it('should sync visits to Google Calendar', async () => {
      const result = await googleCalendarService.syncVisitsToCalendar('user-123');

      expect(result).toEqual({
        synced: 1,
        skipped: 0,
        errors: 0,
        events: expect.any(Array)
      });
    });

    it('should handle sync errors gracefully', async () => {
      // Mock a failure in event creation
      const googleapis = require('googleapis');
      googleapis.google.calendar().events.insert.mockRejectedValueOnce(new Error('API Error'));

      const result = await googleCalendarService.syncVisitsToCalendar('user-123');

      expect(result).toEqual({
        synced: 0,
        skipped: 0,
        errors: 1,
        events: expect.any(Array)
      });
    });
  });

  describe('syncCalendarToVisits', () => {
    it('should sync calendar events to visits', async () => {
      const result = await googleCalendarService.syncCalendarToVisits('user-123');

      expect(result).toEqual({
        synced: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        events: []
      });
    });
  });

  describe('disconnectCalendar', () => {
    it('should disconnect user from Google Calendar', async () => {
      mockUser.update = jest.fn().mockResolvedValue({
        ...mockUser,
        google_access_token: null,
        google_refresh_token: null,
        google_token_expiry: null,
        google_calendar_sync_enabled: false,
        google_calendar_id: 'primary'
      });

      await googleCalendarService.disconnectCalendar('user-123');

      expect(mockUser.update).toHaveBeenCalledWith({
        google_access_token: null,
        google_refresh_token: null,
        google_token_expiry: null,
        google_calendar_sync_enabled: false,
        google_calendar_id: 'primary'
      });
    });
  });

  describe('validateCalendarAccess', () => {
    it('should validate calendar access successfully', async () => {
      const result = await googleCalendarService.validateCalendarAccess('user-123', 'primary');

      expect(result).toBe(true);
      expect(jest.mocked(google).calendar().calendars.get).toHaveBeenCalledWith({
        calendarId: 'primary'
      });
    });

    it('should return false when calendar access fails', async () => {
      jest.mocked(google).calendar().calendars.get.mockRejectedValueOnce(new Error('Access denied'));

      const result = await googleCalendarService.validateCalendarAccess('user-123', 'primary');

      expect(result).toBe(false);
      expect(jest.mocked(google).calendar().calendars.get).toHaveBeenCalledWith({
        calendarId: 'primary'
      });
    });

    it('should handle missing calendar gracefully', async () => {
      jest.mocked(google).calendar().calendars.get.mockRejectedValueOnce({
        code: 404,
        message: 'Calendar not found'
      });

      const result = await googleCalendarService.validateCalendarAccess('user-123', 'invalid-calendar');

      expect(result).toBe(false);
    });
  });

  // ===== NEW TESTS FOR v5.5.1 SYNC FEATURES =====

  describe('detectConflict', () => {
    it('should return false when no last_sync_at', () => {
      const visit = {
        last_sync_at: null,
        local_modified_at: new Date()
      };
      const googleEvent = { updated: new Date().toISOString() };

      const result = googleCalendarService.detectConflict(visit, googleEvent);
      expect(result).toBe(false);
    });

    it('should return false when only local was modified', () => {
      const lastSync = new Date('2024-01-01T10:00:00Z');
      const visit = {
        last_sync_at: lastSync,
        local_modified_at: new Date('2024-01-01T12:00:00Z')
      };
      const googleEvent = { updated: '2024-01-01T09:00:00Z' }; // Before last sync

      const result = googleCalendarService.detectConflict(visit, googleEvent);
      expect(result).toBe(false);
    });

    it('should return false when only remote was modified', () => {
      const lastSync = new Date('2024-01-01T10:00:00Z');
      const visit = {
        last_sync_at: lastSync,
        local_modified_at: new Date('2024-01-01T09:00:00Z') // Before last sync
      };
      const googleEvent = { updated: '2024-01-01T12:00:00Z' };

      const result = googleCalendarService.detectConflict(visit, googleEvent);
      expect(result).toBe(false);
    });

    it('should return true when both local and remote were modified after last sync', () => {
      const lastSync = new Date('2024-01-01T10:00:00Z');
      const visit = {
        last_sync_at: lastSync,
        local_modified_at: new Date('2024-01-01T12:00:00Z')
      };
      const googleEvent = { updated: '2024-01-01T11:00:00Z' };

      const result = googleCalendarService.detectConflict(visit, googleEvent);
      expect(result).toBe(true);
    });
  });

  describe('parseGoogleEvent', () => {
    it('should parse visit date from Google event', () => {
      const event = {
        start: { dateTime: '2024-01-15T14:00:00Z' },
        end: { dateTime: '2024-01-15T15:00:00Z' },
        updated: '2024-01-14T10:00:00Z'
      };

      const result = googleCalendarService.parseGoogleEvent(event);

      expect(result.visit_date).toEqual(new Date('2024-01-15T14:00:00Z'));
      expect(result.duration_minutes).toBe(60);
      expect(result.remote_modified_at).toEqual(new Date('2024-01-14T10:00:00Z'));
    });

    it('should parse visit type from event summary', () => {
      const event = {
        summary: 'Consultation - John Doe (Follow-up)',
        start: { dateTime: '2024-01-15T14:00:00Z' },
        end: { dateTime: '2024-01-15T14:30:00Z' },
        updated: '2024-01-14T10:00:00Z'
      };

      const result = googleCalendarService.parseGoogleEvent(event);

      expect(result.visit_type).toBe('Follow-up');
      expect(result.duration_minutes).toBe(30);
    });

    it('should parse status from event description', () => {
      const event = {
        start: { dateTime: '2024-01-15T14:00:00Z' },
        end: { dateTime: '2024-01-15T15:00:00Z' },
        description: 'Statut: COMPLETED\nOther info',
        updated: '2024-01-14T10:00:00Z'
      };

      const result = googleCalendarService.parseGoogleEvent(event);

      expect(result.status).toBe('COMPLETED');
    });

    it('should handle French status in description', () => {
      const event = {
        start: { dateTime: '2024-01-15T14:00:00Z' },
        end: { dateTime: '2024-01-15T15:00:00Z' },
        description: 'Statut: termine',  // Using ASCII version that the service can parse
        updated: '2024-01-14T10:00:00Z'
      };

      const result = googleCalendarService.parseGoogleEvent(event);

      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('getSyncIssues', () => {
    it('should return conflicts and errors for user', async () => {
      const mockVisitsWithIssues = [
        {
          id: 'visit-1',
          sync_status: 'conflict',
          patient: { first_name: 'John', last_name: 'Doe' },
          visit_date: new Date(),
          status: 'SCHEDULED',
          sync_error_message: null
        },
        {
          id: 'visit-2',
          sync_status: 'error',
          patient: { first_name: 'Jane', last_name: 'Smith' },
          visit_date: new Date(),
          status: 'SCHEDULED',
          sync_error_message: 'API Error'
        }
      ];

      Visit.findAll.mockResolvedValue(mockVisitsWithIssues);

      const result = await googleCalendarService.getSyncIssues('user-123');

      expect(result.total).toBe(2);
      expect(result.conflicts).toBe(1);
      expect(result.errors).toBe(1);
      expect(result.visits).toHaveLength(2);
    });

    it('should return empty results when no issues', async () => {
      Visit.findAll.mockResolvedValue([]);

      const result = await googleCalendarService.getSyncIssues('user-123');

      expect(result.total).toBe(0);
      expect(result.conflicts).toBe(0);
      expect(result.errors).toBe(0);
    });
  });

  describe('getSyncStats', () => {
    beforeEach(() => {
      // Set up count and findOne mocks
      Visit.count = jest.fn();
      Visit.findOne = jest.fn();
    });

    it('should return sync statistics for user', async () => {
      Visit.findAll.mockResolvedValue([
        { sync_status: 'synced', count: '10' },
        { sync_status: 'pending_to_google', count: '2' },
        { sync_status: 'conflict', count: '1' }
      ]);
      Visit.count.mockResolvedValue(15);
      Visit.findOne.mockResolvedValue({ last_sync_at: new Date() });

      const result = await googleCalendarService.getSyncStats('user-123');

      expect(result).toHaveProperty('totalVisits');
      expect(result).toHaveProperty('totalWithGoogle');
      expect(result).toHaveProperty('lastSyncAt');
      expect(result).toHaveProperty('byStatus');
    });
  });

  describe('Constants', () => {
    it('should export CALENDAR_RELEVANT_FIELDS', () => {
      expect(googleCalendarService.CALENDAR_RELEVANT_FIELDS).toBeDefined();
      expect(googleCalendarService.CALENDAR_RELEVANT_FIELDS).toContain('visit_date');
      expect(googleCalendarService.CALENDAR_RELEVANT_FIELDS).toContain('status');
    });

    it('should export MAX_SYNC_ERROR_COUNT', () => {
      expect(googleCalendarService.MAX_SYNC_ERROR_COUNT).toBeDefined();
      expect(googleCalendarService.MAX_SYNC_ERROR_COUNT).toBe(3);
    });
  });
});