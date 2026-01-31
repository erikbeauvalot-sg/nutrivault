/**
 * DocumentSharingModal Component Tests
 * Tests for the document sharing modal that creates and manages share links
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DocumentSharingModal from '../DocumentSharingModal';
import * as documentService from '../../services/documentService';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key
  })
}));

// Mock documentService
vi.mock('../../services/documentService', () => ({
  createShareLink: vi.fn(),
  getSharesWithLogs: vi.fn(),
  revokeShareLink: vi.fn(),
  updateShareSettings: vi.fn(),
  getFileTypeIcon: vi.fn(() => '📄'),
  formatFileSize: vi.fn((size) => `${size} Bytes`)
}));

// Mock navigator.clipboard
const mockClipboard = {
  writeText: vi.fn()
};
Object.assign(navigator, { clipboard: mockClipboard });

describe('DocumentSharingModal', () => {
  const mockDocument = {
    id: 'doc-uuid',
    file_name: 'test-document.pdf',
    mime_type: 'application/pdf',
    file_size: 1024
  };

  const mockPatients = [
    { id: 'patient-1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
    { id: 'patient-2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' }
  ];

  const mockOnHide = vi.fn();
  const mockOnShareCreated = vi.fn();

  const defaultProps = {
    show: true,
    onHide: mockOnHide,
    document: mockDocument,
    patients: mockPatients,
    onShareCreated: mockOnShareCreated
  };

  beforeEach(() => {
    vi.clearAllMocks();
    documentService.getSharesWithLogs.mockResolvedValue({ data: [] });
    mockClipboard.writeText.mockResolvedValue();
  });

  // ========================================
  // Rendering Tests
  // ========================================
  describe('Rendering', () => {
    it('renders the modal when show is true', () => {
      render(<DocumentSharingModal {...defaultProps} />);

      expect(screen.getByText('Share Document')).toBeInTheDocument();
    });

    it('does not render when show is false', () => {
      render(<DocumentSharingModal {...defaultProps} show={false} />);

      expect(screen.queryByText('Share Document')).not.toBeInTheDocument();
    });

    it('does not render when document is null', () => {
      render(<DocumentSharingModal {...defaultProps} document={null} />);

      expect(screen.queryByText('Share Document')).not.toBeInTheDocument();
    });

    it('displays document information', () => {
      render(<DocumentSharingModal {...defaultProps} />);

      expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    });

    it('displays patient select options', () => {
      render(<DocumentSharingModal {...defaultProps} />);

      expect(screen.getByText('-- Choose a patient --')).toBeInTheDocument();
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
    });

    it('displays create new share link section', () => {
      render(<DocumentSharingModal {...defaultProps} />);

      expect(screen.getByText('Create New Share Link')).toBeInTheDocument();
    });

    it('displays existing share links section', () => {
      render(<DocumentSharingModal {...defaultProps} />);

      expect(screen.getByText('Existing Share Links')).toBeInTheDocument();
    });

    it('shows close button', () => {
      render(<DocumentSharingModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });
  });

  // ========================================
  // Form Interaction Tests
  // ========================================
  describe('Form Interactions', () => {
    it('allows selecting a patient', () => {
      render(<DocumentSharingModal {...defaultProps} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'patient-1' } });

      expect(select.value).toBe('patient-1');
    });

    it('allows setting expiration date', () => {
      render(<DocumentSharingModal {...defaultProps} />);

      const dateInput = screen.getByLabelText(/Expiration Date/i);
      fireEvent.change(dateInput, { target: { value: '2024-12-31T23:59' } });

      expect(dateInput.value).toBe('2024-12-31T23:59');
    });

    it('allows toggling password protection', () => {
      render(<DocumentSharingModal {...defaultProps} />);

      const passwordSwitch = screen.getByRole('switch');
      fireEvent.click(passwordSwitch);

      expect(screen.getByLabelText('Password *')).toBeInTheDocument();
    });

    it('shows password field when password protection is enabled', () => {
      render(<DocumentSharingModal {...defaultProps} />);

      const passwordSwitch = screen.getByRole('switch');
      fireEvent.click(passwordSwitch);

      const passwordInput = screen.getByLabelText('Password *');
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('clears password when protection is disabled', () => {
      render(<DocumentSharingModal {...defaultProps} />);

      // Enable password protection
      const passwordSwitch = screen.getByRole('switch');
      fireEvent.click(passwordSwitch);

      // Enter password
      const passwordInput = screen.getByLabelText('Password *');
      fireEvent.change(passwordInput, { target: { value: 'testpass' } });

      // Disable password protection
      fireEvent.click(passwordSwitch);

      // Password field should be gone
      expect(screen.queryByLabelText('Password *')).not.toBeInTheDocument();
    });

    it('allows setting max downloads', () => {
      render(<DocumentSharingModal {...defaultProps} />);

      const maxDownloadsInput = screen.getByLabelText(/Maximum Downloads/i);
      fireEvent.change(maxDownloadsInput, { target: { value: '10' } });

      expect(maxDownloadsInput.value).toBe('10');
    });

    it('allows adding notes', () => {
      render(<DocumentSharingModal {...defaultProps} />);

      const notesInput = screen.getByLabelText(/Notes/i);
      fireEvent.change(notesInput, { target: { value: 'Test note' } });

      expect(notesInput.value).toBe('Test note');
    });
  });

  // ========================================
  // Create Share Tests
  // ========================================
  describe('Create Share', () => {
    it('shows error when no patient selected', async () => {
      render(<DocumentSharingModal {...defaultProps} />);

      const createButton = screen.getByRole('button', { name: /Create Share Link/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Please select a patient')).toBeInTheDocument();
      });
    });

    it('shows error for short password', async () => {
      render(<DocumentSharingModal {...defaultProps} />);

      // Select patient
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'patient-1' } });

      // Enable password
      const passwordSwitch = screen.getByRole('switch');
      fireEvent.click(passwordSwitch);

      // Enter short password
      const passwordInput = screen.getByLabelText('Password *');
      fireEvent.change(passwordInput, { target: { value: '123' } });

      // Try to create
      const createButton = screen.getByRole('button', { name: /Create Share Link/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 4 characters')).toBeInTheDocument();
      });
    });

    it('calls createShareLink with correct parameters', async () => {
      const mockResponse = {
        data: {
          id: 'share-uuid',
          share_url: 'http://localhost:5173/shared/token123',
          share_token: 'token123'
        }
      };
      documentService.createShareLink.mockResolvedValue(mockResponse);

      render(<DocumentSharingModal {...defaultProps} />);

      // Select patient
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'patient-1' } });

      // Set max downloads
      const maxDownloadsInput = screen.getByLabelText(/Maximum Downloads/i);
      fireEvent.change(maxDownloadsInput, { target: { value: '5' } });

      // Create share
      const createButton = screen.getByRole('button', { name: /Create Share Link/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(documentService.createShareLink).toHaveBeenCalledWith(
          'doc-uuid',
          expect.objectContaining({
            patient_id: 'patient-1',
            max_downloads: 5
          })
        );
      });
    });

    it('shows success message on successful creation', async () => {
      const mockResponse = {
        data: {
          id: 'share-uuid',
          share_url: 'http://localhost:5173/shared/token123'
        }
      };
      documentService.createShareLink.mockResolvedValue(mockResponse);

      render(<DocumentSharingModal {...defaultProps} />);

      // Select patient
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'patient-1' } });

      // Create share
      const createButton = screen.getByRole('button', { name: /Create Share Link/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Share link created successfully')).toBeInTheDocument();
      });
    });

    it('calls onShareCreated callback on success', async () => {
      const mockResponse = {
        data: {
          id: 'share-uuid',
          share_url: 'http://localhost:5173/shared/token123'
        }
      };
      documentService.createShareLink.mockResolvedValue(mockResponse);

      render(<DocumentSharingModal {...defaultProps} />);

      // Select patient
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'patient-1' } });

      // Create share
      const createButton = screen.getByRole('button', { name: /Create Share Link/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnShareCreated).toHaveBeenCalledWith(mockResponse.data);
      });
    });

    it('shows error message on failure', async () => {
      documentService.createShareLink.mockRejectedValue({
        response: { data: { error: 'Failed to create share' } }
      });

      render(<DocumentSharingModal {...defaultProps} />);

      // Select patient
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'patient-1' } });

      // Create share
      const createButton = screen.getByRole('button', { name: /Create Share Link/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to create share')).toBeInTheDocument();
      });
    });

    it('resets form after successful creation', async () => {
      const mockResponse = {
        data: {
          id: 'share-uuid',
          share_url: 'http://localhost:5173/shared/token123'
        }
      };
      documentService.createShareLink.mockResolvedValue(mockResponse);

      render(<DocumentSharingModal {...defaultProps} />);

      // Select patient
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'patient-1' } });

      // Create share
      const createButton = screen.getByRole('button', { name: /Create Share Link/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(select.value).toBe('');
      });
    });

    it('shows loading state during creation', async () => {
      let resolveCreate;
      documentService.createShareLink.mockReturnValue(
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
      );

      render(<DocumentSharingModal {...defaultProps} />);

      // Select patient
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'patient-1' } });

      // Create share
      const createButton = screen.getByRole('button', { name: /Create Share Link/i });
      fireEvent.click(createButton);

      expect(screen.getByText('Creating...')).toBeInTheDocument();

      resolveCreate({ data: { id: 'share-uuid' } });
    });
  });

  // ========================================
  // Existing Shares Tests
  // ========================================
  describe('Existing Shares', () => {
    const mockShares = [
      {
        id: 'share-1',
        share_token: 'token1',
        share_url: 'http://localhost:5173/shared/token1',
        patient: { first_name: 'John', last_name: 'Doe' },
        sent_at: '2024-01-15T10:00:00.000Z',
        expires_at: '2024-12-31T23:59:00.000Z',
        download_count: 3,
        max_downloads: 10,
        is_active: true,
        is_expired: false,
        has_reached_limit: false,
        is_password_protected: true,
        last_accessed_at: '2024-01-16T10:00:00.000Z',
        accessLogs: []
      }
    ];

    beforeEach(() => {
      documentService.getSharesWithLogs.mockResolvedValue({ data: mockShares });
    });

    it('loads existing shares on mount', async () => {
      render(<DocumentSharingModal {...defaultProps} />);

      await waitFor(() => {
        expect(documentService.getSharesWithLogs).toHaveBeenCalledWith('doc-uuid');
      });
    });

    it('displays existing share links', async () => {
      render(<DocumentSharingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/John Doe/)).toBeInTheDocument();
        expect(screen.getByText(/Downloads: 3\/10/)).toBeInTheDocument();
      });
    });

    it('shows Active badge for active share', async () => {
      render(<DocumentSharingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    it('shows Revoked badge for inactive share', async () => {
      documentService.getSharesWithLogs.mockResolvedValue({
        data: [{ ...mockShares[0], is_active: false }]
      });

      render(<DocumentSharingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Revoked')).toBeInTheDocument();
      });
    });

    it('shows Expired badge for expired share', async () => {
      documentService.getSharesWithLogs.mockResolvedValue({
        data: [{ ...mockShares[0], is_expired: true }]
      });

      render(<DocumentSharingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Expired')).toBeInTheDocument();
      });
    });

    it('shows Limit Reached badge when download limit reached', async () => {
      documentService.getSharesWithLogs.mockResolvedValue({
        data: [{ ...mockShares[0], has_reached_limit: true }]
      });

      render(<DocumentSharingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Limit Reached')).toBeInTheDocument();
      });
    });

    it('shows empty state when no shares exist', async () => {
      documentService.getSharesWithLogs.mockResolvedValue({ data: [] });

      render(<DocumentSharingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No share links created yet')).toBeInTheDocument();
      });
    });
  });

  // ========================================
  // Revoke Share Tests
  // ========================================
  describe('Revoke Share', () => {
    const mockShares = [
      {
        id: 'share-1',
        share_token: 'token1',
        share_url: 'http://localhost:5173/shared/token1',
        patient: { first_name: 'John', last_name: 'Doe' },
        sent_at: '2024-01-15T10:00:00.000Z',
        download_count: 3,
        max_downloads: 10,
        is_active: true,
        is_expired: false,
        has_reached_limit: false,
        accessLogs: []
      }
    ];

    beforeEach(() => {
      documentService.getSharesWithLogs.mockResolvedValue({ data: mockShares });
      documentService.revokeShareLink.mockResolvedValue({ success: true });
    });

    it('shows revoke button for active shares', async () => {
      render(<DocumentSharingModal {...defaultProps} />);

      // Expand the accordion to see the revoke button
      await waitFor(() => {
        const accordionButton = screen.getByText(/John Doe/).closest('button');
        fireEvent.click(accordionButton);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Revoke Link/i })).toBeInTheDocument();
      });
    });

    it('opens confirmation modal when revoke is clicked', async () => {
      render(<DocumentSharingModal {...defaultProps} />);

      // Expand accordion
      await waitFor(() => {
        const accordionButton = screen.getByText(/John Doe/).closest('button');
        fireEvent.click(accordionButton);
      });

      // Click revoke
      await waitFor(() => {
        const revokeButton = screen.getByRole('button', { name: /Revoke Link/i });
        fireEvent.click(revokeButton);
      });

      expect(screen.getByText('Revoke Share Link')).toBeInTheDocument();
    });

    it('calls revokeShareLink on confirmation', async () => {
      render(<DocumentSharingModal {...defaultProps} />);

      // Expand accordion
      await waitFor(() => {
        const accordionButton = screen.getByText(/John Doe/).closest('button');
        fireEvent.click(accordionButton);
      });

      // Click revoke
      await waitFor(() => {
        const revokeButton = screen.getByRole('button', { name: /Revoke Link/i });
        fireEvent.click(revokeButton);
      });

      // Confirm revoke
      const confirmButton = screen.getAllByRole('button', { name: /Revoke Link/i })[1];
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(documentService.revokeShareLink).toHaveBeenCalledWith('share-1');
      });
    });
  });

  // ========================================
  // Copy Link Tests
  // ========================================
  describe('Copy Link', () => {
    const mockShares = [
      {
        id: 'share-1',
        share_token: 'token1',
        share_url: 'http://localhost:5173/shared/token1',
        patient: { first_name: 'John', last_name: 'Doe' },
        sent_at: '2024-01-15T10:00:00.000Z',
        download_count: 0,
        is_active: true,
        is_expired: false,
        has_reached_limit: false,
        accessLogs: []
      }
    ];

    beforeEach(() => {
      documentService.getSharesWithLogs.mockResolvedValue({ data: mockShares });
    });

    it('copies link to clipboard', async () => {
      render(<DocumentSharingModal {...defaultProps} />);

      // Expand accordion
      await waitFor(() => {
        const accordionButton = screen.getByText(/John Doe/).closest('button');
        fireEvent.click(accordionButton);
      });

      // Click copy button
      await waitFor(() => {
        const copyButton = screen.getByRole('button', { name: /Copy/i });
        fireEvent.click(copyButton);
      });

      expect(mockClipboard.writeText).toHaveBeenCalledWith('http://localhost:5173/shared/token1');
    });

    it('shows Copied! feedback after copying', async () => {
      render(<DocumentSharingModal {...defaultProps} />);

      // Expand accordion
      await waitFor(() => {
        const accordionButton = screen.getByText(/John Doe/).closest('button');
        fireEvent.click(accordionButton);
      });

      // Click copy button
      await waitFor(() => {
        const copyButton = screen.getByRole('button', { name: /Copy/i });
        fireEvent.click(copyButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });
  });

  // ========================================
  // Modal Behavior Tests
  // ========================================
  describe('Modal Behavior', () => {
    it('calls onHide when close button is clicked', async () => {
      render(<DocumentSharingModal {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(mockOnHide).toHaveBeenCalled();
    });

    it('does not close while loading', async () => {
      let resolveCreate;
      documentService.createShareLink.mockReturnValue(
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
      );

      render(<DocumentSharingModal {...defaultProps} />);

      // Select patient and start creation
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'patient-1' } });

      const createButton = screen.getByRole('button', { name: /Create Share Link/i });
      fireEvent.click(createButton);

      // Try to close
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      // Modal should still be open
      expect(screen.getByText('Share Document')).toBeInTheDocument();

      resolveCreate({ data: { id: 'share-uuid' } });
    });

    it('resets state on close', () => {
      const { rerender } = render(<DocumentSharingModal {...defaultProps} />);

      // Select patient
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'patient-1' } });

      // Close modal
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      // Reopen modal
      rerender(<DocumentSharingModal {...defaultProps} show={false} />);
      rerender(<DocumentSharingModal {...defaultProps} show={true} />);

      // Form should be reset
      const newSelect = screen.getByRole('combobox');
      expect(newSelect.value).toBe('');
    });
  });
});
