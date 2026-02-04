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
    t: (key, defaultValue) => defaultValue || key,
    i18n: { language: 'en', changeLanguage: vi.fn() }
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

// Mock react-icons (auto-mock all exports as simple spans)
vi.mock('react-icons/fa', async (importOriginal) => {
  const actual = await importOriginal();
  const mocked = {};
  for (const key of Object.keys(actual)) {
    mocked[key] = (props) => <span data-testid={`icon-${key}`} {...props} />;
  }
  return mocked;
});

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="chart-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Bar: () => null,
  Area: () => null,
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
      { id: 1, icon: '📅', message: 'New visit scheduled', created_at: new Date().toISOString(), color: 'primary' },
      { id: 2, icon: '👤', message: 'New patient registered', created_at: new Date().toISOString(), color: 'success' }
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
    data: {
      currentVersion: '8.0.4',
      changelog: {
        title: 'New Feature Released',
        date: new Date().toISOString(),
        features: [
          { icon: '✨', title: 'Analytics', description: 'Check out the new analytics' }
        ]
      }
    }
  })
}));

// Mock task service (used by TaskManagerWidget)
vi.mock('../../../services/taskService', () => ({
  getTasks: vi.fn().mockResolvedValue({
    success: true,
    data: [
      { id: 1, title: 'Follow up with patient', completed: false, due_date: new Date().toISOString(), priority: 'normal' },
      { id: 2, title: 'Review lab results', completed: true, due_date: new Date().toISOString(), priority: 'normal' }
    ]
  }),
  createTask: vi.fn().mockResolvedValue({ success: true, data: {} }),
  completeTask: vi.fn().mockResolvedValue({ success: true }),
  deleteTask: vi.fn().mockResolvedValue({ success: true })
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
      // t('dashboard.activityFeed', 'Activité récente') returns 'Activité récente'
      expect(screen.getByText(/Activité récente/i)).toBeInTheDocument();
    });
  });

  it('should display activity items', async () => {
    renderWithRouter(<ActivityFeedWidget />);

    await waitFor(() => {
      expect(screen.getByText(/visit/i)).toBeInTheDocument();
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
      // t('dashboard.taskManager', 'Tâches à faire') returns 'Tâches à faire'
      expect(screen.getByText(/Tâches à faire/i)).toBeInTheDocument();
    });
  });

  it('should display task items', async () => {
    renderWithRouter(<TaskManagerWidget />);

    await waitFor(() => {
      expect(screen.getByText(/follow up/i)).toBeInTheDocument();
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
      // t('dashboard.revenueChart', 'Évolution du CA') returns 'Évolution du CA'
      expect(screen.getByText(/Évolution du CA/i)).toBeInTheDocument();
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
      // t('dashboard.practiceHealthScore', 'Santé du cabinet') returns 'Santé du cabinet'
      expect(screen.getByText(/Santé du cabinet/i)).toBeInTheDocument();
    });
  });

  it('should display health score', async () => {
    renderWithRouter(<PracticeHealthScoreWidget />);

    await waitFor(() => {
      expect(screen.getByText('75')).toBeInTheDocument();
    });
  });

  it('should display score components', async () => {
    renderWithRouter(<PracticeHealthScoreWidget />);

    await waitFor(() => {
      // t('dashboard.healthComponent.patientGrowth', 'Croissance patients') returns 'Croissance patients'
      expect(screen.getByText(/Croissance patients/i)).toBeInTheDocument();
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
      // t('dashboard.whatsNew', 'Nouveautés') returns 'Nouveautés'
      expect(screen.getByText(/Nouveautés/i)).toBeInTheDocument();
    });
  });

  it('should display news items', async () => {
    renderWithRouter(<WhatsNewWidget />);

    await waitFor(() => {
      expect(screen.getAllByText(/Analytics/i).length).toBeGreaterThan(0);
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
      // Empty state shows 'Aucune activité récente'
      expect(screen.getByText(/Aucune activité récente/i)).toBeInTheDocument();
    });
  });

  it('TaskManagerWidget should handle empty tasks', async () => {
    const taskService = await import('../../../services/taskService');
    taskService.getTasks.mockResolvedValue({ success: true, data: [] });

    renderWithRouter(<TaskManagerWidget />);

    await waitFor(() => {
      // Empty state shows 'Aucune tâche en attente'
      expect(screen.getByText(/Aucune tâche en attente/i)).toBeInTheDocument();
    });
  });

  it('Widgets should handle API errors gracefully', async () => {
    const dashboardService = await import('../../../services/dashboardService');
    dashboardService.getActivityFeed.mockRejectedValue(new Error('API Error'));

    // Should not throw
    expect(() => renderWithRouter(<ActivityFeedWidget />)).not.toThrow();
  });
});
