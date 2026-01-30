/**
 * Visit Service Tests
 * Tests for visit API service functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api';
import { getVisits, getVisitById, createVisit, updateVisit, deleteVisit, finishAndInvoice } from '../visitService';

// Mock the API module
vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('visitService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getVisits', () => {
    it('should call API with correct endpoint', async () => {
      const mockVisits = [{ id: 'visit-1', visit_type: 'Consultation initiale' }];
      api.get.mockResolvedValue({ data: { success: true, data: mockVisits } });

      const result = await getVisits();

      expect(api.get).toHaveBeenCalledWith('/visits?');
      expect(result.data).toEqual(mockVisits);
    });

    it('should pass filters to API', async () => {
      const mockVisits = [{ id: 'visit-1' }];
      api.get.mockResolvedValue({ data: { success: true, data: mockVisits } });

      await getVisits({ patient_id: 'patient-123', status: 'COMPLETED' });

      expect(api.get).toHaveBeenCalledWith('/visits?patient_id=patient-123&status=COMPLETED');
    });
  });

  describe('getVisitById', () => {
    it('should call API with correct visit ID', async () => {
      const mockVisit = { id: 'visit-123', visit_type: 'Suivi' };
      api.get.mockResolvedValue({ data: { success: true, data: mockVisit } });

      const result = await getVisitById('visit-123');

      expect(api.get).toHaveBeenCalledWith('/visits/visit-123');
      expect(result).toEqual(mockVisit);
    });
  });

  describe('createVisit', () => {
    it('should call API with visit data', async () => {
      const visitData = {
        patient_id: 'patient-123',
        dietitian_id: 'user-456',
        visit_date: '2026-02-01T10:00:00Z',
        visit_type: 'Consultation initiale'
      };
      const mockResponse = { data: { success: true, data: { id: 'new-visit', ...visitData } } };
      api.post.mockResolvedValue(mockResponse);

      const result = await createVisit(visitData);

      expect(api.post).toHaveBeenCalledWith('/visits', visitData);
      expect(result.id).toBe('new-visit');
    });
  });

  describe('updateVisit', () => {
    it('should call API with visit ID and update data', async () => {
      const updateData = { status: 'COMPLETED', notes: 'Visit completed successfully' };
      api.put.mockResolvedValue({ data: { success: true, data: { id: 'visit-123', ...updateData } } });

      const result = await updateVisit('visit-123', updateData);

      expect(api.put).toHaveBeenCalledWith('/visits/visit-123', updateData);
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('deleteVisit', () => {
    it('should call API with correct visit ID', async () => {
      api.delete.mockResolvedValue({ data: { success: true, message: 'Visit deleted' } });

      await deleteVisit('visit-123');

      expect(api.delete).toHaveBeenCalledWith('/visits/visit-123');
    });
  });

  describe('finishAndInvoice', () => {
    it('should call API with visit ID and options', async () => {
      const options = {
        markCompleted: true,
        generateInvoice: true,
        sendEmail: false
      };
      const mockResponse = {
        data: {
          success: true,
          data: {
            actions: { markedCompleted: true, invoiceGenerated: true },
            invoice: { id: 'inv-123', amount_total: 80 },
            emailSent: false
          }
        }
      };
      api.post.mockResolvedValue(mockResponse);

      const result = await finishAndInvoice('visit-123', options);

      expect(api.post).toHaveBeenCalledWith('/visits/visit-123/finish-and-invoice', options);
      // extractData extracts the nested data
      expect(result.actions.markedCompleted).toBe(true);
      expect(result.invoice.amount_total).toBe(80);
    });

    it('should handle response without nested data', async () => {
      const options = { markCompleted: true };
      const mockResponse = {
        data: {
          actions: { markedCompleted: true },
          invoice: null
        }
      };
      api.post.mockResolvedValue(mockResponse);

      const result = await finishAndInvoice('visit-123', options);

      expect(result.actions.markedCompleted).toBe(true);
    });

    it('should handle API errors', async () => {
      const error = new Error('Visit not found');
      error.response = { status: 404, data: { error: 'Visit not found' } };
      api.post.mockRejectedValue(error);

      await expect(finishAndInvoice('invalid-id', {})).rejects.toThrow('Visit not found');
    });
  });
});
