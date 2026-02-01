/**
 * IngredientModal Component Tests
 * Tests for the ingredient create/edit modal component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IngredientModal from '../IngredientModal';
import * as ingredientService from '../../services/ingredientService';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key
  })
}));

// Mock ingredient service
vi.mock('../../services/ingredientService', () => ({
  createIngredient: vi.fn(),
  updateIngredient: vi.fn()
}));

// Mock react-toastify
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

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
    category: 'proteins',
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
      expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    });

    it('renders category select', () => {
      render(<IngredientModal {...defaultProps} />);
      expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
    });

    it('renders unit select', () => {
      render(<IngredientModal {...defaultProps} />);
      expect(screen.getByLabelText(/Default Unit/)).toBeInTheDocument();
    });

    it('renders nutrition fields', () => {
      render(<IngredientModal {...defaultProps} />);
      expect(screen.getByLabelText(/Calories/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Protein/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Carbs/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Fat/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Fiber/)).toBeInTheDocument();
    });

    it('renders allergen badges', () => {
      render(<IngredientModal {...defaultProps} />);
      expect(screen.getByText('Gluten')).toBeInTheDocument();
      expect(screen.getByText('Dairy')).toBeInTheDocument();
      expect(screen.getByText('Eggs')).toBeInTheDocument();
    });
  });

  describe('Create Mode', () => {
    it('starts with empty form', () => {
      render(<IngredientModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Name/);
      expect(nameInput).toHaveValue('');
    });

    it('creates ingredient on submit', async () => {
      render(<IngredientModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Name/);
      await userEvent.type(nameInput, 'New Ingredient');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(ingredientService.createIngredient).toHaveBeenCalled();
      });
    });

    it('calls onSuccess after successful creation', async () => {
      render(<IngredientModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Name/);
      await userEvent.type(nameInput, 'New Ingredient');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('calls onHide after successful creation', async () => {
      render(<IngredientModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Name/);
      await userEvent.type(nameInput, 'New Ingredient');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnHide).toHaveBeenCalled();
      });
    });
  });

  describe('Edit Mode', () => {
    it('populates form with ingredient data', () => {
      render(<IngredientModal {...defaultProps} ingredient={sampleIngredient} />);

      const nameInput = screen.getByLabelText(/Name/);
      expect(nameInput).toHaveValue('Chicken Breast');
    });

    it('populates nutrition fields', () => {
      render(<IngredientModal {...defaultProps} ingredient={sampleIngredient} />);

      const caloriesInput = screen.getByLabelText(/Calories/);
      expect(caloriesInput).toHaveValue(165);
    });

    it('updates ingredient on submit', async () => {
      render(<IngredientModal {...defaultProps} ingredient={sampleIngredient} />);

      const nameInput = screen.getByLabelText(/Name/);
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

      const nameInput = screen.getByLabelText(/Name/);
      await userEvent.type(nameInput, 'Valid Name');

      expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
    });
  });

  describe('Allergen Selection', () => {
    it('toggles allergen selection when clicked', async () => {
      render(<IngredientModal {...defaultProps} />);

      const glutenBadge = screen.getByText('Gluten');
      fireEvent.click(glutenBadge);

      // Badge should change appearance (bg-warning when selected)
      expect(glutenBadge.closest('.badge')).toHaveClass('bg-warning');
    });

    it('deselects allergen when clicked again', async () => {
      render(<IngredientModal {...defaultProps} />);

      const glutenBadge = screen.getByText('Gluten');
      fireEvent.click(glutenBadge);
      fireEvent.click(glutenBadge);

      expect(glutenBadge.closest('.badge')).toHaveClass('bg-light');
    });

    it('includes selected allergens in submission', async () => {
      render(<IngredientModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Name/);
      await userEvent.type(nameInput, 'Wheat Bread');

      const glutenBadge = screen.getByText('Gluten');
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

      const proteinInput = screen.getByLabelText(/Protein/);
      await userEvent.type(proteinInput, '3.5');

      expect(proteinInput).toHaveValue(3.5);
    });

    it('includes nutrition in submission', async () => {
      render(<IngredientModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Name/);
      await userEvent.type(nameInput, 'Test Food');

      const caloriesInput = screen.getByLabelText(/Calories/);
      await userEvent.type(caloriesInput, '100');

      const proteinInput = screen.getByLabelText(/Protein/);
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
    it('lists all categories', () => {
      render(<IngredientModal {...defaultProps} />);

      const categorySelect = screen.getByLabelText(/Category/);
      expect(categorySelect).toBeInTheDocument();

      // Open dropdown and check options
      const options = categorySelect.querySelectorAll('option');
      expect(options.length).toBeGreaterThan(5);
    });

    it('includes selected category in submission', async () => {
      render(<IngredientModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Name/);
      await userEvent.type(nameInput, 'Carrot');

      const categorySelect = screen.getByLabelText(/Category/);
      fireEvent.change(categorySelect, { target: { value: 'vegetables' } });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(ingredientService.createIngredient).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'vegetables' })
        );
      });
    });
  });

  describe('Unit Selection', () => {
    it('lists common units', () => {
      render(<IngredientModal {...defaultProps} />);

      const unitSelect = screen.getByLabelText(/Default Unit/);

      // Check for common units
      expect(unitSelect).toContainHTML('g');
      expect(unitSelect).toContainHTML('ml');
      expect(unitSelect).toContainHTML('cup');
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

      const nameInput = screen.getByLabelText(/Name/);
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

      const nameInput = screen.getByLabelText(/Name/);
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

      const nameInput = screen.getByLabelText(/Name/);
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

      const nameInput = screen.getByLabelText(/Name/);
      await userEvent.type(nameInput, 'Test Ingredient');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnHide).not.toHaveBeenCalled();
      });
    });
  });
});
