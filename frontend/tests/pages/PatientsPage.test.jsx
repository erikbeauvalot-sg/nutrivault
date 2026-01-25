/**
 * PatientsPage Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatientsPage from '../../src/pages/PatientsPage';
import { renderWithProviders, mockAdminUser, mockAssistantUser } from '../utils/testUtils';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3001/api';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

const mockPatients = [
  {
    id: 'patient-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@test.com',
    phone: '+1234567890',
    is_active: true
  },
  {
    id: 'patient-2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@test.com',
    phone: '+0987654321',
    is_active: true
  }
];

describe('PatientsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    server.use(
      http.get(`${API_URL}/patients`, ({ request }) => {
        const url = new URL(request.url);
        const search = url.searchParams.get('search');
        const isActive = url.searchParams.get('is_active');

        let patients = [...mockPatients];

        if (search) {
          patients = patients.filter(p =>
            p.first_name.toLowerCase().includes(search.toLowerCase()) ||
            p.last_name.toLowerCase().includes(search.toLowerCase())
          );
        }

        if (isActive !== null) {
          patients = patients.filter(p => String(p.is_active) === isActive);
        }

        return HttpResponse.json({
          success: true,
          data: patients,
          pagination: {
            totalCount: patients.length,
            totalPages: 1,
            page: 1,
            limit: 10
          }
        });
      }),
      http.delete(`${API_URL}/patients/:id`, () => {
        return HttpResponse.json({
          success: true,
          message: 'Patient deleted'
        });
      })
    );
  });

  describe('Rendering', () => {
    it('should render page title', async () => {
      renderWithProviders(<PatientsPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText(/management/i)).toBeInTheDocument();
      });
    });

    it('should render patient list', async () => {
      renderWithProviders(<PatientsPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should render create patient button for admin', async () => {
      renderWithProviders(<PatientsPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText(/create patient/i)).toBeInTheDocument();
      });
    });

    it('should render export button', async () => {
      renderWithProviders(<PatientsPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText(/export/i)).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      renderWithProviders(<PatientsPage />, { user: mockAdminUser });

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('CRUD Operations', () => {
    it('should open quick patient modal when clicking create', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PatientsPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText(/create patient/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/create patient/i));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should navigate to edit page when clicking edit', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PatientsPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTitle(/edit/i);
      await user.click(editButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/patients/patient-1/edit');
    });

    it('should navigate to detail page when clicking row', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PatientsPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const row = screen.getByText('John Doe').closest('tr');
      await user.click(row);

      expect(mockNavigate).toHaveBeenCalledWith('/patients/patient-1');
    });

    it('should confirm before deleting patient', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      renderWithProviders(<PatientsPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle(/delete/i);
      await user.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it('should delete patient when confirmed', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<PatientsPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle(/delete/i);
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        // Patient should be removed from list
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      });
    });
  });

  describe('Search and Filter', () => {
    it('should filter patients when searching', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PatientsPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      });
    });

    it('should filter by status', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PatientsPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const filterSelect = screen.getByDisplayValue('All');
      await user.selectOptions(filterSelect, 'active');

      // Component should re-fetch with filter
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to schedule visit with patient', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PatientsPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const scheduleButtons = screen.getAllByTitle(/schedule/i);
      await user.click(scheduleButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/visits/create', {
        state: { selectedPatient: mockPatients[0] }
      });
    });
  });

  describe('Permission Checks', () => {
    it('should not show create button for assistant role', async () => {
      renderWithProviders(<PatientsPage />, { user: mockAssistantUser });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.queryByText(/create patient/i)).not.toBeInTheDocument();
    });

    it('should not show edit buttons for assistant role', async () => {
      renderWithProviders(<PatientsPage />, { user: mockAssistantUser });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.queryByTitle(/edit/i)).not.toBeInTheDocument();
    });

    it('should not show delete buttons for assistant role', async () => {
      renderWithProviders(<PatientsPage />, { user: mockAssistantUser });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.queryByTitle(/delete/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message on API error', async () => {
      server.use(
        http.get(`${API_URL}/patients`, () => {
          return HttpResponse.json(
            { success: false, error: 'Failed to load patients' },
            { status: 500 }
          );
        })
      );

      renderWithProviders(<PatientsPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should allow dismissing error alert', async () => {
      const user = userEvent.setup();

      server.use(
        http.get(`${API_URL}/patients`, () => {
          return HttpResponse.json(
            { success: false, error: 'Failed to load' },
            { status: 500 }
          );
        })
      );

      renderWithProviders(<PatientsPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('Export Modal', () => {
    it('should open export modal when clicking export', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PatientsPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText(/export/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/export/i));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });
});
