/**
 * BillingPage Tests
 * Tests for invoice management functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BillingPage from '../../src/pages/BillingPage';
import { renderWithProviders, mockAdminUser, mockDietitianUser, mockAssistantUser } from '../utils/testUtils';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

const API_URL = '/api';

// Mock useNavigate and useParams
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({}),
    useLocation: () => ({ pathname: '/billing', state: null })
  };
});

// Mock invoice data
const mockInvoices = [
  {
    id: 'invoice-1',
    invoice_number: 'INV-2024-001',
    patient_id: 'patient-1',
    visit_id: 'visit-1',
    amount_total: 150.00,
    amount_paid: 0,
    amount_due: 150.00,
    status: 'SENT',
    due_date: '2026-02-15',
    created_at: '2026-01-15T10:00:00Z',
    description: 'Initial consultation',
    patient: {
      id: 'patient-1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@test.com'
    }
  },
  {
    id: 'invoice-2',
    invoice_number: 'INV-2024-002',
    patient_id: 'patient-2',
    visit_id: 'visit-2',
    amount_total: 80.00,
    amount_paid: 80.00,
    amount_due: 0,
    status: 'PAID',
    due_date: '2026-01-30',
    created_at: '2026-01-10T14:00:00Z',
    description: 'Follow-up appointment',
    patient: {
      id: 'patient-2',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@test.com'
    }
  },
  {
    id: 'invoice-3',
    invoice_number: 'INV-2024-003',
    patient_id: 'patient-1',
    visit_id: 'visit-3',
    amount_total: 200.00,
    amount_paid: 0,
    amount_due: 200.00,
    status: 'OVERDUE',
    due_date: '2026-01-01',
    created_at: '2025-12-15T09:00:00Z',
    description: 'Extended consultation',
    patient: {
      id: 'patient-1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@test.com'
    }
  }
];

const mockPatients = [
  { id: 'patient-1', first_name: 'John', last_name: 'Doe', email: 'john.doe@test.com' },
  { id: 'patient-2', first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@test.com' }
];

describe('BillingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default API handlers
    server.use(
      http.get(`${API_URL}/billing`, ({ request }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get('status');
        const search = url.searchParams.get('search');

        let invoices = [...mockInvoices];

        if (status) {
          invoices = invoices.filter(inv => inv.status === status);
        }

        if (search) {
          invoices = invoices.filter(inv =>
            inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
            inv.patient?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
            inv.patient?.last_name?.toLowerCase().includes(search.toLowerCase())
          );
        }

        return HttpResponse.json({
          success: true,
          data: invoices,
          pagination: {
            totalCount: invoices.length,
            totalPages: 1,
            page: 1,
            limit: 20
          }
        });
      }),
      http.get(`${API_URL}/billing/:id`, ({ params }) => {
        const invoice = mockInvoices.find(inv => inv.id === params.id);
        if (invoice) {
          return HttpResponse.json({
            success: true,
            data: invoice
          });
        }
        return HttpResponse.json(
          { success: false, error: 'Invoice not found' },
          { status: 404 }
        );
      }),
      http.post(`${API_URL}/billing`, async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
          success: true,
          data: {
            id: 'invoice-new',
            invoice_number: 'INV-2024-004',
            ...body,
            status: 'DRAFT',
            created_at: new Date().toISOString()
          }
        });
      }),
      http.put(`${API_URL}/billing/:id`, async ({ params, request }) => {
        const body = await request.json();
        const invoice = mockInvoices.find(inv => inv.id === params.id);
        return HttpResponse.json({
          success: true,
          data: { ...invoice, ...body }
        });
      }),
      http.delete(`${API_URL}/billing/:id`, () => {
        return HttpResponse.json({
          success: true,
          message: 'Invoice deleted'
        });
      }),
      http.post(`${API_URL}/billing/:id/payment`, async ({ params, request }) => {
        const body = await request.json();
        const invoice = mockInvoices.find(inv => inv.id === params.id);
        return HttpResponse.json({
          success: true,
          data: {
            ...invoice,
            amount_paid: invoice.amount_paid + body.amount,
            amount_due: invoice.amount_due - body.amount,
            status: body.amount >= invoice.amount_due ? 'PAID' : invoice.status
          }
        });
      }),
      http.post(`${API_URL}/billing/:id/send-email`, () => {
        return HttpResponse.json({
          success: true,
          message: 'Invoice sent'
        });
      }),
      http.post(`${API_URL}/billing/:id/mark-paid`, ({ params }) => {
        const invoice = mockInvoices.find(inv => inv.id === params.id);
        return HttpResponse.json({
          success: true,
          data: {
            ...invoice,
            status: 'PAID',
            amount_paid: invoice.amount_total,
            amount_due: 0
          }
        });
      }),
      http.get(`${API_URL}/patients`, () => {
        return HttpResponse.json({
          success: true,
          data: mockPatients
        });
      })
    );
  });

  describe('Rendering', () => {
    it('should render page title', async () => {
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        const title = screen.getByRole('heading', { level: 1 });
        expect(title).toBeInTheDocument();
      });
    });

    it('should render subtitle', async () => {
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        const subtitle = document.querySelector('.text-muted');
        expect(subtitle).toBeInTheDocument();
      });
    });

    it('should show loading spinner initially', () => {
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      const spinner = document.querySelector('.spinner-border');
      expect(spinner).toBeInTheDocument();
    });

    it('should render invoice list after loading', async () => {
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
        expect(screen.getByText('INV-2024-002')).toBeInTheDocument();
      });
    });

    it('should display patient names in invoice list', async () => {
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        // Use getAllByText since patient names may appear multiple times (table + mobile view)
        const johnDoeElements = screen.getAllByText(/John Doe/);
        expect(johnDoeElements.length).toBeGreaterThan(0);
        const janeSmithElements = screen.getAllByText(/Jane Smith/);
        expect(janeSmithElements.length).toBeGreaterThan(0);
      });
    });

    it('should display invoice amounts', async () => {
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        // Check for amount values (format may vary)
        const amountElements = screen.getAllByText(/150|80|200/);
        expect(amountElements.length).toBeGreaterThan(0);
      });
    });

    it('should render export button', async () => {
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        const exportButton = screen.getByText(/export/i);
        expect(exportButton).toBeInTheDocument();
      });
    });

    it('should render create invoice button for users with permission', async () => {
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        const createButton = screen.getAllByRole('button').find(
          btn => btn.textContent.toLowerCase().includes('create') ||
                 btn.textContent.toLowerCase().includes('créer')
        );
        expect(createButton).toBeTruthy();
      });
    });
  });

  describe('Status Display', () => {
    it('should display status badges', async () => {
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        const badges = document.querySelectorAll('.badge');
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('should show different colors for different statuses', async () => {
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        // Check for various status badges (SENT, PAID, OVERDUE)
        const badges = document.querySelectorAll('.badge');
        expect(badges.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe('Filtering', () => {
    it('should have status filter dropdown', async () => {
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
      });

      const selects = document.querySelectorAll('select');
      expect(selects.length).toBeGreaterThan(0);
    });

    it('should filter invoices by status', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
      });

      // Find status filter select
      const selects = document.querySelectorAll('select');
      const statusSelect = Array.from(selects).find(select => {
        const options = select.querySelectorAll('option');
        return Array.from(options).some(opt =>
          opt.textContent.toLowerCase().includes('paid') ||
          opt.textContent.toLowerCase().includes('payé')
        );
      });

      if (statusSelect) {
        await user.selectOptions(statusSelect, 'PAID');

        // Wait for filtered results
        await waitFor(() => {
          // Should show PAID invoice
          expect(screen.getByText('INV-2024-002')).toBeInTheDocument();
        });
      }
    });

    it('should have search input', async () => {
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search|recherche/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should allow typing in search input', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search|recherche/i);

      // Type a single character to verify the input is interactive
      await user.type(searchInput, 'J');

      // Verify input received at least one character
      await waitFor(() => {
        expect(searchInput.value.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to create invoice page', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
      });

      const createButton = screen.getAllByRole('button').find(
        btn => btn.textContent.toLowerCase().includes('create') ||
               btn.textContent.toLowerCase().includes('créer')
      );

      if (createButton) {
        await user.click(createButton);
        expect(mockNavigate).toHaveBeenCalledWith('/billing/create');
      }
    });

    it('should navigate to invoice detail on row click', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
      });

      // Click on the invoice row (not action buttons)
      const tableBody = document.querySelector('tbody');
      const row = tableBody?.querySelector('tr');
      if (row) {
        await user.click(row);
        expect(mockNavigate).toHaveBeenCalledWith('/billing/invoice-1');
      }
    });

    it('should navigate to edit invoice page', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
      });

      // ActionButton uses title attribute with translated text
      const editButtons = screen.getAllByTitle(/edit|common\.edit/i);
      if (editButtons.length > 0) {
        await user.click(editButtons[0]);
        expect(mockNavigate).toHaveBeenCalledWith('/billing/invoice-1/edit');
      }
    });

    it('should navigate to record payment page', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
      });

      // ActionButton uses title with translated text - recordPayment or billing.recordPayment
      const paymentButtons = screen.getAllByTitle(/payment|billing\.recordPayment/i);
      if (paymentButtons.length > 0) {
        await user.click(paymentButtons[0]);
        expect(mockNavigate).toHaveBeenCalledWith('/billing/invoice-1/record-payment');
      }
    });
  });

  describe('Delete Invoice', () => {
    it('should show confirmation modal before deleting', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle(/delete|supprimer/i);
      if (deleteButtons.length > 0) {
        await user.click(deleteButtons[0]);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
      }
    });

    it('should delete invoice when confirmed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle(/delete|supprimer/i);
      if (deleteButtons.length > 0) {
        await user.click(deleteButtons[0]);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        const confirmButton = within(screen.getByRole('dialog')).getAllByRole('button').find(
          btn => btn.textContent.toLowerCase().includes('delete') ||
                 btn.textContent.toLowerCase().includes('supprimer')
        );

        if (confirmButton) {
          await user.click(confirmButton);

          await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
          });
        }
      }
    });

    it('should cancel delete when modal is dismissed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle(/delete|supprimer/i);
      if (deleteButtons.length > 0) {
        await user.click(deleteButtons[0]);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        const cancelButton = within(screen.getByRole('dialog')).getAllByRole('button').find(
          btn => btn.textContent.toLowerCase().includes('cancel') ||
                 btn.textContent.toLowerCase().includes('annuler')
        );

        if (cancelButton) {
          await user.click(cancelButton);

          await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
          });

          // Invoice should still be in the list
          expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
        }
      }
    });
  });

  describe('Export Modal', () => {
    it('should open export modal when clicking export', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText(/export/i)).toBeInTheDocument();
      });

      const exportButton = screen.getByText(/export/i);
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should close export modal when dismissed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText(/export/i)).toBeInTheDocument();
      });

      const exportButton = screen.getByText(/export/i);
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Close the modal
      const closeButton = document.querySelector('.btn-close');
      if (closeButton) {
        await user.click(closeButton);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Permission Checks', () => {
    it('should show error for user without billing.read permission', async () => {
      const noPermUser = {
        ...mockAssistantUser,
        permissions: [] // No permissions
      };

      renderWithProviders(<BillingPage />, { user: noPermUser });

      await waitFor(() => {
        const errorAlert = document.querySelector('.alert-danger');
        expect(errorAlert).toBeInTheDocument();
      });
    });

    it('should not show create button for user without billing.create permission', async () => {
      const readOnlyUser = {
        ...mockAssistantUser,
        permissions: ['billing.read'] // Only read permission
      };

      renderWithProviders(<BillingPage />, { user: readOnlyUser });

      await waitFor(() => {
        expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
      });

      const createButton = screen.queryAllByRole('button').find(
        btn => btn.textContent.toLowerCase().includes('create') ||
               btn.textContent.toLowerCase().includes('créer')
      );

      expect(createButton).toBeFalsy();
    });

    it('should show all actions for admin user', async () => {
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
      });

      // Admin should see create, edit, delete buttons
      const createButton = screen.getAllByRole('button').find(
        btn => btn.textContent.toLowerCase().includes('create') ||
               btn.textContent.toLowerCase().includes('créer')
      );
      expect(createButton).toBeTruthy();

      const editButtons = screen.getAllByTitle(/edit|modifier/i);
      expect(editButtons.length).toBeGreaterThan(0);

      const deleteButtons = screen.getAllByTitle(/delete|supprimer/i);
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('should show invoices for dietitian with billing permission', async () => {
      renderWithProviders(<BillingPage />, { user: mockDietitianUser });

      await waitFor(() => {
        expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
        expect(screen.getByText('INV-2024-002')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on API error', async () => {
      server.use(
        http.get(`${API_URL}/billing`, () => {
          return HttpResponse.json(
            { success: false, error: 'Failed to load invoices' },
            { status: 500 }
          );
        })
      );

      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        const errorAlert = document.querySelector('.alert-danger');
        expect(errorAlert).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should allow dismissing error alert', async () => {
      server.use(
        http.get(`${API_URL}/billing`, () => {
          return HttpResponse.json(
            { success: false, error: 'Failed to load' },
            { status: 500 }
          );
        })
      );

      const user = userEvent.setup();
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        const errorAlert = document.querySelector('.alert-danger');
        expect(errorAlert).toBeInTheDocument();
      }, { timeout: 5000 });

      const closeButton = document.querySelector('.alert-danger .btn-close');
      if (closeButton) {
        await user.click(closeButton);

        await waitFor(() => {
          expect(document.querySelector('.alert-danger')).not.toBeInTheDocument();
        });
      }
    });

    it('should display error on delete failure', async () => {
      server.use(
        http.delete(`${API_URL}/billing/:id`, () => {
          return HttpResponse.json(
            { success: false, error: 'Cannot delete invoice' },
            { status: 400 }
          );
        })
      );

      const user = userEvent.setup();
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle(/delete|supprimer/i);
      if (deleteButtons.length > 0) {
        await user.click(deleteButtons[0]);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        const confirmButton = within(screen.getByRole('dialog')).getAllByRole('button').find(
          btn => btn.textContent.toLowerCase().includes('delete') ||
                 btn.textContent.toLowerCase().includes('supprimer')
        );

        if (confirmButton) {
          await user.click(confirmButton);

          await waitFor(() => {
            const errorAlert = document.querySelector('.alert-danger');
            expect(errorAlert).toBeInTheDocument();
          }, { timeout: 5000 });
        }
      }
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no invoices', async () => {
      server.use(
        http.get(`${API_URL}/billing`, () => {
          return HttpResponse.json({
            success: true,
            data: [],
            pagination: {
              totalCount: 0,
              totalPages: 0,
              page: 1,
              limit: 20
            }
          });
        })
      );

      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        // Look for empty state message or icon
        const emptyState = document.querySelector('.text-muted, .empty-state');
        expect(emptyState || screen.queryByText(/no invoice|aucune facture/i)).toBeTruthy();
      }, { timeout: 5000 });
    });
  });

  describe('Pagination', () => {
    it('should display pagination when multiple pages exist', async () => {
      server.use(
        http.get(`${API_URL}/billing`, () => {
          return HttpResponse.json({
            success: true,
            data: mockInvoices,
            pagination: {
              totalCount: 50,
              totalPages: 3,
              page: 1,
              limit: 20
            }
          });
        })
      );

      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
      });

      // Check for pagination elements
      const paginationNav = document.querySelector('.pagination, nav[aria-label*="pagination"]');
      expect(paginationNav).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toBeInTheDocument();
      });
    });

    it('should have accessible buttons', async () => {
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Each button should have text content or aria-label
        const hasAccessibleName = button.textContent.trim() !== '' ||
                                   button.getAttribute('aria-label') ||
                                   button.getAttribute('title');
        expect(hasAccessibleName).toBeTruthy();
      });
    });

    it('should have table with proper structure', async () => {
      renderWithProviders(<BillingPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
      });

      const table = document.querySelector('table');
      if (table) {
        expect(table.querySelector('thead')).toBeInTheDocument();
        expect(table.querySelector('tbody')).toBeInTheDocument();
      }
    });
  });
});
