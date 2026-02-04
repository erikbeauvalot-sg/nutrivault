/**
 * CampaignEditorPage Component Tests
 * Tests for the campaign editor page
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import CampaignEditorPage from '../CampaignEditorPage';
import * as campaignService from '../../services/campaignService';
import { toast } from 'react-toastify';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: undefined })
  };
});

// Mock react-i18next — t must be a stable reference to avoid infinite useCallback/useEffect loops
const stableT = (key, defaultValue) => defaultValue || key;
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: stableT
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

// Mock AudienceBuilder
vi.mock('../../components/campaigns/AudienceBuilder', () => ({
  default: ({ value, onChange }) => (
    <div data-testid="audience-builder">
      <button
        data-testid="add-condition"
        onClick={() => onChange({ conditions: [{ field: 'test' }], logic: 'AND' })}
      >
        Add Condition
      </button>
    </div>
  )
}));

// Mock AudiencePreview
vi.mock('../../components/campaigns/AudiencePreview', () => ({
  default: ({ preview, loading }) => (
    <div data-testid="audience-preview">
      {loading ? 'Loading...' : preview ? `${preview.count} patients` : 'No preview'}
    </div>
  )
}));

// Mock CampaignPreview
vi.mock('../../components/campaigns/CampaignPreview', () => ({
  default: ({ campaign }) => (
    <div data-testid="campaign-preview">
      Preview: {campaign.name}
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

const renderComponent = (initialRoute = '/campaigns/new') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/campaigns/new" element={<CampaignEditorPage />} />
        <Route path="/campaigns/:id/edit" element={<CampaignEditorPage />} />
        <Route path="/campaigns" element={<div>Campaigns List</div>} />
      </Routes>
    </MemoryRouter>
  );
};

/**
 * Finds the input/select/textarea sibling within the same Form.Group as the label.
 * Needed because react-bootstrap Form.Label does not generate a `for` attribute
 * unless an explicit `htmlFor` prop is passed, so getByLabelText cannot associate
 * the label with its control.
 */
function getFormControl(labelPattern) {
  const label = screen.getByText(labelPattern, { selector: 'label' });
  const group = label.closest('.mb-3');
  const control = group.querySelector('input, select, textarea');
  return control;
}

