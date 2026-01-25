/**
 * DashboardPage Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '../../src/pages/DashboardPage';
import { renderWithProviders, mockAdminUser, mockDietitianUser } from '../utils/testUtils';
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

// Mock date-fns to control dates
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    isToday: () => true
  };
});

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Setup MSW handlers for dashboard
    server.use(
      http.get(`${API_URL}/patients`, () => {
        return HttpResponse.json({
          success: true,
          data: [
            { id: 'p1', first_name: 'John', last_name: 'Doe', is_active: true },
            { id: 'p2', first_name: 'Jane', last_name: 'Smith', is_active: true },
            { id: 'p3', first_name: 'Bob', last_name: 'Wilson', is_active: false }
          ]
        });
      }),
      http.get(`${API_URL}/visits`, () => {
        return HttpResponse.json({
          success: true,
          data: [
            {
              id: 'v1',
              patient: { first_name: 'John', last_name: 'Doe' },
              visit_date: new Date().toISOString(),
              visit_type: 'Initial Consultation',
              duration_minutes: 60,
              status: 'SCHEDULED'
            },
            {
              id: 'v2',
              patient: { first_name: 'Jane', last_name: 'Smith' },
              visit_date: new Date().toISOString(),
              visit_type: 'Follow-up',
              duration_minutes: 30,
              status: 'COMPLETED'
            }
          ]
        });
      }),
      http.get(`${API_URL}/users`, () => {
        return HttpResponse.json({
          success: true,
          data: [
            { id: 'u1', username: 'admin' },
            { id: 'u2', username: 'dietitian' }
          ]
        });
      }),
      http.get(`${API_URL}/patients/alerts`, () => {
        return HttpResponse.json({
          success: true,
          data: []
        });
      }),
      http.get(`${API_URL}/measures/alerts`, () => {
        return HttpResponse.json({
          success: true,
          data: []
        });
      })
    );
  });

  describe('Rendering', () => {
    it('should render welcome message with username', async () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText(/welcome/i)).toBeInTheDocument();
      });
    });

    it('should render dashboard mode toggle buttons', async () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      expect(screen.getByText(/ma journée/i)).toBeInTheDocument();
      expect(screen.getByText(/mon cabinet/i)).toBeInTheDocument();
    });

    it('should render quick action buttons in day mode', async () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText(/patient flash/i)).toBeInTheDocument();
        expect(screen.getByText(/schedule visit/i)).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard Mode Toggle', () => {
    it('should start in day mode by default', () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      const dayButton = screen.getByText(/ma journée/i);
      expect(dayButton.classList.contains('btn-primary')).toBe(true);
    });

    it('should switch to office mode when clicking office button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await user.click(screen.getByText(/mon cabinet/i));

      await waitFor(() => {
        // In office mode, we should see "Patients" card
        expect(screen.getByText(/manage patient records/i)).toBeInTheDocument();
      });
    });

    it('should persist mode preference in localStorage', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await user.click(screen.getByText(/mon cabinet/i));

      expect(localStorage.getItem('nutrivault_dashboard_mode')).toBe('office');
    });

    it('should load saved mode preference from localStorage', async () => {
      localStorage.setItem('nutrivault_dashboard_mode', 'office');

      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText(/manage patient records/i)).toBeInTheDocument();
      });
    });
  });

  describe('Statistics', () => {
    it('should display patient count', async () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        // Should show active patients count
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should show loading spinners while fetching data', () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      // Initially there should be loading indicators
      expect(screen.getAllByText('...').length).toBeGreaterThan(0);
    });
  });

  describe("Today's Appointments", () => {
    it('should display todays appointments list', async () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText(/today's appointments/i)).toBeInTheDocument();
      });
    });

    it('should show appointment details', async () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      });
    });

    it('should show empty state when no appointments', async () => {
      server.use(
        http.get(`${API_URL}/visits`, () => {
          return HttpResponse.json({
            success: true,
            data: []
          });
        })
      );

      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText(/no appointments/i)).toBeInTheDocument();
      });
    });

    it('should navigate to visit detail on click', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/john doe/i).closest('[class*="list-group-item"]'));

      expect(mockNavigate).toHaveBeenCalledWith('/visits/v1');
    });
  });

  describe('Quick Actions', () => {
    it('should open quick patient modal when clicking quick patient button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await user.click(screen.getByText(/patient flash/i));

      await waitFor(() => {
        // Modal should be opened
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should navigate to create visit page', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await user.click(screen.getByText(/schedule visit/i));

      expect(mockNavigate).toHaveBeenCalledWith('/visits/create');
    });

    it('should navigate to agenda page', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await user.click(screen.getByText(/view agenda/i));

      expect(mockNavigate).toHaveBeenCalledWith('/agenda');
    });
  });

  describe('Office Mode', () => {
    beforeEach(() => {
      localStorage.setItem('nutrivault_dashboard_mode', 'office');
    });

    it('should display navigation cards in office mode', async () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText(/manage patient records/i)).toBeInTheDocument();
        expect(screen.getByText(/schedule and track visits/i)).toBeInTheDocument();
        expect(screen.getByText(/manage invoices/i)).toBeInTheDocument();
      });
    });

    it('should display global stats in office mode', async () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText(/quick stats/i)).toBeInTheDocument();
      });
    });

    it('should show user count for admin', async () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText(/total users/i)).toBeInTheDocument();
      });
    });

    it('should show role for non-admin users', async () => {
      renderWithProviders(<DashboardPage />, { user: mockDietitianUser });

      await waitFor(() => {
        expect(screen.getByText(/your role/i)).toBeInTheDocument();
      });
    });
  });

  describe('Status Badges', () => {
    it('should show scheduled badge for scheduled visits', async () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        const badges = screen.getAllByText(/scheduled/i);
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('should show completed badge for completed visits', async () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        const badges = screen.getAllByText(/completed/i);
        expect(badges.length).toBeGreaterThan(0);
      });
    });
  });
});
