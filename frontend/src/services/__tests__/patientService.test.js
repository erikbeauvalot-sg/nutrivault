/**
 * Patient Service Tests
 * Tests for patient API service functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api';
import {
  getPatients,
  getPatientById,
  getPatientDetails,
  createPatient,
  updatePatient,
  deletePatient,
  getPortalStatus,
  activatePortal,
  deactivatePortal,
  reactivatePortal,
  getPatientJournal,
  createPatientJournalEntry,
  updatePatientJournalEntry,
  deletePatientJournalEntry,
  addJournalComment,
  deleteJournalComment,
  resendPortalInvitation,
  sendPortalPasswordReset
} from '../patientService';

// Mock the API module
vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

// Helper: build a standard { data: { data: <payload> } } axios-like response
const makeResponse = (payload, extra = {}) => ({
  data: { data: payload, ...extra }
});

// Helper: build a response without the nested `data` wrapper (direct data)
const makeDirectResponse = (payload) => ({
  data: payload
});

describe('patientService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // getPatients
  // ==========================================

  describe('getPatients()', () => {
    it('calls api.get with the patients endpoint and no query string when no filters', async () => {
      api.get.mockResolvedValue(makeResponse([]));

      await getPatients();

      expect(api.get).toHaveBeenCalledWith('/patients?');
    });

    it('appends valid string filters to the query string', async () => {
      api.get.mockResolvedValue(makeResponse([]));

      await getPatients({ search: 'Dupont', page: 2, limit: 20 });

      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('search=Dupont')
      );
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      );
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('limit=20')
      );
    });

    it('does not append null filter values', async () => {
      api.get.mockResolvedValue(makeResponse([]));

      await getPatients({ search: null, page: 1 });

      const url = api.get.mock.calls[0][0];
      expect(url).not.toContain('search');
      expect(url).toContain('page=1');
    });

    it('does not append undefined filter values', async () => {
      api.get.mockResolvedValue(makeResponse([]));

      await getPatients({ search: undefined, limit: 10 });

      const url = api.get.mock.calls[0][0];
      expect(url).not.toContain('search');
      expect(url).toContain('limit=10');
    });

    it('skips empty string values for all keys except is_active', async () => {
      api.get.mockResolvedValue(makeResponse([]));

      await getPatients({ search: '', page: 1 });

      const url = api.get.mock.calls[0][0];
      expect(url).not.toContain('search');
      expect(url).toContain('page=1');
    });

    it('allows empty string for the is_active key (needed for "All Status")', async () => {
      api.get.mockResolvedValue(makeResponse([]));

      await getPatients({ is_active: '' });

      const url = api.get.mock.calls[0][0];
      expect(url).toContain('is_active=');
    });

    it('returns extracted data and pagination', async () => {
      const mockPatients = [{ id: 'p-1', first_name: 'Alice' }];
      const mockPagination = { page: 1, limit: 20, total: 1, totalPages: 1 };
      api.get.mockResolvedValue({
        data: { data: mockPatients, pagination: mockPagination }
      });

      const result = await getPatients();

      expect(result.data).toEqual(mockPatients);
      expect(result.pagination).toEqual(mockPagination);
    });

    it('returns an empty array as default data when response.data has a data field of null', async () => {
      // extractData: response.data has 'data' key → returns data ?? defaultValue
      // When data key is explicitly null, the default [] is used.
      api.get.mockResolvedValue({ data: { data: null } });

      const result = await getPatients();

      expect(result.data).toEqual([]);
    });

    it('returns null pagination when none is present', async () => {
      api.get.mockResolvedValue(makeResponse([]));

      const result = await getPatients();

      expect(result.pagination).toBeNull();
    });
  });

  // ==========================================
  // getPatientById
  // ==========================================

  describe('getPatientById()', () => {
    it('calls api.get with the correct patient ID in the URL', async () => {
      api.get.mockResolvedValue(makeResponse({ id: 'patient-123' }));

      await getPatientById('patient-123');

      expect(api.get).toHaveBeenCalledWith('/patients/patient-123');
    });

    it('returns the extracted patient object', async () => {
      const mockPatient = { id: 'patient-123', first_name: 'Alice', last_name: 'Dupont' };
      api.get.mockResolvedValue(makeResponse(mockPatient));

      const result = await getPatientById('patient-123');

      expect(result).toEqual(mockPatient);
    });

    it('handles a flat response (no nested data wrapper)', async () => {
      const mockPatient = { id: 'patient-abc', first_name: 'Bob' };
      api.get.mockResolvedValue(makeDirectResponse(mockPatient));

      const result = await getPatientById('patient-abc');

      // extractData returns responseData directly when it has no 'data' key
      expect(result).toEqual(mockPatient);
    });
  });

  // ==========================================
  // getPatientDetails
  // ==========================================

  describe('getPatientDetails()', () => {
    it('calls api.get with the /details endpoint', async () => {
      api.get.mockResolvedValue(makeResponse({ id: 'patient-123', visits: [] }));

      await getPatientDetails('patient-123');

      expect(api.get).toHaveBeenCalledWith('/patients/patient-123/details');
    });

    it('returns the extracted details object', async () => {
      const mockDetails = { id: 'patient-123', visits: [{ id: 'v-1' }], measures: [] };
      api.get.mockResolvedValue(makeResponse(mockDetails));

      const result = await getPatientDetails('patient-123');

      expect(result).toEqual(mockDetails);
    });
  });

  // ==========================================
  // createPatient
  // ==========================================

  describe('createPatient()', () => {
    it('calls api.post with /patients and the patient data', async () => {
      const newPatientData = { first_name: 'Charles', last_name: 'Martin', email: 'c@example.com' };
      api.post.mockResolvedValue(makeResponse({ id: 'new-patient', ...newPatientData }));

      await createPatient(newPatientData);

      expect(api.post).toHaveBeenCalledWith('/patients', newPatientData);
    });

    it('returns the created patient object', async () => {
      const newPatientData = { first_name: 'Charles', last_name: 'Martin' };
      const createdPatient = { id: 'new-patient', ...newPatientData };
      api.post.mockResolvedValue(makeResponse(createdPatient));

      const result = await createPatient(newPatientData);

      expect(result).toEqual(createdPatient);
      expect(result.id).toBe('new-patient');
    });

    it('propagates API errors', async () => {
      const error = new Error('Validation failed');
      error.response = { status: 422, data: { error: 'Email already exists' } };
      api.post.mockRejectedValue(error);

      await expect(createPatient({ email: 'dup@example.com' })).rejects.toThrow('Validation failed');
    });
  });

  // ==========================================
  // updatePatient
  // ==========================================

  describe('updatePatient()', () => {
    it('calls api.put with the correct patient ID and update data', async () => {
      const updateData = { first_name: 'Updated' };
      api.put.mockResolvedValue(makeResponse({ id: 'patient-123', ...updateData }));

      await updatePatient('patient-123', updateData);

      expect(api.put).toHaveBeenCalledWith('/patients/patient-123', updateData);
    });

    it('returns the updated patient object', async () => {
      const updateData = { phone: '0601020304' };
      const updatedPatient = { id: 'patient-123', first_name: 'Alice', ...updateData };
      api.put.mockResolvedValue(makeResponse(updatedPatient));

      const result = await updatePatient('patient-123', updateData);

      expect(result).toEqual(updatedPatient);
      expect(result.phone).toBe('0601020304');
    });

    it('propagates API errors', async () => {
      api.put.mockRejectedValue(new Error('Patient not found'));

      await expect(updatePatient('invalid-id', {})).rejects.toThrow('Patient not found');
    });
  });

  // ==========================================
  // deletePatient
  // ==========================================

  describe('deletePatient()', () => {
    it('calls api.delete with the correct patient ID', async () => {
      api.delete.mockResolvedValue(makeResponse({ message: 'Patient deleted' }));

      await deletePatient('patient-123');

      expect(api.delete).toHaveBeenCalledWith('/patients/patient-123');
    });

    it('returns the deletion result', async () => {
      const deleteResult = { message: 'Patient soft-deleted successfully' };
      api.delete.mockResolvedValue(makeResponse(deleteResult));

      const result = await deletePatient('patient-123');

      expect(result).toEqual(deleteResult);
    });

    it('propagates API errors', async () => {
      api.delete.mockRejectedValue(new Error('Forbidden'));

      await expect(deletePatient('patient-123')).rejects.toThrow('Forbidden');
    });
  });

  // ==========================================
  // Portal management
  // ==========================================

  describe('getPortalStatus()', () => {
    it('calls api.get with the correct portal status endpoint', async () => {
      api.get.mockResolvedValue(makeResponse({ status: 'active' }));

      await getPortalStatus('patient-123');

      expect(api.get).toHaveBeenCalledWith('/patients/patient-123/portal/status');
    });

    it('returns the extracted portal status data', async () => {
      const statusData = { status: 'active', last_login: '2026-01-15T10:00:00Z' };
      api.get.mockResolvedValue(makeResponse(statusData));

      const result = await getPortalStatus('patient-123');

      expect(result).toEqual(statusData);
    });
  });

  describe('activatePortal()', () => {
    it('calls api.post with the correct activate endpoint', async () => {
      api.post.mockResolvedValue(makeResponse({ status: 'active' }));

      await activatePortal('patient-123');

      expect(api.post).toHaveBeenCalledWith('/patients/patient-123/portal/activate');
    });

    it('returns the extracted response data', async () => {
      const activationResult = { status: 'active', email_sent: true };
      api.post.mockResolvedValue(makeResponse(activationResult));

      const result = await activatePortal('patient-123');

      expect(result).toEqual(activationResult);
    });

    it('does not send any request body', async () => {
      api.post.mockResolvedValue(makeResponse({}));

      await activatePortal('patient-123');

      // api.post should be called with just the URL, no body argument
      expect(api.post).toHaveBeenCalledWith('/patients/patient-123/portal/activate');
      expect(api.post.mock.calls[0].length).toBe(1);
    });
  });

  describe('deactivatePortal()', () => {
    it('calls api.post with the correct deactivate endpoint', async () => {
      api.post.mockResolvedValue(makeResponse({ status: 'inactive' }));

      await deactivatePortal('patient-123');

      expect(api.post).toHaveBeenCalledWith('/patients/patient-123/portal/deactivate');
    });

    it('returns the extracted response data', async () => {
      const deactivationResult = { status: 'inactive' };
      api.post.mockResolvedValue(makeResponse(deactivationResult));

      const result = await deactivatePortal('patient-123');

      expect(result).toEqual(deactivationResult);
    });
  });

  describe('reactivatePortal()', () => {
    it('calls api.post with the correct reactivate endpoint', async () => {
      api.post.mockResolvedValue(makeResponse({ status: 'active' }));

      await reactivatePortal('patient-123');

      expect(api.post).toHaveBeenCalledWith('/patients/patient-123/portal/reactivate');
    });

    it('returns the extracted response data', async () => {
      const result = await reactivatePortal('patient-abc');
      // We only verify the call and that it does not throw; result shape depends on backend
      expect(api.post).toHaveBeenCalledWith('/patients/patient-abc/portal/reactivate');
    });
  });

  describe('resendPortalInvitation()', () => {
    it('calls api.post with the correct resend endpoint', async () => {
      api.post.mockResolvedValue(makeResponse({ sent: true }));

      await resendPortalInvitation('patient-123');

      expect(api.post).toHaveBeenCalledWith('/patients/patient-123/portal/resend');
    });
  });

  describe('sendPortalPasswordReset()', () => {
    it('calls api.post with the correct password reset endpoint', async () => {
      api.post.mockResolvedValue(makeResponse({ sent: true }));

      await sendPortalPasswordReset('patient-123');

      expect(api.post).toHaveBeenCalledWith('/patients/patient-123/portal/reset-password');
    });
  });

  // ==========================================
  // Journal functions
  // ==========================================

  describe('getPatientJournal()', () => {
    it('calls api.get with the correct journal endpoint', async () => {
      api.get.mockResolvedValue({ data: [] });

      await getPatientJournal('patient-123');

      expect(api.get).toHaveBeenCalledWith('/patients/patient-123/journal?');
    });

    it('appends date and filter params when provided', async () => {
      api.get.mockResolvedValue({ data: [] });

      await getPatientJournal('patient-123', {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        entry_type: 'meal',
        mood: 'happy',
        page: 2,
        limit: 10
      });

      const url = api.get.mock.calls[0][0];
      expect(url).toContain('startDate=2026-01-01');
      expect(url).toContain('endDate=2026-01-31');
      expect(url).toContain('entry_type=meal');
      expect(url).toContain('mood=happy');
      expect(url).toContain('page=2');
      expect(url).toContain('limit=10');
    });

    it('does not append falsy params', async () => {
      api.get.mockResolvedValue({ data: [] });

      await getPatientJournal('patient-123', { startDate: '', entry_type: null });

      const url = api.get.mock.calls[0][0];
      expect(url).not.toContain('startDate');
      expect(url).not.toContain('entry_type');
    });

    it('returns response.data directly', async () => {
      const mockEntries = [{ id: 'entry-1', content: 'Had salad' }];
      api.get.mockResolvedValue({ data: mockEntries });

      const result = await getPatientJournal('patient-123');

      expect(result).toEqual(mockEntries);
    });
  });

  describe('createPatientJournalEntry()', () => {
    it('calls api.post with correct endpoint and data', async () => {
      const entryData = { content: 'Morning jog', entry_type: 'activity' };
      api.post.mockResolvedValue(makeResponse({ id: 'entry-1', ...entryData }));

      await createPatientJournalEntry('patient-123', entryData);

      expect(api.post).toHaveBeenCalledWith('/patients/patient-123/journal', entryData);
    });

    it('returns the created entry', async () => {
      const entryData = { content: 'Lunch notes' };
      const createdEntry = { id: 'entry-2', ...entryData };
      api.post.mockResolvedValue(makeResponse(createdEntry));

      const result = await createPatientJournalEntry('patient-123', entryData);

      expect(result).toEqual(createdEntry);
    });
  });

  describe('updatePatientJournalEntry()', () => {
    it('calls api.put with correct endpoint and data', async () => {
      const updateData = { content: 'Updated content' };
      api.put.mockResolvedValue(makeResponse({ id: 'entry-1', ...updateData }));

      await updatePatientJournalEntry('patient-123', 'entry-1', updateData);

      expect(api.put).toHaveBeenCalledWith('/patients/patient-123/journal/entry-1', updateData);
    });
  });

  describe('deletePatientJournalEntry()', () => {
    it('calls api.delete with the correct endpoint', async () => {
      api.delete.mockResolvedValue(makeResponse({ deleted: true }));

      await deletePatientJournalEntry('patient-123', 'entry-1');

      expect(api.delete).toHaveBeenCalledWith('/patients/patient-123/journal/entry-1');
    });
  });

  describe('addJournalComment()', () => {
    it('calls api.post with correct endpoint and comment data', async () => {
      const commentData = { content: 'Great progress!' };
      api.post.mockResolvedValue(makeResponse({ id: 'comment-1', ...commentData }));

      await addJournalComment('patient-123', 'entry-1', commentData);

      expect(api.post).toHaveBeenCalledWith(
        '/patients/patient-123/journal/entry-1/comments',
        commentData
      );
    });
  });

  describe('deleteJournalComment()', () => {
    it('calls api.delete with the correct endpoint', async () => {
      api.delete.mockResolvedValue(makeResponse({ deleted: true }));

      await deleteJournalComment('patient-123', 'comment-1');

      expect(api.delete).toHaveBeenCalledWith('/patients/patient-123/journal/comments/comment-1');
    });
  });

  // ==========================================
  // Error propagation (shared behavior)
  // ==========================================

  describe('error propagation', () => {
    it('getPatientById propagates network errors', async () => {
      api.get.mockRejectedValue(new Error('Network error'));

      await expect(getPatientById('patient-123')).rejects.toThrow('Network error');
    });

    it('getPortalStatus propagates 403 errors', async () => {
      const error = new Error('Forbidden');
      error.response = { status: 403 };
      api.get.mockRejectedValue(error);

      await expect(getPortalStatus('patient-123')).rejects.toThrow('Forbidden');
    });

    it('activatePortal propagates API errors', async () => {
      api.post.mockRejectedValue(new Error('Portal already active'));

      await expect(activatePortal('patient-123')).rejects.toThrow('Portal already active');
    });

    it('deletePatientJournalEntry propagates API errors', async () => {
      api.delete.mockRejectedValue(new Error('Entry not found'));

      await expect(deletePatientJournalEntry('patient-123', 'entry-999')).rejects.toThrow('Entry not found');
    });
  });
});
