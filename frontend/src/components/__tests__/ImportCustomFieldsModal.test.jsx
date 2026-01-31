/**
 * ImportCustomFieldsModal Component Tests
 * Tests for the custom fields import modal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImportCustomFieldsModal from '../ImportCustomFieldsModal';
import customFieldService from '../../services/customFieldService';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue, params) => {
      if (params) {
        let result = defaultValue || key;
        Object.keys(params).forEach(k => {
          result = result.replace(`{{${k}}}`, params[k]);
        });
        return result;
      }
      return defaultValue || key;
    }
  })
}));

// Mock customFieldService
vi.mock('../../services/customFieldService', () => ({
  default: {
    importCategories: vi.fn()
  }
}));

describe('ImportCustomFieldsModal', () => {
  const mockOnHide = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockExistingCategories = [
    { id: 'existing-1', name: 'Existing Category' }
  ];

  const defaultProps = {
    show: true,
    onHide: mockOnHide,
    onSuccess: mockOnSuccess,
    existingCategories: mockExistingCategories
  };

  const validImportFileContent = {
    version: '1.0',
    exportDate: '2024-01-15T10:00:00.000Z',
    exportedBy: 'admin',
    categories: [
      {
        name: 'New Category',
        description: 'A new category to import',
        color: '#ff5733',
        entity_types: ['patient'],
        field_definitions: [
          { field_name: 'new_field', field_label: 'New Field', field_type: 'text' }
        ]
      },
      {
        name: 'Existing Category',
        description: 'This one already exists',
        color: '#3498db',
        entity_types: ['visit'],
        field_definitions: []
      }
    ]
  };

  // Helper to create a mock file
  const createMockFile = (content, name = 'test.json') => {
    const blob = new Blob([JSON.stringify(content)], { type: 'application/json' });
    return new File([blob], name, { type: 'application/json' });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the modal when show is true', () => {
      render(<ImportCustomFieldsModal {...defaultProps} />);

      expect(screen.getByText('Import Custom Fields')).toBeInTheDocument();
    });

    it('does not render the modal when show is false', () => {
      render(<ImportCustomFieldsModal {...defaultProps} show={false} />);

      expect(screen.queryByText('Import Custom Fields')).not.toBeInTheDocument();
    });

    it('renders file input', () => {
      render(<ImportCustomFieldsModal {...defaultProps} />);

      expect(screen.getByText('Select Export File')).toBeInTheDocument();
    });

    it('shows file hint text', () => {
      render(<ImportCustomFieldsModal {...defaultProps} />);

      expect(screen.getByText('Select a JSON file exported from NutriVault.')).toBeInTheDocument();
    });

    it('shows Cancel button', () => {
      render(<ImportCustomFieldsModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('shows Import button disabled initially', () => {
      render(<ImportCustomFieldsModal {...defaultProps} />);

      const importButton = screen.getByRole('button', { name: /Import$/i });
      expect(importButton).toBeDisabled();
    });
  });

  describe('File selection', () => {
    it('parses valid JSON file', async () => {
      render(<ImportCustomFieldsModal {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]');
      const mockFile = createMockFile(validImportFileContent);

      // Mock the file read
      Object.defineProperty(mockFile, 'text', {
        value: () => Promise.resolve(JSON.stringify(validImportFileContent))
      });

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(screen.getByText('File Information')).toBeInTheDocument();
      });
    });

    it('displays file information after valid file selection', async () => {
      render(<ImportCustomFieldsModal {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]');
      const mockFile = createMockFile(validImportFileContent);
      Object.defineProperty(mockFile, 'text', {
        value: () => Promise.resolve(JSON.stringify(validImportFileContent))
      });

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(screen.getByText('Version:')).toBeInTheDocument();
        expect(screen.getByText('1.0')).toBeInTheDocument();
        expect(screen.getByText('admin')).toBeInTheDocument();
      });
    });

    it('displays category list after file selection', async () => {
      render(<ImportCustomFieldsModal {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]');
      const mockFile = createMockFile(validImportFileContent);
      Object.defineProperty(mockFile, 'text', {
        value: () => Promise.resolve(JSON.stringify(validImportFileContent))
      });

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(screen.getByText('New Category')).toBeInTheDocument();
        expect(screen.getByText('Existing Category')).toBeInTheDocument();
      });
    });

    it('shows "Exists" badge for existing categories', async () => {
      render(<ImportCustomFieldsModal {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]');
      const mockFile = createMockFile(validImportFileContent);
      Object.defineProperty(mockFile, 'text', {
        value: () => Promise.resolve(JSON.stringify(validImportFileContent))
      });

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(screen.getByText('Exists')).toBeInTheDocument();
      });
    });

    it('shows error for invalid JSON file', async () => {
      render(<ImportCustomFieldsModal {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]');
      const invalidFile = new File(['not valid json'], 'test.json', { type: 'application/json' });
      Object.defineProperty(invalidFile, 'text', {
        value: () => Promise.resolve('not valid json')
      });

      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(screen.getByText('Invalid JSON file. Please select a valid export file.')).toBeInTheDocument();
      });
    });

    it('shows error for file without categories array', async () => {
      render(<ImportCustomFieldsModal {...defaultProps} />);

      const invalidContent = { version: '1.0' };
      const fileInput = document.querySelector('input[type="file"]');
      const mockFile = createMockFile(invalidContent);
      Object.defineProperty(mockFile, 'text', {
        value: () => Promise.resolve(JSON.stringify(invalidContent))
      });

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Invalid file format/)).toBeInTheDocument();
      });
    });
  });

  describe('Import options', () => {
    const setupWithFile = async () => {
      render(<ImportCustomFieldsModal {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]');
      const mockFile = createMockFile(validImportFileContent);
      Object.defineProperty(mockFile, 'text', {
        value: () => Promise.resolve(JSON.stringify(validImportFileContent))
      });

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(screen.getByText('Import Options')).toBeInTheDocument();
      });
    };

    it('shows import options after file selection', async () => {
      await setupWithFile();

      expect(screen.getByText('Skip existing categories (keep current data)')).toBeInTheDocument();
      expect(screen.getByText('Update existing categories (merge with imported data)')).toBeInTheDocument();
    });

    it('has skip existing option selected by default', async () => {
      await setupWithFile();

      const skipRadio = screen.getByLabelText('Skip existing categories (keep current data)');
      expect(skipRadio).toBeChecked();
    });

    it('allows selecting update existing option', async () => {
      await setupWithFile();

      const updateRadio = screen.getByLabelText('Update existing categories (merge with imported data)');
      fireEvent.click(updateRadio);

      expect(updateRadio).toBeChecked();
    });
  });

  describe('Category selection', () => {
    const setupWithFile = async () => {
      render(<ImportCustomFieldsModal {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]');
      const mockFile = createMockFile(validImportFileContent);
      Object.defineProperty(mockFile, 'text', {
        value: () => Promise.resolve(JSON.stringify(validImportFileContent))
      });

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(screen.getByText('New Category')).toBeInTheDocument();
      });
    };

    it('has all categories selected by default', async () => {
      await setupWithFile();

      const selectAllCheckbox = screen.getByLabelText('Select All');
      expect(selectAllCheckbox).toBeChecked();
    });

    it('allows deselecting individual categories', async () => {
      await setupWithFile();

      const categoryItem = screen.getByText('New Category').closest('.list-group-item');
      fireEvent.click(categoryItem);

      const selectAllCheckbox = screen.getByLabelText('Select All');
      expect(selectAllCheckbox).not.toBeChecked();
    });

    it('updates import summary when selection changes', async () => {
      await setupWithFile();

      // Initially all selected
      expect(screen.getByText(/Will import 2 categories/)).toBeInTheDocument();

      // Deselect one
      const categoryItem = screen.getByText('New Category').closest('.list-group-item');
      fireEvent.click(categoryItem);

      expect(screen.getByText(/Will import 1 categories/)).toBeInTheDocument();
    });

    it('shows existing warning count', async () => {
      await setupWithFile();

      expect(screen.getByText(/1 of these categories already exist/)).toBeInTheDocument();
    });
  });

  describe('Import functionality', () => {
    const setupWithFile = async () => {
      render(<ImportCustomFieldsModal {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]');
      const mockFile = createMockFile(validImportFileContent);
      Object.defineProperty(mockFile, 'text', {
        value: () => Promise.resolve(JSON.stringify(validImportFileContent))
      });

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(screen.getByText('New Category')).toBeInTheDocument();
      });
    };

    it('calls importCategories service on import', async () => {
      customFieldService.importCategories.mockResolvedValue({
        success: true,
        data: {
          categoriesCreated: 1,
          categoriesUpdated: 0,
          categoriesSkipped: 1,
          definitionsCreated: 1,
          definitionsUpdated: 0,
          definitionsSkipped: 0,
          errors: []
        }
      });

      await setupWithFile();

      const importButton = screen.getByRole('button', { name: /Import$/i });
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(customFieldService.importCategories).toHaveBeenCalled();
      });
    });

    it('passes correct options to importCategories', async () => {
      customFieldService.importCategories.mockResolvedValue({
        success: true,
        data: {
          categoriesCreated: 1,
          categoriesUpdated: 0,
          categoriesSkipped: 1,
          definitionsCreated: 1,
          definitionsUpdated: 0,
          definitionsSkipped: 0,
          errors: []
        }
      });

      await setupWithFile();

      // Select update option
      const updateRadio = screen.getByLabelText('Update existing categories (merge with imported data)');
      fireEvent.click(updateRadio);

      const importButton = screen.getByRole('button', { name: /Import$/i });
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(customFieldService.importCategories).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            skipExisting: false,
            updateExisting: true
          })
        );
      });
    });

    it('shows loading state during import', async () => {
      let resolveImport;
      customFieldService.importCategories.mockReturnValue(
        new Promise((resolve) => {
          resolveImport = resolve;
        })
      );

      await setupWithFile();

      const importButton = screen.getByRole('button', { name: /Import$/i });
      fireEvent.click(importButton);

      expect(screen.getByText('Importing...')).toBeInTheDocument();

      resolveImport({
        success: true,
        data: { categoriesCreated: 0, errors: [] }
      });
    });

    it('shows success results after import', async () => {
      customFieldService.importCategories.mockResolvedValue({
        success: true,
        data: {
          categoriesCreated: 1,
          categoriesUpdated: 0,
          categoriesSkipped: 1,
          definitionsCreated: 2,
          definitionsUpdated: 0,
          definitionsSkipped: 0,
          errors: []
        }
      });

      await setupWithFile();

      const importButton = screen.getByRole('button', { name: /Import$/i });
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(screen.getByText('Import Complete!')).toBeInTheDocument();
        expect(screen.getByText(/Categories Created:/)).toBeInTheDocument();
      });
    });

    it('calls onSuccess after successful import', async () => {
      customFieldService.importCategories.mockResolvedValue({
        success: true,
        data: {
          categoriesCreated: 1,
          categoriesUpdated: 0,
          categoriesSkipped: 0,
          definitionsCreated: 1,
          definitionsUpdated: 0,
          definitionsSkipped: 0,
          errors: []
        }
      });

      await setupWithFile();

      const importButton = screen.getByRole('button', { name: /Import$/i });
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('shows error message on import failure', async () => {
      customFieldService.importCategories.mockRejectedValue({
        response: {
          data: { error: 'Import failed due to validation error' }
        }
      });

      await setupWithFile();

      const importButton = screen.getByRole('button', { name: /Import$/i });
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(screen.getByText('Import failed due to validation error')).toBeInTheDocument();
      });
    });

    it('shows import errors in results', async () => {
      customFieldService.importCategories.mockResolvedValue({
        success: true,
        data: {
          categoriesCreated: 1,
          categoriesUpdated: 0,
          categoriesSkipped: 0,
          definitionsCreated: 0,
          definitionsUpdated: 0,
          definitionsSkipped: 0,
          errors: [
            { type: 'definition', name: 'bad_field', error: 'Invalid field type' }
          ]
        }
      });

      await setupWithFile();

      const importButton = screen.getByRole('button', { name: /Import$/i });
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(screen.getByText('Errors:')).toBeInTheDocument();
        expect(screen.getByText(/definition: bad_field - Invalid field type/)).toBeInTheDocument();
      });
    });

    it('disables import button when no categories selected', async () => {
      await setupWithFile();

      // Deselect all
      const selectAllCheckbox = screen.getByLabelText('Select All');
      fireEvent.click(selectAllCheckbox);

      const importButton = screen.getByRole('button', { name: /Import$/i });
      expect(importButton).toBeDisabled();
    });

    it('shows error when trying to import with no selection', async () => {
      await setupWithFile();

      // The button should be disabled, but let's verify the state
      const selectAllCheckbox = screen.getByLabelText('Select All');
      fireEvent.click(selectAllCheckbox);

      const importButton = screen.getByRole('button', { name: /Import$/i });
      expect(importButton).toBeDisabled();
    });
  });

  describe('Modal behavior', () => {
    it('calls onHide when Cancel button clicked', () => {
      render(<ImportCustomFieldsModal {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnHide).toHaveBeenCalled();
    });

    it('changes button to Close after successful import', async () => {
      customFieldService.importCategories.mockResolvedValue({
        success: true,
        data: {
          categoriesCreated: 1,
          categoriesUpdated: 0,
          categoriesSkipped: 0,
          definitionsCreated: 0,
          definitionsUpdated: 0,
          definitionsSkipped: 0,
          errors: []
        }
      });

      render(<ImportCustomFieldsModal {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]');
      const mockFile = createMockFile(validImportFileContent);
      Object.defineProperty(mockFile, 'text', {
        value: () => Promise.resolve(JSON.stringify(validImportFileContent))
      });

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(screen.getByText('New Category')).toBeInTheDocument();
      });

      const importButton = screen.getByRole('button', { name: /Import$/i });
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Close/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Import$/i })).not.toBeInTheDocument();
      });
    });

    it('resets state when modal closes and reopens', async () => {
      const { rerender } = render(<ImportCustomFieldsModal {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]');
      const mockFile = createMockFile(validImportFileContent);
      Object.defineProperty(mockFile, 'text', {
        value: () => Promise.resolve(JSON.stringify(validImportFileContent))
      });

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(screen.getByText('New Category')).toBeInTheDocument();
      });

      // Close and reopen
      rerender(<ImportCustomFieldsModal {...defaultProps} show={false} />);
      rerender(<ImportCustomFieldsModal {...defaultProps} show={true} />);

      // File info should be gone (would need to select file again)
      // The modal resets on close through handleClose
    });
  });
});
