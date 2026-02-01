/**
 * CampaignsWidget Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CampaignsWidget from '../CampaignsWidget';
import * as campaignService from '../../../services/campaignService';

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

// Mock campaign service
vi.mock('../../../services/campaignService');

// Mock react-icons
vi.mock('react-icons/fa', () => ({
  FaEnvelope: () => <span data-testid="icon-envelope" />,
  FaPaperPlane: () => <span data-testid="icon-paperplane" />,
  FaEnvelopeOpen: () => <span data-testid="icon-envelope-open" />,
  FaClock: () => <span data-testid="icon-clock" />
}));

const mockCampaigns = {
  data: [
    {
      id: '1',
      name: 'Newsletter January',
      status: 'sent',
      sent_at: '2025-01-15T10:00:00Z',
      recipient_count: 100,
      stats: { openRate: 30 },
      created_at: '2025-01-10T10:00:00Z'
    },
    {
      id: '2',
      name: 'Promo February',
      status: 'scheduled',
      scheduled_at: '2025-02-01T10:00:00Z',
      recipient_count: 0,
      stats: null,
      created_at: '2025-01-20T10:00:00Z'
    },
    {
      id: '3',
      name: 'Draft Campaign',
      status: 'draft',
      sent_at: null,
      recipient_count: 0,
      stats: null,
      created_at: '2025-01-25T10:00:00Z'
    },
    {
      id: '4',
      name: 'Old Newsletter',
      status: 'sent',
      sent_at: '2024-12-01T10:00:00Z',
      recipient_count: 50,
      stats: { openRate: 40 },
      created_at: '2024-11-25T10:00:00Z'
    }
  ]
};

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <CampaignsWidget />
    </BrowserRouter>
  );
};

describe('CampaignsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    campaignService.getCampaigns.mockResolvedValue(mockCampaigns);
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching data', async () => {
      campaignService.getCampaigns.mockImplementation(
        () => new Promise(() => {})
      );

      renderComponent();

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should show widget title during loading', async () => {
      campaignService.getCampaigns.mockImplementation(
        () => new Promise(() => {})
      );

      renderComponent();

      expect(screen.getByText('Campagnes Email')).toBeInTheDocument();
    });
  });

  describe('Stats Display', () => {
    it('should display sent campaigns count', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // 2 sent campaigns
        expect(screen.getByText('Envoyées')).toBeInTheDocument();
      });
    });

    it('should display scheduled campaigns count', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument(); // 1 scheduled
        expect(screen.getByText('Planifiées')).toBeInTheDocument();
      });
    });

    it('should display draft campaigns count', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Brouillons')).toBeInTheDocument();
      });
    });

    it('should calculate and display average open rate', async () => {
      renderComponent();

      await waitFor(() => {
        // Average of 30% and 40% = 35%
        expect(screen.getByText('35%')).toBeInTheDocument();
        expect(screen.getByText('Ouverture')).toBeInTheDocument();
      });
    });

    it('should display total recipients', async () => {
      renderComponent();

      await waitFor(() => {
        // 100 + 50 = 150 recipients from sent campaigns
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('Total destinataires')).toBeInTheDocument();
      });
    });
  });

  describe('Recent Campaigns List', () => {
    it('should display recent campaigns header', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Campagnes récentes')).toBeInTheDocument();
      });
    });

    it('should display up to 3 recent campaigns', async () => {
      renderComponent();

      await waitFor(() => {
        // Should show most recent 3 campaigns
        expect(screen.getByText('Draft Campaign')).toBeInTheDocument();
        expect(screen.getByText('Promo February')).toBeInTheDocument();
        expect(screen.getByText('Newsletter January')).toBeInTheDocument();
      });
    });

    it('should display campaign status badges', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('sent')).toBeInTheDocument();
        expect(screen.getByText('scheduled')).toBeInTheDocument();
        expect(screen.getByText('draft')).toBeInTheDocument();
      });
    });

    it('should navigate to campaign when clicked', async () => {
      renderComponent();

      await waitFor(() => {
        const campaignItem = screen.getByText('Newsletter January').closest('[style*="cursor"]');
        fireEvent.click(campaignItem);
        expect(mockNavigate).toHaveBeenCalledWith('/campaigns/1');
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no campaigns', async () => {
      campaignService.getCampaigns.mockResolvedValue({ data: [] });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Aucune campagne')).toBeInTheDocument();
      });
    });

    it('should show zeros for stats when no campaigns', async () => {
      campaignService.getCampaigns.mockResolvedValue({ data: [] });

      renderComponent();

      await waitFor(() => {
        const zeros = screen.getAllByText('0');
        expect(zeros.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle error gracefully', async () => {
      campaignService.getCampaigns.mockRejectedValue(new Error('API Error'));

      renderComponent();

      await waitFor(() => {
        // Should render nothing when error
        expect(screen.queryByText('Campagnes Email')).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to campaigns list when clicking view all', async () => {
      renderComponent();

      await waitFor(() => {
        const viewAllBadge = screen.getByText('Voir tout');
        fireEvent.click(viewAllBadge);
        expect(mockNavigate).toHaveBeenCalledWith('/campaigns');
      });
    });

    it('should navigate to new campaign when clicking button', async () => {
      renderComponent();

      await waitFor(() => {
        const newButton = screen.getByText('Nouvelle campagne');
        fireEvent.click(newButton);
        expect(mockNavigate).toHaveBeenCalledWith('/campaigns/new');
      });
    });
  });

  describe('Date Formatting', () => {
    it('should format sent dates correctly', async () => {
      renderComponent();

      await waitFor(() => {
        // Dates should be formatted in French (e.g., "15 janv.")
        // The exact format depends on browser locale
        expect(screen.getByText(/janv/i)).toBeInTheDocument();
      });
    });
  });
});
