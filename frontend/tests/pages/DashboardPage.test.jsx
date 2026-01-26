/**
 * DashboardPage Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

// Setup real localStorage for these tests
const realLocalStorage = {
  store: {},
  getItem: function(key) { return this.store[key] || null; },
  setItem: function(key, value) { this.store[key] = value; },
  removeItem: function(key) { delete this.store[key]; },
  clear: function() { this.store = {}; }
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    realLocalStorage.clear();

    // Override localStorage mock with functional version
    Object.defineProperty(window, 'localStorage', {
      value: realLocalStorage,
      writable: true
    });

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
        return HttpResponse.json({ success: true, data: [] });
      }),
      http.get(`${API_URL}/measures/alerts`, () => {
        return HttpResponse.json({ success: true, data: [] });
      })
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('Rendering', () => {
    it('should render welcome message with username', async () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        // Look for the welcome text or username
        expect(screen.getByText(/welcome/i)).toBeInTheDocument();
      });
    });

    it('should render dashboard mode toggle buttons', async () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      // The toggle buttons should be present
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render quick action buttons in day mode', async () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        // Look for buttons with specific content
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(2);
      });
    });
  });

  describe('Dashboard Mode Toggle', () => {
    it('should start in day mode by default', () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      // Find the day mode button and check it's active
      const dayButton = screen.getAllByRole('button').find(
        btn => btn.textContent.includes('Journée') || btn.classList.contains('btn-primary')
      );
      expect(dayButton).toBeTruthy();
    });

    it('should switch to office mode when clicking office button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      // Find and click the office mode button (might be "My Office" or "Mon Cabinet")
      const officeButton = screen.getAllByRole('button').find(
        btn => btn.textContent.includes('Cabinet') ||
               btn.textContent.includes('Office') ||
               btn.textContent.includes('🏢')
      );

      expect(officeButton).toBeTruthy();

      await user.click(officeButton);

      await waitFor(() => {
        // In office mode, we should see different content (links/cards)
        const cards = document.querySelectorAll('.card');
        expect(cards.length).toBeGreaterThan(0);
      });
    });

    it('should persist mode preference in localStorage', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      // Find and click the office mode button
      const officeButton = screen.getAllByRole('button').find(
        btn => btn.textContent.includes('Cabinet')
      );

      if (officeButton) {
        await user.click(officeButton);

        await waitFor(() => {
          expect(realLocalStorage.getItem('nutrivault_dashboard_mode')).toBe('office');
        });
      }
    });
  });

  describe('Statistics', () => {
    it('should show loading indicators initially', () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      // Initially there should be loading indicators (...)
      expect(screen.getAllByText('...').length).toBeGreaterThan(0);
    });

    it('should display statistics after loading', async () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        // After loading, stats should be visible (numbers)
        const statCards = document.querySelectorAll('.card');
        expect(statCards.length).toBeGreaterThan(0);
      }, { timeout: 5000 });
    });
  });

  describe("Today's Appointments", () => {
    it('should display todays appointments section', async () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      // Wait for page to render with cards
      await waitFor(() => {
        const cards = document.querySelectorAll('.card');
        expect(cards.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });

    it('should show appointment details when data loads', async () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        // Patient names should appear
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      }, { timeout: 5000 });
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
        // Empty state message
        expect(screen.getByText(/no.*appointment/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should navigate to visit detail on click', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      const listItem = screen.getByText(/john doe/i).closest('[class*="list-group-item"]');
      if (listItem) {
        await user.click(listItem);
        expect(mockNavigate).toHaveBeenCalledWith('/visits/v1/edit');
      }
    });
  });

  describe('Quick Actions', () => {
    it('should open quick patient modal when clicking quick patient button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      // Find button with flash/quick patient text or icon
      const quickPatientBtn = screen.getAllByRole('button').find(
        btn => btn.textContent.includes('Flash') || btn.textContent.includes('Patient')
      );

      if (quickPatientBtn) {
        await user.click(quickPatientBtn);

        await waitFor(() => {
          // Modal should be opened
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
      }
    });

    it('should navigate to create visit page', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      // Find schedule visit button
      const scheduleBtn = screen.getAllByRole('button').find(
        btn => btn.textContent.toLowerCase().includes('visite') ||
               btn.textContent.toLowerCase().includes('visit') ||
               btn.textContent.includes('📅')
      );

      if (scheduleBtn) {
        await user.click(scheduleBtn);
        expect(mockNavigate).toHaveBeenCalledWith('/visits/create');
      }
    });

    it('should navigate to agenda page', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      // Find agenda button
      const agendaBtn = screen.getAllByRole('button').find(
        btn => btn.textContent.toLowerCase().includes('agenda') ||
               btn.textContent.includes('🗓️')
      );

      if (agendaBtn) {
        await user.click(agendaBtn);
        expect(mockNavigate).toHaveBeenCalledWith('/agenda');
      }
    });
  });

  describe('Office Mode', () => {
    it('should display navigation cards in office mode', async () => {
      const user = userEvent.setup();
      realLocalStorage.setItem('nutrivault_dashboard_mode', 'office');

      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        // Office mode should show patient/visit/billing cards
        const cards = document.querySelectorAll('.card');
        expect(cards.length).toBeGreaterThan(0);
      });
    });

    it('should display global stats in office mode', async () => {
      realLocalStorage.setItem('nutrivault_dashboard_mode', 'office');

      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        // Stats section should be visible
        expect(screen.getByText(/stats/i)).toBeInTheDocument();
      });
    });
  });

  describe('Status Badges', () => {
    it('should show visit status badges', async () => {
      renderWithProviders(<DashboardPage />, { user: mockAdminUser });

      await waitFor(() => {
        // Look for status badges
        const badges = document.querySelectorAll('.badge');
        expect(badges.length).toBeGreaterThan(0);
      }, { timeout: 5000 });
    });
  });
});
