/**
 * SharedDocumentPage Component Tests
 * Tests for the public shared document page
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SharedDocumentPage from '../SharedDocumentPage';
import * as publicDocService from '../../services/publicDocumentService';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key,
    i18n: { language: 'en' }
  })
}));

// Mock publicDocumentService
vi.mock('../../services/publicDocumentService', () => ({
  getShareInfo: vi.fn(),
  verifyPassword: vi.fn(),
  downloadDocument: vi.fn(),
  triggerFileDownload: vi.fn(),
  getPreviewUrl: vi.fn((token) => `http://localhost:3001/public/documents/${token}/preview`),
  formatFileSize: vi.fn((bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }),
  getFileTypeIcon: vi.fn(() => 'file-pdf'),
  canPreviewFile: vi.fn((mimeType) => mimeType === 'application/pdf' || mimeType?.startsWith('image/'))
}));

function renderWithRouter(token) {
  return render(
    <MemoryRouter initialEntries={[`/shared/${token}`]}>
      <Routes>
        <Route path="/shared/:token" element={<SharedDocumentPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SharedDocumentPage', () => {
  const mockToken = 'a'.repeat(64);

  const mockShareInfo = {
    id: 'share-uuid',
    document: {
      id: 'doc-uuid',
      file_name: 'test-document.pdf',
      description: 'A test document',
      mime_type: 'application/pdf',
      file_size: 1048576
    },
    patient: {
      id: 'patient-uuid',
      first_name: 'John',
      last_name: 'Doe'
    },
    is_password_protected: false,
    expires_at: null,
    max_downloads: null,
    download_count: 0,
    is_active: true,
    is_expired: false,
    has_reached_limit: false,
    is_accessible: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    publicDocService.getShareInfo.mockResolvedValue(mockShareInfo);
  });

  // ========================================
  // Loading State Tests
  // ========================================
  describe('Loading State', () => {
    it('shows loading spinner initially', async () => {
      let resolveShare;
      publicDocService.getShareInfo.mockReturnValue(
        new Promise((resolve) => {
          resolveShare = resolve;
        })
      );

      renderWithRouter(mockToken);

      expect(screen.getByText('Loading document...')).toBeInTheDocument();

      resolveShare(mockShareInfo);
    });
  });

  // ========================================
  // Successful Load Tests
  // ========================================
  describe('Successful Load', () => {
    it('displays document name', async () => {
      renderWithRouter(mockToken);

      await waitFor(() => {
        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
      });
    });

    it('displays document size', async () => {
      renderWithRouter(mockToken);

      await waitFor(() => {
        expect(publicDocService.formatFileSize).toHaveBeenCalledWith(1048576);
      });
    });

    it('displays patient name', async () => {
      renderWithRouter(mockToken);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('displays download button', async () => {
      renderWithRouter(mockToken);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
      });
    });

    it('displays expiration date when set', async () => {
      publicDocService.getShareInfo.mockResolvedValue({
        ...mockShareInfo,
        expires_at: '2024-12-31T23:59:59.000Z'
      });

      renderWithRouter(mockToken);

      await waitFor(() => {
        expect(screen.getByText(/Expires:/i)).toBeInTheDocument();
      });
    });

    it('displays remaining downloads when limit set', async () => {
      publicDocService.getShareInfo.mockResolvedValue({
        ...mockShareInfo,
        max_downloads: 10,
        download_count: 3
      });

      renderWithRouter(mockToken);

      await waitFor(() => {
        expect(screen.getByText(/Downloads remaining:/i)).toBeInTheDocument();
        expect(screen.getByText('7')).toBeInTheDocument();
      });
    });

    it('shows unlocked badge after password verification', async () => {
      publicDocService.getShareInfo.mockResolvedValue({
        ...mockShareInfo,
        is_password_protected: true,
        is_accessible: true
      });

      publicDocService.verifyPassword.mockResolvedValue({ valid: true });

      renderWithRouter(mockToken);

      // Enter password
      await waitFor(() => {
        expect(screen.getByText('Password Required')).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText(/Password/i);
      fireEvent.change(passwordInput, { target: { value: 'testpass123' } });

      const unlockButton = screen.getByRole('button', { name: /Unlock Document/i });
      fireEvent.click(unlockButton);

      await waitFor(() => {
        expect(screen.getByText('Unlocked')).toBeInTheDocument();
      });
    });
  });

  // ========================================
  // Error State Tests
  // ========================================
  describe('Error States', () => {
    it('shows error for non-existent token', async () => {
      publicDocService.getShareInfo.mockRejectedValue({
        response: { status: 404 }
      });

      renderWithRouter(mockToken);

      await waitFor(() => {
        expect(screen.getByText('Document Unavailable')).toBeInTheDocument();
        expect(screen.getByText(/This share link was not found/)).toBeInTheDocument();
      });
    });

    it('shows error for revoked share', async () => {
      publicDocService.getShareInfo.mockResolvedValue({
        ...mockShareInfo,
        is_active: false,
        is_accessible: false
      });

      renderWithRouter(mockToken);

      await waitFor(() => {
        expect(screen.getByText(/This share link has been revoked/)).toBeInTheDocument();
      });
    });

    it('shows error for expired share', async () => {
      publicDocService.getShareInfo.mockResolvedValue({
        ...mockShareInfo,
        is_expired: true,
        is_accessible: false
      });

      renderWithRouter(mockToken);

      await waitFor(() => {
        expect(screen.getByText(/This share link has expired/)).toBeInTheDocument();
      });
    });

    it('shows error for download limit reached', async () => {
      publicDocService.getShareInfo.mockResolvedValue({
        ...mockShareInfo,
        has_reached_limit: true,
        is_accessible: false
      });

      renderWithRouter(mockToken);

      await waitFor(() => {
        expect(screen.getByText(/This share link has reached its download limit/)).toBeInTheDocument();
      });
    });

    it('shows generic error on load failure', async () => {
      publicDocService.getShareInfo.mockRejectedValue({
        response: { status: 500, data: { error: 'Server error' } }
      });

      renderWithRouter(mockToken);

      await waitFor(() => {
        expect(screen.getByText('Document Unavailable')).toBeInTheDocument();
      });
    });
  });

  // ========================================
  // Password Protection Tests
  // ========================================
  describe('Password Protection', () => {
    beforeEach(() => {
      publicDocService.getShareInfo.mockResolvedValue({
        ...mockShareInfo,
        is_password_protected: true
      });
    });

    it('shows password prompt for protected documents', async () => {
      renderWithRouter(mockToken);

      await waitFor(() => {
        expect(screen.getByText('Password Required')).toBeInTheDocument();
        expect(screen.getByText(/This document is password protected/)).toBeInTheDocument();
      });
    });

    it('shows document info in password prompt', async () => {
      renderWithRouter(mockToken);

      await waitFor(() => {
        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
      });
    });

    it('shows password input field', async () => {
      renderWithRouter(mockToken);

      await waitFor(() => {
        expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      });
    });

    it('disables unlock button when password is empty', async () => {
      renderWithRouter(mockToken);

      await waitFor(() => {
        const unlockButton = screen.getByRole('button', { name: /Unlock Document/i });
        expect(unlockButton).toBeDisabled();
      });
    });

    it('enables unlock button when password is entered', async () => {
      renderWithRouter(mockToken);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/Password/i);
        fireEvent.change(passwordInput, { target: { value: 'testpass123' } });
      });

      const unlockButton = screen.getByRole('button', { name: /Unlock Document/i });
      expect(unlockButton).not.toBeDisabled();
    });

    it('calls verifyPassword on submit', async () => {
      publicDocService.verifyPassword.mockResolvedValue({ valid: true });

      renderWithRouter(mockToken);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/Password/i);
        fireEvent.change(passwordInput, { target: { value: 'testpass123' } });
      });

      const unlockButton = screen.getByRole('button', { name: /Unlock Document/i });
      fireEvent.click(unlockButton);

      await waitFor(() => {
        expect(publicDocService.verifyPassword).toHaveBeenCalledWith(mockToken, 'testpass123');
      });
    });

    it('shows error for wrong password', async () => {
      publicDocService.verifyPassword.mockRejectedValue({
        response: { status: 401 }
      });

      renderWithRouter(mockToken);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/Password/i);
        fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
      });

      const unlockButton = screen.getByRole('button', { name: /Unlock Document/i });
      fireEvent.click(unlockButton);

      await waitFor(() => {
        expect(screen.getByText(/Incorrect password/)).toBeInTheDocument();
      });
    });

    it('shows rate limit error', async () => {
      publicDocService.verifyPassword.mockRejectedValue({
        response: { status: 429 }
      });

      renderWithRouter(mockToken);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/Password/i);
        fireEvent.change(passwordInput, { target: { value: 'anypass' } });
      });

      const unlockButton = screen.getByRole('button', { name: /Unlock Document/i });
      fireEvent.click(unlockButton);

      await waitFor(() => {
        expect(screen.getByText(/Too many attempts/)).toBeInTheDocument();
      });
    });

    it('shows loading state during verification', async () => {
      let resolveVerify;
      publicDocService.verifyPassword.mockReturnValue(
        new Promise((resolve) => {
          resolveVerify = resolve;
        })
      );

      renderWithRouter(mockToken);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/Password/i);
        fireEvent.change(passwordInput, { target: { value: 'testpass' } });
      });

      const unlockButton = screen.getByRole('button', { name: /Unlock Document/i });
      fireEvent.click(unlockButton);

      expect(screen.getByText('Verifying...')).toBeInTheDocument();

      resolveVerify({ valid: true });
    });

    it('shows document after successful verification', async () => {
      publicDocService.verifyPassword.mockResolvedValue({ valid: true });

      renderWithRouter(mockToken);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/Password/i);
        fireEvent.change(passwordInput, { target: { value: 'testpass123' } });
      });

      const unlockButton = screen.getByRole('button', { name: /Unlock Document/i });
      fireEvent.click(unlockButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
      });
    });
  });

  // ========================================
  // Download Tests
  // ========================================
  describe('Download', () => {
    it('downloads document when button clicked', async () => {
      const mockBlob = new Blob(['test content'], { type: 'application/pdf' });
      publicDocService.downloadDocument.mockResolvedValue(mockBlob);

      renderWithRouter(mockToken);

      await waitFor(() => {
        const downloadButton = screen.getByRole('button', { name: /Download/i });
        fireEvent.click(downloadButton);
      });

      await waitFor(() => {
        expect(publicDocService.downloadDocument).toHaveBeenCalledWith(mockToken, null);
      });
    });

    it('triggers file download with document name', async () => {
      const mockBlob = new Blob(['test content'], { type: 'application/pdf' });
      publicDocService.downloadDocument.mockResolvedValue(mockBlob);

      renderWithRouter(mockToken);

      await waitFor(() => {
        const downloadButton = screen.getByRole('button', { name: /Download/i });
        fireEvent.click(downloadButton);
      });

      await waitFor(() => {
        expect(publicDocService.triggerFileDownload).toHaveBeenCalledWith(
          mockBlob,
          'test-document.pdf'
        );
      });
    });

    it('shows loading state during download', async () => {
      let resolveDownload;
      publicDocService.downloadDocument.mockReturnValue(
        new Promise((resolve) => {
          resolveDownload = resolve;
        })
      );

      renderWithRouter(mockToken);

      await waitFor(() => {
        const downloadButton = screen.getByRole('button', { name: /Download/i });
        fireEvent.click(downloadButton);
      });

      expect(screen.getByText('Downloading...')).toBeInTheDocument();

      resolveDownload(new Blob(['test']));
    });

    it('includes password for protected downloads', async () => {
      publicDocService.getShareInfo.mockResolvedValue({
        ...mockShareInfo,
        is_password_protected: true
      });
      publicDocService.verifyPassword.mockResolvedValue({ valid: true });

      const mockBlob = new Blob(['test content'], { type: 'application/pdf' });
      publicDocService.downloadDocument.mockResolvedValue(mockBlob);

      renderWithRouter(mockToken);

      // Enter password
      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/Password/i);
        fireEvent.change(passwordInput, { target: { value: 'testpass123' } });
      });

      const unlockButton = screen.getByRole('button', { name: /Unlock Document/i });
      fireEvent.click(unlockButton);

      // Download
      await waitFor(() => {
        const downloadButton = screen.getByRole('button', { name: /Download/i });
        fireEvent.click(downloadButton);
      });

      await waitFor(() => {
        expect(publicDocService.downloadDocument).toHaveBeenCalledWith(mockToken, 'testpass123');
      });
    });

    it('disables download button for inaccessible share', async () => {
      publicDocService.getShareInfo.mockResolvedValue({
        ...mockShareInfo,
        is_accessible: false,
        is_expired: true
      });

      renderWithRouter(mockToken);

      await waitFor(() => {
        const downloadButton = screen.getByRole('button', { name: /Download/i });
        expect(downloadButton).toBeDisabled();
      });
    });

    it('refreshes share info after download', async () => {
      const mockBlob = new Blob(['test content'], { type: 'application/pdf' });
      publicDocService.downloadDocument.mockResolvedValue(mockBlob);

      renderWithRouter(mockToken);

      await waitFor(() => {
        const downloadButton = screen.getByRole('button', { name: /Download/i });
        fireEvent.click(downloadButton);
      });

      await waitFor(() => {
        // Should be called twice - once on mount, once after download
        expect(publicDocService.getShareInfo).toHaveBeenCalledTimes(2);
      });
    });

    it('shows error on download failure', async () => {
      publicDocService.downloadDocument.mockRejectedValue({
        response: { status: 403, data: { error: 'Access denied' } }
      });

      renderWithRouter(mockToken);

      await waitFor(() => {
        const downloadButton = screen.getByRole('button', { name: /Download/i });
        fireEvent.click(downloadButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Access denied/)).toBeInTheDocument();
      });
    });
  });

  // ========================================
  // Preview Tests
  // ========================================
  describe('Preview', () => {
    it('shows preview for PDFs when unlocked', async () => {
      publicDocService.getShareInfo.mockResolvedValue({
        ...mockShareInfo,
        is_password_protected: true
      });
      publicDocService.verifyPassword.mockResolvedValue({ valid: true });

      renderWithRouter(mockToken);

      // Enter password
      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/Password/i);
        fireEvent.change(passwordInput, { target: { value: 'testpass' } });
      });

      const unlockButton = screen.getByRole('button', { name: /Unlock Document/i });
      fireEvent.click(unlockButton);

      await waitFor(() => {
        const iframe = document.querySelector('iframe');
        expect(iframe).toBeInTheDocument();
      });
    });

    it('shows preview for images when accessible', async () => {
      publicDocService.getShareInfo.mockResolvedValue({
        ...mockShareInfo,
        document: {
          ...mockShareInfo.document,
          mime_type: 'image/jpeg',
          file_name: 'photo.jpg'
        }
      });

      renderWithRouter(mockToken);

      await waitFor(() => {
        const img = document.querySelector('img');
        expect(img).toBeInTheDocument();
      });
    });

    it('shows locked preview placeholder for protected documents', async () => {
      publicDocService.getShareInfo.mockResolvedValue({
        ...mockShareInfo,
        is_password_protected: true
      });

      renderWithRouter(mockToken);

      await waitFor(() => {
        expect(screen.getByText(/Preview available after password verification/)).toBeInTheDocument();
      });
    });

    it('does not show preview for non-previewable files', async () => {
      publicDocService.getShareInfo.mockResolvedValue({
        ...mockShareInfo,
        document: {
          ...mockShareInfo.document,
          mime_type: 'application/msword',
          file_name: 'document.doc'
        }
      });
      publicDocService.canPreviewFile.mockReturnValue(false);

      renderWithRouter(mockToken);

      await waitFor(() => {
        expect(document.querySelector('iframe')).not.toBeInTheDocument();
        expect(document.querySelector('img')).not.toBeInTheDocument();
      });
    });
  });

  // ========================================
  // Branding Tests
  // ========================================
  describe('Branding', () => {
    it('shows powered by footer', async () => {
      renderWithRouter(mockToken);

      await waitFor(() => {
        expect(screen.getByText('Powered by NutriVault')).toBeInTheDocument();
      });
    });
  });
});
