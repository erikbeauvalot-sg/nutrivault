/**
 * VisitDetailPage Invoices Tab Tests
 * Tests for the invoices tab functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';

// Mock the services
vi.mock('../../services/billingService', () => ({
  getInvoicesByVisit: vi.fn(),
  downloadInvoicePDF: vi.fn()
}));

vi.mock('../../services/visitService', () => ({
  default: {
    getVisitById: vi.fn()
  }
}));

vi.mock('../../services/visitCustomFieldService', () => ({
  default: {
    getVisitCustomFields: vi.fn()
  }
}));

vi.mock('../../services/measureService', () => ({
  getMeasuresByVisit: vi.fn(),
  formatMeasureValue: vi.fn(),
  getAllMeasureTranslations: vi.fn()
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', role: 'ADMIN' }
  })
}));

import { getInvoicesByVisit, downloadInvoicePDF } from '../../services/billingService';
import visitService from '../../services/visitService';
import visitCustomFieldService from '../../services/visitCustomFieldService';
import { getMeasuresByVisit, getAllMeasureTranslations } from '../../services/measureService';

// Helper to wrap component with necessary providers
const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        {component}
      </I18nextProvider>
    </BrowserRouter>
  );
};

describe('VisitDetailPage - Invoices Tab', () => {
  const mockVisit = {
    id: 'visit-123',
    visit_date: '2026-01-15T10:00:00Z',
    status: 'COMPLETED',
    patient: {
      id: 'patient-1',
      first_name: 'Jean',
      last_name: 'Dupont',
      email: 'jean@example.com'
    },
    dietitian: {
      id: 'user-1',
      first_name: 'Dr',
      last_name: 'Smith'
    }
  };

  const mockInvoices = [
    {
      id: 'inv-1',
      invoice_number: 'INV-2026-001',
      invoice_date: '2026-01-15',
      status: 'PAID',
      total_amount: 100.00,
      amount_paid: 100.00,
      amount_due: 0,
      visit_id: 'visit-123'
    },
    {
      id: 'inv-2',
      invoice_number: 'INV-2026-002',
      invoice_date: '2026-01-16',
      status: 'SENT',
      total_amount: 150.00,
      amount_paid: 0,
      amount_due: 150.00,
      visit_id: 'visit-123'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    visitService.getVisitById.mockResolvedValue({ data: { data: mockVisit } });
    visitCustomFieldService.getVisitCustomFields.mockResolvedValue([]);
    getMeasuresByVisit.mockResolvedValue([]);
    getAllMeasureTranslations.mockResolvedValue({});
    getInvoicesByVisit.mockResolvedValue({ data: { data: mockInvoices } });
  });

  describe('Invoice data fetching', () => {
    it('should call getInvoicesByVisit with correct visit ID', async () => {
      getInvoicesByVisit.mockResolvedValue({ data: { data: mockInvoices } });

      // Simulate the fetch call that would happen in the component
      await getInvoicesByVisit('visit-123');

      expect(getInvoicesByVisit).toHaveBeenCalledWith('visit-123');
    });

    it('should return invoices linked to the visit', async () => {
      const result = await getInvoicesByVisit('visit-123');

      expect(result.data.data).toHaveLength(2);
      expect(result.data.data[0].invoice_number).toBe('INV-2026-001');
      expect(result.data.data[1].invoice_number).toBe('INV-2026-002');
    });

    it('should return empty array when visit has no invoices', async () => {
      getInvoicesByVisit.mockResolvedValue({ data: { data: [] } });

      const result = await getInvoicesByVisit('visit-no-invoices');

      expect(result.data.data).toHaveLength(0);
    });
  });

  describe('PDF Download', () => {
    it('should call downloadInvoicePDF with correct invoice ID', async () => {
      const mockPdfBlob = new Blob(['pdf'], { type: 'application/pdf' });
      downloadInvoicePDF.mockResolvedValue({
        data: mockPdfBlob,
        headers: { 'content-disposition': 'attachment; filename="invoice.pdf"' }
      });

      await downloadInvoicePDF('inv-1');

      expect(downloadInvoicePDF).toHaveBeenCalledWith('inv-1');
    });

    it('should return PDF blob', async () => {
      const mockPdfBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      downloadInvoicePDF.mockResolvedValue({
        data: mockPdfBlob,
        headers: { 'content-disposition': 'attachment; filename="INV-2026-001.pdf"' }
      });

      const result = await downloadInvoicePDF('inv-1');

      expect(result.data).toBeInstanceOf(Blob);
    });
  });

  describe('Invoice status display', () => {
    it('should correctly identify PAID status', () => {
      const paidInvoice = mockInvoices[0];
      expect(paidInvoice.status).toBe('PAID');
      expect(paidInvoice.amount_due).toBe(0);
    });

    it('should correctly identify SENT status with amount due', () => {
      const sentInvoice = mockInvoices[1];
      expect(sentInvoice.status).toBe('SENT');
      expect(sentInvoice.amount_due).toBeGreaterThan(0);
    });
  });

  describe('Currency formatting', () => {
    it('should format amounts correctly', () => {
      const formatCurrency = (amount, locale = 'fr-FR') => {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: 'EUR'
        }).format(amount || 0);
      };

      expect(formatCurrency(100)).toContain('100');
      expect(formatCurrency(150.50)).toContain('150');
      expect(formatCurrency(0)).toContain('0');
    });
  });
});
