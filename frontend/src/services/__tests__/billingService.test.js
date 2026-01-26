/**
 * Billing Service Tests
 * Tests for billing API service functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api';
import { getInvoices, getInvoicesByVisit, getInvoiceById, downloadInvoicePDF } from '../billingService';

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

describe('billingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getInvoices', () => {
    it('should call API with correct endpoint', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      api.get.mockResolvedValue(mockResponse);

      await getInvoices();

      expect(api.get).toHaveBeenCalledWith('/api/billing', { params: {} });
    });

    it('should pass filters to API', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      api.get.mockResolvedValue(mockResponse);

      const filters = { status: 'PAID', patient_id: 'test-id' };
      await getInvoices(filters);

      expect(api.get).toHaveBeenCalledWith('/api/billing', { params: filters });
    });
  });

  describe('getInvoicesByVisit', () => {
    it('should call API with visit_id filter', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      api.get.mockResolvedValue(mockResponse);

      const visitId = 'visit-123';
      await getInvoicesByVisit(visitId);

      expect(api.get).toHaveBeenCalledWith('/api/billing', { params: { visit_id: visitId } });
    });

    it('should return invoices for the visit', async () => {
      const mockInvoices = [
        { id: 'inv-1', invoice_number: 'INV-001', visit_id: 'visit-123', total_amount: 100 },
        { id: 'inv-2', invoice_number: 'INV-002', visit_id: 'visit-123', total_amount: 150 }
      ];
      const mockResponse = { data: { success: true, data: mockInvoices } };
      api.get.mockResolvedValue(mockResponse);

      const result = await getInvoicesByVisit('visit-123');

      expect(result.data.data).toHaveLength(2);
      expect(result.data.data[0].invoice_number).toBe('INV-001');
    });

    it('should return empty array when no invoices for visit', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      api.get.mockResolvedValue(mockResponse);

      const result = await getInvoicesByVisit('visit-no-invoices');

      expect(result.data.data).toHaveLength(0);
    });
  });

  describe('getInvoiceById', () => {
    it('should call API with correct invoice ID', async () => {
      const mockResponse = { data: { success: true, data: { id: 'inv-123' } } };
      api.get.mockResolvedValue(mockResponse);

      await getInvoiceById('inv-123');

      expect(api.get).toHaveBeenCalledWith('/api/billing/inv-123');
    });
  });

  describe('downloadInvoicePDF', () => {
    it('should call API with correct endpoint and responseType blob', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      const mockResponse = { data: mockBlob, headers: { 'content-disposition': 'attachment; filename="invoice.pdf"' } };
      api.get.mockResolvedValue(mockResponse);

      const result = await downloadInvoicePDF('inv-123');

      expect(api.get).toHaveBeenCalledWith('/api/billing/inv-123/pdf', { responseType: 'blob' });
      expect(result.data).toBe(mockBlob);
    });
  });
});
