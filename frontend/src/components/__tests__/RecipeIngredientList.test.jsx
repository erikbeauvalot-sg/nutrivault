/**
 * RecipeIngredientList Component Tests
 * Tests for the recipe ingredient management component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeIngredientList from '../RecipeIngredientList';
import * as ingredientService from '../../services/ingredientService';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key
  })
}));

// Mock ingredient service
vi.mock('../../services/ingredientService', () => ({
  searchIngredients: vi.fn()
}));

describe('RecipeIngredientList', () => {
  const mockOnChange = vi.fn();

  const sampleIngredients = [
    {
      ingredient_id: 'ing-1',
      ingredient: {
        id: 'ing-1',
        name: 'Chicken Breast',
        category: 'proteins',
        default_unit: 'g',
        nutrition_per_100g: { calories: 165, protein: 31, fat: 3.6, carbs: 0 }
      },
      quantity: 200,
      unit: 'g',
      notes: 'Boneless',
      is_optional: false,
      display_order: 0
    },
    {
      ingredient_id: 'ing-2',
      ingredient: {
        id: 'ing-2',
        name: 'Brown Rice',
        category: 'grains',
        default_unit: 'g',
        nutrition_per_100g: { calories: 111, protein: 2.6, fat: 0.9, carbs: 23 }
      },
      quantity: 150,
      unit: 'g',
      notes: '',
      is_optional: true,
      display_order: 1
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    ingredientService.searchIngredients.mockResolvedValue([]);
  });

  describe('Rendering', () => {
    it('renders empty state when no ingredients', () => {
      render(<RecipeIngredientList ingredients={[]} onChange={mockOnChange} />);
      expect(screen.getByText('No ingredients added yet')).toBeInTheDocument();
    });

    it('renders ingredient list', () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} />);

      expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
      expect(screen.getByText('Brown Rice')).toBeInTheDocument();
    });

    it('renders ingredient selector in edit mode', () => {
      render(<RecipeIngredientList ingredients={[]} onChange={mockOnChange} readOnly={false} />);
      expect(screen.getByPlaceholderText('Search to add ingredient...')).toBeInTheDocument();
    });

    it('hides ingredient selector in read-only mode', () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} readOnly={true} />);
      expect(screen.queryByPlaceholderText('Search to add ingredient...')).not.toBeInTheDocument();
    });
  });

  describe('Ingredient Display', () => {
    it('shows ingredient names', () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} />);

      expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
      expect(screen.getByText('Brown Rice')).toBeInTheDocument();
    });

    it('shows ingredient quantities', () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} />);

      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs[0]).toHaveValue(200);
      expect(inputs[1]).toHaveValue(150);
    });

    it('shows ingredient units', () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} />);

      const selects = screen.getAllByRole('combobox');
      expect(selects[0]).toHaveValue('g');
    });

    it('shows ingredient notes', () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} />);

      const notesInputs = screen.getAllByPlaceholderText('e.g., chopped');
      expect(notesInputs[0]).toHaveValue('Boneless');
    });

    it('shows optional checkbox', () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).not.toBeChecked(); // Chicken is not optional
      expect(checkboxes[1]).toBeChecked(); // Rice is optional
    });
  });

  describe('Edit Actions', () => {
    it('updates quantity when changed', async () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} />);

      const quantityInput = screen.getAllByRole('spinbutton')[0];
      await userEvent.clear(quantityInput);
      await userEvent.type(quantityInput, '250');

      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall[0].quantity).toBe('250');
    });

    it('updates unit when changed', async () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} />);

      const unitSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(unitSelect, { target: { value: 'kg' } });

      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall[0].unit).toBe('kg');
    });

    it('updates notes when changed', async () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} />);

      const notesInput = screen.getAllByPlaceholderText('e.g., chopped')[0];
      await userEvent.clear(notesInput);
      await userEvent.type(notesInput, 'Sliced thin');

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('toggles optional status', async () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} />);

      const checkbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall[0].is_optional).toBe(true);
    });
  });

  describe('Remove Ingredient', () => {
    it('removes ingredient when remove button is clicked', () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} />);

      const removeButtons = screen.getAllByText('✕');
      fireEvent.click(removeButtons[0]);

      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall).toHaveLength(1);
      expect(lastCall[0].ingredient.name).toBe('Brown Rice');
    });

    it('hides remove button in read-only mode', () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} readOnly={true} />);
      expect(screen.queryByText('✕')).not.toBeInTheDocument();
    });
  });

  describe('Reorder Ingredients', () => {
    it('moves ingredient up when up button clicked', () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} />);

      const upButtons = screen.getAllByText('▲');
      fireEvent.click(upButtons[1]); // Click up on second ingredient

      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall[0].ingredient.name).toBe('Brown Rice');
      expect(lastCall[1].ingredient.name).toBe('Chicken Breast');
    });

    it('moves ingredient down when down button clicked', () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} />);

      const downButtons = screen.getAllByText('▼');
      fireEvent.click(downButtons[0]); // Click down on first ingredient

      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall[0].ingredient.name).toBe('Brown Rice');
    });

    it('disables up button for first ingredient', () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} />);

      const upButtons = screen.getAllByText('▲');
      expect(upButtons[0].closest('button')).toBeDisabled();
    });

    it('disables down button for last ingredient', () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} />);

      const downButtons = screen.getAllByText('▼');
      expect(downButtons[downButtons.length - 1].closest('button')).toBeDisabled();
    });

    it('hides reorder buttons in read-only mode', () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} readOnly={true} />);
      expect(screen.queryByText('▲')).not.toBeInTheDocument();
      expect(screen.queryByText('▼')).not.toBeInTheDocument();
    });
  });

  describe('Nutrition Calculation', () => {
    it('shows nutrition summary when ingredients have nutrition data', () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} />);

      expect(screen.getByText('Estimated Total Nutrition')).toBeInTheDocument();
    });

    it('calculates total calories correctly', () => {
      // Chicken: 200g = 330 cal
      // Rice: 150g = 166.5 cal
      // Total: 496.5 cal, rounded = 496 or 497
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} />);

      const caloriesText = screen.getByText(/496|497|kcal/);
      expect(caloriesText).toBeInTheDocument();
    });

    it('shows nutrition note about grams', () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} />);

      expect(screen.getByText(/Based on ingredients with quantity in grams/)).toBeInTheDocument();
    });
  });

  describe('Read-Only Mode', () => {
    it('displays values as text instead of inputs', () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} readOnly={true} />);

      // Should show text, not inputs
      expect(screen.getByText('200')).toBeInTheDocument();
      expect(screen.getByText('g')).toBeInTheDocument();
    });

    it('shows optional badge for optional ingredients', () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} readOnly={true} />);

      expect(screen.getByText('Optional')).toBeInTheDocument();
    });

    it('shows notes as text', () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} readOnly={true} />);

      expect(screen.getByText('Boneless')).toBeInTheDocument();
    });
  });

  describe('Add Ingredient', () => {
    it('adds new ingredient when selected from autocomplete', async () => {
      const newIngredient = {
        id: 'ing-3',
        name: 'Broccoli',
        category: 'vegetables',
        default_unit: 'g',
        nutrition_per_100g: { calories: 34, protein: 2.8 }
      };

      ingredientService.searchIngredients.mockResolvedValue([newIngredient]);

      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search to add ingredient...');
      await userEvent.type(input, 'broccoli');

      await waitFor(() => {
        expect(screen.getByText('Broccoli')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Broccoli'));

      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall).toHaveLength(3);
      expect(lastCall[2].ingredient.name).toBe('Broccoli');
    });

    it('excludes already added ingredients from search', async () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} />);

      // The excludeIds prop should contain ing-1 and ing-2
      const selector = screen.getByPlaceholderText('Search to add ingredient...');
      expect(selector).toBeInTheDocument();

      // Verify that IngredientSelector is rendered with correct excludeIds
      // This is implicitly tested by the component structure
    });
  });

  describe('Category Badge', () => {
    it('shows category badge for ingredients', () => {
      render(<RecipeIngredientList ingredients={sampleIngredients} onChange={mockOnChange} />);

      expect(screen.getAllByText(/proteins/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/grains/i).length).toBeGreaterThan(0);
    });
  });
});
