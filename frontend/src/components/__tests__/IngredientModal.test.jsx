/**
 * IngredientModal Component Tests
 * Tests for the ingredient create/edit modal component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IngredientModal from '../IngredientModal';
import * as ingredientService from '../../services/ingredientService';
import * as ingredientCategoryService from '../../services/ingredientCategoryService';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key
  })
}));

// Mock ingredient service
vi.mock('../../services/ingredientService', () => ({
  createIngredient: vi.fn(),
  updateIngredient: vi.fn(),
  lookupNutrition: vi.fn()
}));

// Mock ingredient category service
vi.mock('../../services/ingredientCategoryService', () => ({
  getCategories: vi.fn()
}));

// Mock react-toastify
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}));

const mockCategories = [
  { id: 'cat-1', name: 'Proteins', icon: '🥩', sort_order: 1 },
  { id: 'cat-2', name: 'Vegetables', icon: '🥬', sort_order: 2 },
  { id: 'cat-3', name: 'Fruits', icon: '🍎', sort_order: 3 },
  { id: 'cat-4', name: 'Grains', icon: '🌾', sort_order: 4 },
  { id: 'cat-5', name: 'Dairy', icon: '🧀', sort_order: 5 },
  { id: 'cat-6', name: 'Other', icon: '📦', sort_order: 6 }
];

/**
 * Helper to get form controls by their label text.
 * The component uses Form.Group without controlId, so labels are not
 * associated to inputs via htmlFor/id. React Bootstrap Modal renders
 * via a portal into document.body, so we search document.body rather
 * than the render container.
 */
function getFieldByLabel(labelPattern) {
  const labels = document.body.querySelectorAll('label');
  for (const label of labels) {
    if (labelPattern.test(label.textContent)) {
      const group = label.closest('.mb-3');
      if (!group) continue;
      const input = group.querySelector('input, select');
      if (input) return input;
    }
  }
  throw new Error(`Could not find form control for label matching ${labelPattern}`);
}

