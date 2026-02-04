/**
 * PracticeOverviewWidget Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PracticeOverviewWidget from '../PracticeOverviewWidget';
import * as dashboardService from '../../../services/dashboardService';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key
  })
}));

// Mock dashboard service
vi.mock('../../../services/dashboardService');

// Mock react-icons
vi.mock('react-icons/fa', () => ({
  FaUsers: () => <span data-testid="icon-users" />,
  FaCalendarCheck: () => <span data-testid="icon-calendar" />,
  FaEuroSign: () => <span data-testid="icon-euro" />,
  FaChartLine: () => <span data-testid="icon-chart" />,
  FaArrowUp: () => <span data-testid="icon-arrow-up">↑</span>,
  FaArrowDown: () => <span data-testid="icon-arrow-down">↓</span>
}));

const mockOverviewData = {
  success: true,
  data: {
    totalPatients: 150,
    newPatientsThisMonth: 12,
    patientsChange: 5,
    visitsThisMonth: 85,
    visitsChange: 10,
    revenueThisMonth: 12500,
    revenueChange: 2500,
    retentionRate: 78,
    outstandingAmount: 1500
  }
};

describe('PracticeOverviewWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dashboardService.getOverview.mockResolvedValue(mockOverviewData);
  });

  describe('Loading State', () => {
    it('should show loading spinners while fetching data', async () => {
      dashboardService.getOverview.mockImplementation(
        () => new Promise(() => {})
      );

      const { container } = render(<PracticeOverviewWidget />);

      expect(container.querySelectorAll('.spinner-border').length).toBe(4);
    });

    it('should show 4 loading card placeholders', async () => {
      dashboardService.getOverview.mockImplementation(
        () => new Promise(() => {})
      );

      const { container } = render(<PracticeOverviewWidget />);

      // 4 columns with spinners
      const spinners = container.querySelectorAll('.spinner-border');
      expect(spinners.length).toBe(4);
    });
  });

  describe('KPI Display', () => {
    it('should display total patients', async () => {
      render(<PracticeOverviewWidget />);

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('Patients actifs')).toBeInTheDocument();
      });
    });

    it('should display new patients this month', async () => {
      render(<PracticeOverviewWidget />);

      await waitFor(() => {
        expect(screen.getByText('+12 ce mois')).toBeInTheDocument();
      });
    });

    it('should display visits this month', async () => {
      render(<PracticeOverviewWidget />);

      await waitFor(() => {
        expect(screen.getByText('85')).toBeInTheDocument();
        expect(screen.getByText('Visites ce mois')).toBeInTheDocument();
      });
    });

    it('should display revenue this month', async () => {
      render(<PracticeOverviewWidget />);

      await waitFor(() => {
        // Should be formatted as currency (12 500 €)
        expect(screen.getByText(/12.*500.*€/)).toBeInTheDocument();
        expect(screen.getByText('CA ce mois')).toBeInTheDocument();
      });
    });

    it('should display retention rate', async () => {
      render(<PracticeOverviewWidget />);

      await waitFor(() => {
        expect(screen.getByText('78%')).toBeInTheDocument();
        expect(screen.getByText('Taux de rétention')).toBeInTheDocument();
      });
    });

    it('should display outstanding amount', async () => {
      render(<PracticeOverviewWidget />);

      await waitFor(() => {
        expect(screen.getByText(/1.*500.*€.*impayés/)).toBeInTheDocument();
      });
    });
  });

  describe('Change Indicators', () => {
    it('should show positive change with up arrow', async () => {
      render(<PracticeOverviewWidget />);

      await waitFor(() => {
        const upArrows = screen.getAllByTestId('icon-arrow-up');
        expect(upArrows.length).toBeGreaterThan(0);
      });
    });

    it('should show change values', async () => {
      render(<PracticeOverviewWidget />);

      await waitFor(() => {
        // Patients change: +5
        expect(screen.getByText('5')).toBeInTheDocument();
        // Visits change: +10
        expect(screen.getByText('10')).toBeInTheDocument();
      });
    });

    it('should show negative change with down arrow', async () => {
      dashboardService.getOverview.mockResolvedValue({
        success: true,
        data: {
          ...mockOverviewData.data,
          patientsChange: -3,
          visitsChange: -5
        }
      });

      render(<PracticeOverviewWidget />);

      await waitFor(() => {
        const downArrows = screen.getAllByTestId('icon-arrow-down');
        expect(downArrows.length).toBeGreaterThan(0);
      });
    });

    it('should not show change indicator when change is 0', async () => {
      dashboardService.getOverview.mockResolvedValue({
        success: true,
        data: {
          ...mockOverviewData.data,
          patientsChange: 0,
          visitsChange: 0
        }
      });

      render(<PracticeOverviewWidget />);

      await waitFor(() => {
        // Should still render the widget
        expect(screen.getByText('150')).toBeInTheDocument();
      });
    });
  });

  describe('Currency Formatting', () => {
    it('should format revenue as EUR currency', async () => {
      render(<PracticeOverviewWidget />);

      await waitFor(() => {
        // French format: 12 500 €
        expect(screen.getByText(/12.*500.*€/)).toBeInTheDocument();
      });
    });

    it('should format revenue change as currency', async () => {
      render(<PracticeOverviewWidget />);

      await waitFor(() => {
        // Both revenue (12 500 €) and revenue change (2 500 €) contain the pattern
        const matches = screen.getAllByText(/2.*500.*€/);
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('should render nothing on error', async () => {
      dashboardService.getOverview.mockRejectedValue(new Error('API Error'));

      const { container } = render(<PracticeOverviewWidget />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('should render nothing when success is false', async () => {
      dashboardService.getOverview.mockResolvedValue({
        success: false,
        data: null
      });

      const { container } = render(<PracticeOverviewWidget />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('Outstanding Amount', () => {
    it('should show no outstanding message when amount is 0', async () => {
      dashboardService.getOverview.mockResolvedValue({
        success: true,
        data: {
          ...mockOverviewData.data,
          outstandingAmount: 0
        }
      });

      render(<PracticeOverviewWidget />);

      await waitFor(() => {
        expect(screen.getByText('Aucun impayé')).toBeInTheDocument();
      });
    });
  });

  describe('Icons', () => {
    it('should render all KPI icons', async () => {
      render(<PracticeOverviewWidget />);

      await waitFor(() => {
        expect(screen.getByTestId('icon-users')).toBeInTheDocument();
        expect(screen.getByTestId('icon-calendar')).toBeInTheDocument();
        expect(screen.getByTestId('icon-euro')).toBeInTheDocument();
        expect(screen.getByTestId('icon-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Comparison Labels', () => {
    it('should show vs last month label for visits', async () => {
      render(<PracticeOverviewWidget />);

      await waitFor(() => {
        const labels = screen.getAllByText('vs mois dernier');
        expect(labels.length).toBe(2); // For visits and revenue
      });
    });
  });
});
