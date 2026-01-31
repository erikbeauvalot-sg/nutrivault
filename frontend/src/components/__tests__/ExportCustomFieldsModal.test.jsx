/**
 * ExportCustomFieldsModal Component Tests
 * Tests for the custom fields export modal
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExportCustomFieldsModal from '../ExportCustomFieldsModal';
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
    exportCategories: vi.fn()
  }
}));

describe('ExportCustomFieldsModal', () => {
  const mockOnHide = vi.fn();
  const mockCategories = [
    {
      id: 'cat-1',
      name: 'Medical History',
      description: 'Patient medical background',
      color: '#3498db',
      entity_types: ['patient'],
      field_definitions: [
        { id: 'def-1', field_name: 'blood_type', field_label: 'Blood Type' },
        { id: 'def-2', field_name: 'allergies', field_label: 'Allergies' }
      ]
    },
    {
      id: 'cat-2',
      name: 'Lifestyle',
      description: 'Lifestyle information',
      color: '#e74c3c',
      entity_types: ['patient', 'visit'],
      field_definitions: [
        { id: 'def-3', field_name: 'exercise', field_label: 'Exercise' }
      ]
    }
  ];

  const defaultProps = {
    show: true,
    onHide: mockOnHide,
    categories: mockCategories
  };

  // Mock URL and document methods for file download
  let originalCreateObjectURL;
  let originalRevokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock URL methods
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:test-url');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  describe('Rendering', () => {
    it('renders the modal when show is true', () => {
      render(<ExportCustomFieldsModal {...defaultProps} />);

      expect(screen.getByText('Export Custom Fields')).toBeInTheDocument();
    });

    it('does not render the modal when show is false', () => {
      render(<ExportCustomFieldsModal {...defaultProps} show={false} />);

      expect(screen.queryByText('Export Custom Fields')).not.toBeInTheDocument();
    });

    it('renders all categories', () => {
      render(<ExportCustomFieldsModal {...defaultProps} />);

      expect(screen.getByText('Medical History')).toBeInTheDocument();
      expect(screen.getByText('Lifestyle')).toBeInTheDocument();
    });

    it('renders category descriptions', () => {
      render(<ExportCustomFieldsModal {...defaultProps} />);

      expect(screen.getByText('Patient medical background')).toBeInTheDocument();
      expect(screen.getByText('Lifestyle information')).toBeInTheDocument();
    });

    it('renders field count badges', () => {
      render(<ExportCustomFieldsModal {...defaultProps} />);

      expect(screen.getByText('2 fields')).toBeInTheDocument();
      expect(screen.getByText('1 fields')).toBeInTheDocument();
    });

    it('renders entity type badges', () => {
      render(<ExportCustomFieldsModal {...defaultProps} />);

      // There are multiple Patient badges (one for each category)
      const patientBadges = screen.getAllByText('Patient');
      expect(patientBadges.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Visit')).toBeInTheDocument();
    });

    it('shows Select All checkbox checked by default', () => {
      render(<ExportCustomFieldsModal {...defaultProps} />);

      const selectAllCheckbox = screen.getByLabelText('Select All');
      expect(selectAllCheckbox).toBeChecked();
    });

    it('shows export summary with correct counts', () => {
      render(<ExportCustomFieldsModal {...defaultProps} />);

      expect(screen.getByText(/Will export 2 categories with 3 field definitions/)).toBeInTheDocument();
    });

    it('shows message when no categories available', () => {
      render(<ExportCustomFieldsModal {...defaultProps} categories={[]} />);

      expect(screen.getByText('No categories available to export.')).toBeInTheDocument();
    });
  });

  describe('Selection behavior', () => {
    it('deselects all when Select All is unchecked', () => {
      render(<ExportCustomFieldsModal {...defaultProps} />);

      const selectAllCheckbox = screen.getByLabelText('Select All');
      fireEvent.click(selectAllCheckbox);

      // Export button should be disabled when nothing selected
      const exportButton = screen.getByRole('button', { name: /Export$/i });
      expect(exportButton).toBeDisabled();
    });

    it('toggles individual category selection', () => {
      render(<ExportCustomFieldsModal {...defaultProps} />);

      // Find and click on the Medical History checkbox
      const medicalHistoryItem = screen.getByText('Medical History').closest('.list-group-item');
      fireEvent.click(medicalHistoryItem);

      // Select All should now be unchecked
      const selectAllCheckbox = screen.getByLabelText('Select All');
      expect(selectAllCheckbox).not.toBeChecked();
    });

    it('selects all when all individual items are selected', () => {
      render(<ExportCustomFieldsModal {...defaultProps} />);

      // First uncheck Select All
      const selectAllCheckbox = screen.getByLabelText('Select All');
      fireEvent.click(selectAllCheckbox);

      // Now select both categories individually by clicking on them
      const medicalHistoryItem = screen.getByText('Medical History').closest('.list-group-item');
      const lifestyleItem = screen.getByText('Lifestyle').closest('.list-group-item');

      fireEvent.click(medicalHistoryItem);
      fireEvent.click(lifestyleItem);

      // Select All should now be checked
      expect(selectAllCheckbox).toBeChecked();
    });

    it('updates summary when selection changes', () => {
      render(<ExportCustomFieldsModal {...defaultProps} />);

      // Initially shows all selected
      expect(screen.getByText(/Will export 2 categories with 3 field definitions/)).toBeInTheDocument();

      // Uncheck one category
      const lifestyleItem = screen.getByText('Lifestyle').closest('.list-group-item');
      fireEvent.click(lifestyleItem);

      // Summary should update
      expect(screen.getByText(/Will export 1 categories with 2 field definitions/)).toBeInTheDocument();
    });
  });

  describe('Export functionality', () => {
    it('calls exportCategories service when export button clicked', async () => {
      customFieldService.exportCategories.mockResolvedValue({
        success: true,
        data: {
          version: '1.0',
          categories: mockCategories
        }
      });

      render(<ExportCustomFieldsModal {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Export$/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(customFieldService.exportCategories).toHaveBeenCalledWith([]);
      });
    });

    it('exports only selected categories when not all selected', async () => {
      customFieldService.exportCategories.mockResolvedValue({
        success: true,
        data: {
          version: '1.0',
          categories: [mockCategories[0]]
        }
      });

      render(<ExportCustomFieldsModal {...defaultProps} />);

      // Deselect second category
      const lifestyleItem = screen.getByText('Lifestyle').closest('.list-group-item');
      fireEvent.click(lifestyleItem);

      const exportButton = screen.getByRole('button', { name: /Export$/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(customFieldService.exportCategories).toHaveBeenCalledWith(['cat-1']);
      });
    });

    it('creates download URL on successful export', async () => {
      customFieldService.exportCategories.mockResolvedValue({
        success: true,
        data: {
          version: '1.0',
          categories: mockCategories
        }
      });

      render(<ExportCustomFieldsModal {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Export$/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(URL.createObjectURL).toHaveBeenCalled();
      });
    });

    it('calls onHide after successful export', async () => {
      customFieldService.exportCategories.mockResolvedValue({
        success: true,
        data: {
          version: '1.0',
          categories: mockCategories
        }
      });

      render(<ExportCustomFieldsModal {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Export$/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockOnHide).toHaveBeenCalled();
      });
    });

    it('shows loading state during export', async () => {
      let resolveExport;
      customFieldService.exportCategories.mockReturnValue(
        new Promise((resolve) => {
          resolveExport = resolve;
        })
      );

      render(<ExportCustomFieldsModal {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Export$/i });
      fireEvent.click(exportButton);

      expect(screen.getByText('Exporting...')).toBeInTheDocument();

      // Resolve the promise
      resolveExport({ success: true, data: { categories: [] } });

      await waitFor(() => {
        expect(screen.queryByText('Exporting...')).not.toBeInTheDocument();
      });
    });

    it('shows error message on export failure', async () => {
      customFieldService.exportCategories.mockRejectedValue({
        response: {
          data: { error: 'Export failed due to server error' }
        }
      });

      render(<ExportCustomFieldsModal {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Export$/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('Export failed due to server error')).toBeInTheDocument();
      });
    });

    it('disables export button when no categories selected', () => {
      render(<ExportCustomFieldsModal {...defaultProps} />);

      // Uncheck Select All
      const selectAllCheckbox = screen.getByLabelText('Select All');
      fireEvent.click(selectAllCheckbox);

      const exportButton = screen.getByRole('button', { name: /Export$/i });
      expect(exportButton).toBeDisabled();
    });

    it('disables buttons during loading', async () => {
      let resolveExport;
      customFieldService.exportCategories.mockReturnValue(
        new Promise((resolve) => {
          resolveExport = resolve;
        })
      );

      render(<ExportCustomFieldsModal {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Export$/i });
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });

      fireEvent.click(exportButton);

      expect(cancelButton).toBeDisabled();

      resolveExport({ success: true, data: { categories: [] } });
    });
  });

  describe('Modal behavior', () => {
    it('calls onHide when Cancel button clicked', () => {
      render(<ExportCustomFieldsModal {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnHide).toHaveBeenCalled();
    });

    it('resets selection when modal reopens', () => {
      const { rerender } = render(<ExportCustomFieldsModal {...defaultProps} show={false} />);

      // Open the modal
      rerender(<ExportCustomFieldsModal {...defaultProps} show={true} />);

      // All should be selected again
      const selectAllCheckbox = screen.getByLabelText('Select All');
      expect(selectAllCheckbox).toBeChecked();
    });

    it('dismisses error alert', async () => {
      customFieldService.exportCategories.mockRejectedValue({
        response: {
          data: { error: 'Test error' }
        }
      });

      render(<ExportCustomFieldsModal {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Export$/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      // Find the error alert (the one containing "Test error")
      const errorText = screen.getByText('Test error');
      const alert = errorText.closest('.alert');
      const closeButton = alert.querySelector('.btn-close');
      fireEvent.click(closeButton);

      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });
  });
});
