/**
 * Public Document Service Tests
 * Tests for the public document sharing API service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getDownloadUrl,
  getPreviewUrl,
  triggerFileDownload,
  formatFileSize,
  getFileTypeIcon,
  canPreviewFile
} from '../publicDocumentService';

// Note: getShareInfo, verifyPassword, and downloadDocument require mocking axios.create
// which is complex. We test the pure utility functions here and integration tests
// would cover the API calls.

describe('publicDocumentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // URL Generation Tests
  // ========================================
  describe('getDownloadUrl', () => {
    it('generates download URL without password', () => {
      const token = 'g'.repeat(64);
      const url = getDownloadUrl(token);

      expect(url).toContain(`/public/documents/${token}/download`);
      expect(url).not.toContain('password=');
    });

    it('generates download URL with password', () => {
      const token = 'h'.repeat(64);
      const url = getDownloadUrl(token, 'testpass123');

      expect(url).toContain(`/public/documents/${token}/download`);
      expect(url).toContain('password=testpass123');
    });

    it('encodes special characters in password', () => {
      const token = 'i'.repeat(64);
      const url = getDownloadUrl(token, 'pass&word=123');

      expect(url).toContain('password=pass%26word%3D123');
    });
  });

  describe('getPreviewUrl', () => {
    it('generates preview URL without password', () => {
      const token = 'j'.repeat(64);
      const url = getPreviewUrl(token);

      expect(url).toContain(`/public/documents/${token}/preview`);
      expect(url).not.toContain('password=');
    });

    it('generates preview URL with password', () => {
      const token = 'k'.repeat(64);
      const url = getPreviewUrl(token, 'testpass123');

      expect(url).toContain(`/public/documents/${token}/preview`);
      expect(url).toContain('password=testpass123');
    });
  });

  // ========================================
  // formatFileSize Tests
  // ========================================
  describe('formatFileSize', () => {
    it('formats 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('formats bytes', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
    });

    it('formats kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('formats megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(5242880)).toBe('5 MB');
    });

    it('formats gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('formats with decimal precision', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2621440)).toBe('2.5 MB');
    });
  });

  // ========================================
  // getFileTypeIcon Tests
  // ========================================
  describe('getFileTypeIcon', () => {
    it('returns image icon for image types', () => {
      expect(getFileTypeIcon('image/jpeg')).toBe('file-image');
      expect(getFileTypeIcon('image/png')).toBe('file-image');
      expect(getFileTypeIcon('image/gif')).toBe('file-image');
    });

    it('returns pdf icon for PDF', () => {
      expect(getFileTypeIcon('application/pdf')).toBe('file-pdf');
    });

    it('returns word icon for Word documents', () => {
      expect(getFileTypeIcon('application/msword')).toBe('file-word');
      expect(getFileTypeIcon('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('file-word');
    });

    it('returns text icon for text files', () => {
      expect(getFileTypeIcon('text/plain')).toBe('file-text');
      expect(getFileTypeIcon('text/html')).toBe('file-text');
    });

    it('returns generic file icon for unknown types', () => {
      expect(getFileTypeIcon('application/octet-stream')).toBe('file');
      expect(getFileTypeIcon('application/zip')).toBe('file');
    });

    it('handles null/undefined mime types', () => {
      expect(getFileTypeIcon(null)).toBe('file');
      expect(getFileTypeIcon(undefined)).toBe('file');
    });
  });

  // ========================================
  // canPreviewFile Tests
  // ========================================
  describe('canPreviewFile', () => {
    it('returns true for images', () => {
      expect(canPreviewFile('image/jpeg')).toBe(true);
      expect(canPreviewFile('image/png')).toBe(true);
      expect(canPreviewFile('image/gif')).toBe(true);
      expect(canPreviewFile('image/webp')).toBe(true);
    });

    it('returns true for PDFs', () => {
      expect(canPreviewFile('application/pdf')).toBe(true);
    });

    it('returns false for Word documents', () => {
      expect(canPreviewFile('application/msword')).toBe(false);
      expect(canPreviewFile('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(false);
    });

    it('returns false for other file types', () => {
      expect(canPreviewFile('application/zip')).toBe(false);
      expect(canPreviewFile('text/plain')).toBe(false);
    });

    it('handles null/undefined mime types', () => {
      expect(canPreviewFile(null)).toBe(false);
      expect(canPreviewFile(undefined)).toBe(false);
    });
  });

  // ========================================
  // triggerFileDownload Tests
  // ========================================
  describe('triggerFileDownload', () => {
    let mockCreateObjectURL;
    let mockRevokeObjectURL;
    let mockAppendChild;
    let mockRemoveChild;
    let mockClick;
    let mockLink;

    beforeEach(() => {
      mockCreateObjectURL = vi.fn(() => 'blob:url');
      mockRevokeObjectURL = vi.fn();
      mockClick = vi.fn();
      mockLink = {
        href: '',
        download: '',
        click: mockClick
      };

      mockAppendChild = vi.fn();
      mockRemoveChild = vi.fn();

      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;
      global.document.createElement = vi.fn(() => mockLink);
      global.document.body.appendChild = mockAppendChild;
      global.document.body.removeChild = mockRemoveChild;
    });

    it('creates object URL from blob', () => {
      const blob = new Blob(['test content'], { type: 'application/pdf' });
      triggerFileDownload(blob, 'test.pdf');

      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
    });

    it('sets download filename', () => {
      const blob = new Blob(['test content'], { type: 'application/pdf' });
      triggerFileDownload(blob, 'my-document.pdf');

      expect(mockLink.download).toBe('my-document.pdf');
    });

    it('triggers click on link', () => {
      const blob = new Blob(['test content'], { type: 'application/pdf' });
      triggerFileDownload(blob, 'test.pdf');

      expect(mockClick).toHaveBeenCalled();
    });

    it('cleans up resources', () => {
      const blob = new Blob(['test content'], { type: 'application/pdf' });
      triggerFileDownload(blob, 'test.pdf');

      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:url');
    });
  });
});
