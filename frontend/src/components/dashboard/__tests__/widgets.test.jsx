/**
 * Dashboard Widgets Tests
 * Tests for ActivityFeedWidget, TaskManagerWidget, RevenueChartWidget,
 * PracticeHealthScoreWidget, and WhatsNewWidget
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key
  })
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock react-icons
vi.mock('react-icons/fa', () => ({
  FaBell: () => <span data-testid="icon-bell" />,
  FaTasks: () => <span data-testid="icon-tasks" />,
  FaChartBar: () => <span data-testid="icon-chart-bar" />,
  FaHeart: () => <span data-testid="icon-heart" />,
  FaLightbulb: () => <span data-testid="icon-lightbulb" />,
  FaCheckCircle: () => <span data-testid="icon-check" />,
  FaExclamationTriangle: () => <span data-testid="icon-warning" />,
  FaCalendarAlt: () => <span data-testid="icon-calendar" />,
  FaUser: () => <span data-testid="icon-user" />,
  FaPlus: () => <span data-testid="icon-plus" />,
  FaInfoCircle: () => <span data-testid="icon-info" />
}));

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="chart-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null
}));

// Mock dashboard service
vi.mock('../../../services/dashboardService', () => ({
  getActivityFeed: vi.fn().mockResolvedValue({
    success: true,
    data: [
      { id: 1, type: 'visit', message: 'New visit scheduled', timestamp: new Date().toISOString() },
      { id: 2, type: 'patient', message: 'New patient registered', timestamp: new Date().toISOString() }
    ]
  }),
  getTasks: vi.fn().mockResolvedValue({
    success: true,
    data: [
      { id: 1, title: 'Follow up with patient', completed: false, dueDate: new Date().toISOString() },
      { id: 2, title: 'Review lab results', completed: true, dueDate: new Date().toISOString() }
    ]
  }),
  getRevenueChart: vi.fn().mockResolvedValue({
    success: true,
    data: [
      { month: 'Jan', revenue: 5000, invoices: 20 },
      { month: 'Feb', revenue: 6000, invoices: 25 }
    ]
  }),
  getHealthScore: vi.fn().mockResolvedValue({
    success: true,
    data: {
      totalScore: 75,
      level: 'good',
      components: {
        patientGrowth: { score: 15, max: 20, label: 'Patient Growth' },
        revenue: { score: 18, max: 20, label: 'Revenue' },
        retention: { score: 14, max: 20, label: 'Retention' },
        activity: { score: 16, max: 20, label: 'Activity' },
        payments: { score: 12, max: 20, label: 'Payments' }
      }
    }
  }),
  getWhatsNew: vi.fn().mockResolvedValue({
    success: true,
    data: [
      { id: 1, title: 'New Feature Released', description: 'Check out the new analytics', date: new Date().toISOString() }
    ]
  })
}));

// Import widgets after mocking
import ActivityFeedWidget from '../ActivityFeedWidget';
import TaskManagerWidget from '../TaskManagerWidget';
import RevenueChartWidget from '../RevenueChartWidget';
import PracticeHealthScoreWidget from '../PracticeHealthScoreWidget';
import WhatsNewWidget from '../WhatsNewWidget';

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ActivityFeedWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render widget title', async () => {
    renderWithRouter(<ActivityFeedWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Activity/i) || screen.getByText(/Activité/i)).toBeTruthy();
    });
  });

  it('should display activity items', async () => {
    renderWithRouter(<ActivityFeedWidget />);

    await waitFor(() => {
      expect(screen.getByText(/visit/i) || screen.getByText(/patient/i)).toBeTruthy();
    });
  });
});

describe('TaskManagerWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render widget title', async () => {
    renderWithRouter(<TaskManagerWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Task/i) || screen.getByText(/Tâche/i)).toBeTruthy();
    });
  });

  it('should display task items', async () => {
    renderWithRouter(<TaskManagerWidget />);

    await waitFor(() => {
      // Tasks should be visible
      expect(screen.getByText(/follow up/i) || screen.getByText(/review/i)).toBeTruthy();
    });
  });
});

describe('RevenueChartWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render widget title', async () => {
    renderWithRouter(<RevenueChartWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Revenue/i) || screen.getByText(/Chiffre/i) || screen.getByText(/CA/i)).toBeTruthy();
    });
  });

  it('should render chart container', async () => {
    renderWithRouter(<RevenueChartWidget />);

    await waitFor(() => {
      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });
  });
});

describe('PracticeHealthScoreWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render widget title', async () => {
    renderWithRouter(<PracticeHealthScoreWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Health/i) || screen.getByText(/Santé/i) || screen.getByText(/Score/i)).toBeTruthy();
    });
  });

  it('should display health score', async () => {
    renderWithRouter(<PracticeHealthScoreWidget />);

    await waitFor(() => {
      expect(screen.getByText('75') || screen.getByText(/75/)).toBeTruthy();
    });
  });

  it('should display score components', async () => {
    renderWithRouter(<PracticeHealthScoreWidget />);

    await waitFor(() => {
      // Should show component labels
      expect(screen.getByText(/Growth/i) || screen.getByText(/Croissance/i) || screen.getByText(/Revenue/i)).toBeTruthy();
    });
  });
});

describe('WhatsNewWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render widget title', async () => {
    renderWithRouter(<WhatsNewWidget />);

    await waitFor(() => {
      expect(screen.getByText(/New/i) || screen.getByText(/Nouveau/i) || screen.getByText(/Quoi de neuf/i)).toBeTruthy();
    });
  });

  it('should display news items', async () => {
    renderWithRouter(<WhatsNewWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Feature/i) || screen.getByText(/analytics/i)).toBeTruthy();
    });
  });
});

// Additional common widget behavior tests
describe('Widget Common Behaviors', () => {
  it('ActivityFeedWidget should handle empty data', async () => {
    const dashboardService = await import('../../../services/dashboardService');
    dashboardService.getActivityFeed.mockResolvedValue({ success: true, data: [] });

    renderWithRouter(<ActivityFeedWidget />);

    await waitFor(() => {
      // Should still render without crashing
      expect(screen.getByText(/Activity/i) || screen.getByText(/Activité/i)).toBeTruthy();
    });
  });

  it('TaskManagerWidget should handle empty tasks', async () => {
    const dashboardService = await import('../../../services/dashboardService');
    dashboardService.getTasks.mockResolvedValue({ success: true, data: [] });

    renderWithRouter(<TaskManagerWidget />);

    await waitFor(() => {
      // Should still render without crashing
      expect(screen.getByText(/Task/i) || screen.getByText(/Tâche/i)).toBeTruthy();
    });
  });

  it('Widgets should handle API errors gracefully', async () => {
    const dashboardService = await import('../../../services/dashboardService');
    dashboardService.getActivityFeed.mockRejectedValue(new Error('API Error'));

    // Should not throw
    expect(() => renderWithRouter(<ActivityFeedWidget />)).not.toThrow();
  });
});
