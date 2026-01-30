/**
 * CreateInvoiceModal Component Tests
 * Tests for invoice creation with visit type price pre-filling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateInvoiceModal from '../CreateInvoiceModal';

// Mock translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key
  })
}));

// Mock patient service
vi.mock('../../services/patientService', () => ({
  getPatients: vi.fn()
}));

// Mock visit service
vi.mock('../../services/visitService', () => ({
  getVisits: vi.fn()
}));

// Mock visit type service
vi.mock('../../services/visitTypeService', () => ({
  default: {
    getAllVisitTypes: vi.fn()
  }
}));

import * as patientService from '../../services/patientService';
import * as visitService from '../../services/visitService';
import visitTypeService from '../../services/visitTypeService';

describe('CreateInvoiceModal', () => {
  const mockPatients = [
    { id: 'patient-1', first_name: 'Jean', last_name: 'Dupont', email: 'jean@test.com' }
  ];

  const mockVisitTypes = [
    { id: 'vt-1', name: 'Consultation initiale', default_price: 80.00 },
    { id: 'vt-2', name: 'Suivi', default_price: 60.00 },
    { id: 'vt-3', name: 'Urgence', default_price: null }
  ];

  const mockVisits = [
    { id: 'visit-1', visit_date: '2026-01-15T10:00:00Z', visit_type: 'Consultation initiale', status: 'COMPLETED' },
    { id: 'visit-2', visit_date: '2026-01-20T14:00:00Z', visit_type: 'Suivi', status: 'COMPLETED' },
    { id: 'visit-3', visit_date: '2026-01-25T09:00:00Z', visit_type: 'Urgence', status: 'COMPLETED' }
  ];

  const defaultProps = {
    show: true,
    onHide: vi.fn(),
    onSubmit: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    patientService.getPatients.mockResolvedValue({
      data: { data: mockPatients }
    });

    visitTypeService.getAllVisitTypes.mockResolvedValue({
      success: true,
      data: mockVisitTypes
    });

    visitService.getVisits.mockResolvedValue({
      data: mockVisits,
      pagination: null
    });
  });

  it('should render modal when show is true', async () => {
    render(<CreateInvoiceModal {...defaultProps} />);
    // Modal title (in header)
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should load patients on mount', async () => {
    render(<CreateInvoiceModal {...defaultProps} />);

    await waitFor(() => {
      expect(patientService.getPatients).toHaveBeenCalledWith({ is_active: true });
    });
  });

  it('should load visit types on mount', async () => {
    render(<CreateInvoiceModal {...defaultProps} />);

    await waitFor(() => {
      expect(visitTypeService.getAllVisitTypes).toHaveBeenCalled();
    });
  });

  it('should validate required fields before submit', async () => {
    const user = userEvent.setup();
    const mockSubmit = vi.fn();
    render(<CreateInvoiceModal {...defaultProps} onSubmit={mockSubmit} />);

    // Wait for data to load
    await waitFor(() => {
      expect(patientService.getPatients).toHaveBeenCalled();
    });

    // Try to submit without filling required fields
    const submitButtons = screen.getAllByRole('button', { name: /Create Invoice/i });
    const submitButton = submitButtons[submitButtons.length - 1]; // Get the submit button (last one)
    await user.click(submitButton);

    // Should show error and not call submit
    await waitFor(() => {
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  it('should handle visit type fetch error gracefully', async () => {
    visitTypeService.getAllVisitTypes.mockRejectedValue(new Error('Network error'));

    render(<CreateInvoiceModal {...defaultProps} />);

    // Should still render
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should handle empty visit types list', async () => {
    visitTypeService.getAllVisitTypes.mockResolvedValue({
      success: true,
      data: []
    });

    render(<CreateInvoiceModal {...defaultProps} />);

    // Should still render
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
