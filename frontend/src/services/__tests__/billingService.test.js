/**
 * Billing Service Tests
 * Tests for billing API service functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api';
import {
  getInvoices,
  getInvoicesByVisit,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  recordPayment,
  deleteInvoice,
  sendInvoiceEmail,
  markAsPaid,
  downloadInvoicePDF
} from '../billingService';

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

      expect(api.get).toHaveBeenCalledWith('/billing', { params: {} });
    });

    it('should pass filters to API', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      api.get.mockResolvedValue(mockResponse);

      const filters = { status: 'PAID', patient_id: 'test-id' };
      await getInvoices(filters);

      expect(api.get).toHaveBeenCalledWith('/billing', { params: filters });
    });
  });

  describe('getInvoicesByVisit', () => {
    it('should call API with visit_id filter', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      api.get.mockResolvedValue(mockResponse);

      const visitId = 'visit-123';
      await getInvoicesByVisit(visitId);

      expect(api.get).toHaveBeenCalledWith('/billing', { params: { visit_id: visitId } });
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

      expect(api.get).toHaveBeenCalledWith('/billing/inv-123');
    });
  });

  describe('downloadInvoicePDF', () => {
    it('should call API with correct endpoint and responseType blob', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      const mockResponse = { data: mockBlob, headers: { 'content-disposition': 'attachment; filename="invoice.pdf"' } };
      api.get.mockResolvedValue(mockResponse);

      const result = await downloadInvoicePDF('inv-123');

      expect(api.get).toHaveBeenCalledWith('/billing/inv-123/pdf?lang=fr', { responseType: 'blob' });
      expect(result.data).toBe(mockBlob);
    });

    it('should use specified language for PDF generation', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      api.get.mockResolvedValue({ data: mockBlob });

      await downloadInvoicePDF('inv-123', 'en');

      expect(api.get).toHaveBeenCalledWith('/billing/inv-123/pdf?lang=en', { responseType: 'blob' });
    });
  });

  describe('createInvoice', () => {
    it('should call API with correct data', async () => {
      const invoiceData = {
        patient_id: 'patient-123',
        visit_id: 'visit-456',
        service_description: 'Consultation initiale',
        amount_total: 80.00,
        due_date: '2026-02-15'
      };
      const mockResponse = {
        data: {
          success: true,
          data: { id: 'inv-new', invoice_number: 'INV-2026-0001', ...invoiceData }
        }
      };
      api.post.mockResolvedValue(mockResponse);

      const result = await createInvoice(invoiceData);

      expect(api.post).toHaveBeenCalledWith('/billing', invoiceData);
      expect(result.success).toBe(true);
      expect(result.data.invoice_number).toBe('INV-2026-0001');
    });

    it('should handle invoice creation without visit_id', async () => {
      const invoiceData = {
        patient_id: 'patient-123',
        service_description: 'Consultation',
        amount_total: 50.00
      };
      const mockResponse = { data: { success: true, data: { id: 'inv-new' } } };
      api.post.mockResolvedValue(mockResponse);

      await createInvoice(invoiceData);

      expect(api.post).toHaveBeenCalledWith('/billing', invoiceData);
    });

    it('should propagate API errors', async () => {
      const error = new Error('Patient not found');
      error.response = { status: 404, data: { error: 'Patient not found' } };
      api.post.mockRejectedValue(error);

      await expect(createInvoice({ patient_id: 'invalid' })).rejects.toThrow('Patient not found');
    });
  });

  describe('updateInvoice', () => {
    it('should call API with correct invoice ID and data', async () => {
      const updateData = {
        service_description: 'Updated description',
        amount_total: 100.00
      };
      const mockResponse = { data: { success: true, data: { id: 'inv-123', ...updateData } } };
      api.put.mockResolvedValue(mockResponse);

      const result = await updateInvoice('inv-123', updateData);

      expect(api.put).toHaveBeenCalledWith('/billing/inv-123', updateData);
      expect(result.data.amount_total).toBe(100.00);
    });
  });

  describe('recordPayment', () => {
    it('should call API with payment data', async () => {
      const paymentData = {
        amount: 50.00,
        payment_method: 'CARD',
        payment_date: '2026-01-30',
        notes: 'Partial payment'
      };
      const mockResponse = {
        data: {
          success: true,
          data: { id: 'inv-123', amount_paid: 50.00, amount_due: 30.00 }
        }
      };
      api.post.mockResolvedValue(mockResponse);

      const result = await recordPayment('inv-123', paymentData);

      expect(api.post).toHaveBeenCalledWith('/billing/inv-123/payment', paymentData);
      expect(result.data.amount_paid).toBe(50.00);
    });
  });

  describe('deleteInvoice', () => {
    it('should call API with correct invoice ID', async () => {
      const mockResponse = { data: { success: true, message: 'Invoice deleted' } };
      api.delete.mockResolvedValue(mockResponse);

      await deleteInvoice('inv-123');

      expect(api.delete).toHaveBeenCalledWith('/billing/inv-123');
    });
  });

  describe('sendInvoiceEmail', () => {
    it('should call API to send invoice email', async () => {
      const mockResponse = { data: { success: true, message: 'Invoice sent successfully' } };
      api.post.mockResolvedValue(mockResponse);

      const result = await sendInvoiceEmail('inv-123');

      expect(api.post).toHaveBeenCalledWith('/billing/inv-123/send-email');
      expect(result.success).toBe(true);
    });
  });

  describe('markAsPaid', () => {
    it('should call API to mark invoice as paid', async () => {
      const mockResponse = {
        data: { success: true, data: { id: 'inv-123', status: 'PAID', amount_due: 0 } }
      };
      api.post.mockResolvedValue(mockResponse);

      const result = await markAsPaid('inv-123');

      expect(api.post).toHaveBeenCalledWith('/billing/inv-123/mark-paid');
      expect(result.data.status).toBe('PAID');
    });
  });
});
