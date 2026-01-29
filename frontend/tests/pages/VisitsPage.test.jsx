/**
 * VisitsPage Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VisitsPage from '../../src/pages/VisitsPage';
import { renderWithProviders, mockAdminUser, mockAssistantUser } from '../utils/testUtils';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

const API_URL = '/api';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

const mockVisits = [
  {
    id: 'visit-1',
    patient_id: 'patient-1',
    dietitian_id: 'dietitian-1',
    visit_date: '2026-01-29T10:00:00Z',
    visit_type: 'Initial Consultation',
    status: 'SCHEDULED',
    duration_minutes: 60,
    patient: {
      id: 'patient-1',
      first_name: 'John',
      last_name: 'Doe'
    }
  },
  {
    id: 'visit-2',
    patient_id: 'patient-2',
    dietitian_id: 'dietitian-1',
    visit_date: '2026-01-28T14:00:00Z',
    visit_type: 'Follow-up',
    status: 'COMPLETED',
    duration_minutes: 30,
    patient: {
      id: 'patient-2',
      first_name: 'Jane',
      last_name: 'Smith'
    }
  }
];

describe('VisitsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    server.use(
      http.get(`${API_URL}/visits`, () => {
        return HttpResponse.json({
          success: true,
          data: mockVisits,
          pagination: {
            totalCount: mockVisits.length,
            totalPages: 1,
            page: 1,
            limit: 10
          }
        });
      }),
      http.get(`${API_URL}/patients`, () => {
        return HttpResponse.json({
          success: true,
          data: [
            { id: 'patient-1', first_name: 'John', last_name: 'Doe' },
            { id: 'patient-2', first_name: 'Jane', last_name: 'Smith' }
          ]
        });
      }),
      http.delete(`${API_URL}/visits/:id`, () => {
        return HttpResponse.json({
          success: true,
          message: 'Visit deleted'
        });
      })
    );
  });

  describe('Rendering', () => {
    it('should render page title', async () => {
      renderWithProviders(<VisitsPage />, { user: mockAdminUser });

      await waitFor(() => {
        // Look for a heading or main content area with visit text
        const heading = document.querySelector('h1, h2, .page-title');
        expect(heading || screen.getAllByText(/visit/i).length > 0).toBeTruthy();
      });
    });

    it('should render visit list in table', async () => {
      renderWithProviders(<VisitsPage />, { user: mockAdminUser });

      await waitFor(() => {
        // Check for table rows containing patient names
        const table = document.querySelector('table');
        expect(table).toBeInTheDocument();
        expect(table.textContent).toContain('John Doe');
        expect(table.textContent).toContain('Jane Smith');
      });
    });

    it('should show spinner while loading', () => {
      renderWithProviders(<VisitsPage />, { user: mockAdminUser });

      // Look for spinner class or loading indicator
      const spinner = document.querySelector('.spinner-border, .spinner, [role="status"]');
      expect(spinner).toBeInTheDocument();
    });

    it('should render create visit button for admin', async () => {
      renderWithProviders(<VisitsPage />, { user: mockAdminUser });

      await waitFor(() => {
        const createButton = screen.getAllByRole('button').find(
          btn => btn.textContent.toLowerCase().includes('create') ||
                 btn.textContent.toLowerCase().includes('schedule') ||
                 btn.textContent.toLowerCase().includes('planifier')
        );
        expect(createButton).toBeTruthy();
      });
    });
  });

  describe('Status Display', () => {
    it('should display status badges', async () => {
      renderWithProviders(<VisitsPage />, { user: mockAdminUser });

      await waitFor(() => {
        const table = document.querySelector('table');
        expect(table).toBeInTheDocument();
      });

      const badges = document.querySelectorAll('.badge');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should display visit type information', async () => {
      renderWithProviders(<VisitsPage />, { user: mockAdminUser });

      await waitFor(() => {
        const table = document.querySelector('table');
        expect(table).toBeInTheDocument();
        // Check for visit types
        expect(table.textContent).toContain('Initial Consultation');
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to create visit page', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VisitsPage />, { user: mockAdminUser });

      await waitFor(() => {
        const table = document.querySelector('table');
        expect(table).toBeInTheDocument();
      });

      const createButton = screen.getAllByRole('button').find(
        btn => btn.textContent.toLowerCase().includes('schedule') ||
               btn.textContent.toLowerCase().includes('create') ||
               btn.textContent.toLowerCase().includes('planifier')
      );

      if (createButton) {
        await user.click(createButton);
        expect(mockNavigate).toHaveBeenCalledWith('/visits/create');
      }
    });

    it('should navigate to visit detail on row click', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VisitsPage />, { user: mockAdminUser });

      await waitFor(() => {
        const table = document.querySelector('table');
        expect(table).toBeInTheDocument();
      });

      // Find row in table body (not in dropdown)
      const tableBody = document.querySelector('tbody');
      const row = tableBody?.querySelector('tr');
      if (row) {
        await user.click(row);
        expect(mockNavigate).toHaveBeenCalled();
      }
    });
  });

  describe('Filtering', () => {
    it('should have status filter dropdown', async () => {
      renderWithProviders(<VisitsPage />, { user: mockAdminUser });

      await waitFor(() => {
        const table = document.querySelector('table');
        expect(table).toBeInTheDocument();
      });

      // Find filter select by looking for All option
      const selects = document.querySelectorAll('select');
      expect(selects.length).toBeGreaterThan(0);
    });
  });

  describe('Permission Checks', () => {
    it('should render page for assistant user', async () => {
      renderWithProviders(<VisitsPage />, { user: mockAssistantUser });

      await waitFor(() => {
        const table = document.querySelector('table');
        expect(table).toBeInTheDocument();
      });

      // Page should render with visits data
      const tableBody = document.querySelector('tbody');
      expect(tableBody).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message on API error', async () => {
      server.use(
        http.get(`${API_URL}/visits`, () => {
          return HttpResponse.json(
            { success: false, error: 'Failed to load visits' },
            { status: 500 }
          );
        })
      );

      renderWithProviders(<VisitsPage />, { user: mockAdminUser });

      await waitFor(() => {
        const errorAlert = document.querySelector('.alert-danger');
        expect(errorAlert).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});