describe('IngredientModal', () => {
  const mockOnHide = vi.fn();
  const mockOnSuccess = vi.fn();

  const defaultProps = {
    show: true,
    onHide: mockOnHide,
    ingredient: null,
    onSuccess: mockOnSuccess
  };

  const sampleIngredient = {
    id: 'ing-123',
    name: 'Chicken Breast',
    category_id: 'cat-1',
    default_unit: 'g',
    nutrition_per_100g: {
      calories: 165,
      protein: 31,
      fat: 3.6,
      carbs: 0,
      fiber: 0
    },
    allergens: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ingredientCategoryService.getCategories.mockResolvedValue(mockCategories);
    ingredientService.createIngredient.mockResolvedValue({ id: 'new-ing' });
    ingredientService.updateIngredient.mockResolvedValue(sampleIngredient);
  });

  describe('Rendering', () => {
    it('renders modal when show is true', () => {
      render(<IngredientModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render modal when show is false', () => {
      render(<IngredientModal {...defaultProps} show={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows "New Ingredient" title for create mode', () => {
      render(<IngredientModal {...defaultProps} />);
      expect(screen.getByText('New Ingredient')).toBeInTheDocument();
    });

    it('shows "Edit Ingredient" title for edit mode', () => {
      render(<IngredientModal {...defaultProps} ingredient={sampleIngredient} />);
      expect(screen.getByText('Edit Ingredient')).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('renders name field', () => {
      render(<IngredientModal {...defaultProps} />);
      expect(getFieldByLabel(/Name/)).toBeInTheDocument();
    });

    it('renders category select', async () => {
      render(<IngredientModal {...defaultProps} />);
      await waitFor(() => {
        expect(getFieldByLabel(/Category/)).toBeInTheDocument();
      });
    });

    it('renders unit select', async () => {
      render(<IngredientModal {...defaultProps} />);
      await waitFor(() => {
        expect(getFieldByLabel(/Default Unit/)).toBeInTheDocument();
      });
    });

    it('renders nutrition fields', async () => {
      render(<IngredientModal {...defaultProps} />);
      await waitFor(() => {
        expect(getFieldByLabel(/Calories/)).toBeInTheDocument();
      });
      expect(getFieldByLabel(/Protein/)).toBeInTheDocument();
      expect(getFieldByLabel(/Carbs/)).toBeInTheDocument();
      expect(getFieldByLabel(/Fat/)).toBeInTheDocument();
      expect(getFieldByLabel(/Fiber/)).toBeInTheDocument();
    });

    it('renders allergen badges', () => {
      render(<IngredientModal {...defaultProps} />);
      expect(screen.getByText('gluten')).toBeInTheDocument();
      expect(screen.getByText('dairy')).toBeInTheDocument();
      expect(screen.getByText('eggs')).toBeInTheDocument();
    });
  });

  describe('Create Mode', () => {
    it('starts with empty form', async () => {
      render(<IngredientModal {...defaultProps} />);

      await waitFor(() => {
        expect(getFieldByLabel(/Name/)).toHaveValue('');
      });
    });

    it('creates ingredient on submit', async () => {
      render(<IngredientModal {...defaultProps} />);

      await waitFor(() => {
        expect(getFieldByLabel(/Name/)).toBeInTheDocument();
      });
      const nameInput = getFieldByLabel(/Name/);
      await userEvent.type(nameInput, 'New Ingredient');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(ingredientService.createIngredient).toHaveBeenCalled();
      });
    });

    it('calls onSuccess after successful creation', async () => {
      render(<IngredientModal {...defaultProps} />);

      await waitFor(() => {
        expect(getFieldByLabel(/Name/)).toBeInTheDocument();
      });
      const nameInput = getFieldByLabel(/Name/);
      await userEvent.type(nameInput, 'New Ingredient');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('calls onHide after successful creation', async () => {
      render(<IngredientModal {...defaultProps} />);

      await waitFor(() => {
        expect(getFieldByLabel(/Name/)).toBeInTheDocument();
      });
      const nameInput = getFieldByLabel(/Name/);
      await userEvent.type(nameInput, 'New Ingredient');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnHide).toHaveBeenCalled();
      });
    });
  });

  describe('Edit Mode', () => {
    it('populates form with ingredient data', async () => {
      render(<IngredientModal {...defaultProps} ingredient={sampleIngredient} />);

      await waitFor(() => {
        expect(getFieldByLabel(/Name/)).toHaveValue('Chicken Breast');
      });
    });

    it('populates nutrition fields', async () => {
      render(<IngredientModal {...defaultProps} ingredient={sampleIngredient} />);

      await waitFor(() => {
        expect(getFieldByLabel(/Calories/)).toHaveValue(165);
      });
    });

    it('updates ingredient on submit', async () => {
      render(<IngredientModal {...defaultProps} ingredient={sampleIngredient} />);

      await waitFor(() => {
        expect(getFieldByLabel(/Name/)).toHaveValue('Chicken Breast');
      });
      const nameInput = getFieldByLabel(/Name/);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Chicken');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(ingredientService.updateIngredient).toHaveBeenCalledWith(
          'ing-123',
          expect.objectContaining({ name: 'Updated Chicken' })
        );
      });
    });
  });

  describe('Validation', () => {
    it('shows error when name is empty', async () => {
      render(<IngredientModal {...defaultProps} />);

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('This field is required')).toBeInTheDocument();
      });
    });

    it('does not submit when validation fails', async () => {
      render(<IngredientModal {...defaultProps} />);

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(ingredientService.createIngredient).not.toHaveBeenCalled();
      });
    });

    it('clears error when field is corrected', async () => {
      render(<IngredientModal {...defaultProps} />);

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('This field is required')).toBeInTheDocument();
      });

      const nameInput = getFieldByLabel(/Name/);
      await userEvent.type(nameInput, 'Valid Name');

      expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
    });
  });

  describe('Allergen Selection', () => {
    it('toggles allergen selection when clicked', async () => {
      render(<IngredientModal {...defaultProps} />);

      const glutenBadge = screen.getByText('gluten');
      fireEvent.click(glutenBadge);

      // Badge should change appearance (bg-warning when selected)
      expect(glutenBadge.closest('.badge')).toHaveClass('bg-warning');
    });

    it('deselects allergen when clicked again', async () => {
      render(<IngredientModal {...defaultProps} />);

      const glutenBadge = screen.getByText('gluten');
      fireEvent.click(glutenBadge);
      fireEvent.click(glutenBadge);

      expect(glutenBadge.closest('.badge')).toHaveClass('bg-light');
    });

    it('includes selected allergens in submission', async () => {
      render(<IngredientModal {...defaultProps} />);

      await waitFor(() => {
        expect(getFieldByLabel(/Name/)).toBeInTheDocument();
      });
      const nameInput = getFieldByLabel(/Name/);
      await userEvent.type(nameInput, 'Wheat Bread');

      const glutenBadge = screen.getByText('gluten');
      fireEvent.click(glutenBadge);

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(ingredientService.createIngredient).toHaveBeenCalledWith(
          expect.objectContaining({ allergens: ['gluten'] })
        );
      });
    });
  });

  describe('Nutrition Input', () => {
    it('accepts decimal values for nutrition', async () => {
      render(<IngredientModal {...defaultProps} />);

      await waitFor(() => {
        expect(getFieldByLabel(/Protein/)).toBeInTheDocument();
      });
      const proteinInput = getFieldByLabel(/Protein/);
      await userEvent.type(proteinInput, '3.5');

      expect(proteinInput).toHaveValue(3.5);
    });

    it('includes nutrition in submission', async () => {
      render(<IngredientModal {...defaultProps} />);

      await waitFor(() => {
        expect(getFieldByLabel(/Name/)).toBeInTheDocument();
      });
      const nameInput = getFieldByLabel(/Name/);
      await userEvent.type(nameInput, 'Test Food');

      const caloriesInput = getFieldByLabel(/Calories/);
      await userEvent.type(caloriesInput, '100');

      const proteinInput = getFieldByLabel(/Protein/);
      await userEvent.type(proteinInput, '10');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(ingredientService.createIngredient).toHaveBeenCalledWith(
          expect.objectContaining({
            nutrition_per_100g: expect.objectContaining({
              calories: 100,
              protein: 10
            })
          })
        );
      });
    });
  });

  describe('Category Selection', () => {
    it('lists all categories from API', async () => {
      render(<IngredientModal {...defaultProps} />);

      await waitFor(() => {
        const categorySelect = getFieldByLabel(/Category/);
        const options = categorySelect.querySelectorAll('option');
        // 6 categories + 1 "Select..." placeholder
        expect(options.length).toBe(7);
      });
    });

    it('includes selected category_id in submission', async () => {
      render(<IngredientModal {...defaultProps} />);

      await waitFor(() => {
        const categorySelect = getFieldByLabel(/Category/);
        const options = categorySelect.querySelectorAll('option');
        expect(options.length).toBe(7);
      });

      const nameInput = getFieldByLabel(/Name/);
      await userEvent.type(nameInput, 'Carrot');

      const categorySelect = getFieldByLabel(/Category/);
      fireEvent.change(categorySelect, { target: { value: 'cat-2' } });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(ingredientService.createIngredient).toHaveBeenCalledWith(
          expect.objectContaining({ category_id: 'cat-2' })
        );
      });
    });
  });

  describe('Unit Selection', () => {
    it('lists common units', async () => {
      render(<IngredientModal {...defaultProps} />);

      await waitFor(() => {
        const unitSelect = getFieldByLabel(/Default Unit/);
        expect(unitSelect).toBeInTheDocument();
      });

      const unitSelect = getFieldByLabel(/Default Unit/);
      const options = Array.from(unitSelect.querySelectorAll('option')).map(o => o.value);
      expect(options).toContain('g');
      expect(options).toContain('ml');
      expect(options).toContain('cup');
    });
  });

  describe('Cancel Action', () => {
    it('calls onHide when cancel button clicked', () => {
      render(<IngredientModal {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnHide).toHaveBeenCalled();
    });

    it('calls onHide when close button clicked', () => {
      render(<IngredientModal {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(mockOnHide).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('shows loading state during submission', async () => {
      let resolveCreate;
      ingredientService.createIngredient.mockImplementation(() => {
        return new Promise(resolve => {
          resolveCreate = () => resolve({ id: 'new-ing' });
        });
      });

      render(<IngredientModal {...defaultProps} />);

      await waitFor(() => {
        expect(getFieldByLabel(/Name/)).toBeInTheDocument();
      });
      const nameInput = getFieldByLabel(/Name/);
      await userEvent.type(nameInput, 'New Ingredient');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });

      resolveCreate();
    });

    it('disables buttons during submission', async () => {
      let resolveCreate;
      ingredientService.createIngredient.mockImplementation(() => {
        return new Promise(resolve => {
          resolveCreate = () => resolve({ id: 'new-ing' });
        });
      });

      render(<IngredientModal {...defaultProps} />);

      await waitFor(() => {
        expect(getFieldByLabel(/Name/)).toBeInTheDocument();
      });
      const nameInput = getFieldByLabel(/Name/);
      await userEvent.type(nameInput, 'New Ingredient');

      const saveButton = screen.getByText('Save');
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(cancelButton).toBeDisabled();
      });

      resolveCreate();
    });
  });

  describe('Error Handling', () => {
    it('shows error toast on API failure', async () => {
      const { toast } = await import('react-toastify');
      ingredientService.createIngredient.mockRejectedValue(new Error('API Error'));

      render(<IngredientModal {...defaultProps} />);

      await waitFor(() => {
        expect(getFieldByLabel(/Name/)).toBeInTheDocument();
      });
      const nameInput = getFieldByLabel(/Name/);
      await userEvent.type(nameInput, 'Test Ingredient');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('does not close modal on error', async () => {
      ingredientService.createIngredient.mockRejectedValue(new Error('API Error'));

      render(<IngredientModal {...defaultProps} />);

      await waitFor(() => {
        expect(getFieldByLabel(/Name/)).toBeInTheDocument();
      });
      const nameInput = getFieldByLabel(/Name/);
      await userEvent.type(nameInput, 'Test Ingredient');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnHide).not.toHaveBeenCalled();
      });
    });
  });
});
