/**
 * EditVisitPage Component Tests
 * Tests for visit editing and finish visit functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EditVisitPage from '../EditVisitPage';

// Mock translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
    i18n: {
      language: 'fr',
      resolvedLanguage: 'fr'
    }
  })
}));

// Mock auth context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', username: 'testuser', role: 'DIETITIAN' }
  })
}));

// Mock Layout component
vi.mock('../../components/layout/Layout', () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>
}));

// Mock visit service
const mockGetVisitById = vi.fn();
const mockUpdateVisit = vi.fn();
const mockFinishAndInvoice = vi.fn();

vi.mock('../../services/visitService', () => ({
  default: {
    getVisitById: (...args) => mockGetVisitById(...args),
    updateVisit: (...args) => mockUpdateVisit(...args),
    finishAndInvoice: (...args) => mockFinishAndInvoice(...args)
  }
}));

// Mock visit custom field service
vi.mock('../../services/visitCustomFieldService', () => ({
  default: {
    getVisitCustomFields: vi.fn().mockResolvedValue([]),
    updateVisitCustomFields: vi.fn().mockResolvedValue({ success: true })
  }
}));

// Mock visit type service
vi.mock('../../services/visitTypeService', () => ({
  default: {
    getAllVisitTypes: vi.fn().mockResolvedValue({
      data: [
        { id: 'vt-1', name: 'Consultation initiale', default_price: 80.00, duration_minutes: 60 },
        { id: 'vt-2', name: 'Suivi', default_price: 60.00, duration_minutes: 30 }
      ]
    })
  }
}));

// Mock user service
vi.mock('../../services/userService', () => ({
  default: {
    getDietitians: vi.fn().mockResolvedValue([
      { id: 'user-123', username: 'dietitian1', first_name: 'Jean', last_name: 'Dupont' }
    ])
  }
}));

// Mock measure service
vi.mock('../../services/measureService', () => ({
  getMeasureDefinitions: vi.fn().mockResolvedValue([]),
  getMeasuresByVisit: vi.fn().mockResolvedValue([]),
  getAllMeasureTranslations: vi.fn().mockResolvedValue([])
}));

// Mock utils
vi.mock('../../utils/measureTranslations', () => ({
  fetchMeasureTranslations: vi.fn().mockResolvedValue({})
}));

vi.mock('../../utils/dateUtils', () => ({
  formatDateTime: vi.fn((date) => date)
}));

// Mock ConfirmModal
vi.mock('../../components/ConfirmModal', () => ({
  default: ({ show, onConfirm, onHide, title, message }) => show ? (
    <div data-testid="confirm-modal">
      <h5>{title}</h5>
      <p>{message}</p>
      <button onClick={onConfirm} data-testid="confirm-button">Confirm</button>
      <button onClick={onHide} data-testid="cancel-button">Cancel</button>
    </div>
  ) : null
}));

// Mock ResponsiveTabs
vi.mock('../../components/ResponsiveTabs', () => ({
  default: ({ children }) => <div>{children}</div>,
  Tab: ({ children }) => <div>{children}</div>
}));

// Mock CustomFieldInput
vi.mock('../../components/CustomFieldInput', () => ({
  default: () => null
}));

const mockVisit = {
  id: 'visit-123',
  patient_id: 'patient-456',
  dietitian_id: 'user-123',
  visit_date: '2026-01-30T10:00:00Z',
  visit_type: 'Consultation initiale',
  duration_minutes: 60,
  status: 'SCHEDULED',
  next_visit_date: null,
  patient: {
    id: 'patient-456',
    first_name: 'Marie',
    last_name: 'Martin'
  }
};

const renderComponent = () => {
  return render(
    <MemoryRouter initialEntries={['/visits/visit-123/edit']}>
      <Routes>
        <Route path="/visits/:id/edit" element={<EditVisitPage />} />
        <Route path="/visits/:id" element={<div>Visit Detail Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('EditVisitPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVisitById.mockResolvedValue(mockVisit);
    mockUpdateVisit.mockResolvedValue({ ...mockVisit });
    mockFinishAndInvoice.mockResolvedValue({
      visit: { ...mockVisit, status: 'COMPLETED' },
      invoice: { id: 'inv-123', invoice_number: 'INV-2026-0001', amount_total: 80 },
      actions: { markedCompleted: true, generateInvoice: true }
    });
  });

  it('should render loading state initially', () => {
    renderComponent();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should load visit data on mount', async () => {
    renderComponent();

    await waitFor(() => {
      expect(mockGetVisitById).toHaveBeenCalledWith('visit-123');
    });
  });

  it('should show finish visit button for scheduled visits', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Finish Visit/i)).toBeInTheDocument();
    });
  });

  it('should not show finish visit button for completed visits', async () => {
    mockGetVisitById.mockResolvedValue({
      ...mockVisit,
      status: 'COMPLETED'
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/Finish Visit/i)).not.toBeInTheDocument();
    });
  });

  describe('confirmFinishVisit', () => {
    it('should call finishAndInvoice when finishing visit', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText(/Finish Visit/i)).toBeInTheDocument();
      });

      // Click finish visit button
      await user.click(screen.getByText(/Finish Visit/i));

      // Confirm modal should appear
      await waitFor(() => {
        expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
      });

      // Click confirm
      await user.click(screen.getByTestId('confirm-button'));

      // Should call updateVisit first (to save changes)
      await waitFor(() => {
        expect(mockUpdateVisit).toHaveBeenCalled();
      });

      // Should call finishAndInvoice to complete and create invoice
      await waitFor(() => {
        expect(mockFinishAndInvoice).toHaveBeenCalledWith('visit-123', {
          markCompleted: true,
          generateInvoice: true,
          sendEmail: false
        });
      });
    });

    it('should handle finishAndInvoice error gracefully', async () => {
      const user = userEvent.setup();
      mockFinishAndInvoice.mockRejectedValue(new Error('Invoice creation failed'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Finish Visit/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/Finish Visit/i));

      await waitFor(() => {
        expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('confirm-button'));

      // Should still have called updateVisit
      await waitFor(() => {
        expect(mockUpdateVisit).toHaveBeenCalled();
      });

      // Should have attempted finishAndInvoice
      await waitFor(() => {
        expect(mockFinishAndInvoice).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });
});
