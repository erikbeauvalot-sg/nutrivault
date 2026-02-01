/**
 * Scheduler Service Tests
 * Tests for the scheduler service functions
 */

const testDb = require('./setup/testDb');

// Mock node-cron
jest.mock('node-cron', () => ({
  validate: jest.fn((expression) => {
    // Valid cron expressions
    const validPatterns = ['0 * * * *', '* * * * *', '0 9 * * *'];
    return validPatterns.includes(expression) || /^[\d\s\*\/\-,]+$/.test(expression);
  }),
  schedule: jest.fn((expression, callback, options) => ({
    stop: jest.fn(),
    start: jest.fn()
  }))
}));

// Mock appointment reminder service
jest.mock('../src/services/appointmentReminder.service', () => ({
  processScheduledReminders: jest.fn().mockResolvedValue({
    totalSent: 5,
    totalFailed: 1
  })
}));

// Mock campaign sender service
jest.mock('../src/services/campaignSender.service', () => ({
  processScheduledCampaigns: jest.fn().mockResolvedValue()
}));

let db;
let schedulerService;
let cron;
let appointmentReminderService;
let campaignSenderService;

describe('Scheduler Service', () => {
  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();

    schedulerService = require('../src/services/scheduler.service');
    cron = require('node-cron');
    appointmentReminderService = require('../src/services/appointmentReminder.service');
    campaignSenderService = require('../src/services/campaignSender.service');
  });

  afterAll(async () => {
    schedulerService.stopAllJobs();
    await testDb.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    schedulerService.stopAllJobs();
  });

  describe('scheduleAppointmentReminders', () => {
    it('should schedule appointment reminders with default cron', async () => {
      await schedulerService.scheduleAppointmentReminders();

      expect(cron.validate).toHaveBeenCalled();
      expect(cron.schedule).toHaveBeenCalled();

      // Check that schedule was called with correct timezone
      const scheduleCall = cron.schedule.mock.calls[0];
      expect(scheduleCall[2]).toHaveProperty('timezone');
    });

    it('should validate cron expression before scheduling', async () => {
      cron.validate.mockReturnValueOnce(false);

      await schedulerService.scheduleAppointmentReminders();

      // Should not schedule if validation fails
      const scheduleCallsAfterValidation = cron.schedule.mock.calls.length;
      expect(scheduleCallsAfterValidation).toBe(0);
    });

    it('should stop existing job before scheduling new one', async () => {
      const mockStop = jest.fn();
      cron.schedule.mockReturnValueOnce({ stop: mockStop, start: jest.fn() });

      await schedulerService.scheduleAppointmentReminders();
      await schedulerService.scheduleAppointmentReminders();

      expect(mockStop).toHaveBeenCalled();
    });
  });

  describe('scheduleScheduledCampaigns', () => {
    it('should schedule campaign sender job', async () => {
      await schedulerService.scheduleScheduledCampaigns();

      expect(cron.schedule).toHaveBeenCalledWith(
        '* * * * *',
        expect.any(Function),
        expect.objectContaining({ scheduled: true })
      );
    });

    it('should stop existing campaign job before scheduling new one', async () => {
      const mockStop = jest.fn();
      cron.schedule.mockReturnValueOnce({ stop: mockStop, start: jest.fn() });

      await schedulerService.scheduleScheduledCampaigns();
      await schedulerService.scheduleScheduledCampaigns();

      expect(mockStop).toHaveBeenCalled();
    });
  });

  describe('initializeScheduledJobs', () => {
    it('should initialize all scheduled jobs', async () => {
      await schedulerService.initializeScheduledJobs();

      // Should have scheduled both jobs
      expect(cron.schedule).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during initialization', async () => {
      // Mock an error in schedule
      cron.schedule.mockImplementationOnce(() => {
        throw new Error('Schedule failed');
      });

      // Should not throw
      await expect(schedulerService.initializeScheduledJobs()).resolves.not.toThrow();
    });
  });

  describe('stopAllJobs', () => {
    it('should stop all running jobs', async () => {
      const mockStop1 = jest.fn();
      const mockStop2 = jest.fn();

      cron.schedule
        .mockReturnValueOnce({ stop: mockStop1, start: jest.fn() })
        .mockReturnValueOnce({ stop: mockStop2, start: jest.fn() });

      await schedulerService.initializeScheduledJobs();
      schedulerService.stopAllJobs();

      expect(mockStop1).toHaveBeenCalled();
      expect(mockStop2).toHaveBeenCalled();
    });

    it('should handle stopping when no jobs are running', () => {
      expect(() => schedulerService.stopAllJobs()).not.toThrow();
    });
  });

  describe('getJobStatus', () => {
    it('should return status object with correct structure', () => {
      const status = schedulerService.getJobStatus();

      expect(status).toHaveProperty('appointmentReminders');
      expect(status).toHaveProperty('scheduledCampaigns');
      expect(status.appointmentReminders).toHaveProperty('running');
      expect(status.scheduledCampaigns).toHaveProperty('running');
    });

    it('should return running true after scheduling jobs', async () => {
      cron.schedule.mockReturnValue({ stop: jest.fn(), start: jest.fn() });

      await schedulerService.initializeScheduledJobs();
      const status = schedulerService.getJobStatus();

      expect(status.appointmentReminders.running).toBe(true);
      expect(status.scheduledCampaigns.running).toBe(true);
    });

    it('should include schedule information', () => {
      const status = schedulerService.getJobStatus();

      expect(status.appointmentReminders).toHaveProperty('schedule');
      expect(status.scheduledCampaigns).toHaveProperty('schedule');
      expect(status.scheduledCampaigns.schedule).toBe('* * * * *');
    });
  });

  describe('triggerAppointmentRemindersNow', () => {
    it('should manually trigger appointment reminder job', async () => {
      const result = await schedulerService.triggerAppointmentRemindersNow();

      expect(appointmentReminderService.processScheduledReminders).toHaveBeenCalled();
      expect(result).toEqual({
        totalSent: 5,
        totalFailed: 1
      });
    });

    it('should propagate errors from reminder service', async () => {
      appointmentReminderService.processScheduledReminders.mockRejectedValueOnce(
        new Error('Reminder failed')
      );

      await expect(schedulerService.triggerAppointmentRemindersNow())
        .rejects.toThrow('Reminder failed');
    });
  });

  describe('triggerScheduledCampaignsNow', () => {
    it('should manually trigger campaign sender job', async () => {
      await schedulerService.triggerScheduledCampaignsNow();

      expect(campaignSenderService.processScheduledCampaigns).toHaveBeenCalled();
    });

    it('should propagate errors from campaign service', async () => {
      campaignSenderService.processScheduledCampaigns.mockRejectedValueOnce(
        new Error('Campaign failed')
      );

      await expect(schedulerService.triggerScheduledCampaignsNow())
        .rejects.toThrow('Campaign failed');
    });
  });
});
