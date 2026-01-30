/**
 * Appointment Reminder Service Tests
 * Tests for appointment reminder API service functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api';
import {
  sendReminderManually,
  sendInvitationManually,
  getReminderStats,
  unsubscribeFromReminders,
  resubscribeToReminders,
  triggerBatchReminders
} from '../appointmentReminderService';

// Mock the API module
vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}));

describe('appointmentReminderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // sendReminderManually
  // ========================================
  describe('sendReminderManually', () => {
    it('should call API with correct endpoint', async () => {
      const mockResponse = { data: { success: true, data: { visitId: 'visit-123' } } };
      api.post.mockResolvedValue(mockResponse);

      await sendReminderManually('visit-123');

      expect(api.post).toHaveBeenCalledWith('/appointment-reminders/send/visit-123');
    });

    it('should return response data', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Appointment reminder sent successfully',
          data: { visitId: 'visit-123', patientEmail: 'test@example.com' }
        }
      };
      api.post.mockResolvedValue(mockResponse);

      const result = await sendReminderManually('visit-123');

      expect(result.success).toBe(true);
      expect(result.data.visitId).toBe('visit-123');
    });

    it('should propagate API errors', async () => {
      const error = new Error('Visit not found');
      error.response = { data: { error: 'Visit not found' } };
      api.post.mockRejectedValue(error);

      await expect(sendReminderManually('invalid-id')).rejects.toThrow('Visit not found');
    });
  });

  // ========================================
  // sendInvitationManually
  // ========================================
  describe('sendInvitationManually', () => {
    it('should call API with correct endpoint', async () => {
      const mockResponse = { data: { success: true, data: { visitId: 'visit-123', type: 'invitation' } } };
      api.post.mockResolvedValue(mockResponse);

      await sendInvitationManually('visit-123');

      expect(api.post).toHaveBeenCalledWith('/appointment-reminders/invite/visit-123');
    });

    it('should return response data with type invitation', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Calendar invitation sent successfully',
          data: { visitId: 'visit-123', patientEmail: 'test@example.com', type: 'invitation' }
        }
      };
      api.post.mockResolvedValue(mockResponse);

      const result = await sendInvitationManually('visit-123');

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('invitation');
    });

    it('should propagate API errors', async () => {
      const error = new Error('Visit is in the past');
      error.response = { data: { error: 'Visit is in the past' } };
      api.post.mockRejectedValue(error);

      await expect(sendInvitationManually('old-visit')).rejects.toThrow('Visit is in the past');
    });
  });

  // ========================================
  // getReminderStats
  // ========================================
  describe('getReminderStats', () => {
    it('should call API with correct endpoint', async () => {
      const mockResponse = { data: { success: true, data: {} } };
      api.get.mockResolvedValue(mockResponse);

      await getReminderStats();

      expect(api.get).toHaveBeenCalledWith('/appointment-reminders/stats');
    });

    it('should return reminder statistics', async () => {
      const mockStats = {
        totalReminders: 50,
        visitsWithReminders: 45,
        upcomingNeedingReminders: 10,
        emailsSent: 48,
        emailsFailed: 2,
        patientsOptedOut: 5
      };
      const mockResponse = { data: { success: true, data: mockStats } };
      api.get.mockResolvedValue(mockResponse);

      const result = await getReminderStats();

      expect(result.data).toEqual(mockStats);
    });
  });

  // ========================================
  // unsubscribeFromReminders
  // ========================================
  describe('unsubscribeFromReminders', () => {
    it('should call API with unsubscribe token', async () => {
      const mockResponse = { data: { success: true } };
      api.post.mockResolvedValue(mockResponse);

      await unsubscribeFromReminders('unsubscribe-token-123');

      expect(api.post).toHaveBeenCalledWith('/appointment-reminders/unsubscribe/unsubscribe-token-123');
    });

    it('should return success response', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'You have been unsubscribed from appointment reminders',
          data: { patientId: 'patient-123' }
        }
      };
      api.post.mockResolvedValue(mockResponse);

      const result = await unsubscribeFromReminders('token-123');

      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // resubscribeToReminders
  // ========================================
  describe('resubscribeToReminders', () => {
    it('should call API with patient ID', async () => {
      const mockResponse = { data: { success: true } };
      api.post.mockResolvedValue(mockResponse);

      await resubscribeToReminders('patient-123');

      expect(api.post).toHaveBeenCalledWith('/appointment-reminders/resubscribe', {
        patientId: 'patient-123'
      });
    });

    it('should return success response', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'You have been resubscribed to appointment reminders',
          data: { patientId: 'patient-123', appointmentRemindersEnabled: true }
        }
      };
      api.post.mockResolvedValue(mockResponse);

      const result = await resubscribeToReminders('patient-123');

      expect(result.success).toBe(true);
      expect(result.data.appointmentRemindersEnabled).toBe(true);
    });
  });

  // ========================================
  // triggerBatchReminders
  // ========================================
  describe('triggerBatchReminders', () => {
    it('should call API with correct endpoint', async () => {
      const mockResponse = { data: { success: true, data: { totalSent: 5 } } };
      api.post.mockResolvedValue(mockResponse);

      await triggerBatchReminders();

      expect(api.post).toHaveBeenCalledWith('/appointment-reminders/batch/send-now');
    });

    it('should return batch job results', async () => {
      const mockResults = {
        success: true,
        remindersEnabled: true,
        totalSent: 10,
        totalFailed: 2,
        results: []
      };
      const mockResponse = { data: mockResults };
      api.post.mockResolvedValue(mockResponse);

      const result = await triggerBatchReminders();

      expect(result.totalSent).toBe(10);
      expect(result.totalFailed).toBe(2);
    });
  });
});
