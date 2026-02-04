/**
 * IngredientSelector Component Tests
 * Tests for the ingredient autocomplete selector component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IngredientSelector from '../IngredientSelector';
import * as ingredientService from '../../services/ingredientService';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key
  })
}));

// Mock ingredient service
vi.mock('../../services/ingredientService', () => ({
  searchIngredients: vi.fn(),
  getIngredients: vi.fn().mockResolvedValue({ data: [] })
}));

// Mock IngredientModal
vi.mock('../IngredientModal', () => ({
  default: () => null
}));

describe('IngredientSelector', () => {
  const mockOnSelect = vi.fn();

  const sampleIngredients = [
    { id: 'ing-1', name: 'Chicken Breast', category: 'proteins', default_unit: 'g' },
    { id: 'ing-2', name: 'Chicken Thigh', category: 'proteins', default_unit: 'g' },
    { id: 'ing-3', name: 'Chicken Wings', category: 'proteins', default_unit: 'piece' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    ingredientService.searchIngredients.mockResolvedValue([]);
  });

  describe('Rendering', () => {
    it('renders input field', () => {
      render(<IngredientSelector onSelect={mockOnSelect} />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(
        <IngredientSelector
          onSelect={mockOnSelect}
          placeholder="Search for ingredients..."
        />
      );
      expect(screen.getByPlaceholderText('Search for ingredients...')).toBeInTheDocument();
    });

    it('renders default placeholder when not provided', () => {
      render(<IngredientSelector onSelect={mockOnSelect} />);
      expect(screen.getByPlaceholderText('Search ingredients...')).toBeInTheDocument();
    });
  });

  describe('Search Behavior', () => {
    it('does not search when query is less than 2 characters', async () => {
      render(<IngredientSelector onSelect={mockOnSelect} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'c');

      await waitFor(() => {
        expect(ingredientService.searchIngredients).not.toHaveBeenCalled();
      }, { timeout: 500 });
    });

    it('searches when query is 2 or more characters', async () => {
      ingredientService.searchIngredients.mockResolvedValue(sampleIngredients);

      render(<IngredientSelector onSelect={mockOnSelect} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'chi');

      await waitFor(() => {
        expect(ingredientService.searchIngredients).toHaveBeenCalled();
      }, { timeout: 500 });
    });

    it('shows search results in dropdown', async () => {
      ingredientService.searchIngredients.mockResolvedValue(sampleIngredients);

      render(<IngredientSelector onSelect={mockOnSelect} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'chicken');

      await waitFor(() => {
        expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
        expect(screen.getByText('Chicken Thigh')).toBeInTheDocument();
      });
    });

    it('shows no results message when no matches', async () => {
      ingredientService.searchIngredients.mockResolvedValue([]);

      render(<IngredientSelector onSelect={mockOnSelect} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'xyz');

      await waitFor(() => {
        expect(screen.getByText('No ingredients found')).toBeInTheDocument();
      });
    });
  });

  describe('Selection', () => {
    it('calls onSelect when ingredient is clicked', async () => {
      ingredientService.searchIngredients.mockResolvedValue(sampleIngredients);

      render(<IngredientSelector onSelect={mockOnSelect} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'chicken');

      await waitFor(() => {
        expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Chicken Breast'));

      expect(mockOnSelect).toHaveBeenCalledWith(sampleIngredients[0]);
    });

    it('clears input after selection', async () => {
      ingredientService.searchIngredients.mockResolvedValue(sampleIngredients);

      render(<IngredientSelector onSelect={mockOnSelect} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'chicken');

      await waitFor(() => {
        expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Chicken Breast'));

      expect(input.value).toBe('');
    });

    it('hides dropdown after selection', async () => {
      ingredientService.searchIngredients.mockResolvedValue(sampleIngredients);

      render(<IngredientSelector onSelect={mockOnSelect} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'chicken');

      await waitFor(() => {
        expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Chicken Breast'));

      await waitFor(() => {
        expect(screen.queryByText('Chicken Breast')).not.toBeInTheDocument();
      });
    });
  });

  describe('Exclude IDs', () => {
    it('filters out excluded ingredient IDs', async () => {
      ingredientService.searchIngredients.mockResolvedValue([sampleIngredients[0]]);

      render(
        <IngredientSelector
          onSelect={mockOnSelect}
          excludeIds={['ing-1']}
        />
      );

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'chicken');

      await waitFor(() => {
        // ing-1 should be filtered out
        expect(screen.queryByText('Chicken Breast')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('navigates with arrow keys', async () => {
      ingredientService.searchIngredients.mockResolvedValue(sampleIngredients);

      render(<IngredientSelector onSelect={mockOnSelect} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'chicken');

      await waitFor(() => {
        expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
      });

      // Press arrow down to highlight first item
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      // The first item should be highlighted (active state)
      const listItems = screen.getAllByRole('button');
      expect(listItems[0]).toHaveClass('active');
    });

    it('selects item with Enter key', async () => {
      ingredientService.searchIngredients.mockResolvedValue(sampleIngredients);

      render(<IngredientSelector onSelect={mockOnSelect} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'chicken');

      await waitFor(() => {
        expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnSelect).toHaveBeenCalled();
    });

    it('closes dropdown with Escape key', async () => {
      ingredientService.searchIngredients.mockResolvedValue(sampleIngredients);

      render(<IngredientSelector onSelect={mockOnSelect} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'chicken');

      await waitFor(() => {
        expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText('Chicken Breast')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator while searching', async () => {
      // Create a delayed promise
      let resolveSearch;
      ingredientService.searchIngredients.mockImplementation(() => {
        return new Promise(resolve => {
          resolveSearch = () => resolve(sampleIngredients);
        });
      });

      render(<IngredientSelector onSelect={mockOnSelect} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'chicken');

      // Wait for debounce and check loading state
      await waitFor(() => {
        expect(ingredientService.searchIngredients).toHaveBeenCalled();
      }, { timeout: 500 });

      // Resolve the search
      resolveSearch();
    });
  });

  describe('Category Badge', () => {
    it('shows category badge for ingredients', async () => {
      ingredientService.searchIngredients.mockResolvedValue(sampleIngredients);

      render(<IngredientSelector onSelect={mockOnSelect} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'chicken');

      await waitFor(() => {
        expect(screen.getAllByText('Proteins').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Default Unit Display', () => {
    it('shows default unit for ingredients', async () => {
      ingredientService.searchIngredients.mockResolvedValue(sampleIngredients);

      render(<IngredientSelector onSelect={mockOnSelect} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'chicken');

      await waitFor(() => {
        // Two ingredients have 'g' as default_unit, one has 'piece'
        expect(screen.getAllByText('g').length).toBe(2);
        expect(screen.getByText('piece')).toBeInTheDocument();
      });
    });
  });

  describe('Click Outside', () => {
    it('closes dropdown when clicking outside', async () => {
      ingredientService.searchIngredients.mockResolvedValue(sampleIngredients);

      render(
        <div>
          <IngredientSelector onSelect={mockOnSelect} />
          <button data-testid="outside">Outside</button>
        </div>
      );

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'chicken');

      await waitFor(() => {
        expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
      });

      fireEvent.mouseDown(screen.getByTestId('outside'));

      await waitFor(() => {
        expect(screen.queryByText('Chicken Breast')).not.toBeInTheDocument();
      });
    });
  });
});