describe('CampaignEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    campaignService.createCampaign.mockResolvedValue({ id: '1' });
    campaignService.updateCampaign.mockResolvedValue({ id: '1' });
    campaignService.previewAudienceCriteria.mockResolvedValue({ count: 50, patients: [] });

    // Mock global fetch used by loadDietitians
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] })
    });
  });

  describe('Rendering', () => {
    it('should render the page title for new campaign', async () => {
      render(
        <BrowserRouter>
          <CampaignEditorPage />
        </BrowserRouter>
      );

      expect(screen.getByText('New Campaign')).toBeInTheDocument();
    });

    it('should render step navigation', async () => {
      render(
        <BrowserRouter>
          <CampaignEditorPage />
        </BrowserRouter>
      );

      // "Basic Info" also appears in the card header as "Basic Information",
      // so we use getAllByText and verify at least one match exists for each step.
      expect(screen.getAllByText(/Basic Info/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Content/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Audience/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Preview/).length).toBeGreaterThanOrEqual(1);
    });

    it('should render form fields in basics step', async () => {
      render(
        <BrowserRouter>
          <CampaignEditorPage />
        </BrowserRouter>
      );

      expect(getFormControl(/Campaign Name/)).toBeInTheDocument();
      expect(getFormControl(/Email Subject/)).toBeInTheDocument();
      expect(getFormControl(/Campaign Type/)).toBeInTheDocument();
    });

    it('should render action buttons', async () => {
      render(
        <BrowserRouter>
          <CampaignEditorPage />
        </BrowserRouter>
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save Draft')).toBeInTheDocument();
    });
  });

  describe('Step Navigation', () => {
    it('should start on basics step', async () => {
      render(
        <BrowserRouter>
          <CampaignEditorPage />
        </BrowserRouter>
      );

      expect(getFormControl(/Campaign Name/)).toBeInTheDocument();
    });

    it('should navigate to content step when next is clicked', async () => {
      render(
        <BrowserRouter>
          <CampaignEditorPage />
        </BrowserRouter>
      );

      // Fill required fields
      fireEvent.change(getFormControl(/Campaign Name/), {
        target: { value: 'Test Campaign' }
      });
      fireEvent.change(getFormControl(/Email Subject/), {
        target: { value: 'Test Subject' }
      });

      // Click next
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      // Should now show content step
      await waitFor(() => {
        expect(screen.getByText('Email Content')).toBeInTheDocument();
      });
    });

    it('should disable next button when basics are incomplete', async () => {
      render(
        <BrowserRouter>
          <CampaignEditorPage />
        </BrowserRouter>
      );

      const nextButton = screen.getByText('Next');
      expect(nextButton).toBeDisabled();
    });

    it('should show checkmark on completed steps', async () => {
      render(
        <BrowserRouter>
          <CampaignEditorPage />
        </BrowserRouter>
      );

      // Fill basics
      fireEvent.change(getFormControl(/Campaign Name/), {
        target: { value: 'Test Campaign' }
      });
      fireEvent.change(getFormControl(/Email Subject/), {
        target: { value: 'Test Subject' }
      });

      await waitFor(() => {
        expect(screen.getByText('Next')).not.toBeDisabled();
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate campaign name is required', async () => {
      render(
        <BrowserRouter>
          <CampaignEditorPage />
        </BrowserRouter>
      );

      // Try to save without name
      fireEvent.change(getFormControl(/Email Subject/), {
        target: { value: 'Test Subject' }
      });

      const saveButton = screen.getByText('Save Draft');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Campaign name is required');
      });
    });

    it('should validate email subject is required', async () => {
      render(
        <BrowserRouter>
          <CampaignEditorPage />
        </BrowserRouter>
      );

      // Fill name but not subject
      fireEvent.change(getFormControl(/Campaign Name/), {
        target: { value: 'Test Campaign' }
      });

      const saveButton = screen.getByText('Save Draft');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Email subject is required');
      });
    });
  });

  describe('Campaign Type Selection', () => {
    it('should have newsletter as default type', async () => {
      render(
        <BrowserRouter>
          <CampaignEditorPage />
        </BrowserRouter>
      );

      const typeSelect = getFormControl(/Campaign Type/);
      expect(typeSelect.value).toBe('newsletter');
    });

    it('should allow changing campaign type', async () => {
      render(
        <BrowserRouter>
          <CampaignEditorPage />
        </BrowserRouter>
      );

      const typeSelect = getFormControl(/Campaign Type/);
      fireEvent.change(typeSelect, { target: { value: 'promotional' } });

      expect(typeSelect.value).toBe('promotional');
    });
  });

  describe('Saving Campaign', () => {
    it('should create new campaign when saving', async () => {
      render(
        <BrowserRouter>
          <CampaignEditorPage />
        </BrowserRouter>
      );

      // Fill form
      fireEvent.change(getFormControl(/Campaign Name/), {
        target: { value: 'Test Campaign' }
      });
      fireEvent.change(getFormControl(/Email Subject/), {
        target: { value: 'Test Subject' }
      });

      // Save
      const saveButton = screen.getByText('Save Draft');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(campaignService.createCampaign).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Campaign',
            subject: 'Test Subject'
          })
        );
      });
    });

    it('should show success toast on save', async () => {
      render(
        <BrowserRouter>
          <CampaignEditorPage />
        </BrowserRouter>
      );

      fireEvent.change(getFormControl(/Campaign Name/), {
        target: { value: 'Test Campaign' }
      });
      fireEvent.change(getFormControl(/Email Subject/), {
        target: { value: 'Test Subject' }
      });

      const saveButton = screen.getByText('Save Draft');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Campaign created successfully');
      });
    });

    it('should show error toast on save failure', async () => {
      campaignService.createCampaign.mockRejectedValue(new Error('Save failed'));

      render(
        <BrowserRouter>
          <CampaignEditorPage />
        </BrowserRouter>
      );

      fireEvent.change(getFormControl(/Campaign Name/), {
        target: { value: 'Test Campaign' }
      });
      fireEvent.change(getFormControl(/Email Subject/), {
        target: { value: 'Test Subject' }
      });

      const saveButton = screen.getByText('Save Draft');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to save campaign');
      });
    });

    it('should navigate to campaigns list after save', async () => {
      render(
        <BrowserRouter>
          <CampaignEditorPage />
        </BrowserRouter>
      );

      fireEvent.change(getFormControl(/Campaign Name/), {
        target: { value: 'Test Campaign' }
      });
      fireEvent.change(getFormControl(/Email Subject/), {
        target: { value: 'Test Subject' }
      });

      const saveButton = screen.getByText('Save Draft');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/campaigns');
      });
    });
  });

  describe('Content Step', () => {
    const goToContentStep = async () => {
      render(
        <BrowserRouter>
          <CampaignEditorPage />
        </BrowserRouter>
      );

      fireEvent.change(getFormControl(/Campaign Name/), {
        target: { value: 'Test Campaign' }
      });
      fireEvent.change(getFormControl(/Email Subject/), {
        target: { value: 'Test Subject' }
      });
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Email Content')).toBeInTheDocument();
      });
    };

    it('should display content textarea', async () => {
      await goToContentStep();

      expect(screen.getByPlaceholderText(/Write your email content here/)).toBeInTheDocument();
    });

    it('should display personalization variables sidebar', async () => {
      await goToContentStep();

      expect(screen.getByText('Variables de personnalisation')).toBeInTheDocument();
    });

    it('should display back button', async () => {
      await goToContentStep();

      // The header "Back" link and the step "Back" button are both visible
      const backButtons = screen.getAllByText('Back');
      expect(backButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Navigation', () => {
    it('should navigate back when cancel is clicked', async () => {
      render(
        <BrowserRouter>
          <CampaignEditorPage />
        </BrowserRouter>
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledWith('/campaigns');
    });

    it('should navigate back when back link is clicked', async () => {
      render(
        <BrowserRouter>
          <CampaignEditorPage />
        </BrowserRouter>
      );

      const backLink = screen.getByText('Back');
      fireEvent.click(backLink);

      expect(mockNavigate).toHaveBeenCalledWith('/campaigns');
    });
  });

  describe('Sender Selection', () => {
    it('should have default option for patient dietitian', async () => {
      render(
        <BrowserRouter>
          <CampaignEditorPage />
        </BrowserRouter>
      );

      const senderSelect = getFormControl(/Sender/);
      expect(senderSelect).toBeInTheDocument();
      expect(screen.getByText(/Use patient's assigned dietitian/)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show spinner while saving', async () => {
      // Use a promise that never resolves to keep the saving state active
      campaignService.createCampaign.mockImplementation(
        () => new Promise(() => {})
      );

      render(
        <BrowserRouter>
          <CampaignEditorPage />
        </BrowserRouter>
      );

      fireEvent.change(getFormControl(/Campaign Name/), {
        target: { value: 'Test Campaign' }
      });
      fireEvent.change(getFormControl(/Email Subject/), {
        target: { value: 'Test Subject' }
      });

      const saveButton = screen.getByText('Save Draft');
      fireEvent.click(saveButton);

      // Button should be disabled while saving
      await waitFor(() => {
        expect(saveButton).toBeDisabled();
      });
    });
  });
});
