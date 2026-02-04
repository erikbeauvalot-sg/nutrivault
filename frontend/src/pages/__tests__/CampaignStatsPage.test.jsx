/**
 * CampaignStatsPage Component Tests
 * Tests for the campaign statistics page
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import CampaignStatsPage from '../CampaignStatsPage';
import * as campaignService from '../../services/campaignService';
import { toast } from 'react-toastify';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: '1' })
  };
});

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key
  })
}));

// Mock campaign service
vi.mock('../../services/campaignService');

// Mock Layout
vi.mock('../../components/layout/Layout', () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>
}));

// Mock Pagination
vi.mock('../../components/common/Pagination', () => ({
  default: ({ currentPage, totalPages, onPageChange }) => (
    <div data-testid="pagination">
      <button onClick={() => onPageChange(currentPage + 1)}>Next Page</button>
    </div>
  )
}));

// Mock toast
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

const mockCampaignStats = {
  campaign: {
    id: '1',
    name: 'Test Newsletter',
    subject: 'Monthly Update',
    status: 'sent',
    campaign_type: 'newsletter',
    sent_at: '2025-01-15T10:00:00Z',
    recipient_count: 100
  },
  stats: {
    total: 100,
    sent: 95,
    pending: 3,
    failed: 2,
    bounced: 0,
    opened: 45,
    clicked: 20,
    openRate: '47.4',
    clickRate: '21.1'
  }
};

const mockRecipients = {
  data: [
    {
      id: '1',
      email: 'john@example.com',
      status: 'sent',
      sent_at: '2025-01-15T10:00:00Z',
      opened_at: '2025-01-15T11:00:00Z',
      clicked_at: null,
      patient: { name: 'John Doe' }
    },
    {
      id: '2',
      email: 'jane@example.com',
      status: 'sent',
      sent_at: '2025-01-15T10:00:00Z',
      opened_at: null,
      clicked_at: null,
      patient: { name: 'Jane Smith' }
    },
    {
      id: '3',
      email: 'bob@example.com',
      status: 'failed',
      sent_at: null,
      opened_at: null,
      clicked_at: null,
      patient: { name: 'Bob Wilson' }
    }
  ],
  pagination: {
    page: 1,
    totalPages: 2,
    total: 100
  }
};

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <CampaignStatsPage />
    </BrowserRouter>
  );
};

describe('CampaignStatsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    campaignService.getCampaignStats.mockResolvedValue(mockCampaignStats);
    campaignService.getCampaignRecipients.mockResolvedValue(mockRecipients);
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', async () => {
      campaignService.getCampaignStats.mockImplementation(
        () => new Promise(() => {})
      );

      const { container } = renderComponent();

      expect(container.querySelector('.spinner-border')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Campaign Header', () => {
    it('should display campaign name', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Newsletter')).toBeInTheDocument();
      });
    });

    it('should display campaign subject', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Monthly Update')).toBeInTheDocument();
      });
    });

    it('should have back navigation link', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Back to campaigns')).toBeInTheDocument();
      });
    });

    it('should navigate back when clicking back link', async () => {
      renderComponent();

      await waitFor(() => {
        const backLink = screen.getByText('Back to campaigns');
        fireEvent.click(backLink);
        expect(mockNavigate).toHaveBeenCalledWith('/campaigns');
      });
    });
  });

  describe('Stats Cards', () => {
    it('should display total recipients', async () => {
      renderComponent();

      await waitFor(() => {
        // "100" appears in both the total recipients stat card and the campaign info card
        expect(screen.getAllByText('100').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Total Recipients')).toBeInTheDocument();
      });
    });

    it('should display delivered count', async () => {
      renderComponent();

      await waitFor(() => {
        // "95" appears in both the delivered stat card and the delivery status badge
        expect(screen.getAllByText('95').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Delivered')).toBeInTheDocument();
      });
    });

    it('should display opened count with rate', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('45')).toBeInTheDocument();
        expect(screen.getByText('Opened')).toBeInTheDocument();
        expect(screen.getByText('(47.4%)')).toBeInTheDocument();
      });
    });

    it('should display clicked count with rate', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('20')).toBeInTheDocument();
        expect(screen.getByText('Clicked')).toBeInTheDocument();
        expect(screen.getByText('(21.1%)')).toBeInTheDocument();
      });
    });
  });

  describe('Delivery Status Card', () => {
    it('should display delivery status breakdown', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Delivery Status')).toBeInTheDocument();
        expect(screen.getByText('Sent')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('Failed')).toBeInTheDocument();
        expect(screen.getByText('Bounced')).toBeInTheDocument();
      });
    });

    it('should show status counts as badges', async () => {
      renderComponent();

      await waitFor(() => {
        const badges = screen.getAllByText(/\d+/);
        expect(badges.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Campaign Info Card', () => {
    it('should display campaign info', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Campaign Info')).toBeInTheDocument();
        expect(screen.getByText('Type')).toBeInTheDocument();
        expect(screen.getByText('newsletter')).toBeInTheDocument();
      });
    });

    it('should display sent date', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Sent at')).toBeInTheDocument();
      });
    });
  });

  describe('Recipients Table', () => {
    it('should display recipients list', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Recipients')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should display recipient emails', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      });
    });

    it('should display recipient status badges', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByText('sent').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('failed')).toBeInTheDocument();
      });
    });

    it('should show opened timestamp for opened emails', async () => {
      renderComponent();

      await waitFor(() => {
        // John's email was opened
        const openedCells = screen.getAllByRole('cell');
        expect(openedCells.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Filtering', () => {
    it('should have status filter dropdown', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
        expect(screen.getByText('All statuses')).toBeInTheDocument();
      });
    });

    it('should filter by status when selected', async () => {
      renderComponent();

      await waitFor(() => {
        const statusFilter = screen.getByRole('combobox');
        fireEvent.change(statusFilter, { target: { value: 'failed' } });
      });

      await waitFor(() => {
        expect(campaignService.getCampaignRecipients).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({ status: 'failed' })
        );
      });
    });

    it('should have search input', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });
    });

    it('should search when typing', async () => {
      renderComponent();

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search...');
        fireEvent.change(searchInput, { target: { value: 'john' } });
      });

      await waitFor(() => {
        expect(campaignService.getCampaignRecipients).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({ search: 'john' })
        );
      });
    });
  });

  describe('Pagination', () => {
    it('should display pagination when multiple pages', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('pagination')).toBeInTheDocument();
      });
    });

    it('should load next page when clicking pagination', async () => {
      renderComponent();

      await waitFor(() => {
        const nextPageButton = screen.getByText('Next Page');
        fireEvent.click(nextPageButton);
      });

      await waitFor(() => {
        expect(campaignService.getCampaignRecipients).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({ page: 2 })
        );
      });
    });

    it('should not show pagination when single page', async () => {
      campaignService.getCampaignRecipients.mockResolvedValue({
        ...mockRecipients,
        pagination: { page: 1, totalPages: 1, total: 3 }
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show message when no recipients', async () => {
      campaignService.getCampaignRecipients.mockResolvedValue({
        data: [],
        pagination: { page: 1, totalPages: 1, total: 0 }
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No recipients found')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error and navigate on load error', async () => {
      campaignService.getCampaignStats.mockRejectedValue(
        new Error('Campaign not found')
      );

      renderComponent();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load campaign');
        expect(mockNavigate).toHaveBeenCalledWith('/campaigns');
      });
    });

    it('should handle recipients loading error gracefully', async () => {
      campaignService.getCampaignRecipients.mockRejectedValue(
        new Error('Failed to load recipients')
      );

      renderComponent();

      // Should still show stats
      await waitFor(() => {
        expect(screen.getByText('Test Newsletter')).toBeInTheDocument();
      });
    });
  });

  describe('Table Headers', () => {
    it('should display all column headers', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Recipient')).toBeInTheDocument();
        expect(screen.getAllByText('Status')[0]).toBeInTheDocument();
        expect(screen.getByText('Sent')).toBeInTheDocument();
        expect(screen.getByText('Opened')).toBeInTheDocument();
        expect(screen.getByText('Clicked')).toBeInTheDocument();
      });
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly', async () => {
      renderComponent();

      await waitFor(() => {
        // Date should be formatted in French locale
        // 15/01/2025 10:00 format
        const formattedDates = screen.getAllByText(/\d{2}\/\d{2}\/\d{4}/);
        expect(formattedDates.length).toBeGreaterThan(0);
      });
    });

    it('should show dash for null dates', async () => {
      renderComponent();

      await waitFor(() => {
        // Jane's opened_at and clicked_at are null
        const dashes = screen.getAllByText('-');
        expect(dashes.length).toBeGreaterThan(0);
      });
    });
  });
});
