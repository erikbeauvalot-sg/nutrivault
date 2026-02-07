/**
 * CustomFieldInput Component Tests
 * Ensures component handles various select_options formats
 *
 * Prevents React error #31 when select options are objects
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CustomFieldInput from '../CustomFieldInput';

// Mock EmbeddedMeasureField to avoid API calls in tests
vi.mock('../EmbeddedMeasureField', () => ({
  default: ({ patientId, measureName, visitId, readOnly }) => (
    <div data-testid="embedded-measure-field" data-patient={patientId} data-measure={measureName} data-visit={visitId || ''} data-readonly={readOnly || false}>
      Embedded: {measureName}
    </div>
  )
}));

describe('CustomFieldInput', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  const baseFieldDefinition = {
    definition_id: 'test-field-1',
    field_name: 'test_field',
    field_label: 'Test Field',
    field_type: 'text'
  };

  describe('Select fields with object options', () => {
    const selectFieldWithObjects = {
      ...baseFieldDefinition,
      field_type: 'select',
      select_options: [
        { value: 'male', label: 'Homme' },
        { value: 'female', label: 'Femme' },
        { value: 'other', label: 'Autre' }
      ]
    };

    it('renders select options from {value, label} objects', () => {
      render(
        <CustomFieldInput
          fieldDefinition={selectFieldWithObjects}
          value=""
          onChange={mockOnChange}
        />
      );

      // Check that labels are displayed
      expect(screen.getByText('Homme')).toBeInTheDocument();
      expect(screen.getByText('Femme')).toBeInTheDocument();
      expect(screen.getByText('Autre')).toBeInTheDocument();
    });

    it('selects correct option by value', () => {
      render(
        <CustomFieldInput
          fieldDefinition={selectFieldWithObjects}
          value="female"
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select.value).toBe('female');
    });

    it('calls onChange with value (not object) when selection changes', () => {
      render(
        <CustomFieldInput
          fieldDefinition={selectFieldWithObjects}
          value=""
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'male' } });

      expect(mockOnChange).toHaveBeenCalledWith('test-field-1', 'male');
    });
  });

  describe('Select fields with string options', () => {
    const selectFieldWithStrings = {
      ...baseFieldDefinition,
      field_type: 'select',
      select_options: ['Active', 'Inactive', 'Pending']
    };

    it('renders select options from string array', () => {
      render(
        <CustomFieldInput
          fieldDefinition={selectFieldWithStrings}
          value=""
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('handles string value correctly', () => {
      render(
        <CustomFieldInput
          fieldDefinition={selectFieldWithStrings}
          value="Active"
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select.value).toBe('Active');
    });
  });

  describe('Select fields with empty/null options', () => {
    it('handles undefined select_options gracefully', () => {
      const fieldWithNoOptions = {
        ...baseFieldDefinition,
        field_type: 'select',
        select_options: undefined
      };

      // Should not crash
      render(
        <CustomFieldInput
          fieldDefinition={fieldWithNoOptions}
          value=""
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('handles null select_options gracefully', () => {
      const fieldWithNullOptions = {
        ...baseFieldDefinition,
        field_type: 'select',
        select_options: null
      };

      // Should not crash
      render(
        <CustomFieldInput
          fieldDefinition={fieldWithNullOptions}
          value=""
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('Text fields', () => {
    it('renders text input', () => {
      render(
        <CustomFieldInput
          fieldDefinition={baseFieldDefinition}
          value="test value"
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input.value).toBe('test value');
    });
  });

  describe('Number fields', () => {
    it('renders number input', () => {
      render(
        <CustomFieldInput
          fieldDefinition={{ ...baseFieldDefinition, field_type: 'number' }}
          value={42}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('spinbutton');
      expect(input.value).toBe('42');
    });
  });

  describe('Boolean fields', () => {
    it('renders checkbox', () => {
      render(
        <CustomFieldInput
          fieldDefinition={{ ...baseFieldDefinition, field_type: 'boolean' }}
          value={true}
          onChange={mockOnChange}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('Embedded fields', () => {
    it('renders EmbeddedMeasureField with patientId and visitId', () => {
      render(
        <CustomFieldInput
          fieldDefinition={{
            ...baseFieldDefinition,
            field_type: 'embedded',
            select_options: { measure_name: 'weight' }
          }}
          value={null}
          onChange={mockOnChange}
          patientId="patient-123"
          visitId="visit-456"
        />
      );
      const embedded = screen.getByTestId('embedded-measure-field');
      expect(embedded).toBeInTheDocument();
      expect(embedded).toHaveAttribute('data-patient', 'patient-123');
      expect(embedded).toHaveAttribute('data-measure', 'weight');
      expect(embedded).toHaveAttribute('data-visit', 'visit-456');
    });

    it('shows message when patientId is missing', () => {
      render(
        <CustomFieldInput
          fieldDefinition={{
            ...baseFieldDefinition,
            field_type: 'embedded',
            select_options: { measure_name: 'weight' }
          }}
          value={null}
          onChange={mockOnChange}
        />
      );
      expect(screen.getByText('Patient context required')).toBeInTheDocument();
    });

    it('shows message when measure_name is missing', () => {
      render(
        <CustomFieldInput
          fieldDefinition={{
            ...baseFieldDefinition,
            field_type: 'embedded',
            select_options: {}
          }}
          value={null}
          onChange={mockOnChange}
          patientId="patient-123"
        />
      );
      expect(screen.getByText('Measure not configured')).toBeInTheDocument();
    });
  });
});
