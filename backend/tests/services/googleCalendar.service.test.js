/**
 * Google Calendar Service Tests
 *
 * Tests for Google Calendar integration functionality
 */

const googleCalendarService = require('../../src/services/googleCalendar.service');
const { User, Visit, Patient } = require('../../../models');

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
});