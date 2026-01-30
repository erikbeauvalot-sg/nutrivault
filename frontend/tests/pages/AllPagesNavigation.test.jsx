/**
 * All Pages Navigation Tests
 * Verify that all pages render without errors
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, mockAdminUser } from '../utils/testUtils';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// Import all pages
import DashboardPage from '../../src/pages/DashboardPage';
import PatientsPage from '../../src/pages/PatientsPage';
import VisitsPage from '../../src/pages/VisitsPage';
import BillingPage from '../../src/pages/BillingPage';
import UsersPage from '../../src/pages/UsersPage';
import ReportsPage from '../../src/pages/ReportsPage';
import DocumentsPage from '../../src/pages/DocumentsPage';
import AgendaPage from '../../src/pages/AgendaPage';
import CustomFieldsPage from '../../src/pages/CustomFieldsPage';
import RolesManagementPage from '../../src/pages/RolesManagementPage';
import MeasuresPage from '../../src/pages/MeasuresPage';
import EmailTemplatesPage from '../../src/pages/EmailTemplatesPage';
import AIConfigPage from '../../src/pages/AIConfigPage';
import AnalyticsDashboardPage from '../../src/pages/AnalyticsDashboardPage';
import UserSettingsPage from '../../src/pages/UserSettingsPage';
import InvoiceCustomizationPage from '../../src/pages/InvoiceCustomizationPage';

const API_URL = '/api';

// Mock useNavigate and useParams
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'test-id' }),
    useLocation: () => ({ pathname: '/', state: null })
  };
});

// Extended mock data
const mockPatients = [
  { id: 'patient-1', first_name: 'John', last_name: 'Doe', email: 'john@test.com', is_active: true },
  { id: 'patient-2', first_name: 'Jane', last_name: 'Smith', email: 'jane@test.com', is_active: true }
];

const mockVisits = [
  { id: 'visit-1', patient_id: 'patient-1', visit_date: '2024-02-01', visit_type: 'Consultation', status: 'COMPLETED', patient: mockPatients[0] },
  { id: 'visit-2', patient_id: 'patient-2', visit_date: '2024-02-15', visit_type: 'Follow-up', status: 'SCHEDULED', patient: mockPatients[1] }
];

const mockInvoices = [
  { id: 'invoice-1', invoice_number: 'INV-001', patient_id: 'patient-1', amount_total: 100, status: 'PAID', patient: mockPatients[0] },
  { id: 'invoice-2', invoice_number: 'INV-002', patient_id: 'patient-2', amount_total: 150, status: 'SENT', patient: mockPatients[1] }
];

const mockUsers = [
  { id: 'user-1', username: 'admin', email: 'admin@test.com', first_name: 'Admin', last_name: 'User', role: { name: 'ADMIN' }, is_active: true }
];

const mockRoles = [
  { id: 'role-1', name: 'ADMIN', description: 'Administrator', permissions: [] },
  { id: 'role-2', name: 'DIETITIAN', description: 'Dietitian', permissions: [] }
];

const mockDocuments = [
  { id: 'doc-1', file_name: 'test.pdf', category: 'report', created_at: '2024-01-01' }
];

const mockCategories = [
  { id: 'cat-1', name: 'Medical History', slug: 'medical_history', entity_type: 'patient' }
];

const mockMeasures = [
  { id: 'measure-1', name: 'weight', display_name: 'Weight', unit: 'kg', is_active: true }
];

const mockEmailTemplates = [
  { id: 'template-1', name: 'Invoice', slug: 'invoice', category: 'invoice', is_active: true }
];

const mockAIConfig = {
  providers: [
    { id: 'anthropic', name: 'Anthropic', is_configured: true, models: [{ id: 'claude-3', name: 'Claude 3' }] }
  ],
  current: { provider: 'anthropic', model: 'claude-3' }
};

const mockCustomization = {
  id: 'cust-1',
  user_id: 'user-1',
  logo_file_path: null,
  primary_color: '#3498db',
  business_name: 'Test Business'
};

describe('All Pages Navigation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup comprehensive mock handlers
    server.use(
      // Dashboard
      http.get(`${API_URL}/dashboard/statistics`, () => {
        return HttpResponse.json({
          success: true,
          data: { totalPatients: 10, activePatients: 8, todayVisits: 3, pendingInvoices: 2 }
        });
      }),

      // Patients
      http.get(`${API_URL}/patients`, () => {
        return HttpResponse.json({ success: true, data: mockPatients, pagination: { total: 2, page: 1, totalPages: 1 } });
      }),
      http.get(`${API_URL}/patients/:id`, () => {
        return HttpResponse.json({ success: true, data: mockPatients[0] });
      }),

      // Visits
      http.get(`${API_URL}/visits`, () => {
        return HttpResponse.json({ success: true, data: mockVisits, pagination: { total: 2, page: 1, totalPages: 1 } });
      }),
      http.get(`${API_URL}/visits/:id`, () => {
        return HttpResponse.json({ success: true, data: mockVisits[0] });
      }),

      // Billing
      http.get(`${API_URL}/billing`, () => {
        return HttpResponse.json({ success: true, data: mockInvoices, pagination: { total: 2, page: 1, totalPages: 1 } });
      }),
      http.get(`${API_URL}/billing/:id`, () => {
        return HttpResponse.json({ success: true, data: mockInvoices[0] });
      }),

      // Users
      http.get(`${API_URL}/users`, () => {
        return HttpResponse.json({ success: true, data: mockUsers });
      }),
      http.get(`${API_URL}/users/:id`, () => {
        return HttpResponse.json({ success: true, data: mockUsers[0] });
      }),

      // Roles
      http.get(`${API_URL}/roles`, () => {
        return HttpResponse.json({ success: true, data: mockRoles });
      }),

      // Documents
      http.get(`${API_URL}/documents`, () => {
        return HttpResponse.json({ success: true, data: mockDocuments, pagination: { total: 1, page: 1, totalPages: 1 } });
      }),

      // Custom Fields
      http.get(`${API_URL}/custom-fields/categories`, () => {
        return HttpResponse.json({ success: true, data: mockCategories });
      }),
      http.get(`${API_URL}/custom-fields/definitions`, () => {
        return HttpResponse.json({ success: true, data: [] });
      }),

      // Measures
      http.get(`${API_URL}/measures/definitions`, () => {
        return HttpResponse.json({ success: true, data: mockMeasures });
      }),

      // Email Templates
      http.get(`${API_URL}/email-templates`, () => {
        return HttpResponse.json({ success: true, data: mockEmailTemplates });
      }),

      // AI Config
      http.get(`${API_URL}/ai/config`, () => {
        return HttpResponse.json({ success: true, data: mockAIConfig });
      }),
      http.get(`${API_URL}/ai/providers`, () => {
        return HttpResponse.json({ success: true, data: mockAIConfig.providers });
      }),

      // Analytics
      http.get(`${API_URL}/analytics/overview`, () => {
        return HttpResponse.json({
          success: true,
          data: {
            patients: { total: 10, new_this_month: 2 },
            visits: { total: 50, this_month: 10 },
            revenue: { total: 5000, this_month: 1000 }
          }
        });
      }),
      http.get(`${API_URL}/analytics/visits`, () => {
        return HttpResponse.json({ success: true, data: [] });
      }),
      http.get(`${API_URL}/analytics/revenue`, () => {
        return HttpResponse.json({ success: true, data: [] });
      }),

      // Invoice Customization
      http.get(`${API_URL}/invoice-customizations`, () => {
        return HttpResponse.json({ success: true, data: mockCustomization });
      }),

      // Settings
      http.get(`${API_URL}/settings`, () => {
        return HttpResponse.json({ success: true, data: {} });
      }),

      // Reports
      http.get(`${API_URL}/reports/summary`, () => {
        return HttpResponse.json({ success: true, data: {} });
      }),

      // Alerts
      http.get(`${API_URL}/alerts`, () => {
        return HttpResponse.json({
          success: true,
          data: { overdue_invoices: [], overdue_visits: [], visits_without_notes: [], patients_followup: [], summary: { total_count: 0 } }
        });
      }),
      http.get(`${API_URL}/measure-alerts`, () => {
        return HttpResponse.json({ success: true, data: [], count: 0 });
      })
    );
  });

  describe('Main Pages', () => {
    it('DashboardPage renders without error', async () => {
      const { container } = renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container.querySelector('.spinner-border, [role="status"]') || screen.queryByText(/loading/i)).toBeFalsy();
      }, { timeout: 3000 });

      // Should not show error alerts
      expect(screen.queryByRole('alert')).toBeFalsy();
    });

    it('PatientsPage renders without error', async () => {
      const { container } = renderWithProviders(<PatientsPage />, { user: mockAdminUser });

      // Wait for page to render
      await waitFor(() => {
        expect(container.innerHTML.length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      expect(container).toBeTruthy();
    });

    it('VisitsPage renders without error', async () => {
      const { container } = renderWithProviders(<VisitsPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('BillingPage renders without error', async () => {
      const { container } = renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('UsersPage renders without error', async () => {
      const { container } = renderWithProviders(<UsersPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('AgendaPage renders without error', async () => {
      const { container } = renderWithProviders(<AgendaPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('DocumentsPage renders without error', async () => {
      const { container } = renderWithProviders(<DocumentsPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('ReportsPage renders without error', async () => {
      const { container } = renderWithProviders(<ReportsPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('Settings Pages', () => {
    it('CustomFieldsPage renders without error', async () => {
      const { container } = renderWithProviders(<CustomFieldsPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('RolesManagementPage renders without error', async () => {
      const { container } = renderWithProviders(<RolesManagementPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('MeasuresPage renders without error', async () => {
      const { container } = renderWithProviders(<MeasuresPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('EmailTemplatesPage renders without error', async () => {
      const { container } = renderWithProviders(<EmailTemplatesPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('AIConfigPage renders without error', async () => {
      const { container } = renderWithProviders(<AIConfigPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('UserSettingsPage renders without error', async () => {
      const { container } = renderWithProviders(<UserSettingsPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('InvoiceCustomizationPage renders without error', async () => {
      const { container } = renderWithProviders(<InvoiceCustomizationPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('Analytics Pages', () => {
    it('AnalyticsDashboardPage renders without error', async () => {
      const { container } = renderWithProviders(<AnalyticsDashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(container).toBeTruthy();
      }, { timeout: 3000 });
    });
  });
});
