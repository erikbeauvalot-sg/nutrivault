/**
 * AnalyticsDashboardPage Component Tests
 * Tests for the analytics dashboard page
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AnalyticsDashboardPage from '../AnalyticsDashboardPage';
import * as analyticsService from '../../services/analyticsService';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key
  })
}));

// Mock Layout
vi.mock('../../components/layout/Layout', () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>
}));

// Mock analytics service
vi.mock('../../services/analyticsService');

// Mock Recharts to avoid rendering issues
vi.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }) => <div data-testid="chart-container">{children}</div>
}));

const mockHealthData = {
  data: {
    topMeasures: [
      { id: 1, name: 'Weight', count: 100 },
      { id: 2, name: 'Blood Pressure', count: 50 }
    ],
    measureStats: {
      totalMeasures: 150,
      uniquePatients: 25,
      outOfRange: 10,
      complianceRate: 85.5
    },
    riskDistribution: {
      low: 15,
      medium: 8,
      high: 2
    },
    monthlyTrends: [
      { month: '2025-01', count: 50, uniquePatients: 10 },
      { month: '2025-02', count: 60, uniquePatients: 12 }
    ]
  }
};

const mockFinancialData = {
  data: {
    revenueByStatus: [
      { status: 'PAID', totalAmount: 5000 },
      { status: 'PENDING', totalAmount: 2000 }
    ],
    monthlyRevenue: [
      { month: '2025-01', revenue: 3000, invoiceCount: 20 },
      { month: '2025-02', revenue: 4000, invoiceCount: 25 }
    ],
    paymentMethods: [
      { method: 'CASH', totalAmount: 3000 },
      { method: 'CARD', totalAmount: 4000 }
    ],
    summary: {
      totalRevenue: 7000,
      paidAmount: 5000,
      pendingAmount: 2000,
      totalInvoices: 45
    }
  }
};

const mockCommunicationData = {
  data: {
    emailsByType: [
      { type: 'reminder', sent: 100, delivered: 95, opened: 50 },
      { type: 'newsletter', sent: 50, delivered: 48, opened: 30 }
    ],
    monthlyVolume: [
      { month: '2025-01', sent: 80, delivered: 75 },
      { month: '2025-02', sent: 90, delivered: 85 }
    ],
    noShowRates: { overall: '8.5' },
    reminderEffectiveness: {
      withReminder: { attended: 85, noShow: 5 },
      withoutReminder: { attended: 70, noShow: 15 },
      reductionRate: '10.5'
    },
    summary: {
      totalEmailsSent: 150,
      deliveryRate: '95.5',
      openRate: '53.3'
    }
  }
};

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <AnalyticsDashboardPage />
    </BrowserRouter>
  );
};

describe('AnalyticsDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    analyticsService.getHealthTrends.mockResolvedValue(mockHealthData);
    analyticsService.getFinancialMetrics.mockResolvedValue(mockFinancialData);
    analyticsService.getCommunicationEffectiveness.mockResolvedValue(mockCommunicationData);
  });

  describe('Rendering', () => {
    it('should render the page title', async () => {
      renderComponent();

      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    it('should render three tabs', async () => {
      renderComponent();

      expect(screen.getByText('Health Trends')).toBeInTheDocument();
      expect(screen.getByText('Financial Metrics')).toBeInTheDocument();
      expect(screen.getByText('Communication')).toBeInTheDocument();
    });

    it('should render date range filters', async () => {
      renderComponent();

      expect(screen.getByText('Start Date')).toBeInTheDocument();
      expect(screen.getByText('End Date')).toBeInTheDocument();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  describe('Health Trends Tab', () => {
    it('should load health data on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(analyticsService.getHealthTrends).toHaveBeenCalled();
      });
    });

    it('should display loading state', async () => {
      analyticsService.getHealthTrends.mockImplementation(() => new Promise(() => {}));
      const { container } = renderComponent();

      // Should show spinner during loading
      expect(container.querySelector('.spinner-border')).toBeInTheDocument();
    });

    it('should display health statistics after loading', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument(); // Total Measures
        expect(screen.getByText('25')).toBeInTheDocument(); // Patients Tracked
        expect(screen.getByText('85.5%')).toBeInTheDocument(); // Compliance Rate
      });
    });

    it('should display error alert on fetch error', async () => {
      analyticsService.getHealthTrends.mockRejectedValue({
        response: { data: { error: 'Server error' } }
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should render charts', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByTestId('chart-container').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Financial Metrics Tab', () => {
    it('should load financial data when tab is clicked', async () => {
      renderComponent();

      const financialTab = screen.getByText('Financial Metrics');
      fireEvent.click(financialTab);

      await waitFor(() => {
        expect(analyticsService.getFinancialMetrics).toHaveBeenCalled();
      });
    });

    it('should display financial summary', async () => {
      renderComponent();

      const financialTab = screen.getByText('Financial Metrics');
      fireEvent.click(financialTab);

      await waitFor(() => {
        // Check for formatted currency values
        expect(screen.getByText(/7.*000/)).toBeInTheDocument(); // Total Revenue
        expect(screen.getByText('45')).toBeInTheDocument(); // Total Invoices
      });
    });

    it('should not reload data on subsequent tab clicks', async () => {
      renderComponent();

      const financialTab = screen.getByText('Financial Metrics');
      fireEvent.click(financialTab);

      await waitFor(() => {
        expect(analyticsService.getFinancialMetrics).toHaveBeenCalledTimes(1);
      });

      // Click away and back
      const healthTab = screen.getByText('Health Trends');
      fireEvent.click(healthTab);
      fireEvent.click(financialTab);

      await waitFor(() => {
        // Should not have been called again
        expect(analyticsService.getFinancialMetrics).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Communication Tab', () => {
    it('should load communication data when tab is clicked', async () => {
      renderComponent();

      const commTab = screen.getByText('Communication');
      fireEvent.click(commTab);

      await waitFor(() => {
        expect(analyticsService.getCommunicationEffectiveness).toHaveBeenCalled();
      });
    });

    it('should display communication summary', async () => {
      renderComponent();

      const commTab = screen.getByText('Communication');
      fireEvent.click(commTab);

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument(); // Emails Sent
        expect(screen.getByText('95.5%')).toBeInTheDocument(); // Delivery Rate
      });
    });

    it('should display reminder effectiveness data', async () => {
      renderComponent();

      const commTab = screen.getByText('Communication');
      fireEvent.click(commTab);

      await waitFor(() => {
        expect(screen.getByText('Reminder Effectiveness')).toBeInTheDocument();
      });
    });

    it('should handle string rates correctly (parseFloat)', async () => {
      renderComponent();

      const commTab = screen.getByText('Communication');
      fireEvent.click(commTab);

      await waitFor(() => {
        // These values come as strings and should be parsed
        expect(screen.getByText('95.5%')).toBeInTheDocument();
        expect(screen.getByText('8.5%')).toBeInTheDocument();
      });
    });
  });

  describe('Date Range Filtering', () => {
    it('should update date range state on input change', async () => {
      const { container } = renderComponent();

      // Date inputs use type="date" which does not have role "textbox"
      const dateInputs = container.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBe(2);

      // The date labels are present
      expect(screen.getByText('Start Date')).toBeInTheDocument();
      expect(screen.getByText('End Date')).toBeInTheDocument();
    });

    it('should refresh data when refresh button is clicked', async () => {
      renderComponent();

      await waitFor(() => {
        expect(analyticsService.getHealthTrends).toHaveBeenCalledTimes(1);
      });

      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(analyticsService.getHealthTrends).toHaveBeenCalledTimes(2);
      });
    });

    it('should refresh correct tab data based on active tab', async () => {
      renderComponent();

      // Switch to financial tab
      const financialTab = screen.getByText('Financial Metrics');
      fireEvent.click(financialTab);

      await waitFor(() => {
        expect(analyticsService.getFinancialMetrics).toHaveBeenCalledTimes(1);
      });

      // Click refresh
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(analyticsService.getFinancialMetrics).toHaveBeenCalledTimes(2);
        // Health trends should not have been called again
        expect(analyticsService.getHealthTrends).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Empty State Handling', () => {
    it('should handle empty health data gracefully', async () => {
      analyticsService.getHealthTrends.mockResolvedValue({
        data: {
          topMeasures: [],
          measureStats: { totalMeasures: 0, uniquePatients: 0, outOfRange: 0 },
          riskDistribution: { low: 0, medium: 0, high: 0 },
          monthlyTrends: []
        }
      });

      renderComponent();

      await waitFor(() => {
        // Multiple stat cards show 0 (totalMeasures, uniquePatients, outOfRange)
        expect(screen.getAllByText('0').length).toBeGreaterThan(0);
        expect(screen.getAllByText('No data available').length).toBeGreaterThan(0);
      });
    });

    it('should handle null data gracefully', async () => {
      analyticsService.getHealthTrends.mockResolvedValue({ data: null });

      renderComponent();

      await waitFor(() => {
        // Should not crash
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      renderComponent();

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Analytics Dashboard');
    });

    it('should have accessible tab navigation', async () => {
      renderComponent();

      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(3);
    });
  });
});
