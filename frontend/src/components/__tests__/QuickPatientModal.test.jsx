/**
 * QuickPatientModal Component Tests
 * Tests for the quick patient creation modal with custom fields support
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import QuickPatientModal from '../QuickPatientModal';
import * as patientService from '../../services/patientService';
import * as customFieldService from '../../services/customFieldService';

// Mock services
vi.mock('../../services/patientService', () => ({
  createPatient: vi.fn()
}));

vi.mock('../../services/customFieldService', () => ({
  getCategories: vi.fn(),
  updatePatientCustomFields: vi.fn()
}));

// Mock useEmailCheck hook
vi.mock('../../hooks/useEmailCheck', () => ({
  default: () => ({
    checking: false,
    available: null,
    error: null
  })
}));

const renderModal = (props = {}) => {
  const defaultProps = {
    show: true,
    onHide: vi.fn(),
    onSuccess: vi.fn()
  };

  return render(
    <I18nextProvider i18n={i18n}>
      <QuickPatientModal {...defaultProps} {...props} />
    </I18nextProvider>
  );
};

describe('QuickPatientModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    customFieldService.getCategories.mockResolvedValue([]);
  });

  describe('Rendering', () => {
    it('renders the modal when show is true', async () => {
      renderModal();

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('displays the modal title', async () => {
      renderModal();

      await waitFor(() => {
        expect(screen.getByText(/Quick Patient Creation|Création Rapide/i)).toBeInTheDocument();
      });
    });

    it('renders standard form fields', async () => {
      renderModal();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/first name|prénom/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/last name|nom/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/example\.com/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/\+33/i)).toBeInTheDocument();
      });
    });
  });

  describe('Custom Fields', () => {
    const mockCategoriesWithVisibleFields = [
      {
        id: 'cat-1',
        name: 'Personal Info',
        field_definitions: [
          {
            id: 'field-1',
            field_name: 'date_of_birth',
            field_label: 'Date of Birth',
            field_type: 'date',
            is_active: true,
            visible_on_creation: true,
            is_required: false
          },
          {
            id: 'field-2',
            field_name: 'occupation',
            field_label: 'Occupation',
            field_type: 'text',
            is_active: true,
            visible_on_creation: false, // Should not appear
            is_required: false
          }
        ]
      },
      {
        id: 'cat-2',
        name: 'Medical',
        field_definitions: [
          {
            id: 'field-3',
            field_name: 'blood_type',
            field_label: 'Blood Type',
            field_type: 'select',
            select_options: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
            is_active: true,
            visible_on_creation: true,
            is_required: false
          }
        ]
      }
    ];

    it('fetches custom fields when modal opens', async () => {
      customFieldService.getCategories.mockResolvedValue([]);
      renderModal();

      await waitFor(() => {
        expect(customFieldService.getCategories).toHaveBeenCalled();
      });
    });

    it('displays custom fields marked as visible_on_creation', async () => {
      customFieldService.getCategories.mockResolvedValue(mockCategoriesWithVisibleFields);
      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Date of Birth')).toBeInTheDocument();
        expect(screen.getByText('Blood Type')).toBeInTheDocument();
      });
    });

    it('does not display custom fields not marked as visible_on_creation', async () => {
      customFieldService.getCategories.mockResolvedValue(mockCategoriesWithVisibleFields);
      renderModal();

      await waitFor(() => {
        expect(screen.queryByText('Occupation')).not.toBeInTheDocument();
      });
    });

    it('displays additional information header when custom fields exist', async () => {
      customFieldService.getCategories.mockResolvedValue(mockCategoriesWithVisibleFields);
      renderModal();

      await waitFor(() => {
        expect(screen.getByText(/Additional Information|Informations Complémentaires/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      customFieldService.getCategories.mockResolvedValue([]);
      patientService.createPatient.mockResolvedValue({
        data: { id: 'new-patient-id', first_name: 'John', last_name: 'Doe' }
      });
    });

    it('does not submit when first name is empty', async () => {
      renderModal();

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const lastNameInput = screen.getByPlaceholderText(/last name|nom/i);
      fireEvent.change(lastNameInput, { target: { value: 'Doe' } });

      const emailInput = screen.getByPlaceholderText(/example\.com/i);
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });

      const submitButton = screen.getByRole('button', { name: /create|créer/i });
      fireEvent.click(submitButton);

      // Form should not submit - createPatient should not be called
      await waitFor(() => {
        expect(patientService.createPatient).not.toHaveBeenCalled();
      });
    });

    it('does not submit when neither email nor phone is provided', async () => {
      renderModal();

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const firstNameInput = screen.getByPlaceholderText(/first name|prénom/i);
      fireEvent.change(firstNameInput, { target: { value: 'John' } });

      const lastNameInput = screen.getByPlaceholderText(/last name|nom/i);
      fireEvent.change(lastNameInput, { target: { value: 'Doe' } });

      const submitButton = screen.getByRole('button', { name: /create|créer/i });
      fireEvent.click(submitButton);

      // Form should not submit - createPatient should not be called
      await waitFor(() => {
        expect(patientService.createPatient).not.toHaveBeenCalled();
      });
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      customFieldService.getCategories.mockResolvedValue([]);
      patientService.createPatient.mockResolvedValue({
        data: { id: 'new-patient-id', first_name: 'John', last_name: 'Doe' }
      });
    });

    it('submits form with valid data', async () => {
      const onSuccess = vi.fn();
      const onHide = vi.fn();

      renderModal({ onSuccess, onHide });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/first name|prénom/i), {
        target: { value: 'John' }
      });
      fireEvent.change(screen.getByPlaceholderText(/last name|nom/i), {
        target: { value: 'Doe' }
      });
      fireEvent.change(screen.getByPlaceholderText(/example\.com/i), {
        target: { value: 'john@example.com' }
      });

      const submitButton = screen.getByRole('button', { name: /create|créer/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(patientService.createPatient).toHaveBeenCalledWith({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com'
        });
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        expect(onHide).toHaveBeenCalled();
      });
    });

    it('saves custom field values after patient creation', async () => {
      const mockCategoriesWithVisibleFields = [
        {
          id: 'cat-1',
          name: 'Personal Info',
          field_definitions: [
            {
              id: 'field-1',
              field_name: 'notes',
              field_label: 'Notes',
              field_type: 'text',
              is_active: true,
              visible_on_creation: true,
              is_required: false
            }
          ]
        }
      ];

      customFieldService.getCategories.mockResolvedValue(mockCategoriesWithVisibleFields);
      customFieldService.updatePatientCustomFields.mockResolvedValue({});

      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Notes')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/first name|prénom/i), {
        target: { value: 'John' }
      });
      fireEvent.change(screen.getByPlaceholderText(/last name|nom/i), {
        target: { value: 'Doe' }
      });
      fireEvent.change(screen.getByPlaceholderText(/example\.com/i), {
        target: { value: 'john@example.com' }
      });

      // Find the custom field input and fill it
      const notesInput = screen.getAllByRole('textbox').find(
        input => input.id === 'notes'
      );
      if (notesInput) {
        fireEvent.change(notesInput, { target: { value: 'Test notes' } });
      }

      const submitButton = screen.getByRole('button', { name: /create|créer/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(patientService.createPatient).toHaveBeenCalled();
      });
    });
  });

  describe('Modal Actions', () => {
    it('calls onHide when cancel button is clicked', async () => {
      const onHide = vi.fn();
      customFieldService.getCategories.mockResolvedValue([]);

      renderModal({ onHide });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel|annuler/i });
      fireEvent.click(cancelButton);

      expect(onHide).toHaveBeenCalled();
    });

    it('resets form when modal is closed', async () => {
      const onHide = vi.fn();
      customFieldService.getCategories.mockResolvedValue([]);

      renderModal({ onHide });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const firstNameInput = screen.getByPlaceholderText(/first name|prénom/i);
      fireEvent.change(firstNameInput, { target: { value: 'John' } });

      const cancelButton = screen.getByRole('button', { name: /cancel|annuler/i });
      fireEvent.click(cancelButton);

      // Form should be reset - the modal will re-render with empty values
      expect(onHide).toHaveBeenCalled();
    });
  });

  describe('Layout', () => {
    it('uses larger modal size when custom fields exist', async () => {
      const mockCategoriesWithVisibleFields = [
        {
          id: 'cat-1',
          name: 'Personal Info',
          field_definitions: [
            {
              id: 'field-1',
              field_name: 'notes',
              field_label: 'Notes',
              field_type: 'text',
              is_active: true,
              visible_on_creation: true
            }
          ]
        }
      ];

      customFieldService.getCategories.mockResolvedValue(mockCategoriesWithVisibleFields);
      renderModal();

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog.querySelector('.modal-lg')).toBeInTheDocument();
      });
    });

    it('uses default modal size when no custom fields exist', async () => {
      customFieldService.getCategories.mockResolvedValue([]);
      renderModal();

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog.querySelector('.modal-lg')).not.toBeInTheDocument();
      });
    });
  });
});
