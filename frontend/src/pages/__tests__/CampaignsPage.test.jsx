/**
 * CampaignsPage Component Tests
 * Tests for the campaigns list page
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CampaignsPage from '../CampaignsPage';
import * as campaignService from '../../services/campaignService';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key
  })
}));

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    hasPermission: (perm) => true
  })
}));

// Mock campaign service
vi.mock('../../services/campaignService');

// Mock Layout
vi.mock('../../components/layout/Layout', () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>
}));

// Mock ActionButton
vi.mock('../../components/ActionButton', () => ({
  default: ({ action, onClick, title }) => (
    <button data-testid={`action-${action}`} onClick={onClick} title={title}>
      {action}
    </button>
  )
}));

// Mock Pagination
vi.mock('../../components/common/Pagination', () => ({
  default: () => <div data-testid="pagination">Pagination</div>
}));

// Mock toast
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

const mockCampaigns = [
  {
    id: '1',
    name: 'Newsletter January',
    subject: 'Your health tips',
    status: 'draft',
    campaign_type: 'newsletter',
    recipient_count: 100,
    stats: { openRate: 25 },
    created_at: '2025-01-15T10:00:00Z'
  },
  {
    id: '2',
    name: 'Promotional Offer',
    subject: 'Special discount',
    status: 'sent',
    campaign_type: 'promotional',
    recipient_count: 50,
    stats: { openRate: 35 },
    sent_at: '2025-01-20T14:00:00Z'
  }
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <CampaignsPage />
    </BrowserRouter>
  );
};

describe('CampaignsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset getCampaigns to clear any mockImplementation set by the loading test
    campaignService.getCampaigns.mockReset();
    campaignService.getCampaigns.mockResolvedValue({
      data: mockCampaigns,
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
    });
  });

  // ========================================
  // Rendering Tests
  // ========================================
  describe('Rendering', () => {
    it('renders page title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Email Campaigns')).toBeInTheDocument();
      });
    });

    it('renders create button for users with permission', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('New Campaign')).toBeInTheDocument();
      });
    });

    it('renders campaign list', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Newsletter January')).toBeInTheDocument();
        expect(screen.getByText('Promotional Offer')).toBeInTheDocument();
      });
    });

    it('renders empty state when no campaigns', async () => {
      campaignService.getCampaigns.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      });

      renderComponent();

      // Allow extra time for the debounce effect (300ms) to settle
      await waitFor(() => {
        expect(screen.getByText('No campaigns found')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('renders loading state initially', () => {
      campaignService.getCampaigns.mockImplementation(() => new Promise(() => {}));
      renderComponent();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  // ========================================
  // Filter Tests
  // ========================================
  describe('Filters', () => {
    it('renders search input', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search campaigns...')).toBeInTheDocument();
      });
    });

    it('renders status filter', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('All statuses')).toBeInTheDocument();
      });
    });

    it('renders type filter', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('All types')).toBeInTheDocument();
      });
    });

    it('filters by status', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('All statuses')).toBeInTheDocument();
      });

      const statusSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(statusSelect, { target: { value: 'draft' } });

      await waitFor(() => {
        expect(campaignService.getCampaigns).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'draft' })
        );
      });
    });
  });

  // ========================================
  // Action Tests
  // ========================================
  describe('Actions', () => {
    it('navigates to new campaign page', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('New Campaign')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('New Campaign'));
      expect(mockNavigate).toHaveBeenCalledWith('/campaigns/new');
    });

    it('renders action buttons for each campaign', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByTestId('action-view')).toHaveLength(2);
      });
    });

    it('navigates to view campaign on view action', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByTestId('action-view')[0]).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByTestId('action-view')[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/campaigns/1');
    });
  });

  // ========================================
  // Status Badge Tests
  // ========================================
  describe('Status Badges', () => {
    it('renders status badges', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Draft')).toBeInTheDocument();
        expect(screen.getByText('Sent')).toBeInTheDocument();
      });
    });

    it('renders type badges', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Newsletter')).toBeInTheDocument();
        expect(screen.getByText('Promotional')).toBeInTheDocument();
      });
    });
  });

  // ========================================
  // Delete Tests
  // ========================================
  describe('Delete Campaign', () => {
    it('shows delete confirmation modal', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByTestId('action-delete')[0]).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByTestId('action-delete')[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Campaign')).toBeInTheDocument();
      });
    });

    it('calls delete service on confirm', async () => {
      campaignService.deleteCampaign.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByTestId('action-delete')[0]).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByTestId('action-delete')[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Campaign')).toBeInTheDocument();
      });

      // The modal has a "Delete" button with variant="danger"
      // Use the modal footer's danger button to avoid matching ActionButton mocks
      const modalDeleteButton = screen.getByRole('button', { name: 'Delete' });
      fireEvent.click(modalDeleteButton);

      await waitFor(() => {
        expect(campaignService.deleteCampaign).toHaveBeenCalledWith('1');
      });
    });
  });

  // ========================================
  // Error Handling Tests
  // ========================================
  describe('Error Handling', () => {
    it('shows error toast on load failure', async () => {
      const { toast } = await import('react-toastify');
      campaignService.getCampaigns.mockRejectedValue(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load campaigns');
      });
    });
  });
});
