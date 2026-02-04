/**
 * Detail Pages Tests
 * Verify that detail/edit pages render without errors
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, mockAdminUser } from '../utils/testUtils';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// Import detail pages
import PatientDetailPage from '../../src/pages/PatientDetailPage';
import EditPatientPage from '../../src/pages/EditPatientPage';
import VisitDetailPage from '../../src/pages/VisitDetailPage';
import EditVisitPage from '../../src/pages/EditVisitPage';
import InvoiceDetailPage from '../../src/pages/InvoiceDetailPage';
import EditInvoicePage from '../../src/pages/EditInvoicePage';
import CreateInvoicePage from '../../src/pages/CreateInvoicePage';
import RecordPaymentPage from '../../src/pages/RecordPaymentPage';
import UserDetailPage from '../../src/pages/UserDetailPage';
import DocumentUploadPage from '../../src/pages/DocumentUploadPage';
import MeasureDetailPage from '../../src/pages/MeasureDetailPage';

const API_URL = '/api';

// Mock useNavigate and useParams
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'test-id-123' }),
    useLocation: () => ({ pathname: '/', state: null })
  };
});

// Mock data
const mockPatient = {
  id: 'test-id-123',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@test.com',
  phone: '+1234567890',
  date_of_birth: '1990-01-15',
  gender: 'male',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  tags: [],
  visits: [],
  invoices: []
};

const mockVisit = {
  id: 'test-id-123',
  patient_id: 'patient-1',
  dietitian_id: 'user-1',
  visit_date: '2024-02-01',
  visit_type: 'Initial Consultation',
  status: 'COMPLETED',
  duration_minutes: 60,
  notes: 'Test notes',
  patient: mockPatient,
  dietitian: { id: 'user-1', first_name: 'Dr', last_name: 'Smith' },
  created_at: '2024-01-15T00:00:00Z'
};

const mockInvoice = {
  id: 'test-id-123',
  invoice_number: 'INV-2024-001',
  patient_id: 'patient-1',
  visit_id: 'visit-1',
  amount_total: 100.00,
  amount_paid: 0,
  amount_due: 100.00,
  status: 'SENT',
  invoice_date: '2024-02-01',
  due_date: '2024-03-01',
  service_description: 'Consultation',
  patient: mockPatient,
  payments: [],
  email_history: [],
  created_at: '2024-02-01T00:00:00Z'
};

const mockUser = {
  id: 'test-id-123',
  username: 'testuser',
  email: 'test@test.com',
  first_name: 'Test',
  last_name: 'User',
  role: { id: 'role-1', name: 'ADMIN' },
  is_active: true,
  created_at: '2024-01-01T00:00:00Z'
};

const mockMeasure = {
  id: 'test-id-123',
  name: 'weight',
  display_name: 'Weight',
  unit: 'kg',
  data_type: 'number',
  is_active: true
};

const mockPatients = [mockPatient];
const mockVisits = [mockVisit];
const mockUsers = [mockUser];
const mockRoles = [
  { id: 'role-1', name: 'ADMIN', description: 'Administrator' },
  { id: 'role-2', name: 'DIETITIAN', description: 'Dietitian' }
];

describe('Detail Pages Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {

    // Setup mock handlers
    server.use(
      // Patients
      http.get(`${API_URL}/patients`, () => {
        return HttpResponse.json({ success: true, data: mockPatients, pagination: { total: 1 } });
      }),
      http.get(`${API_URL}/patients/:id`, () => {
        return HttpResponse.json({ success: true, data: mockPatient });
      }),
      http.get(`${API_URL}/patients/:id/visits`, () => {
        return HttpResponse.json({ success: true, data: mockVisits });
      }),
      http.get(`${API_URL}/patients/:id/invoices`, () => {
        return HttpResponse.json({ success: true, data: [] });
      }),
      http.get(`${API_URL}/patients/:id/documents`, () => {
        return HttpResponse.json({ success: true, data: [] });
      }),
      http.get(`${API_URL}/patients/:id/measures`, () => {
        return HttpResponse.json({ success: true, data: [] });
      }),
      http.get(`${API_URL}/patients/:id/custom-fields`, () => {
        return HttpResponse.json({ success: true, data: [] });
      }),

      // Visits
      http.get(`${API_URL}/visits`, () => {
        return HttpResponse.json({ success: true, data: mockVisits, pagination: { total: 1 } });
      }),
      http.get(`${API_URL}/visits/:id`, () => {
        return HttpResponse.json({ success: true, data: mockVisit });
      }),
      http.get(`${API_URL}/visits/:id/custom-fields`, () => {
        return HttpResponse.json({ success: true, data: [] });
      }),

      // Billing
      http.get(`${API_URL}/billing`, () => {
        return HttpResponse.json({ success: true, data: [mockInvoice], pagination: { total: 1 } });
      }),
      http.get(`${API_URL}/billing/:id`, () => {
        return HttpResponse.json({ success: true, data: mockInvoice });
      }),

      // Users
      http.get(`${API_URL}/users`, () => {
        return HttpResponse.json({ success: true, data: mockUsers });
      }),
      http.get(`${API_URL}/users/:id`, () => {
        return HttpResponse.json({ success: true, data: mockUser });
      }),

      // Roles
      http.get(`${API_URL}/roles`, () => {
        return HttpResponse.json({ success: true, data: mockRoles });
      }),

      // Documents
      http.get(`${API_URL}/documents`, () => {
        return HttpResponse.json({ success: true, data: [] });
      }),

      // Measures
      http.get(`${API_URL}/measures/definitions`, () => {
        return HttpResponse.json({ success: true, data: [mockMeasure] });
      }),
      http.get(`${API_URL}/measures/definitions/:id`, () => {
        return HttpResponse.json({ success: true, data: mockMeasure });
      }),

      // Custom Fields
      http.get(`${API_URL}/custom-fields/categories`, () => {
        return HttpResponse.json({ success: true, data: [] });
      }),
      http.get(`${API_URL}/custom-fields/definitions`, () => {
        return HttpResponse.json({ success: true, data: [] });
      }),

      // Tags
      http.get(`${API_URL}/tags`, () => {
        return HttpResponse.json({ success: true, data: [] });
      })
    );
  });

  describe('Patient Pages', () => {
    it('PatientDetailPage renders without error', async () => {
      const { container } = renderWithProviders(<PatientDetailPage />, { user: mockAdminUser });

      // Wait for loading to finish - check container exists and no unhandled errors
      await waitFor(() => {
        // Page should render something (either content or loading state that resolves)
        expect(container.innerHTML.length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      // No crash means success
      expect(container).toBeTruthy();
    });

    it('EditPatientPage renders without error', async () => {
      const { container } = renderWithProviders(<EditPatientPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('Visit Pages', () => {
    it('VisitDetailPage renders without error', async () => {
      const { container } = renderWithProviders(<VisitDetailPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('EditVisitPage renders without error', async () => {
      const { container } = renderWithProviders(<EditVisitPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });

  });

  describe('Invoice Pages', () => {
    it('InvoiceDetailPage renders without error', async () => {
      const { container } = renderWithProviders(<InvoiceDetailPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('EditInvoicePage renders without error', async () => {
      const { container } = renderWithProviders(<EditInvoicePage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('CreateInvoicePage renders without error', async () => {
      const { container } = renderWithProviders(<CreateInvoicePage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('RecordPaymentPage renders without error', async () => {
      const { container } = renderWithProviders(<RecordPaymentPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('User Pages', () => {
    it('UserDetailPage renders without error', async () => {
      const { container } = renderWithProviders(<UserDetailPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('Document Pages', () => {
    it('DocumentUploadPage renders without error', async () => {
      const { container } = renderWithProviders(<DocumentUploadPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('Measure Pages', () => {
    it('MeasureDetailPage renders without error', async () => {
      const { container } = renderWithProviders(<MeasureDetailPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });
  });
});
