/**
 * CustomFieldDisplay Component Tests
 * Ensures component renders correctly with various data formats
 *
 * Prevents React error #31 (objects rendered as children)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CustomFieldDisplay from '../CustomFieldDisplay';

describe('CustomFieldDisplay', () => {
  const baseFieldDefinition = {
    field_label: 'Test Field',
    field_type: 'text'
  };

  describe('Text fields', () => {
    it('renders text value correctly', () => {
      render(
        <CustomFieldDisplay
          fieldDefinition={{ ...baseFieldDefinition, field_type: 'text' }}
          value="Hello World"
        />
      );
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders empty value as dash', () => {
      render(
        <CustomFieldDisplay
          fieldDefinition={{ ...baseFieldDefinition, field_type: 'text' }}
          value={null}
        />
      );
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('Select fields', () => {
    const selectFieldDef = {
      field_label: 'Gender',
      field_type: 'select',
      select_options: [
        { value: 'male', label: 'Homme' },
        { value: 'female', label: 'Femme' },
        { value: 'other', label: 'Autre' }
      ]
    };

    it('renders select value as string correctly', () => {
      render(
        <CustomFieldDisplay
          fieldDefinition={selectFieldDef}
          value="male"
        />
      );
      // Should display the label, not the value
      expect(screen.getByText('Homme')).toBeInTheDocument();
    });

    it('handles select_options as simple strings', () => {
      const stringOptions = {
        field_label: 'Status',
        field_type: 'select',
        select_options: ['Active', 'Inactive', 'Pending']
      };

      render(
        <CustomFieldDisplay
          fieldDefinition={stringOptions}
          value="Active"
        />
      );
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('handles value stored as object {value, label} - should not crash', () => {
      // This is the bug case - value is accidentally an object
      render(
        <CustomFieldDisplay
          fieldDefinition={selectFieldDef}
          value={{ value: 'male', label: 'Homme' }}
        />
      );
      // Should extract and display the label
      expect(screen.getByText('Homme')).toBeInTheDocument();
    });

    it('handles unknown value gracefully', () => {
      render(
        <CustomFieldDisplay
          fieldDefinition={selectFieldDef}
          value="unknown_value"
        />
      );
      // Should display the value as-is if no matching option
      expect(screen.getByText('unknown_value')).toBeInTheDocument();
    });
  });

  describe('Boolean fields', () => {
    it('renders true as Oui', () => {
      render(
        <CustomFieldDisplay
          fieldDefinition={{ ...baseFieldDefinition, field_type: 'boolean' }}
          value={true}
        />
      );
      expect(screen.getByText('Oui')).toBeInTheDocument();
    });

    it('renders false as Non', () => {
      render(
        <CustomFieldDisplay
          fieldDefinition={{ ...baseFieldDefinition, field_type: 'boolean' }}
          value={false}
        />
      );
      expect(screen.getByText('Non')).toBeInTheDocument();
    });
  });

  describe('Date fields', () => {
    it('formats date correctly (DD/MM/YYYY)', () => {
      render(
        <CustomFieldDisplay
          fieldDefinition={{
            ...baseFieldDefinition,
            field_type: 'date',
            validation_rules: { dateFormat: 'DD/MM/YYYY' }
          }}
          value="1990-05-15"
        />
      );
      expect(screen.getByText('15/05/1990')).toBeInTheDocument();
    });
  });

  describe('Number fields', () => {
    it('renders number value correctly', () => {
      render(
        <CustomFieldDisplay
          fieldDefinition={{ ...baseFieldDefinition, field_type: 'number' }}
          value={42}
        />
      );
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  describe('Calculated fields', () => {
    it('renders calculated value with emoji', () => {
      render(
        <CustomFieldDisplay
          fieldDefinition={{
            ...baseFieldDefinition,
            field_type: 'calculated',
            decimal_places: 2
          }}
          value={25.5}
        />
      );
      expect(screen.getByText(/25.50/)).toBeInTheDocument();
    });
  });
});
